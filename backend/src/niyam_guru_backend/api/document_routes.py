"""
Document Generation Routes — Template-Based

Loads PDF templates from data/templates/ and fills placeholders with
consumer complaint form data using PyMuPDF redaction + text insertion.

Templates:
  1. Index.pdf                     → Index / List of Documents
  2. Proforma.pdf                  → Complaint Proforma
  3. Affidavict.pdf                → Complaint with Notarized Affidavit
  4. Memo of parties.pdf           → Memo of Parties
  5. List of dates and events.pdf  → List of Dates and Events
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Tuple, Optional
import fitz  # PyMuPDF
import base64
import io
from datetime import date, datetime
from ..config.settings import DATA_DIR

router = APIRouter(prefix="/api/documents", tags=["documents"])

TEMPLATE_DIR = DATA_DIR / "templates"

# ─────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────

class GenerateDocumentsRequest(BaseModel):
    form_data: Dict[str, Any]


class GenerateDocumentsResponse(BaseModel):
    documents: Dict[str, str]       # key → base64 PDF
    document_names: Dict[str, str]  # key → filename


# ─────────────────────────────────────────────────────────────
# Constants & helpers
# ─────────────────────────────────────────────────────────────

FONT      = "helv"   # Helvetica — closest built-in to Arial
FONT_BOLD = "hebo"   # Helvetica-Bold
PAGE_W    = 595
MARGIN_L  = 72
MARGIN_R  = 72
PAGE_RIGHT = PAGE_W - MARGIN_R  # 523 — usable right edge


def _val(form: Dict, key: str, default: str = "N/A") -> str:
    """Safe access with a blank/None guard."""
    v = form.get(key, "")
    return str(v).strip() if v else default


def _open_template(name: str) -> fitz.Document:
    path = TEMPLATE_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    return fitz.open(str(path))


def _doc_to_b64(doc: fitz.Document) -> str:
    buf = io.BytesIO()
    buf.write(doc.tobytes())
    doc.close()
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _today() -> str:
    return date.today().strftime("%d/%m/%Y")


# ─────────────────────────────────────────────────────────────
# Core redaction engine
# ─────────────────────────────────────────────────────────────

def _apply_edits(page: fitz.Page, edits: List[Tuple]) -> None:
    """
    Apply text replacements on a PDF page using redaction.

    Each edit is a 5-tuple:
      (fitz.Rect, replacement_str, fontsize, fontname, align)

    Steps:
      1. Mark all rects as redaction annotations (white fill).
      2. Apply redactions once — physically removes old text.
      3. Insert replacement text — uses insert_text for single-line
         fields (tight rects) and insert_textbox for multi-line blocks.
    """
    edits = [e for e in edits if e is not None]
    if not edits:
        return

    # 1 — queue all redactions
    for rect, _, _, _, _ in edits:
        page.add_redact_annot(rect, fill=(1, 1, 1))

    # 2 — apply in one pass
    page.apply_redactions()

    # 3 — write replacement text
    MULTILINE_THRESHOLD = 25  # rects taller than this use textbox
    for rect, text, fs, fn, align in edits:
        if not text or not text.strip():
            continue
        is_multiline = ("\n" in text) or (rect.height > MULTILINE_THRESHOLD)
        if is_multiline:
            # Ensure textbox rect has adequate height
            min_h = fs + 6
            ins_rect = fitz.Rect(
                rect.x0, rect.y0, rect.x1,
                max(rect.y1, rect.y0 + min_h),
            )
            page.insert_textbox(
                ins_rect, text, fontname=fn, fontsize=fs,
                align=align, color=(0, 0, 0),
            )
        else:
            # Single-line: insert_text at baseline = y0 + fontsize
            page.insert_text(
                fitz.Point(rect.x0, rect.y0 + fs),
                text, fontname=fn, fontsize=fs, color=(0, 0, 0),
            )


def _sr(page, search, replacement, occ=0, fs=11.0, fn=FONT,
        align=fitz.TEXT_ALIGN_LEFT, ext_r=None, ext_d=None):
    """
    Search-and-Replace helper.  Returns an edit tuple (or None).

    occ     — which occurrence (0-based) to target
    ext_r   — extend rect right edge to this x value
    ext_d   — extend rect bottom edge to this y value
    """
    rects = page.search_for(search)
    if occ < len(rects):
        r = rects[occ]
        x1 = ext_r if ext_r is not None else r.x1
        y1 = ext_d if ext_d is not None else r.y1
        return (fitz.Rect(r.x0, r.y0, x1, y1), replacement, fs, fn, align)
    return None


def _rect(x0, y0, x1, y1, text, fs=11.0, fn=FONT,
          align=fitz.TEXT_ALIGN_LEFT):
    """Build an edit tuple from explicit coordinates."""
    return (fitz.Rect(x0, y0, x1, y1), text, fs, fn, align)


# ─────────────────────────────────────────────────────────────
# 1.  Memo of Parties
# ─────────────────────────────────────────────────────────────

def generate_memo_of_parties(form: Dict) -> str:
    doc = _open_template("Memo of parties.pdf")
    page = doc[0]

    district = _val(form, "districtName",
                    _val(form, "districtOfCauseOfAction"))

    # ── Complainant ──
    name  = _val(form, "complainantName")
    addr  = ", ".join(
        p for p in [
            _val(form, "complainantAddress", ""),
            _val(form, "complainantCity", ""),
            _val(form, "complainantState", ""),
            _val(form, "complainantPin", ""),
        ] if p and p != "N/A"
    )
    phone = _val(form, "complainantPhone", "")
    email = _val(form, "complainantEmail", "")
    phone_email = ", ".join(
        p for p in [phone, email] if p and p != "N/A"
    )

    # ── Opposite Party ──
    op_name = _val(form, "opName")
    op_addr = ", ".join(
        p for p in [
            _val(form, "opAddress", ""),
            _val(form, "opCity", ""),
            _val(form, "opState", ""),
            _val(form, "opPin", ""),
        ] if p and p != "N/A"
    )
    op_phone = _val(form, "opPhone", "")
    op_email = _val(form, "opEmail", "")
    op_phone_email = ", ".join(
        p for p in [op_phone, op_email] if p and p != "N/A"
    )
    op_cat = _val(form, "opCategory", "")

    edits: list = []

    # District
    edits.append(_sr(page, "DISTRICT_____________",
                     f"DISTRICT: {district}", ext_r=PAGE_RIGHT))

    # Complainant details
    edits.append(_sr(page, "(Name of the Complainant)",
                     name, ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Address of the Complainant)",
                     addr or "N/A", ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Phone Number & Email ID)",
                     phone_email or "N/A", occ=0, ext_r=PAGE_RIGHT))

    # Opposite Party details
    edits.append(_sr(page, "1. (Name of the Opposite Party 1)",
                     f"1. {op_name}", ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Designation, if applicable)",
                     op_cat if op_cat != "N/A" else "", occ=0,
                     ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Full Address)",
                     op_addr or "N/A", occ=0, ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Phone Number & Email ID)",
                     op_phone_email or "N/A", occ=1, ext_r=PAGE_RIGHT))

    # OP 2 placeholders — clear them
    edits.append(_sr(page, "2. (Name of the Opposite Party 2, if any)",
                     "", ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Designation, if applicable)",
                     "", occ=1, ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Full Address)",
                     "", occ=1, ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "(Phone Number & Email ID)",
                     "", occ=2, ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "*(Add more parties if necessary.)*",
                     ""))

    # Place and Date
    place = _val(form, "districtOfCauseOfAction",
                 _val(form, "districtName", ""))
    edits.append(_sr(page, "PLACE: _________",
                     f"PLACE: {place}", ext_r=PAGE_RIGHT))
    edits.append(_sr(page, "DATE: _________",
                     f"DATE: {_today()}", ext_r=PAGE_RIGHT))

    _apply_edits(page, edits)
    return _doc_to_b64(doc)


# ─────────────────────────────────────────────────────────────
# 2.  Index / List of Documents
# ─────────────────────────────────────────────────────────────

def generate_index(form: Dict) -> str:
    doc = _open_template("Index.pdf")
    page = doc[0]

    district = _val(form, "districtName",
                    _val(form, "districtOfCauseOfAction"))
    name  = _val(form, "complainantName", "Complainant")
    addr  = _val(form, "complainantAddress", "")
    op_name = _val(form, "opName", "Opposite Party")
    op_addr = _val(form, "opAddress", "")

    complainant_line = f"{name}, {addr}    Complainant" if addr and addr != "N/A" else f"{name}    Complainant"
    op_line = f"{op_name}, {op_addr}    Opposite Parties" if op_addr and op_addr != "N/A" else f"{op_name}    Opposite Parties"

    edits: list = []

    edits.append(_sr(page, "DISTRICT_____________",
                     f"DISTRICT: {district}", ext_r=PAGE_RIGHT))
    edits.append(_sr(
        page,
        "(Name and address of the complainant)    complainant",
        complainant_line, ext_r=PAGE_RIGHT,
    ))
    edits.append(_sr(
        page,
        "(Name and address of the opposite party or parties)    Opposite Parties",
        op_line, ext_r=PAGE_RIGHT,
    ))

    _apply_edits(page, edits)
    return _doc_to_b64(doc)


# ─────────────────────────────────────────────────────────────
# 3.  Proforma
# ─────────────────────────────────────────────────────────────

def generate_proforma(form: Dict) -> str:
    doc = _open_template("Proforma.pdf")
    page0 = doc[0]
    page1 = doc[1]

    district  = _val(form, "districtName",
                     _val(form, "districtOfCauseOfAction"))
    comp_no   = _val(form, "complaintNumber", "______")
    comp_year = _val(form, "complaintYear", str(date.today().year))

    # ── Page 0 edits ──
    edits0: list = []

    edits0.append(_sr(page0, "DISTRICT_____________",
                      f"DISTRICT: {district}", ext_r=PAGE_RIGHT))
    edits0.append(_sr(
        page0, "Consumer Complaint No.________ of_________",
        f"Consumer Complaint No. {comp_no} of {comp_year}",
        fs=13.0, fn=FONT_BOLD,
    ))

    # All _______________ on page 0 — sorted top-to-bottom
    blanks0 = page0.search_for("_______________")
    blanks0.sort(key=lambda r: (r.y0, r.x0))

    # Ordered field values matching the template's top-to-bottom layout:
    #   Name, Address, Mobile, Landline, Email,
    #   Total Amount Paid,
    #   Page No (ref), Para No (ref),
    #   Cause of Action Date
    page0_vals = [
        _val(form, "complainantName"),
        ", ".join(p for p in [
            _val(form, "complainantAddress", ""),
            _val(form, "complainantCity", ""),
            _val(form, "complainantState", ""),
            _val(form, "complainantPin", ""),
        ] if p and p != "N/A"),
        _val(form, "complainantPhone"),
        "",                                          # Landline
        _val(form, "complainantEmail"),
        _val(form, "purchaseAmount",
             _val(form, "paidAsConsideration")),      # Total Amount
        "",                                          # Page No ref
        "",                                          # Para No ref
        _val(form, "dateOfCauseOfAction",
             _val(form, "dateOfDeficiency")),          # Cause of Action
    ]

    for i, r in enumerate(blanks0):
        val = page0_vals[i] if i < len(page0_vals) else ""
        edits0.append(
            (fitz.Rect(r.x0, r.y0, PAGE_RIGHT, r.y1), val, 11.0,
             FONT, fitz.TEXT_ALIGN_LEFT)
        )

    # Replace instruction-style text in the details column to show
    # actual values.  These fields don't have ___ blanks — they have
    # descriptive placeholder text.
    case_cat = f"{_val(form, 'caseCategory')} — {_val(form, 'subCategory')}"
    edits0.append(_sr(
        page0,
        "Case Category (e.g., Housing, Insurance,",
        case_cat, ext_r=PAGE_RIGHT, ext_d=None,
    ))
    # Clear the continuation lines for the category description
    edits0.append(_sr(page0, "Medical, etc.) (Refer to enclosed", ""))
    edits0.append(_sr(page0, "Category List)", ""))

    relief = _val(form, "reliefSought", "")
    edits0.append(_sr(
        page0, "Refund/Possession/Return of Principal",
        relief[:80] if relief and relief != "N/A" else "",
        ext_r=PAGE_RIGHT,
    ))
    edits0.append(_sr(page0, "Amount/Interest (For Housing Category)", ""))

    # ── Page 1 edits ──
    edits1: list = []

    blanks1 = page1.search_for("_______________")
    blanks1.sort(key=lambda r: (r.y0, r.x0))

    #   OP Name, OP Address, OP Mobile, OP Landline, OP Email,
    #   Advocate Name, Address, Mobile, Landline, Email
    op_addr = ", ".join(p for p in [
        _val(form, "opAddress", ""),
        _val(form, "opCity", ""),
        _val(form, "opState", ""),
        _val(form, "opPin", ""),
    ] if p and p != "N/A")

    page1_vals = [
        _val(form, "opName"),
        op_addr,
        _val(form, "opPhone"),
        "",                          # OP Landline
        _val(form, "opEmail"),
        "",                          # Advocate Name
        "",                          # Advocate Address
        "",                          # Advocate Mobile
        "",                          # Advocate Landline
        "",                          # Advocate Email
    ]

    for i, r in enumerate(blanks1):
        val = page1_vals[i] if i < len(page1_vals) else ""
        edits1.append(
            (fitz.Rect(r.x0, r.y0, PAGE_RIGHT, r.y1), val, 11.0,
             FONT, fitz.TEXT_ALIGN_LEFT)
        )

    _apply_edits(page0, edits0)
    _apply_edits(page1, edits1)
    return _doc_to_b64(doc)


# ─────────────────────────────────────────────────────────────
# 4.  List of Dates and Events
# ─────────────────────────────────────────────────────────────

def _build_events(form: Dict) -> list[tuple[str, str]]:
    """Assemble a chronological event list from form data."""
    events: list[tuple[str, str]] = []

    purchase_date    = _val(form, "purchaseDate", "")
    deficiency_date  = _val(form, "dateOfDeficiency", "")
    prior_date       = _val(form, "priorComplaintDate", "")
    cause_date       = _val(form, "dateOfCauseOfAction", "")

    prod_desc  = _val(form, "productServiceDescription", "the product/service")
    amount     = _val(form, "purchaseAmount",
                      _val(form, "paidAsConsideration", ""))
    op_name    = _val(form, "opName", "the Opposite Party")
    deficiency = _val(form, "deficiencyType", "deficiency")
    grievance  = _val(form, "grievanceDescription", "")
    prior_det  = _val(form, "priorComplaintDetails", "")

    if purchase_date and purchase_date != "N/A":
        desc = f"Purchased {prod_desc} from {op_name}"
        if amount and amount != "N/A":
            desc += f" for Rs. {amount}"
        desc += "."
        events.append((purchase_date, desc))

    if amount and amount != "N/A" and purchase_date and purchase_date != "N/A":
        events.append((purchase_date,
                       f"Payment of Rs. {amount} made to {op_name}."))

    if deficiency_date and deficiency_date != "N/A":
        desc = f"{deficiency} noticed/occurred."
        if grievance and grievance != "N/A":
            short = grievance[:180] + ("..." if len(grievance) > 180 else "")
            desc += f" {short}"
        events.append((deficiency_date, desc))

    if prior_date and prior_date != "N/A":
        desc = "Complainant lodged complaint with the Opposite Party."
        if prior_det and prior_det != "N/A":
            desc += f" ({prior_det[:120]})"
        events.append((prior_date, desc))

    if cause_date and cause_date != "N/A":
        events.append((cause_date,
                       "Cause of action arose as stated in the complaint."))

    events.append((_today(),
                   "Consumer Complaint filed before the Commission."))

    # Sort by parsed date
    def _sort_key(ev):
        d = ev[0]
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(d, fmt).strftime("%Y%m%d")
            except ValueError:
                pass
        return d

    return sorted(events, key=_sort_key)


def generate_list_of_dates(form: Dict) -> str:
    doc = _open_template("List of dates and events.pdf")
    page = doc[0]

    district  = _val(form, "districtName",
                     _val(form, "districtOfCauseOfAction"))
    name      = _val(form, "complainantName", "Complainant")
    addr      = _val(form, "complainantAddress", "")
    op_name   = _val(form, "opName", "Opposite Party")
    op_addr   = _val(form, "opAddress", "")

    complainant_line = (
        f"{name}, {addr}    Complainant"
        if addr and addr != "N/A"
        else f"{name}    Complainant"
    )
    op_line = (
        f"{op_name}, {op_addr}    Opposite Parties"
        if op_addr and op_addr != "N/A"
        else f"{op_name}    Opposite Parties"
    )

    # ── Header edits ──
    header_edits: list = []
    header_edits.append(_sr(page, "DISTRICT_____________",
                            f"DISTRICT: {district}", ext_r=PAGE_RIGHT))
    header_edits.append(_sr(
        page,
        "(Name and address of the complainant)    complainant",
        complainant_line, ext_r=PAGE_RIGHT,
    ))
    header_edits.append(_sr(
        page,
        "(Name and address of the opposite party or parties)    Opposite Parties",
        op_line, ext_r=PAGE_RIGHT,
    ))

    # ── Build events ──
    events = _build_events(form)

    # The template has 10 rows.  Each row has:
    #   Sr No  @ x≈77    Date  @ x≈221    Event  @ x≈365
    # Row y-positions (from inspection):
    ROW_Y = [277, 316, 355, 381, 420, 458, 497, 523, 549, 575]
    ROW_H = 35   # approximate row height in the template
    DATE_X0 = 221
    DATE_X1 = 360
    EVT_X0  = 365
    EVT_X1  = PAGE_RIGHT
    SR_X0   = 77
    SR_X1   = 120

    # Build row edits — redact old placeholder content, insert actual events
    row_edits: list = []
    for idx, y in enumerate(ROW_Y):
        if idx < len(events):
            evt_date, evt_desc = events[idx]
            row_edits.append(_rect(SR_X0, y - 5, SR_X1, y + ROW_H,
                                   str(idx + 1), 11.0, FONT))
            row_edits.append(_rect(DATE_X0, y - 5, DATE_X1, y + ROW_H,
                                   evt_date, 11.0, FONT))
            row_edits.append(_rect(EVT_X0, y - 5, EVT_X1, y + ROW_H,
                                   evt_desc, 9.0, FONT))
        else:
            # Clear unused template rows
            row_edits.append(_rect(SR_X0, y - 5, SR_X1, y + ROW_H, ""))
            row_edits.append(_rect(DATE_X0, y - 5, DATE_X1, y + ROW_H, ""))
            row_edits.append(_rect(EVT_X0, y - 5, EVT_X1, y + ROW_H, ""))

    _apply_edits(page, header_edits + row_edits)

    return _doc_to_b64(doc)


# ─────────────────────────────────────────────────────────────
# 5.  Affidavit / Complaint with Notarized Affidavit
# ─────────────────────────────────────────────────────────────

def _affidavit_section_content(form: Dict) -> Dict[str, str]:
    """
    Generate the actual content for each numbered section in the
    complaint based on form data.
    """
    name      = _val(form, "complainantName", "__________________")
    father    = _val(form, "complainantFatherHusbandName", "__________________")
    age       = _val(form, "complainantAge", "__")
    occ       = _val(form, "complainantOccupation", "")
    addr      = _val(form, "complainantAddress", "")
    city      = _val(form, "complainantCity", "")
    state     = _val(form, "complainantState",
                     _val(form, "stateOfCauseOfAction", ""))

    op_name   = _val(form, "opName", "__________________")
    op_addr   = _val(form, "opAddress", "")

    product   = _val(form, "productServiceDescription", "the product/service")
    pdate     = _val(form, "purchaseDate", "(date)")
    amount    = _val(form, "purchaseAmount",
                     _val(form, "paidAsConsideration", ""))
    deficiency_type = _val(form, "deficiencyType", "deficiency in service")
    grievance = _val(form, "grievanceDescription", "")
    relief    = _val(form, "reliefSought", "")
    prior     = _val(form, "priorComplaintDetails", "")

    full_addr = ", ".join(p for p in [addr, city, state] if p and p != "N/A")

    # Section 1: Introduction
    s1 = (
        f"The Complainant, {name}, S/o / D/o / W/o {father}, "
        f"aged {age} years, Occupation: {occ}, "
        f"residing at {full_addr}, "
        f"is a consumer within the meaning of Section 2(7) of the "
        f"Consumer Protection Act, 2019. "
        f"The Opposite Party, {op_name}, located at {op_addr}, "
        f"is responsible for the deficiency in service / unfair trade "
        f"practices as alleged in this complaint."
    )

    # Section 2: Transaction
    s2 = (
        f"The Complainant purchased / availed {product} from the "
        f"Opposite Party on {pdate}. "
    )
    if amount and amount != "N/A":
        s2 += f"The consideration paid was Rs. {amount}. "
    s2 += "Copies of bill/receipt/agreement are attached as Annexure."

    # Section 3: Nature of Complaint
    s3 = (
        f"The Opposite Party has engaged in {deficiency_type}, "
        f"which is in violation of the Consumer Protection Act, 2019. "
    )
    if grievance and grievance != "N/A":
        s3 += grievance
    else:
        s3 += (
            "The Complainant has suffered financial loss and mental agony "
            "due to the Opposite Party's actions."
        )

    # Section 4: History of Attempts for Redressal
    s4 = "The Complainant made several attempts to resolve the issue. "
    if prior and prior != "N/A":
        s4 += prior + " "
    s4 += (
        "However, despite repeated efforts, the Opposite Party has failed "
        "to redress the grievance. Copies of correspondence are enclosed."
    )

    # Section 5: Relief Sought
    s5 = "In light of the facts mentioned, the Complainant humbly prays for the following relief(s):\n"
    if relief and relief != "N/A":
        s5 += relief
    else:
        if amount and amount != "N/A":
            s5 += f"1. Refund of Rs. {amount} with interest.\n"
        s5 += "2. Compensation for mental agony and harassment.\n"
        s5 += "3. Litigation costs.\n"
        s5 += "4. Any other relief deemed fit by this Hon'ble Commission."

    # Section 6: Prayer
    s6 = (
        "The Complainant requests this Hon'ble Commission to grant the "
        "relief(s) as sought above and take appropriate action against the "
        "Opposite Party under the Consumer Protection Act, 2019."
    )

    return {
        "section1": s1,
        "section2": s2,
        "section3": s3,
        "section4": s4,
        "section5": s5,
        "section6": s6,
    }


def generate_affidavit(form: Dict) -> str:
    doc = _open_template("Affidavict.pdf")

    district  = _val(form, "districtName",
                     _val(form, "districtOfCauseOfAction"))
    name      = _val(form, "complainantName", "Complainant")
    addr      = _val(form, "complainantAddress", "")
    op_name   = _val(form, "opName", "Opposite Party")
    op_addr   = _val(form, "opAddress", "")

    complainant_line = (
        f"{name}, {addr}    Complainant"
        if addr and addr != "N/A"
        else f"{name}    Complainant"
    )
    op_line = (
        f"{op_name}, {op_addr}    Opposite Parties"
        if op_addr and op_addr != "N/A"
        else f"{op_name}    Opposite Parties"
    )

    sections = _affidavit_section_content(form)

    # ───── Page 0 ─────
    # Strategy: replace header placeholders via search, then redact the
    # ENTIRE section-content area (y=280–720) and re-insert headings + content.
    p0 = doc[0]
    header_edits: list = []

    header_edits.append(_sr(p0, "DISTRICT_____________",
                            f"DISTRICT: {district}", ext_r=PAGE_RIGHT))
    header_edits.append(_sr(
        p0,
        "(Name and address of the complainant)    complainant",
        complainant_line, ext_r=PAGE_RIGHT,
    ))
    header_edits.append(_sr(
        p0,
        "(Name and address of the opposite party or parties)    Opposite Parties",
        op_line, ext_r=PAGE_RIGHT,
    ))

    # Large-area redaction: everything below the "COMPLAINT UNDER SECTION 35"
    # heading (y≈246) through to the page bottom.  We keep the heading itself.
    # Use full page width to catch any text extending into margins.
    content_clear = _rect(0, 270, PAGE_W, 842, "")
    all_p0 = header_edits + [content_clear]
    _apply_edits(p0, all_p0)

    # Re-insert section headings (bold) and content (normal)
    # Positions matched from the original template inspection.
    _ins = p0.insert_text  # shorthand

    _ins(fitz.Point(MARGIN_L, 289 + 11), "1. INTRODUCTION.",
         fontname=FONT_BOLD, fontsize=11, color=(0, 0, 0))
    p0.insert_textbox(fitz.Rect(MARGIN_L, 305, PAGE_RIGHT, 400),
                      sections["section1"],
                      fontname=FONT, fontsize=10, color=(0, 0, 0))

    _ins(fitz.Point(MARGIN_L, 409 + 11), "2. TRANSACTION",
         fontname=FONT_BOLD, fontsize=11, color=(0, 0, 0))
    p0.insert_textbox(fitz.Rect(MARGIN_L, 425, PAGE_RIGHT, 540),
                      sections["section2"],
                      fontname=FONT, fontsize=10, color=(0, 0, 0))

    _ins(fitz.Point(MARGIN_L, 547 + 11), "3. NATURE OF COMPLAINT",
         fontname=FONT_BOLD, fontsize=11, color=(0, 0, 0))
    p0.insert_textbox(fitz.Rect(MARGIN_L, 563, PAGE_RIGHT, 720),
                      sections["section3"],
                      fontname=FONT, fontsize=10, color=(0, 0, 0))

    # ───── Page 1 ─────
    # Redact entire content area and re-insert headings + remaining sections.
    p1 = doc[1]
    _apply_edits(p1, [_rect(0, 0, PAGE_W, 842, "")])

    _ins1 = p1.insert_text

    _ins1(fitz.Point(MARGIN_L, 90 + 11),
          "4. HISTORY OF ATTEMPTS FOR REDRESSAL",
          fontname=FONT_BOLD, fontsize=11, color=(0, 0, 0))
    p1.insert_textbox(fitz.Rect(MARGIN_L, 108, PAGE_RIGHT, 320),
                      sections["section4"],
                      fontname=FONT, fontsize=10, color=(0, 0, 0))

    _ins1(fitz.Point(MARGIN_L, 340 + 11), "5. RELIEF SOUGHT",
          fontname=FONT_BOLD, fontsize=11, color=(0, 0, 0))
    p1.insert_textbox(fitz.Rect(MARGIN_L, 358, PAGE_RIGHT, 550),
                      sections["section5"],
                      fontname=FONT, fontsize=10, color=(0, 0, 0))

    _ins1(fitz.Point(MARGIN_L, 570 + 11), "6. PRAYER",
          fontname=FONT_BOLD, fontsize=11, color=(0, 0, 0))
    p1.insert_textbox(fitz.Rect(MARGIN_L, 588, PAGE_RIGHT, 700),
                      sections["section6"],
                      fontname=FONT, fontsize=10, color=(0, 0, 0))

    # ───── Page 2 — Signature + Affidavit ─────
    p2 = doc[2]
    e2: list = []

    father = _val(form, "complainantFatherHusbandName", "_______________")
    age    = _val(form, "complainantAge", "___")
    full_addr = ", ".join(
        p for p in [
            _val(form, "complainantAddress", ""),
            _val(form, "complainantCity", ""),
            _val(form, "complainantState", ""),
        ] if p and p != "N/A"
    )
    place  = _val(form, "districtOfCauseOfAction",
                  _val(form, "districtName", "___________"))

    e2.append(_sr(p2, "PLACE: ___________",
                  f"PLACE: {place}", ext_r=PAGE_RIGHT))
    e2.append(_sr(p2, "DATE: ___________",
                  f"DATE: {_today()}", ext_r=PAGE_RIGHT))

    # Affidavit body — fill name, father, age, address
    e2.append(_sr(
        p2,
        "I, ____________________________________________, son/daughter/wife of",
        f"I, {name}, son/daughter/wife of",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))
    e2.append(_sr(
        p2,
        "____________________________________________, aged about _____ years,",
        f"{father}, aged about {age} years,",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))
    e2.append(_sr(
        p2,
        "residing at ____________________________________________, do hereby solemnly",
        f"residing at {full_addr}, do hereby solemnly",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))

    # Paragraph 2 — complainant vs. opposite party
    e2.append(_sr(
        p2,
        "matter of ____________________________________________ Vs.",
        f"matter of {name} Vs.",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))
    e2.append(_sr(
        p2,
        "____________________________________________, being filed before the",
        f"{op_name}, being filed before the",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))

    _apply_edits(p2, e2)

    # ───── Page 3 — Verification ─────
    p3 = doc[3]
    e3: list = []

    day   = str(date.today().day)
    month = date.today().strftime("%B")
    year  = str(date.today().year)

    e3.append(_sr(
        p3,
        "Verified at ___________ (Place) on this ________ (Day) of ________ (Month),",
        f"Verified at {place} (Place) on this {day} (Day) of {month} (Month),",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))
    e3.append(_sr(
        p3,
        "________ (Year) that the contents of the above affidavit are true and correct to the best",
        f"{year} (Year) that the contents of the above affidavit are true and correct to the best",
        fs=12.0, ext_r=PAGE_RIGHT,
    ))

    _apply_edits(p3, e3)

    return _doc_to_b64(doc)


# ─────────────────────────────────────────────────────────────
# Main endpoint
# ─────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateDocumentsResponse)
async def generate_documents(request: GenerateDocumentsRequest):
    """
    Generate all 5 legal filing documents as base64-encoded PDFs.

    Documents returned:
      - index            → Index / List of Documents
      - proforma         → Complaint Proforma
      - affidavit        → Affidavit / Verification
      - memo_of_parties  → Memo of Parties
      - list_of_dates    → List of Dates and Events
    """
    form = request.form_data

    try:
        documents = {
            "index":           generate_index(form),
            "proforma":        generate_proforma(form),
            "affidavit":       generate_affidavit(form),
            "memo_of_parties": generate_memo_of_parties(form),
            "list_of_dates":   generate_list_of_dates(form),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Document generation failed: {exc}",
        ) from exc

    complainant = form.get("complainantName", "Complainant") or "Complainant"
    safe_name = "".join(
        c if c.isalnum() or c in " _-" else "" for c in complainant
    ).strip()
    year = form.get("complaintYear", str(date.today().year)) or str(
        date.today().year
    )

    document_names = {
        "index":           f"Index_{safe_name}_{year}.pdf",
        "proforma":        f"Proforma_{safe_name}_{year}.pdf",
        "affidavit":       f"Affidavit_{safe_name}_{year}.pdf",
        "memo_of_parties": f"MemoOfParties_{safe_name}_{year}.pdf",
        "list_of_dates":   f"ListOfDates_{safe_name}_{year}.pdf",
    }

    return GenerateDocumentsResponse(
        documents=documents, document_names=document_names,
    )
