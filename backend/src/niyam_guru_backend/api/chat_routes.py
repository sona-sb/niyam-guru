"""
Chat API Routes

Endpoints for the AI-powered chat agent:
  POST  /api/chat/send                — send a message
  GET   /api/chat/history/{id}        — load conversation history for a case
  POST  /api/chat/voice-transcript    — save a voice transcript for a case
  GET   /api/chat/cases/{uid}         — list all cases for a user
  POST  /api/chat/approve-email/{id}  — approve & send a drafted email via Gmail
  GET   /api/chat/emails/{case_id}    — list all emails for a case
  GET   /api/chat/health              — health check
"""

from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from niyam_guru_backend.chat_agent import chat_service
from niyam_guru_backend.chat_agent.email_service import email_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SendMessageRequest(BaseModel):
    user_id: str
    message: str
    case_id: str
    metadata: Optional[dict] = None


class SendMessageResponse(BaseModel):
    success: bool
    case_id: Optional[str] = None
    reply: Optional[str] = None
    email_draft: Optional[dict] = None
    error: Optional[str] = None


class VoiceTranscriptRequest(BaseModel):
    user_id: str
    case_id: str
    original_transcript: str
    english_translation: Optional[str] = None
    language_code: Optional[str] = None


class VoiceTranscriptResponse(BaseModel):
    success: bool
    case_id: Optional[str] = None
    transcript_id: Optional[str] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/send", response_model=SendMessageResponse)
async def send_message(req: SendMessageRequest):
    """Send a user message and get an AI response.

    Requires a case_id — cases are created via the MyCases page.
    The full conversation history is sent to the LLM on every call.
    """
    # Verify case exists
    case = chat_service.get_case(req.case_id)
    if not case:
        return SendMessageResponse(
            success=False, error=f"Case {req.case_id} not found"
        )

    reply, email_draft, error = await chat_service.chat(
        case_id=req.case_id,
        user_message=req.message,
        metadata=req.metadata,
    )

    if error:
        return SendMessageResponse(success=False, case_id=req.case_id, error=error)

    return SendMessageResponse(
        success=True, case_id=req.case_id, reply=reply, email_draft=email_draft,
    )


@router.get("/history/{case_id}")
async def get_history(case_id: str):
    """Load all messages for a case."""
    messages = chat_service.get_messages(case_id)
    return {"success": True, "case_id": case_id, "messages": messages}


@router.post("/voice-transcript", response_model=VoiceTranscriptResponse)
async def save_voice_transcript(req: VoiceTranscriptRequest):
    """Save a voice transcript to a case. Requires case_id."""
    # Verify case exists
    case = chat_service.get_case(req.case_id)
    if not case:
        return VoiceTranscriptResponse(
            success=False, error=f"Case {req.case_id} not found"
        )

    transcript_id = chat_service.save_voice_transcript(
        case_id=req.case_id,
        original_transcript=req.original_transcript,
        english_translation=req.english_translation,
        language_code=req.language_code,
    )

    if not transcript_id:
        return VoiceTranscriptResponse(
            success=False, case_id=req.case_id, error="Failed to save transcript"
        )

    return VoiceTranscriptResponse(
        success=True, case_id=req.case_id, transcript_id=transcript_id
    )


@router.get("/cases/{user_id}")
async def list_cases(user_id: str):
    """List all cases for a user."""
    cases = chat_service.list_user_cases(user_id)
    return {"success": True, "cases": cases}


# ---------------------------------------------------------------------------
# Email endpoints
# ---------------------------------------------------------------------------

@router.post("/approve-email/{email_id}")
async def approve_and_send_email(email_id: str):
    """Approve a drafted email and send it via Gmail."""
    success, message = email_service.approve_and_send(email_id)
    return {"success": success, "message": message}


@router.get("/emails/{case_id}")
async def list_emails(case_id: str):
    """List all emails for a case."""
    emails = email_service.get_case_emails(case_id)
    return {"success": True, "emails": emails}


@router.get("/health")
async def chat_health():
    return {
        "status": "healthy",
        "service": "chat-agent",
        "llm_configured": chat_service.llm is not None,
        "supabase_configured": chat_service.supabase is not None,
    }
