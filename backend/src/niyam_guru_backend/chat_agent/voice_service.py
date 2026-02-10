"""
Voice Processing Service using Sarvam AI Speech-to-Text.

Provides transcription (multi-language) and translation (to English)
for audio recordings from the frontend.
"""

import httpx
import traceback
from typing import Optional
from pydantic import BaseModel

from ..config import SARVAM_API_KEY


# =============================================================================
# Models
# =============================================================================

class TranscriptionResult(BaseModel):
    """Result from Sarvam AI speech-to-text."""
    transcript: str = ""
    language_code: Optional[str] = None
    english_translation: Optional[str] = None
    request_id: Optional[str] = None
    error: Optional[str] = None
    success: bool = True


# =============================================================================
# Sarvam AI Supported Languages
# =============================================================================

SUPPORTED_LANGUAGES = {
    "hi-IN": "Hindi",
    "bn-IN": "Bengali",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "od-IN": "Odia",
    "pa-IN": "Punjabi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "gu-IN": "Gujarati",
    "en-IN": "English",
}


# =============================================================================
# Voice Processor
# =============================================================================

class VoiceProcessor:
    """Processes voice audio using Sarvam AI's speech-to-text APIs."""

    TRANSCRIBE_URL = "https://api.sarvam.ai/speech-to-text"
    TRANSLATE_URL = "https://api.sarvam.ai/speech-to-text-translate"
    MODEL_STT = "saarika:v2.5"
    MODEL_TRANSLATE = "saaras:v2.5"

    def __init__(self):
        self.api_key = SARVAM_API_KEY
        if not self.api_key:
            print("⚠️ [VoiceProcessor] SARVAM_API_KEY not set")

    async def transcribe(
        self,
        audio_data: bytes,
        filename: str = "recording.wav",
        content_type: str = "audio/wav",
        language_code: str = "unknown",
    ) -> TranscriptionResult:
        """
        Transcribe audio to text using Sarvam AI Saarika model.

        Args:
            audio_data: Raw audio bytes
            filename: Original filename
            content_type: MIME type of the audio
            language_code: BCP-47 code or "unknown" for auto-detection

        Returns:
            TranscriptionResult with transcript and detected language
        """
        if not self.api_key:
            return TranscriptionResult(
                success=False,
                error="Sarvam AI API key not configured",
            )

        try:
            headers = {
                "api-subscription-key": self.api_key,
            }

            files = {
                "file": (filename, audio_data, content_type),
            }
            data = {
                "model": self.MODEL_STT,
                "language_code": language_code,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.TRANSCRIBE_URL,
                    headers=headers,
                    files=files,
                    data=data,
                )

            if response.status_code == 200:
                result = response.json()
                transcript = result.get("transcript", "")
                detected_lang = result.get("language_code")
                request_id = result.get("request_id")

                print(f"✅ [VoiceProcessor] Transcribed: lang={detected_lang}, len={len(transcript)}")

                # If not English, also get English translation
                english_translation = None
                if detected_lang and detected_lang != "en-IN" and transcript:
                    english_translation = await self._translate_to_english(
                        audio_data, filename, content_type
                    )

                return TranscriptionResult(
                    transcript=transcript,
                    language_code=detected_lang,
                    english_translation=english_translation,
                    request_id=request_id,
                    success=True,
                )
            else:
                error_body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {"message": response.text}
                error_msg = error_body.get("error", {}).get("message", str(error_body))
                print(f"❌ [VoiceProcessor] Transcription failed ({response.status_code}): {error_msg}")
                return TranscriptionResult(
                    success=False,
                    error=f"Sarvam API error ({response.status_code}): {error_msg}",
                )

        except httpx.TimeoutException:
            print("❌ [VoiceProcessor] Transcription request timed out")
            return TranscriptionResult(success=False, error="Request timed out")
        except Exception as e:
            print(f"❌ [VoiceProcessor] Transcription error: {e}")
            traceback.print_exc()
            return TranscriptionResult(success=False, error=str(e))

    async def _translate_to_english(
        self,
        audio_data: bytes,
        filename: str = "recording.wav",
        content_type: str = "audio/wav",
    ) -> Optional[str]:
        """
        Translate audio speech to English using Sarvam AI Saaras model.

        Returns:
            English translation string, or None on failure
        """
        try:
            headers = {
                "api-subscription-key": self.api_key,
            }

            files = {
                "file": (filename, audio_data, content_type),
            }
            data = {
                "model": self.MODEL_TRANSLATE,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.TRANSLATE_URL,
                    headers=headers,
                    files=files,
                    data=data,
                )

            if response.status_code == 200:
                result = response.json()
                translation = result.get("transcript", "")
                print(f"✅ [VoiceProcessor] Translated to English: len={len(translation)}")
                return translation
            else:
                print(f"⚠️ [VoiceProcessor] Translation failed ({response.status_code})")
                return None

        except Exception as e:
            print(f"⚠️ [VoiceProcessor] Translation error: {e}")
            return None

    async def transcribe_and_translate(
        self,
        audio_data: bytes,
        filename: str = "recording.wav",
        content_type: str = "audio/wav",
    ) -> TranscriptionResult:
        """
        Convenience method: auto-detect language, transcribe, and
        translate to English if needed (all in one call).
        """
        return await self.transcribe(
            audio_data=audio_data,
            filename=filename,
            content_type=content_type,
            language_code="unknown",
        )


# Singleton instance
voice_processor = VoiceProcessor()
