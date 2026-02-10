"""
Chat Service — handles conversation persistence and LLM interaction.

- Creates user_cases as the "project" entity
- Stores every message in case_messages
- Stores voice transcripts in case_voice_transcripts
- Loads full conversation history before each LLM call
- Uses Google Gemini (gemini-2.5-flash) for responses
"""

import json
import traceback
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from supabase import Client, create_client
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool

from ..config import SUPABASE_URL, SUPABASE_KEY, GOOGLE_API_KEY, LLM_MODEL
from .email_service import email_service, EmailService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_text(content) -> str:
    """Normalise LLM response content to a plain string.

    Gemini sometimes returns a list of parts (text + inline_data)
    instead of a single string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
        return "\n".join(parts)
    return str(content)


# ---------------------------------------------------------------------------
# Supabase helper
# ---------------------------------------------------------------------------

def _get_supabase() -> Optional[Client]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ [ChatService] Supabase credentials not configured")
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"❌ [ChatService] Supabase client error: {e}")
        return None


# ---------------------------------------------------------------------------
# System prompt — guides the assistant through the case-intake flow
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are **Niyam Guru**, an AI legal assistant specialising in Indian consumer protection law (Consumer Protection Act, 2019).

Your job is to have a **natural, empathetic conversation** with the user to understand their consumer complaint in full, and then help them take action.

### Conversation Guidelines
1. **Start with empathy** — acknowledge the user's frustration.
2. **Ask one or two focused follow-up questions at a time** — never dump a long questionnaire.
3. **Gather these details progressively** across the conversation:
   - What product / service is involved
   - Name of the company / opposite party
   - What went wrong (defective product, deficient service, unfair trade practice, etc.)
   - When did it happen (date of purchase / incident)
   - Amount paid / claim amount
   - User's name and location (city / state)
   - What resolution the user wants (refund, replacement, compensation)
   - Any evidence the user has (bills, screenshots, emails)
4. **Explain relevant consumer rights** when appropriate — cite CPA 2019 sections if known.
5. **When you have enough information**, summarise the case and suggest the user proceed to the pre-litigation notice step.
6. Keep responses **concise** (2-4 paragraphs max). Use markdown formatting sparingly.

### Important
- Respond ONLY about consumer issues and Indian consumer law. Politely redirect other topics.
- Never fabricate legal citations. If unsure, say so.
- **Language rule**: ALWAYS reply in the SAME language the user writes in. If the user writes in Hindi, reply entirely in Hindi. If in Malayalam, reply entirely in Malayalam. If in English, reply in English. NEVER mix languages or provide duplicate responses in multiple languages. Match the user's language exactly.

### Email Capabilities
You have the following tools for email:
- `create_gmail_draft`: Creates a draft complaint email in Gmail for user review before sending.
  - **message** — full body of the formal email
  - **to** — list of recipient email addresses
  - **subject** — email subject line
- `search_gmail`: Search the user's Gmail inbox. Returns matching emails with full body text.
  - **query** — A Gmail search query string. Use Gmail search operators:
    - `from:amazon` — emails from a sender
    - `to:user@example.com` — emails to a recipient
    - `subject:refund` — by subject
    - `newer_than:1d` — within last N days (d=day, m=month, y=year)
    - `older_than:7d` — older than N days
    - `after:2025/01/15` — after a date
    - Combine filters: `from:amazon newer_than:7d`
  - **max_results** — number of results (default 10)
- `get_gmail_message`: Read the full content of a specific email by its message ID (from a previous search result).
  - **message_id** — the email ID returned by `search_gmail`
- `get_case_emails_history`: Check all emails (drafts, sent, failed) for this case from our records.

**Email drafting rules:**
- ONLY draft an email when the user explicitly asks to send or draft a complaint / legal notice email.
- Before calling `create_gmail_draft`, make sure you have ALL of these:
  1. The opposite party's email address (ASK the user — NEVER guess)
  2. The company / opposite party name
  3. A clear description of the complaint
  4. What resolution the user wants
- If ANY of these are missing, ask the user first.
- Write the email body as a **formal legal notice** citing the Consumer Protection Act, 2019 where applicable.
- After you call `create_gmail_draft`, tell the user their email draft is ready for review.

**Email reading rules:**
- When the user asks to check their email for replies / updates, **immediately call `search_gmail`** — do NOT ask for clarification if the request is clear.
- Construct a targeted Gmail query using the filters above. For example, if the user says "check for replies from Amazon", use `from:amazon newer_than:7d`.
- If the user provides a specific email address, use it in the `from:` or `to:` filter.
- If search returns results, summarise the key emails clearly:
  - Sender, date, subject, and a brief summary of the content.
  - If the email is a reply to a complaint, highlight whether the company offered resolution or not.
- If you need to read a specific email in full, use `get_gmail_message` with the message ID from the search results.
- If no results are found, tell the user clearly and suggest broadening the search window.
"""


# ---------------------------------------------------------------------------
# Custom tool: case email history  (placeholder — executed manually in chat())
# ---------------------------------------------------------------------------

@tool
def get_case_emails_history() -> str:
    """Retrieve all complaint emails (drafts, sent, failed) for the current case
    from our records. Use this to check the status of previously drafted or sent emails."""
    return ""


# ---------------------------------------------------------------------------
# ChatService class
# ---------------------------------------------------------------------------

class ChatService:
    """Handles persistent, LLM-backed conversations tied to a case."""

    def __init__(self):
        self.supabase = _get_supabase()
        self.llm = None
        self.llm_with_tools = None
        if GOOGLE_API_KEY:
            self.llm = ChatGoogleGenerativeAI(
                model=LLM_MODEL,
                google_api_key=GOOGLE_API_KEY,
                temperature=0.7,
                max_output_tokens=1024,
            )
            # Combine Gmail toolkit tools + our custom history tool
            gmail_tools = email_service.get_tools_for_llm()
            all_tools = gmail_tools + [get_case_emails_history]
            if all_tools:
                try:
                    self.llm_with_tools = self.llm.bind_tools(all_tools)
                except Exception as e:
                    print(f"⚠️ [ChatService] Could not bind tools: {e}")

    # ------------------------------------------------------------------
    # Case (project) CRUD
    # ------------------------------------------------------------------

    def create_case(
        self,
        user_id: str,
        case_name: str = "New Consumer Complaint",
    ) -> Optional[str]:
        """Create a new user_case and return its id."""
        if not self.supabase:
            return None
        try:
            result = self.supabase.table("user_cases").insert({
                "user_id": user_id,
                "case_name": case_name,
                "case_type": "Consumer Complaint",
                "status": "pending",
                "complainant_name": "",
                "opposite_party_name": "",
            }).execute()
            if result.data:
                case_id = result.data[0]["id"]
                print(f"✅ [ChatService] Created case {case_id}")
                return case_id
        except Exception as e:
            print(f"❌ [ChatService] create_case error: {e}")
            traceback.print_exc()
        return None

    def get_case(self, case_id: str) -> Optional[dict]:
        """Fetch a case by ID."""
        if not self.supabase:
            return None
        try:
            result = (
                self.supabase.table("user_cases")
                .select("*")
                .eq("id", case_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    def list_user_cases(self, user_id: str) -> List[dict]:
        """List all cases for a user, newest first."""
        if not self.supabase:
            return []
        try:
            result = (
                self.supabase.table("user_cases")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return result.data or []
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Message persistence
    # ------------------------------------------------------------------

    def save_message(
        self,
        case_id: str,
        role: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> Optional[str]:
        """Insert a message row and return its id."""
        if not self.supabase:
            return None
        try:
            result = self.supabase.table("case_messages").insert({
                "case_id": case_id,
                "role": role,
                "content": content,
                "metadata": metadata or {},
            }).execute()
            if result.data:
                return result.data[0]["id"]
        except Exception as e:
            print(f"❌ [ChatService] save_message error: {e}")
        return None

    def get_messages(self, case_id: str) -> List[dict]:
        """Load all messages for a case in chronological order."""
        if not self.supabase:
            return []
        try:
            result = (
                self.supabase.table("case_messages")
                .select("id, role, content, metadata, created_at")
                .eq("case_id", case_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data or []
        except Exception as e:
            print(f"❌ [ChatService] get_messages error: {e}")
            return []

    # ------------------------------------------------------------------
    # Voice transcript persistence
    # ------------------------------------------------------------------

    def save_voice_transcript(
        self,
        case_id: str,
        original_transcript: str,
        english_translation: Optional[str] = None,
        language_code: Optional[str] = None,
    ) -> Optional[str]:
        """Store a voice transcript and return its id."""
        if not self.supabase:
            return None
        try:
            result = self.supabase.table("case_voice_transcripts").insert({
                "case_id": case_id,
                "original_transcript": original_transcript,
                "english_translation": english_translation,
                "language_code": language_code,
            }).execute()
            if result.data:
                return result.data[0]["id"]
        except Exception as e:
            print(f"❌ [ChatService] save_voice_transcript error: {e}")
        return None

    def get_voice_transcripts(self, case_id: str) -> List[dict]:
        """Load all voice transcripts for a case."""
        if not self.supabase:
            return []
        try:
            result = (
                self.supabase.table("case_voice_transcripts")
                .select("*")
                .eq("case_id", case_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data or []
        except Exception:
            return []

    # ------------------------------------------------------------------
    # LLM conversation
    # ------------------------------------------------------------------

    def _build_langchain_messages(self, db_messages: List[dict]) -> list:
        """Convert DB rows to LangChain message objects."""
        lc_messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for m in db_messages:
            if m["role"] == "user":
                lc_messages.append(HumanMessage(content=m["content"]))
            elif m["role"] == "assistant":
                lc_messages.append(AIMessage(content=m["content"]))
            elif m["role"] == "system":
                lc_messages.append(SystemMessage(content=m["content"]))
        return lc_messages

    async def chat(
        self,
        case_id: str,
        user_message: str,
        metadata: Optional[dict] = None,
    ) -> Tuple[Optional[str], Optional[dict], Optional[str]]:
        """
        Process a user message:
          1. Save user message
          2. Load full history
          3. Call LLM with tool-enabled model
          4. If tool call → execute, feed result back, get text reply
          5. Save assistant response
          6. Return (assistant_reply, email_draft_or_None, error)
        """
        if not self.llm:
            return None, None, "LLM not configured (GOOGLE_API_KEY missing)"

        # 1. Save user message
        self.save_message(case_id, "user", user_message, metadata)

        # 2. Load full history
        db_messages = self.get_messages(case_id)
        lc_messages = self._build_langchain_messages(db_messages)

        # 3. Call LLM (with tools bound) — loop to support multi-step tool use
        email_draft = None
        MAX_TOOL_ROUNDS = 5  # safety limit
        try:
            active_llm = self.llm_with_tools or self.llm
            response = await active_llm.ainvoke(lc_messages)

            rounds = 0
            while hasattr(response, "tool_calls") and response.tool_calls and rounds < MAX_TOOL_ROUNDS:
                rounds += 1
                # Append the AI message (carries the tool-call metadata)
                lc_messages.append(response)

                for tc in response.tool_calls:
                    tool_name = tc["name"]
                    args = tc["args"]

                    if tool_name == "create_gmail_draft":
                        # Execute the real Gmail tool
                        gmail_tool = email_service.get_tool_by_name("create_gmail_draft")
                        if gmail_tool:
                            tool_result = gmail_tool.invoke(args)
                        else:
                            tool_result = "Gmail not configured — draft not created in Gmail."

                        # Parse Gmail draft ID & persist to Supabase
                        gmail_draft_id = EmailService.parse_draft_id(str(tool_result))
                        to_list = args.get("to", [])
                        to_email = to_list[0] if isinstance(to_list, list) and to_list else str(to_list)
                        draft_row = email_service.save_draft_record(
                            case_id=case_id,
                            to_email=to_email,
                            subject=args.get("subject", ""),
                            body=args.get("message", ""),
                            gmail_draft_id=gmail_draft_id,
                        )
                        if draft_row:
                            email_draft = {
                                "id": draft_row["id"],
                                "to_email": draft_row["to_email"],
                                "subject": draft_row["subject"],
                                "body": draft_row["body"],
                                "status": draft_row["status"],
                            }
                        lc_messages.append(ToolMessage(
                            content=str(tool_result),
                            tool_call_id=tc["id"],
                        ))

                    elif tool_name == "search_gmail":
                        gmail_tool = email_service.get_tool_by_name("search_gmail")
                        if gmail_tool:
                            tool_result = gmail_tool.invoke(args)
                            print(f"🔍 [ChatService] search_gmail query={args.get('query','')} → {len(str(tool_result))} chars")
                        else:
                            tool_result = "Gmail not configured."
                        lc_messages.append(ToolMessage(
                            content=str(tool_result),
                            tool_call_id=tc["id"],
                        ))

                    elif tool_name == "get_gmail_message":
                        gmail_tool = email_service.get_tool_by_name("get_gmail_message")
                        if gmail_tool:
                            tool_result = gmail_tool.invoke(args)
                            print(f"📧 [ChatService] get_gmail_message id={args.get('message_id','')}")
                        else:
                            tool_result = "Gmail not configured."
                        lc_messages.append(ToolMessage(
                            content=str(tool_result),
                            tool_call_id=tc["id"],
                        ))

                    elif tool_name == "get_case_emails_history":
                        rows = email_service.get_case_emails(case_id)
                        summary = json.dumps([
                            {"to": r["to_email"], "subject": r["subject"],
                             "status": r["status"], "sent_at": r.get("sent_at")}
                            for r in rows
                        ]) if rows else "[]"
                        lc_messages.append(ToolMessage(
                            content=summary,
                            tool_call_id=tc["id"],
                        ))

                    else:
                        # Unknown tool — feed empty result
                        lc_messages.append(ToolMessage(
                            content="Tool not recognised.",
                            tool_call_id=tc["id"],
                        ))

                # Call LLM again — it may produce more tool calls or a text reply
                response = await active_llm.ainvoke(lc_messages)

            # Final response is now a text reply (no more tool calls)
            assistant_reply = _extract_text(response.content)

        except Exception as e:
            print(f"❌ [ChatService] LLM error: {e}")
            traceback.print_exc()
            return None, None, f"LLM error: {str(e)}"

        # 5. Save assistant response (with email draft ref in metadata)
        msg_meta = {"email_draft": email_draft} if email_draft else None
        self.save_message(case_id, "assistant", assistant_reply, msg_meta)

        return assistant_reply, email_draft, None

    async def get_or_create_case_and_chat(
        self,
        user_id: str,
        user_message: str,
        case_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Tuple[Optional[str], Optional[str], Optional[dict], Optional[str]]:
        """
        High-level helper:
          - Resolves or creates case_id
          - Calls chat()
          - Returns (case_id, assistant_reply, email_draft, error)
        """
        # Resolve case
        if case_id:
            case = self.get_case(case_id)
            if not case:
                return None, None, None, f"Case {case_id} not found"
        else:
            case_id = self.create_case(user_id)
            if not case_id:
                return None, None, None, "Failed to create case"

        reply, email_draft, error = await self.chat(case_id, user_message, metadata)
        return case_id, reply, email_draft, error


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

chat_service = ChatService()
