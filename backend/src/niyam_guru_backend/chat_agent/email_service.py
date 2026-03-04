"""
Email Service — Gmail API integration via LangChain GmailToolkit + Supabase persistence.

Uses OAuth2 credentials (credentials.json / token.json) to interact with
the Gmail API.  The LLM is only allowed to *draft* emails; actual sending
is gated behind an explicit user approval step.

All email activity is tracked in the `case_emails` Supabase table.
"""

import re
import traceback
from datetime import datetime, timezone
from typing import List, Optional

from langchain_core.tools import BaseTool
from supabase import Client, create_client

from ..config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    GMAIL_CREDENTIALS_FILE,
    GMAIL_TOKEN_FILE,
)


# ---------------------------------------------------------------------------
# Supabase helper
# ---------------------------------------------------------------------------

def _get_supabase() -> Optional[Client]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# EmailService
# ---------------------------------------------------------------------------

class EmailService:
    """Gmail toolkit wrapper + Supabase case_emails persistence."""

    def __init__(self):
        self.supabase = _get_supabase()
        self.toolkit = None
        self.api_resource = None
        self._all_tools: List[BaseTool] = []
        self._tools_for_llm: List[BaseTool] = []
        self._send_tool: Optional[BaseTool] = None
        self._init_gmail()

    # ------------------------------------------------------------------
    # Gmail initialisation
    # ------------------------------------------------------------------

    def _init_gmail(self):
        """Initialise the GmailToolkit.  Fails gracefully when creds are missing."""
        try:
            from langchain_google_community import GmailToolkit
            from langchain_google_community.gmail.utils import (
                build_resource_service,
                get_google_credentials,
            )

            credentials = get_google_credentials(
                token_file=GMAIL_TOKEN_FILE,
                scopes=["https://mail.google.com/"],
                client_secrets_file=GMAIL_CREDENTIALS_FILE,
            )
            self.api_resource = build_resource_service(credentials=credentials)
            self.toolkit = GmailToolkit(api_resource=self.api_resource)
            self._all_tools = self.toolkit.get_tools()

            # Expose draft, search and read to the LLM; sending is approval-gated.
            LLM_TOOL_NAMES = {"create_gmail_draft", "search_gmail", "get_gmail_message"}
            self._tools_for_llm = [
                t for t in self._all_tools if t.name in LLM_TOOL_NAMES
            ]
            self._send_tool = next(
                (t for t in self._all_tools if t.name == "send_gmail_message"),
                None,
            )
            print("✅ [EmailService] Gmail toolkit initialised")
        except Exception as e:
            print(f"⚠️  [EmailService] Gmail not configured: {e}")

    @property
    def is_configured(self) -> bool:
        return self.toolkit is not None

    def get_tools_for_llm(self) -> List[BaseTool]:
        """Return the subset of Gmail tools the LLM may call."""
        return list(self._tools_for_llm)

    def get_tool_by_name(self, name: str) -> Optional[BaseTool]:
        """Lookup any Gmail tool (including send) by name."""
        return next((t for t in self._all_tools if t.name == name), None)

    # ------------------------------------------------------------------
    # Supabase CRUD — case_emails
    # ------------------------------------------------------------------

    def save_draft_record(
        self,
        case_id: str,
        to_email: str,
        subject: str,
        body: str,
        gmail_draft_id: Optional[str] = None,
    ) -> Optional[dict]:
        """Persist an email draft record and return the full row."""
        if not self.supabase:
            return None
        try:
            result = self.supabase.table("case_emails").insert({
                "case_id": case_id,
                "direction": "outbound",
                "from_email": "",
                "to_email": to_email,
                "subject": subject,
                "body": body,
                "status": "pending_review",
                "metadata": {"gmail_draft_id": gmail_draft_id} if gmail_draft_id else {},
            }).execute()
            if result.data:
                print(f"✅ [EmailService] Draft record saved: {result.data[0]['id']}")
                return result.data[0]
        except Exception as e:
            print(f"❌ [EmailService] save_draft_record error: {e}")
            traceback.print_exc()
        return None

    def get_email(self, email_id: str) -> Optional[dict]:
        """Fetch a single email by ID."""
        if not self.supabase:
            return None
        try:
            result = (
                self.supabase.table("case_emails")
                .select("*")
                .eq("id", email_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    def update_email(self, email_id: str, updates: dict) -> Optional[dict]:
        """Update an email row."""
        if not self.supabase:
            return None
        try:
            result = (
                self.supabase.table("case_emails")
                .update(updates)
                .eq("id", email_id)
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception as e:
            print(f"❌ [EmailService] update_email error: {e}")
        return None

    def get_case_emails(self, case_id: str) -> List[dict]:
        """Get all emails for a case, chronological."""
        if not self.supabase:
            return []
        try:
            result = (
                self.supabase.table("case_emails")
                .select("*")
                .eq("case_id", case_id)
                .order("created_at", desc=False)
                .execute()
            )
            return result.data or []
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Approve & Send via Gmail API
    # ------------------------------------------------------------------

    def approve_and_send(self, email_id: str) -> tuple[bool, str]:
        """
        Send a pending_review / approved email via Gmail and update Supabase.
        Returns (success, user_message).
        """
        row = self.get_email(email_id)
        if not row:
            return False, "Email not found"

        if row["status"] not in ("pending_review", "approved"):
            return False, f"Email status is '{row['status']}' — cannot send"

        if not self._send_tool:
            # Gmail not configured — mock-mode
            self.update_email(email_id, {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
            })
            return True, "Marked as sent (Gmail not configured — mock mode)"

        try:
            result = self._send_tool.invoke({
                "message": row["body"],
                "to": row["to_email"],
                "subject": row["subject"],
            })
            self.update_email(email_id, {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "metadata": {
                    **(row.get("metadata") or {}),
                    "gmail_send_result": str(result),
                },
            })
            print(f"✅ [EmailService] Email {email_id} sent via Gmail: {result}")
            return True, "Email sent successfully via Gmail"

        except Exception as e:
            print(f"❌ [EmailService] Gmail send error: {e}")
            traceback.print_exc()
            self.update_email(email_id, {"status": "failed"})
            return False, f"Gmail send error: {str(e)}"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def parse_draft_id(tool_output: str) -> Optional[str]:
        """Extract the Gmail draft ID from `create_gmail_draft` output."""
        match = re.search(r"Draft Id:\s*(\S+)", tool_output)
        return match.group(1) if match else None


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

email_service = EmailService()
