"""
Voice Processing API Routes — Sarvam AI Speech-to-Text.

Endpoints for transcribing and translating audio using the VoiceProcessor
that lives in chat_agent.voice_service.
"""

from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..chat_agent.voice_service import voice_processor, SUPPORTED_LANGUAGES
from ..config import SARVAM_API_KEY


voice_router = APIRouter(
    prefix="/api/voice",
    tags=["Voice Processing"],
)


@voice_router.get("/health")
async def voice_health_check():
    """Health check for voice processing module."""
    has_key = bool(SARVAM_API_KEY)
    return {
        "status": "healthy" if has_key else "degraded",
        "module": "voice-processing",
        "sarvam_api_configured": has_key,
        "supported_languages": SUPPORTED_LANGUAGES,
    }


@voice_router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, AAC, FLAC, OGG)"),
    language_code: Optional[str] = Form(
        default="unknown",
        description="BCP-47 language code (e.g., 'hi-IN', 'en-IN') or 'unknown' for auto-detection",
    ),
):
    """
    Transcribe audio to text using Sarvam AI.

    - Supports 11 Indian languages + English
    - Set language_code to 'unknown' for automatic language detection
    - If audio is not in English, an English translation is also provided
    - Max audio duration: 30 seconds
    - Supported formats: WAV, MP3, AAC, FLAC, OGG
    """
    if not file.content_type or not file.content_type.startswith("audio/"):
        if file.content_type not in ("application/octet-stream", "video/webm"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Expected audio file.",
            )

    audio_data = await file.read()

    if len(audio_data) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    max_size = 10 * 1024 * 1024  # 10MB generous limit
    if len(audio_data) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Audio file too large ({len(audio_data)} bytes). Max: {max_size} bytes",
        )

    result = await voice_processor.transcribe(
        audio_data=audio_data,
        filename=file.filename or "recording.wav",
        content_type=file.content_type or "audio/wav",
        language_code=language_code or "unknown",
    )

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)

    return {
        "success": True,
        "transcript": result.transcript,
        "language_code": result.language_code,
        "english_translation": result.english_translation,
        "request_id": result.request_id,
    }


@voice_router.post("/translate")
async def translate_audio(
    file: UploadFile = File(..., description="Audio file to translate to English"),
):
    """
    Translate audio speech directly to English text.

    Uses Sarvam AI Saaras model for speech-to-text translation.
    Supported source languages: Hindi, Bengali, Kannada, Malayalam,
    Marathi, Odia, Punjabi, Tamil, Telugu, Gujarati, English.
    """
    audio_data = await file.read()

    if len(audio_data) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    result = await voice_processor.transcribe_and_translate(
        audio_data=audio_data,
        filename=file.filename or "recording.wav",
        content_type=file.content_type or "audio/wav",
    )

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)

    return {
        "success": True,
        "transcript": result.transcript,
        "language_code": result.language_code,
        "english_translation": result.english_translation or result.transcript,
        "request_id": result.request_id,
    }


@voice_router.get("/languages")
async def list_supported_languages():
    """List all supported languages for transcription."""
    return {
        "languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ],
        "auto_detect_code": "unknown",
    }
