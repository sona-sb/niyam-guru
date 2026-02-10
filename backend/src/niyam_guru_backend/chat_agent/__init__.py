"""
Chat Agent Module — Gemini-powered conversational assistant for case intake.

Manages multi-turn conversations, persists messages to Supabase,
drafts/sends complaint emails via Gmail, and provides full conversation
context to the LLM on every turn.
"""

from .chat_service import ChatService, chat_service
from .email_service import EmailService, email_service
from .voice_service import VoiceProcessor, voice_processor, SUPPORTED_LANGUAGES

__all__ = [
    "ChatService",
    "chat_service",
    "EmailService",
    "email_service",
    "VoiceProcessor",
    "voice_processor",
    "SUPPORTED_LANGUAGES",
]
