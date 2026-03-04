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
from ..api.document_routes import (
    generate_index,
    generate_proforma,
    generate_affidavit,
    generate_memo_of_parties,
    generate_list_of_dates,
)


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

Your job is to **guide the user step-by-step** through the entire consumer complaint process — from understanding their issue, to generating filing documents, to sending legal notices via email. Think of yourself as a friendly but knowledgeable paralegal walking them through each stage.

### Overall Process (guide the user through these stages naturally)
1. **Understand the complaint** — listen, empathise, ask follow-up questions.
2. **Explain their rights** — cite CPA 2019 provisions relevant to their case.
3. **Collect details for filing** — progressively gather the information needed.
4. **Generate filing documents** — produce the 5 mandatory PDFs.
5. **Send legal notice email** — draft and send a pre-litigation notice to the opposite party.
6. **Follow up** — help them check for replies and advise on next steps.

You should proactively move the conversation forward through these stages. After finishing one stage, briefly explain what comes next and nudge the user along.

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

---

### Document Generation Capabilities

You have a tool to automatically generate 5 mandatory consumer complaint filing documents:
- `generate_filing_documents`: Generates **Index, Proforma, Affidavit, Memo of Parties, and List of Dates & Events** as PDF files, auto-filled with the case details.

The tool accepts these fields:
  - **complainant_name** — full name of the complainant
  - **complainant_father_husband_name** — S/o, D/o, W/o
  - **complainant_age** — age in years
  - **complainant_occupation** — occupation
  - **complainant_address** — full residential address
  - **complainant_phone** — phone number
  - **complainant_email** — email address
  - **op_name** — opposite party (company) name
  - **op_address** — opposite party address (registered office / customer care)
  - **op_phone** — opposite party phone (if known)
  - **case_category** — e.g. "E-COMMERCE", "CONSUMER DURABLES", "BANKING"
  - **sub_category** — e.g. "Online Shopping", "Mobile Phones"
  - **product_service_description** — description of the product / service
  - **purchase_date** — date of purchase (DD/MM/YYYY)
  - **purchase_amount** — amount paid (₹)
  - **payment_mode** — e.g. "UPI", "Credit Card", "Cash"
  - **invoice_number** — invoice / order number
  - **deficiency_type** — e.g. "Defective Product", "Deficient Service", "Unfair Trade Practice"
  - **date_of_deficiency** — when the deficiency was discovered (DD/MM/YYYY)
  - **grievance_description** — detailed description of the complaint
  - **relief_sought** — what relief the user wants (refund amount, compensation, replacement, etc.)
  - **forum_name** — e.g. "District Consumer Disputes Redressal Forum"
  - **state** — state where the cause of action arose
  - **district** — district where the cause of action arose

**Document generation — HOW TO GUIDE THE USER:**

Before generating documents, review what details you already have from the conversation and identify what's missing. Then:

1. **Show the user a summary** of what you already know and clearly list what's still needed. Present it like a checklist, e.g.:
   - ✅ Complainant name: Arjun Kumar
   - ✅ Opposite party: Meesho / Vendor XYZ
   - ❌ Your full address (needed for the complaint form)
   - ❌ Your father's/husband's name (needed for the affidavit)
   - ❌ The opposite party's address (needed for Memo of Parties)
   - ❌ Payment mode (UPI / card / cash?)
   - ❌ Order/invoice number
   …etc.

2. **Ask the user to provide the missing details.** Be specific about WHY each detail is needed (e.g., "Your full address is required for the complaint proforma and will appear on all documents.").

3. **If the user says they don't have certain details or wants to proceed anyway**, that's perfectly fine — generate the documents with whatever you have. Use empty string for missing fields. Tell the user which fields were left blank so they can fill them in by hand later.

4. **After generating**, tell the user:
   - Their 5 documents are ready for download
   - Which fields (if any) were left blank and need to be filled manually
   - That the affidavit MUST be printed, signed, and **notarized** before filing
   - Briefly explain the **next steps**: file at the appropriate Consumer Forum (District / State / National based on claim amount), pay the prescribed fee, and attach supporting evidence

5. **If the user asks to regenerate** with updated details, do so immediately.

---

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

**Email — HOW TO GUIDE THE USER:**

After the user has understood their complaint (or after documents are generated), proactively suggest sending a **pre-litigation legal notice** to the opposite party via email. Walk them through it:

1. **Explain what a legal notice is**: "Before filing a formal complaint, it's standard practice to send a legal notice to the company giving them 15-30 days to resolve the issue. This strengthens your case."

2. **Ask for the opposite party's email address**: "Do you have the company's customer care or grievance email address? For example, for Amazon India it's typically grievance-officer@amazon.in." NEVER guess email addresses — always ask.

3. **Draft the email**: Once you have the email address, call `create_gmail_draft` with a formal legal notice that:
   - Is addressed to the company by name
   - States the complainant's details
   - Describes the issue clearly
   - Cites relevant sections of the Consumer Protection Act, 2019
   - Demands specific relief (refund / replacement / compensation)
   - Gives a deadline (15 days is standard)
   - States that a formal complaint will be filed if unresolved

4. **After drafting**, tell the user: "I've created a draft in your Gmail. Please review it, make any changes you'd like, and send it. You'll find it in your Gmail Drafts folder."

5. **Offer to check for replies later**: "After sending, you can come back and ask me to check if they've replied. I can search your inbox for their response."

**Email reading rules:**
- When the user asks to check their email for replies / updates, **immediately call `search_gmail`** — do NOT ask for clarification if the request is clear.
- Construct a targeted Gmail query using the filters above.
- If search returns results, summarise the key emails clearly: sender, date, subject, and brief content summary. Highlight whether the company offered resolution or not.
- If you need to read a specific email in full, use `get_gmail_message` with the message ID.
- If no results are found, tell the user clearly and suggest broadening the search window or waiting a few more days.

---

### After Everything — Next Steps Guidance

Once documents are generated and legal notice is sent, proactively advise the user on how to proceed:
1. **Wait 15-30 days** for the company to respond to the legal notice
2. If no resolution, **file the complaint** at the appropriate Consumer Forum:
   - Up to ₹1 crore → District Consumer Disputes Redressal Forum
   - ₹1 crore – ₹10 crore → State Consumer Disputes Redressal Commission
   - Above ₹10 crore → National Consumer Disputes Redressal Commission
3. **Documents to carry**: The 5 generated documents (signed & notarized affidavit), copies of evidence (bills, screenshots, correspondence), copy of the legal notice sent, and proof of delivery/sending
4. **Filing fee** varies by claim amount — guide them to check their state's fee schedule
5. Offer to help with anything else — checking email replies, regenerating documents, etc.
"""


# ---------------------------------------------------------------------------
# Custom tool: case email history  (placeholder — executed manually in chat())
# ---------------------------------------------------------------------------

@tool
def get_case_emails_history() -> str:
    """Retrieve all complaint emails (drafts, sent, failed) for the current case
    from our records. Use this to check the status of previously drafted or sent emails."""
    return ""


@tool
def generate_filing_documents(
    complainant_name: str = "",
    complainant_father_husband_name: str = "",
    complainant_age: str = "",
    complainant_occupation: str = "",
    complainant_address: str = "",
    complainant_phone: str = "",
    complainant_email: str = "",
    op_name: str = "",
    op_address: str = "",
    op_phone: str = "",
    case_category: str = "",
    sub_category: str = "",
    product_service_description: str = "",
    purchase_date: str = "",
    purchase_amount: str = "",
    payment_mode: str = "",
    invoice_number: str = "",
    deficiency_type: str = "",
    date_of_deficiency: str = "",
    grievance_description: str = "",
    relief_sought: str = "",
    forum_name: str = "District Consumer Disputes Redressal Forum",
    state: str = "",
    district: str = "",
) -> str:
    """Generate 5 mandatory consumer complaint filing documents (Index, Proforma,
    Affidavit, Memo of Parties, List of Dates & Events) as PDFs auto-filled with
    the case details gathered during the conversation. Call this when the user asks
    to generate, prepare, or create filing documents."""
    return ""  # Placeholder — actual execution happens in chat()


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
                max_output_tokens=2048,
            )
            # Combine Gmail toolkit tools + our custom tools
            gmail_tools = email_service.get_tools_for_llm()
            all_tools = gmail_tools + [get_case_emails_history, generate_filing_documents]
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
    ) -> Tuple[Optional[str], Optional[dict], Optional[dict], Optional[str]]:
        """
        Process a user message:
          1. Save user message
          2. Load full history
          3. Call LLM with tool-enabled model
          4. If tool call → execute, feed result back, get text reply
          5. Save assistant response
          6. Return (assistant_reply, email_draft, document_pack, error)
        """
        if not self.llm:
            return None, None, None, "LLM not configured (GOOGLE_API_KEY missing)"

        # 1. Save user message
        self.save_message(case_id, "user", user_message, metadata)

        # 2. Load full history
        db_messages = self.get_messages(case_id)
        lc_messages = self._build_langchain_messages(db_messages)

        # 3. Call LLM (with tools bound) — loop to support multi-step tool use
        email_draft = None
        document_pack = None
        MAX_TOOL_ROUNDS = 5  # safety limit
        try:
            active_llm = self.llm_with_tools or self.llm
            print(f"🤖 [ChatService] Invoking LLM with {len(lc_messages)} messages, tools_bound={self.llm_with_tools is not None}")
            response = await active_llm.ainvoke(lc_messages)
            print(f"🤖 [ChatService] LLM response: content_len={len(str(response.content))}, tool_calls={len(response.tool_calls) if hasattr(response, 'tool_calls') and response.tool_calls else 0}")
            print(f"🤖 [ChatService] Response content preview: {str(response.content)[:200]}")

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

                    elif tool_name == "generate_filing_documents":
                        # Build form_data dict from tool call args
                        form_data = {
                            "complainantName": args.get("complainant_name", ""),
                            "complainantFatherHusbandName": args.get("complainant_father_husband_name", ""),
                            "complainantAge": args.get("complainant_age", ""),
                            "complainantOccupation": args.get("complainant_occupation", ""),
                            "complainantAddress": args.get("complainant_address", ""),
                            "complainantPhone": args.get("complainant_phone", ""),
                            "complainantEmail": args.get("complainant_email", ""),
                            "opName": args.get("op_name", ""),
                            "opAddress": args.get("op_address", ""),
                            "opPhone": args.get("op_phone", ""),
                            "caseCategory": args.get("case_category", ""),
                            "subCategory": args.get("sub_category", ""),
                            "productServiceDescription": args.get("product_service_description", ""),
                            "purchaseDate": args.get("purchase_date", ""),
                            "purchaseAmount": args.get("purchase_amount", ""),
                            "paidAsConsideration": args.get("purchase_amount", ""),
                            "paymentMode": args.get("payment_mode", ""),
                            "invoiceNumber": args.get("invoice_number", ""),
                            "deficiencyType": args.get("deficiency_type", ""),
                            "dateOfDeficiency": args.get("date_of_deficiency", ""),
                            "grievanceDescription": args.get("grievance_description", ""),
                            "reliefSought": args.get("relief_sought", ""),
                            "forumName": args.get("forum_name", "District Consumer Disputes Redressal Forum"),
                            "stateOfCauseOfAction": args.get("state", ""),
                            "districtOfCauseOfAction": args.get("district", ""),
                            "complaintYear": str(datetime.now().year),
                        }
                        try:
                            docs = {
                                "index":           generate_index(form_data),
                                "proforma":        generate_proforma(form_data),
                                "affidavit":       generate_affidavit(form_data),
                                "memo_of_parties": generate_memo_of_parties(form_data),
                                "list_of_dates":   generate_list_of_dates(form_data),
                            }
                            safe_name = "".join(
                                c if c.isalnum() or c in " _-" else ""
                                for c in form_data.get("complainantName", "case")
                            ).strip() or "case"
                            year = form_data.get("complaintYear", str(datetime.now().year))
                            doc_names = {
                                "index":           f"Index_{safe_name}_{year}.pdf",
                                "proforma":        f"Proforma_{safe_name}_{year}.pdf",
                                "affidavit":       f"Affidavit_{safe_name}_{year}.pdf",
                                "memo_of_parties": f"MemoOfParties_{safe_name}_{year}.pdf",
                                "list_of_dates":   f"ListOfDates_{safe_name}_{year}.pdf",
                            }
                            document_pack = {
                                "documents": docs,
                                "document_names": doc_names,
                            }
                            tool_result = "Successfully generated 5 filing documents: Index, Proforma, Affidavit, Memo of Parties, and List of Dates & Events."
                            print(f"📄 [ChatService] Generated 5 filing documents for {safe_name}")
                        except Exception as doc_err:
                            tool_result = f"Error generating documents: {str(doc_err)}"
                            print(f"❌ [ChatService] Document generation error: {doc_err}")

                        lc_messages.append(ToolMessage(
                            content=tool_result,
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
            print(f"🤖 [ChatService] Final reply length={len(assistant_reply)}, preview='{assistant_reply[:200]}'")

        except Exception as e:
            print(f"❌ [ChatService] LLM error: {e}")
            traceback.print_exc()
            return None, None, None, f"LLM error: {str(e)}"

        # 5. Save assistant response (with email draft ref in metadata)
        msg_meta = {}
        if email_draft:
            msg_meta["email_draft"] = email_draft
        if document_pack:
            # Store only the document_names in DB metadata (not the huge base64)
            msg_meta["document_pack"] = {"document_names": document_pack["document_names"]}

        # Only persist non-empty replies
        if assistant_reply and assistant_reply.strip():
            self.save_message(case_id, "assistant", assistant_reply, msg_meta if msg_meta else None)
        else:
            print("⚠️ [ChatService] Skipping save — empty assistant reply")

        return assistant_reply, email_draft, document_pack, None

    async def get_or_create_case_and_chat(
        self,
        user_id: str,
        user_message: str,
        case_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Tuple[Optional[str], Optional[str], Optional[dict], Optional[dict], Optional[str]]:
        """
        High-level helper:
          - Resolves or creates case_id
          - Calls chat()
          - Returns (case_id, assistant_reply, email_draft, document_pack, error)
        """
        # Resolve case
        if case_id:
            case = self.get_case(case_id)
            if not case:
                return None, None, None, None, f"Case {case_id} not found"
        else:
            case_id = self.create_case(user_id)
            if not case_id:
                return None, None, None, None, "Failed to create case"

        reply, email_draft, document_pack, error = await self.chat(case_id, user_message, metadata)
        return case_id, reply, email_draft, document_pack, error


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

chat_service = ChatService()
