# LangChain + Google Gemini imports
import json
import os
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional, List, TypedDict, Union
from dataclasses import dataclass, field

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage
from langchain_classic.chains.retrieval_qa.base import RetrievalQA
from supabase import create_client, Client

# Import configuration from settings
from niyam_guru_backend.config import (
    EMBEDDING_MODEL,
    LLM_MODEL,
    VECTORSTORE_DIR,
    SIMULATION_DIR,
    DATA_DIR,
    SUPABASE_URL,
    SUPABASE_KEY,
)


# ========== Data Classes for Structured Input ==========

@dataclass
class ComplainantDetails:
    """Details of the complainant/consumer."""
    name: str = ""
    father_husband_name: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    age: str = ""
    occupation: str = ""


@dataclass
class OppositePartyDetails:
    """Details of the opposite party (seller/service provider)."""
    name: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    designation: str = ""


@dataclass
class CaseDetails:
    """Core case information."""
    paid_as_consideration: str = ""  # Amount paid for product/service
    claim_consideration: str = ""     # Amount being claimed
    date_of_cause_of_action: str = ""
    state_of_cause_of_action: str = ""
    district_of_cause_of_action: str = ""
    case_category: str = ""           # e.g., CONSUMER DURABLES, BANKING
    sub_category: str = ""            # e.g., Mobile Phones, Credit Cards


@dataclass
class TransactionDetails:
    """Details of the transaction."""
    product_service_description: str = ""
    purchase_date: str = ""
    purchase_amount: str = ""
    payment_mode: str = ""
    invoice_number: str = ""


@dataclass
class GrievanceDetails:
    """Details of the grievance/complaint."""
    grievance_description: str = ""
    deficiency_type: str = ""  # e.g., Defective Product, Deficiency in Service
    date_of_deficiency: str = ""


@dataclass
class PriorCommunication:
    """Prior communication with the opposite party."""
    prior_complaint_date: str = ""
    prior_complaint_details: str = ""
    response_received: str = ""


@dataclass
class UploadedDocument:
    """Represents an uploaded document."""
    name: str
    category: str  # e.g., 'Purchase Receipt', 'Product Photos', etc.
    file_type: str  # MIME type
    file_path: Optional[str] = None  # Path to the file on disk
    file_content: Optional[bytes] = None  # Raw file content
    base64_content: Optional[str] = None  # Base64 encoded content for images


@dataclass
class ConsumerComplaintData:
    """Complete consumer complaint data from the form."""
    complainant: ComplainantDetails = field(default_factory=ComplainantDetails)
    opposite_party: OppositePartyDetails = field(default_factory=OppositePartyDetails)
    case_details: CaseDetails = field(default_factory=CaseDetails)
    transaction: TransactionDetails = field(default_factory=TransactionDetails)
    grievance: GrievanceDetails = field(default_factory=GrievanceDetails)
    prior_communication: PriorCommunication = field(default_factory=PriorCommunication)
    relief_sought: str = ""
    documents: List[UploadedDocument] = field(default_factory=list)
    
    @classmethod
    def from_dict(cls, data: dict) -> "ConsumerComplaintData":
        """Create ConsumerComplaintData from a dictionary (e.g., from API request)."""
        return cls(
            complainant=ComplainantDetails(
                name=data.get("complainantName", ""),
                father_husband_name=data.get("complainantFatherHusbandName", ""),
                address=data.get("complainantAddress", ""),
                phone=data.get("complainantPhone", ""),
                email=data.get("complainantEmail", ""),
                age=data.get("complainantAge", ""),
                occupation=data.get("complainantOccupation", ""),
            ),
            opposite_party=OppositePartyDetails(
                name=data.get("oppositePartyName", ""),
                address=data.get("oppositePartyAddress", ""),
                phone=data.get("oppositePartyPhone", ""),
                email=data.get("oppositePartyEmail", ""),
                designation=data.get("oppositePartyDesignation", ""),
            ),
            case_details=CaseDetails(
                paid_as_consideration=data.get("paidAsConsideration", ""),
                claim_consideration=data.get("claimConsideration", ""),
                date_of_cause_of_action=data.get("dateOfCauseOfAction", ""),
                state_of_cause_of_action=data.get("stateOfCauseOfAction", ""),
                district_of_cause_of_action=data.get("districtOfCauseOfAction", ""),
                case_category=data.get("caseCategory", ""),
                sub_category=data.get("subCategory", ""),
            ),
            transaction=TransactionDetails(
                product_service_description=data.get("productServiceDescription", ""),
                purchase_date=data.get("purchaseDate", ""),
                purchase_amount=data.get("purchaseAmount", ""),
                payment_mode=data.get("paymentMode", ""),
                invoice_number=data.get("invoiceNumber", ""),
            ),
            grievance=GrievanceDetails(
                grievance_description=data.get("grievanceDescription", ""),
                deficiency_type=data.get("deficiencyType", ""),
                date_of_deficiency=data.get("dateOfDeficiency", ""),
            ),
            prior_communication=PriorCommunication(
                prior_complaint_date=data.get("priorComplaintDate", ""),
                prior_complaint_details=data.get("priorComplaintDetails", ""),
                response_received=data.get("responseReceived", ""),
            ),
            relief_sought=data.get("reliefSought", ""),
            documents=[],  # Documents handled separately
        )


# Path to the Consumer Protection Act 2019 PDF
CPA_2019_PDF_PATH = DATA_DIR / "laws" / "cpa2019.pdf"


# ========== Validation & Contradiction Detection ==========

# Required document categories that a real consumer court expects
MANDATORY_FILING_DOCUMENTS = [
    "Index/List of Documents",
    "Complaint Proforma",
    "Affidavit/Verification",
]

EVIDENCE_DOCUMENT_CATEGORIES = [
    "Purchase Receipt/Invoice",
    "Product Photos",
    "Communication Records",
    "Warranty/Guarantee Card",
    "Medical Report",
    "Expert/Technical Report",
    "Bank Statement/Payment Proof",
]


@dataclass
class ValidationIssue:
    """A single validation finding."""
    category: str          # "missing_field" | "missing_document" | "contradiction" | "weak_detail"
    severity: str          # "critical" | "major" | "minor"
    field: str             # Which field / document this relates to
    message: str           # Human-readable explanation
    confidence_penalty: int  # Suggested percentage-point penalty (0-25)


@dataclass
class ValidationReport:
    """Complete validation report for a complaint."""
    issues: List[ValidationIssue]
    completeness_score: float           # 0.0–1.0
    document_score: float               # 0.0–1.0
    contradiction_score: float          # 0.0 = no contradictions, higher = worse
    max_confidence_cap: int             # Hard ceiling on confidence %
    total_penalty: int                  # Sum of all penalties (capped at 70)
    summary: str                        # One-paragraph text summary for prompt injection


def _is_empty(val: str) -> bool:
    """Check if a string value is effectively empty."""
    return not val or not val.strip() or val.strip().lower() in ("n/a", "na", "none", "nil", "-", "0")


def _parse_amount(val: str) -> Optional[float]:
    """Try to parse an amount string into a float."""
    if _is_empty(val):
        return None
    import re
    cleaned = re.sub(r'[₹,\s]', '', val.replace("Rs.", "").replace("Rs", "").replace("INR", ""))
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_date(val: str) -> Optional[datetime]:
    """Try parsing a date string."""
    if _is_empty(val):
        return None
    from dateutil import parser as dateparser
    try:
        return dateparser.parse(val)
    except Exception:
        return None


def validate_complaint_data(complaint_data: ConsumerComplaintData) -> ValidationReport:
    """
    Validate the complaint data for completeness, contradictions, and evidence strength.

    This runs BEFORE the LLM call so the results can be injected into the prompt
    and also applied as hard-cap adjustments AFTER the LLM responds.
    """
    issues: List[ValidationIssue] = []

    c = complaint_data.complainant
    op = complaint_data.opposite_party
    cd = complaint_data.case_details
    tx = complaint_data.transaction
    gr = complaint_data.grievance
    pc = complaint_data.prior_communication
    docs = complaint_data.documents

    # ── 1. Complainant completeness ──────────────────────────────────────
    complainant_fields = {
        "name": c.name,
        "address": c.address,
    }
    complainant_optional = {
        "phone": c.phone,
        "email": c.email,
        "age": c.age,
    }
    for fname, fval in complainant_fields.items():
        if _is_empty(fval):
            issues.append(ValidationIssue(
                category="missing_field", severity="critical",
                field=f"complainant.{fname}",
                message=f"Complainant {fname} is missing — this is a mandatory filing requirement.",
                confidence_penalty=8,
            ))
    for fname, fval in complainant_optional.items():
        if _is_empty(fval):
            issues.append(ValidationIssue(
                category="missing_field", severity="minor",
                field=f"complainant.{fname}",
                message=f"Complainant {fname} not provided — weakens identity verification.",
                confidence_penalty=2,
            ))

    # ── 2. Opposite party completeness ───────────────────────────────────
    if _is_empty(op.name):
        issues.append(ValidationIssue(
            category="missing_field", severity="critical",
            field="opposite_party.name",
            message="Opposite party name is missing — complaint cannot proceed without identifying the respondent.",
            confidence_penalty=12,
        ))
    if _is_empty(op.address):
        issues.append(ValidationIssue(
            category="missing_field", severity="major",
            field="opposite_party.address",
            message="Opposite party address is missing — service of notice may fail.",
            confidence_penalty=5,
        ))

    # ── 3. Case details ──────────────────────────────────────────────────
    if _is_empty(cd.case_category):
        issues.append(ValidationIssue(
            category="missing_field", severity="major",
            field="case_details.case_category",
            message="Case category not specified — jurisdiction determination is unclear.",
            confidence_penalty=5,
        ))
    if _is_empty(cd.claim_consideration):
        issues.append(ValidationIssue(
            category="missing_field", severity="critical",
            field="case_details.claim_consideration",
            message="No claim amount specified — compensation prediction cannot be accurate.",
            confidence_penalty=10,
        ))
    if _is_empty(cd.date_of_cause_of_action):
        issues.append(ValidationIssue(
            category="missing_field", severity="major",
            field="case_details.date_of_cause_of_action",
            message="Date of cause of action missing — limitation period cannot be verified.",
            confidence_penalty=6,
        ))

    # ── 4. Transaction details ───────────────────────────────────────────
    if _is_empty(tx.product_service_description):
        issues.append(ValidationIssue(
            category="missing_field", severity="critical",
            field="transaction.product_service_description",
            message="Product/service description is empty — the core subject matter of the complaint is unknown.",
            confidence_penalty=10,
        ))
    if _is_empty(tx.purchase_amount) and _is_empty(cd.paid_as_consideration):
        issues.append(ValidationIssue(
            category="missing_field", severity="major",
            field="transaction.purchase_amount",
            message="Purchase amount not provided — damages calculation has no baseline.",
            confidence_penalty=6,
        ))
    if _is_empty(tx.purchase_date):
        issues.append(ValidationIssue(
            category="missing_field", severity="minor",
            field="transaction.purchase_date",
            message="Purchase date not provided — timeline of events is incomplete.",
            confidence_penalty=3,
        ))

    # ── 5. Grievance details ─────────────────────────────────────────────
    if _is_empty(gr.grievance_description):
        issues.append(ValidationIssue(
            category="missing_field", severity="critical",
            field="grievance.grievance_description",
            message="Grievance description is empty — the complaint has no substance without describing what went wrong.",
            confidence_penalty=15,
        ))
    elif len(gr.grievance_description.strip()) < 50:
        issues.append(ValidationIssue(
            category="weak_detail", severity="major",
            field="grievance.grievance_description",
            message=f"Grievance description is very brief ({len(gr.grievance_description.strip())} chars) — insufficient detail for legal analysis.",
            confidence_penalty=8,
        ))

    if _is_empty(gr.deficiency_type):
        issues.append(ValidationIssue(
            category="missing_field", severity="major",
            field="grievance.deficiency_type",
            message="Deficiency type not specified — categorization of the legal claim is unclear.",
            confidence_penalty=4,
        ))

    # ── 6. Relief sought ─────────────────────────────────────────────────
    if _is_empty(complaint_data.relief_sought):
        issues.append(ValidationIssue(
            category="missing_field", severity="major",
            field="relief_sought",
            message="Relief sought is not specified — the court needs to know what the complainant is asking for.",
            confidence_penalty=6,
        ))

    # ── 7. Prior communication ───────────────────────────────────────────
    if _is_empty(pc.prior_complaint_date) and _is_empty(pc.prior_complaint_details):
        issues.append(ValidationIssue(
            category="missing_field", severity="minor",
            field="prior_communication",
            message="No prior communication with opposite party recorded — courts view this unfavorably.",
            confidence_penalty=3,
        ))

    # ── 8. Document checks ───────────────────────────────────────────────
    uploaded_categories = [d.category.strip().lower() for d in docs] if docs else []

    # 8a. Mandatory filing documents
    for req_doc in MANDATORY_FILING_DOCUMENTS:
        if not any(req_doc.lower() in cat for cat in uploaded_categories):
            issues.append(ValidationIssue(
                category="missing_document", severity="critical",
                field=f"documents.{req_doc}",
                message=f"Required filing document '{req_doc}' not uploaded — case may be rejected at filing stage.",
                confidence_penalty=8,
            ))

    # 8b. No evidence documents at all
    has_any_evidence = any(
        any(ev.lower() in cat for ev in EVIDENCE_DOCUMENT_CATEGORIES)
        for cat in uploaded_categories
    )
    if not has_any_evidence and len(docs) == 0:
        issues.append(ValidationIssue(
            category="missing_document", severity="critical",
            field="documents.evidence",
            message="No supporting evidence documents uploaded (bills, photos, communications, etc.) — case relies entirely on oral assertions which are weak in consumer courts.",
            confidence_penalty=15,
        ))
    elif not has_any_evidence:
        issues.append(ValidationIssue(
            category="missing_document", severity="major",
            field="documents.evidence",
            message="Uploaded documents don't include purchase receipts, communication records, or photos — evidentiary support is weak.",
            confidence_penalty=10,
        ))

    # 8c. Purchase receipt / invoice specifically
    if not any("receipt" in cat or "invoice" in cat or "bill" in cat for cat in uploaded_categories):
        if not _is_empty(tx.purchase_amount) or not _is_empty(cd.paid_as_consideration):
            issues.append(ValidationIssue(
                category="missing_document", severity="major",
                field="documents.purchase_receipt",
                message="Claimed a purchase amount but no purchase receipt/invoice uploaded — the amount cannot be verified.",
                confidence_penalty=7,
            ))

    # ── 9. Contradiction detection ───────────────────────────────────────
    # 9a. Claim amount vs purchase amount
    claim_amt = _parse_amount(cd.claim_consideration)
    purchase_amt = _parse_amount(tx.purchase_amount) or _parse_amount(cd.paid_as_consideration)

    if claim_amt is not None and purchase_amt is not None:
        if claim_amt > purchase_amt * 10:
            issues.append(ValidationIssue(
                category="contradiction", severity="critical",
                field="claim_vs_purchase_amount",
                message=f"Claim amount (₹{claim_amt:,.0f}) is more than 10× the purchase amount (₹{purchase_amt:,.0f}) — needs strong justification for consequential damages.",
                confidence_penalty=12,
            ))
        elif claim_amt > purchase_amt * 5:
            issues.append(ValidationIssue(
                category="contradiction", severity="major",
                field="claim_vs_purchase_amount",
                message=f"Claim amount (₹{claim_amt:,.0f}) is significantly higher than purchase amount (₹{purchase_amt:,.0f}) — may be viewed as excessive without supporting evidence.",
                confidence_penalty=7,
            ))
        elif claim_amt < purchase_amt * 0.1:
            issues.append(ValidationIssue(
                category="contradiction", severity="minor",
                field="claim_vs_purchase_amount",
                message=f"Claim amount (₹{claim_amt:,.0f}) is unusually low relative to purchase amount (₹{purchase_amt:,.0f}) — may indicate incomplete relief sought.",
                confidence_penalty=2,
            ))

    # 9b. Date contradictions
    purchase_date = _parse_date(tx.purchase_date)
    deficiency_date = _parse_date(gr.date_of_deficiency)
    cause_date = _parse_date(cd.date_of_cause_of_action)

    if purchase_date and deficiency_date and deficiency_date < purchase_date:
        issues.append(ValidationIssue(
            category="contradiction", severity="critical",
            field="dates.deficiency_before_purchase",
            message=f"Deficiency date ({gr.date_of_deficiency}) is BEFORE the purchase date ({tx.purchase_date}) — this is logically impossible and severely undermines credibility.",
            confidence_penalty=20,
        ))

    if purchase_date and cause_date and cause_date < purchase_date:
        issues.append(ValidationIssue(
            category="contradiction", severity="major",
            field="dates.cause_before_purchase",
            message=f"Date of cause of action ({cd.date_of_cause_of_action}) is before the purchase date ({tx.purchase_date}) — timeline inconsistency.",
            confidence_penalty=12,
        ))

    # 9c. Limitation period check (2 years under CPA 2019)
    if cause_date:
        days_since = (datetime.now() - cause_date).days
        if days_since > 730:  # > 2 years
            issues.append(ValidationIssue(
                category="contradiction", severity="critical",
                field="dates.limitation_period",
                message=f"Cause of action was {days_since} days ago (~{days_since//365} years) — exceeds the 2-year limitation period under Section 69(1) of CPA 2019. Case may be time-barred.",
                confidence_penalty=20,
            ))
        elif days_since > 600:
            issues.append(ValidationIssue(
                category="contradiction", severity="major",
                field="dates.limitation_approaching",
                message=f"Cause of action was {days_since} days ago — approaching the 2-year limitation period.",
                confidence_penalty=5,
            ))

    # 9d. Grievance type vs category mismatch (basic check)
    if not _is_empty(gr.deficiency_type) and not _is_empty(cd.case_category):
        # Check for obvious mismatches
        deficiency_lower = gr.deficiency_type.lower()
        category_lower = cd.case_category.lower()
        mismatch_pairs = [
            (["medical", "health", "hospital", "doctor"], ["electronics", "mobile", "appliance", "vehicle"]),
            (["banking", "loan", "credit", "insurance"], ["food", "restaurant", "hotel"]),
        ]
        for deficiency_keywords, category_keywords in mismatch_pairs:
            if any(k in deficiency_lower for k in deficiency_keywords) and any(k in category_lower for k in category_keywords):
                issues.append(ValidationIssue(
                    category="contradiction", severity="major",
                    field="category_vs_deficiency_type",
                    message=f"Deficiency type '{gr.deficiency_type}' appears inconsistent with case category '{cd.case_category}' — may indicate incorrect form filling.",
                    confidence_penalty=10,
                ))
                break

    # ── Compute aggregate scores ─────────────────────────────────────────
    # Completeness: count of filled critical fields
    all_critical_fields = [
        c.name, c.address, op.name, cd.claim_consideration,
        tx.product_service_description, gr.grievance_description,
        cd.case_category, complaint_data.relief_sought,
    ]
    filled = sum(1 for f in all_critical_fields if not _is_empty(f))
    completeness_score = filled / len(all_critical_fields) if all_critical_fields else 0.0

    # Document score
    required_doc_count = len(MANDATORY_FILING_DOCUMENTS) + 1  # +1 for at least some evidence
    found_doc_count = min(len(docs), required_doc_count) if docs else 0
    document_score = found_doc_count / required_doc_count if required_doc_count > 0 else 0.0

    # Contradiction score (0 = clean, higher = worse)
    contradictions = [i for i in issues if i.category == "contradiction"]
    contradiction_score = sum(i.confidence_penalty for i in contradictions) / 100.0

    # Total penalty (capped at 70 — never knock confidence to below ~30%)
    total_penalty = min(70, sum(i.confidence_penalty for i in issues))

    # Hard confidence caps based on objective criteria
    max_cap = 95
    if completeness_score < 0.4:
        max_cap = min(max_cap, 35)
    elif completeness_score < 0.6:
        max_cap = min(max_cap, 50)
    elif completeness_score < 0.8:
        max_cap = min(max_cap, 70)

    if document_score == 0.0:
        max_cap = min(max_cap, 45)
    elif document_score < 0.5:
        max_cap = min(max_cap, 60)

    if contradiction_score > 0.3:
        max_cap = min(max_cap, 30)
    elif contradiction_score > 0.15:
        max_cap = min(max_cap, 50)
    elif contradiction_score > 0.0:
        max_cap = min(max_cap, 70)

    # Build summary for prompt injection
    critical_issues = [i for i in issues if i.severity == "critical"]
    major_issues = [i for i in issues if i.severity == "major"]
    minor_issues = [i for i in issues if i.severity == "minor"]

    summary_parts = []
    summary_parts.append(f"FORM COMPLETENESS: {completeness_score:.0%} of critical fields filled.")
    summary_parts.append(f"DOCUMENT SCORE: {document_score:.0%} of required documents uploaded.")
    summary_parts.append(f"ISSUES FOUND: {len(critical_issues)} CRITICAL, {len(major_issues)} MAJOR, {len(minor_issues)} MINOR.")

    if contradictions:
        summary_parts.append("CONTRADICTIONS DETECTED:")
        for cont in contradictions:
            summary_parts.append(f"  ⚠ {cont.message}")

    if critical_issues:
        summary_parts.append("CRITICAL GAPS:")
        for ci in critical_issues:
            if ci.category != "contradiction":
                summary_parts.append(f"  ✗ {ci.message}")

    if major_issues:
        summary_parts.append("MAJOR GAPS:")
        for mi in major_issues:
            if mi.category != "contradiction":
                summary_parts.append(f"  ⚠ {mi.message}")

    summary_parts.append(f"MAXIMUM CONFIDENCE CEILING: {max_cap}% — confidence scores MUST NOT exceed this value.")

    summary = "\n".join(summary_parts)

    return ValidationReport(
        issues=issues,
        completeness_score=completeness_score,
        document_score=document_score,
        contradiction_score=contradiction_score,
        max_confidence_cap=max_cap,
        total_penalty=total_penalty,
        summary=summary,
    )


def apply_confidence_adjustments(json_response: dict, validation: ValidationReport) -> dict:
    """
    Post-LLM adjustment: enforce hard caps and inject validation metadata
    into the prediction response so the frontend can display warnings.
    """
    import re as _re

    def _extract_pct(val: str) -> Optional[int]:
        """Extract a percentage number from a string like '85%' or '78% [70-85]'."""
        if not val:
            return None
        m = _re.search(r'(\d+)\s*%', str(val))
        return int(m.group(1)) if m else None

    def _cap_pct_string(original: str, cap: int) -> str:
        """Cap a percentage string."""
        pct = _extract_pct(original)
        if pct is None:
            return original
        capped = min(pct, cap)
        return str(original).replace(str(pct), str(capped))

    cap = validation.max_confidence_cap

    # Cap Judgment_Reasoning.Liability_Confidence
    jr = json_response.get("Judgment_Reasoning", {})
    if jr.get("Liability_Confidence"):
        jr["Liability_Confidence"] = _cap_pct_string(jr["Liability_Confidence"], cap)

    # Cap Simulation_Metadata.Success_Probability
    sm = json_response.get("Simulation_Metadata", {})
    if sm.get("Success_Probability"):
        sm["Success_Probability"] = _cap_pct_string(sm["Success_Probability"], cap)

    # Cap individual Predicted_Outcomes confidences
    rg = json_response.get("Relief_Granted", {})
    for outcome in rg.get("Predicted_Outcomes", []):
        if outcome.get("Confidence"):
            outcome["Confidence"] = _cap_pct_string(outcome["Confidence"], cap)

    # Adjust Case_Strength if confidence is low
    if cap <= 35:
        sm["Case_Strength"] = "Weak"
    elif cap <= 50:
        if sm.get("Case_Strength") == "Strong":
            sm["Case_Strength"] = "Moderate"

    # Inject validation metadata for frontend consumption
    json_response["_validation"] = {
        "completeness_score": round(validation.completeness_score, 2),
        "document_score": round(validation.document_score, 2),
        "contradiction_score": round(validation.contradiction_score, 2),
        "max_confidence_cap": validation.max_confidence_cap,
        "total_penalty_points": validation.total_penalty,
        "issues": [
            {
                "category": i.category,
                "severity": i.severity,
                "field": i.field,
                "message": i.message,
                "confidence_penalty": i.confidence_penalty,
            }
            for i in validation.issues
        ],
        "contradictions": [
            {
                "field": i.field,
                "message": i.message,
                "severity": i.severity,
                "penalty": i.confidence_penalty,
            }
            for i in validation.issues if i.category == "contradiction"
        ],
        "missing_documents": [
            {
                "document": i.field.replace("documents.", ""),
                "message": i.message,
                "severity": i.severity,
            }
            for i in validation.issues if i.category == "missing_document"
        ],
        "missing_fields": [
            {
                "field": i.field,
                "message": i.message,
                "severity": i.severity,
            }
            for i in validation.issues if i.category == "missing_field"
        ],
    }

    return json_response


# ========== Document Processing Functions ==========

def prepare_multimodal_content(documents: List[UploadedDocument]) -> List[dict]:
    """
    Prepare documents for multimodal LLM input.
    Returns a list of content parts that can be passed directly to Gemini.
    
    Gemini supports:
    - Images: image/jpeg, image/png, image/gif, image/webp
    - PDFs: application/pdf (inline data)
    """
    content_parts = []
    
    for doc in documents:
        # Get base64 content
        b64_content = doc.base64_content
        
        # If no base64 content but we have raw bytes, encode it
        if not b64_content and doc.file_content:
            b64_content = base64.b64encode(doc.file_content).decode("utf-8")
        
        if not b64_content:
            continue
        
        # Determine MIME type
        mime_type = doc.file_type
        
        # Supported image types for Gemini
        if mime_type.startswith("image/"):
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{b64_content}"
                }
            })
        
        # PDF support - Gemini can process PDFs directly
        elif mime_type == "application/pdf":
            # For PDFs, we pass as inline data
            content_parts.append({
                "type": "media",
                "mime_type": mime_type,
                "data": b64_content,
            })
    
    return content_parts


def build_document_summary(documents: List[UploadedDocument]) -> str:
    """Build a text summary of uploaded documents for the prompt."""
    if not documents:
        return ""
    
    summary_parts = ["\n【 UPLOADED DOCUMENTS 】"]
    for doc in documents:
        summary_parts.append(f"- {doc.category}: {doc.name} ({doc.file_type})")
    
    return "\n".join(summary_parts)


def generate_case_query_from_form(complaint_data: ConsumerComplaintData) -> str:
    """
    Generate a comprehensive case query from the structured form data.
    This creates a detailed narrative that the LLM can analyze.
    
    Note: Documents (PDFs, images) are passed separately as multimodal content
    to the LLM, not embedded in this text query.
    """
    c = complaint_data.complainant
    op = complaint_data.opposite_party
    cd = complaint_data.case_details
    tx = complaint_data.transaction
    gr = complaint_data.grievance
    pc = complaint_data.prior_communication
    
    # Build the case narrative
    query_parts = []
    
    # Header
    query_parts.append("═" * 70)
    query_parts.append("CONSUMER COMPLAINT CASE DETAILS")
    query_parts.append("═" * 70)
    
    # Complainant Information
    query_parts.append("\n【 COMPLAINANT DETAILS 】")
    if c.name:
        query_parts.append(f"Name: {c.name}")
    if c.father_husband_name:
        query_parts.append(f"S/o or W/o: {c.father_husband_name}")
    if c.age:
        query_parts.append(f"Age: {c.age} years")
    if c.occupation:
        query_parts.append(f"Occupation: {c.occupation}")
    if c.address:
        query_parts.append(f"Address: {c.address}")
    if c.phone:
        query_parts.append(f"Contact: {c.phone}")
    if c.email:
        query_parts.append(f"Email: {c.email}")
    
    # Opposite Party Information
    query_parts.append("\n【 OPPOSITE PARTY DETAILS 】")
    if op.name:
        query_parts.append(f"Name/Company: {op.name}")
    if op.designation:
        query_parts.append(f"Designation: {op.designation}")
    if op.address:
        query_parts.append(f"Address: {op.address}")
    if op.phone:
        query_parts.append(f"Contact: {op.phone}")
    if op.email:
        query_parts.append(f"Email: {op.email}")
    
    # Case Category and Jurisdiction
    query_parts.append("\n【 CASE CATEGORY & JURISDICTION 】")
    if cd.case_category:
        query_parts.append(f"Category: {cd.case_category}")
    if cd.sub_category:
        query_parts.append(f"Sub-Category: {cd.sub_category}")
    if cd.state_of_cause_of_action:
        query_parts.append(f"State: {cd.state_of_cause_of_action}")
    if cd.district_of_cause_of_action:
        query_parts.append(f"District: {cd.district_of_cause_of_action}")
    if cd.date_of_cause_of_action:
        query_parts.append(f"Date of Cause of Action: {cd.date_of_cause_of_action}")
    
    # Transaction Details
    query_parts.append("\n【 TRANSACTION DETAILS 】")
    if tx.product_service_description:
        query_parts.append(f"Product/Service: {tx.product_service_description}")
    if tx.purchase_date:
        query_parts.append(f"Purchase Date: {tx.purchase_date}")
    if tx.purchase_amount or cd.paid_as_consideration:
        amount = tx.purchase_amount or cd.paid_as_consideration
        query_parts.append(f"Purchase Amount: Rs. {amount}")
    if tx.payment_mode:
        query_parts.append(f"Payment Mode: {tx.payment_mode}")
    if tx.invoice_number:
        query_parts.append(f"Invoice/Receipt No.: {tx.invoice_number}")
    
    # Grievance Details
    query_parts.append("\n【 GRIEVANCE / COMPLAINT DETAILS 】")
    if gr.deficiency_type:
        query_parts.append(f"Type of Deficiency: {gr.deficiency_type}")
    if gr.date_of_deficiency:
        query_parts.append(f"Date of Deficiency: {gr.date_of_deficiency}")
    if gr.grievance_description:
        query_parts.append(f"\nDescription of Grievance:\n{gr.grievance_description}")
    
    # Prior Communication
    if pc.prior_complaint_date or pc.prior_complaint_details:
        query_parts.append("\n【 PRIOR COMMUNICATION WITH OPPOSITE PARTY 】")
        if pc.prior_complaint_date:
            query_parts.append(f"Date of Prior Complaint: {pc.prior_complaint_date}")
        if pc.prior_complaint_details:
            query_parts.append(f"Details: {pc.prior_complaint_details}")
        if pc.response_received:
            query_parts.append(f"Response Received: {pc.response_received}")
    
    # Claim Amount
    query_parts.append("\n【 CLAIM DETAILS 】")
    if cd.paid_as_consideration:
        query_parts.append(f"Amount Paid as Consideration: Rs. {cd.paid_as_consideration}")
    if cd.claim_consideration:
        query_parts.append(f"Total Claim Amount: Rs. {cd.claim_consideration}")
    
    # Relief Sought
    if complaint_data.relief_sought:
        query_parts.append("\n【 RELIEF SOUGHT 】")
        query_parts.append(complaint_data.relief_sought)
    
    # Document summary (actual files are passed as multimodal content)
    doc_summary = build_document_summary(complaint_data.documents)
    if doc_summary:
        query_parts.append(doc_summary)
        query_parts.append("\n(Note: The above documents are attached and should be analyzed for evidence)")
    
    query_parts.append("\n" + "═" * 70)
    query_parts.append("\nBased on the above case details and attached documents, please analyze:")
    query_parts.append("1. What are the chances of winning this case?")
    query_parts.append("2. What compensation can be expected?")
    query_parts.append("3. Which forum should this case be filed in?")
    query_parts.append("4. What are the key legal provisions applicable?")
    query_parts.append("5. What additional evidence might strengthen the case?")
    query_parts.append("═" * 70)
    
    return "\n".join(query_parts)


def load_cpa_2019_context() -> str:
    """Load and return the Consumer Protection Act 2019 PDF content."""
    if not CPA_2019_PDF_PATH.exists():
        print(f"⚠️ Warning: CPA 2019 PDF not found at {CPA_2019_PDF_PATH}")
        return ""
    
    try:
        loader = PyPDFLoader(str(CPA_2019_PDF_PATH))
        documents = loader.load()
        
        # Combine all pages into a single text
        full_text = "\n\n".join([doc.page_content for doc in documents])
        
        # Truncate if too long (to avoid token limits) - keep first ~50,000 chars
        max_chars = 50000
        if len(full_text) > max_chars:
            full_text = full_text[:max_chars] + "\n\n[... Document truncated for length ...]"
        
        print(f"✅ Loaded CPA 2019 ({len(documents)} pages, {len(full_text)} characters)")
        return full_text
    except Exception as e:
        print(f"⚠️ Error loading CPA 2019 PDF: {e}")
        return ""


def get_vectorstore():
    """Load and return the vector store."""
    embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)
    vectorstore = Chroma(
        persist_directory=str(VECTORSTORE_DIR),
        embedding_function=embeddings
    )
    return vectorstore


def get_qa_chain(vectorstore, cpa_context: str = "", validation_summary: str = ""):
    """Create and return the QA chain with JSON-formatted legal judgment prompt."""
    
    # Create a retriever from the loaded vector store
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    
    # Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=0.3
    )
    
    # Build the CPA 2019 reference section
    cpa_section = ""
    if cpa_context:
        cpa_section = f"""
═══════════════════════════════════════════════════════════════════════════════
                    CONSUMER PROTECTION ACT, 2019 (REFERENCE)
═══════════════════════════════════════════════════════════════════════════════

The following is the full text of the Consumer Protection Act, 2019. Use this as your
PRIMARY LEGAL REFERENCE for identifying applicable sections, definitions, rights,
remedies, and procedures. Quote specific sections when relevant.

{cpa_context}

═══════════════════════════════════════════════════════════════════════════════
"""
    
    # Build the validation section
    validation_section = ""
    if validation_summary:
        validation_section = f"""
═══════════════════════════════════════════════════════════════════════════════
                    PRE-ANALYSIS VALIDATION REPORT
═══════════════════════════════════════════════════════════════════════════════

The following automated validation was performed on the complaint data BEFORE
your analysis. You MUST account for these findings in your confidence scores.

{validation_summary}

═══════════════════════════════════════════════════════════════════════════════
"""
    
    # Custom prompt template for legal judgment prediction with JSON output
    legal_judgment_prompt = PromptTemplate(
        input_variables=["context", "question"],
        template='''You are an expert legal analyst specializing in Indian Consumer Protection law.
Your task is to analyze the user's case, predict the likely legal outcome based on similar past cases,
and format your response as a detailed JSON structure for a courtroom simulation.

''' + cpa_section + '''
═══════════════════════════════════════════════════════════════════════════════
                    SIMILAR PAST CASES FROM DATABASE
═══════════════════════════════════════════════════════════════════════════════

{context}

═══════════════════════════════════════════════════════════════════════════════
                    USER'S CURRENT CASE
═══════════════════════════════════════════════════════════════════════════════

{question}

''' + validation_section + '''
═══════════════════════════════════════════════════════════════════════════════
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. Carefully analyze the user's case against the Consumer Protection Act, 2019 provisions above.
2. Identify SPECIFIC sections from CPA 2019 that are applicable (e.g., Section 2(1), Section 35, etc.)
3. Quote the exact text of relevant sections where appropriate.
4. Compare with similar past cases from the database.
5. Provide a detailed judgment prediction.

═══════════════════════════════════════════════════════════════════════════════
                    STRICT CONFIDENCE SCORING RULES
═══════════════════════════════════════════════════════════════════════════════

You MUST follow these rules when assigning Liability_Confidence, Success_Probability,
and all Predicted_Outcomes Confidence values:

A) OBSERVE THE MAXIMUM CONFIDENCE CEILING in the validation report above.
   Your confidence numbers must NEVER exceed that ceiling.

B) MISSING INFORMATION PENALTIES (cumulative):
   - Each missing critical field (name, address, grievance, claim amount): −8-15%
   - Each missing major field (dates, category, relief sought): −4-6%
   - Missing grievance description entirely: confidence CANNOT exceed 30%
   - Very brief grievance description (<50 chars): confidence CANNOT exceed 55%

C) MISSING DOCUMENT PENALTIES:
   - No documents uploaded at all: confidence CANNOT exceed 45%
   - Missing mandatory filing docs (index, proforma, affidavit): −8% each
   - No purchase receipt when an amount is claimed: −7%
   - No supporting evidence (photos, communications): −10%

D) CONTRADICTION PENALTIES:
   - Date contradictions (deficiency before purchase): confidence CANNOT exceed 25%
   - Claim >10× purchase amount without justification: −12%
   - Category/deficiency type mismatch: −10%
   - Limitation period exceeded (>2 years): confidence CANNOT exceed 20%

E) BASELINE SCORING:
   - A fully complete case with all documents and no contradictions: 75-90%
   - A complete case but missing some supporting docs: 55-75%
   - A partially complete case with key gaps: 30-55%
   - A case with contradictions or minimal info: 15-35%

F) EXPLICITLY LIST every contradiction, missing field, and missing document
   in the Evidence_Analysis.Critical_Gaps array. Do NOT gloss over them.

═══════════════════════════════════════════════════════════════════════════════

Analyze the case thoroughly and respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON).
The JSON must follow this exact structure:

{{
    "Case_Summary": {{
        "Title": "<Generated case title based on parties involved>",
        "Case_Type": "<e.g., Deficiency in Service, Product Liability, Unfair Trade Practice>",
        "Consumer_Details": {{
            "Description": "<Brief description of the consumer/complainant>",
            "Claim_Amount": "<Amount claimed or product value>",
            "Key_Grievances": ["<List of main complaints>"]
        }},
        "Opposite_Party_Details": {{
            "Description": "<Brief description of the seller/service provider>",
            "Defense_Arguments": ["<List of defense arguments raised or likely to be raised>"]
        }},
        "Facts_of_Case": ["<Chronological list of key facts>"],
        "Evidence_Available": ["<List of evidence the consumer has>"],
        "Evidence_Missing": ["<List of evidence that would strengthen the case>"]
    }},
    "Legal_Grounds": {{
        "Applicable_Sections": [
            {{
                "Section": "<Section number, e.g., 2(1)(g)>",
                "Act": "<Full act name, e.g., Consumer Protection Act, 2019>",
                "Description": "<What this section covers>",
                "Relevance_to_Case": "<How it applies to this specific case>"
            }}
        ],
        "Precedents_Cited": [
            {{
                "Case_Name": "<Full case citation>",
                "Year": "<Year of judgment>",
                "Court": "<Court name>",
                "Key_Holding": "<Main principle established>",
                "Relevance": "<How it supports the current case>"
            }}
        ],
        "Legal_Principles": ["<Key legal principles applicable>"],
        "Contextual_Notes": "<Additional legal context for the simulation>"
    }},
    "Judgment_Reasoning": {{
        "Issues_Framed": [
            {{
                "Issue_Number": <1, 2, 3...>,
                "Issue": "<Legal question to be decided>",
                "Analysis": "<Detailed analysis of this issue>",
                "Finding": "<Conclusion on this issue>"
            }}
        ],
        "Findings": "<Overall findings summary>",
        "Key_Evidence": ["<Evidence that influenced the decision>"],
        "Evidence_Analysis": {{
            "Consumer_Evidence_Strength": "<Strong/Moderate/Weak>",
            "Opposite_Party_Defense_Strength": "<Strong/Moderate/Weak>",
            "Critical_Gaps": ["<Any gaps in evidence or arguments>"]
        }},
        "Inference": "<Legal inference drawn from facts and law>",
        "Liability_Status": "<Established/Not Established/Partial>",
        "Liability_Confidence": "<Percentage confidence, e.g., 85%>",
        "Reasoning_Chain": ["<Step-by-step logical reasoning>"]
    }},
    "Relief_Granted": {{
        "Primary_Relief": {{
            "Type": "<Refund/Replacement/Compensation/Service Rectification>",
            "Amount": "<Specific amount if applicable>",
            "Description": "<Details of the relief>"
        }},
        "Additional_Relief": [
            {{
                "Type": "<e.g., Mental Agony Compensation, Litigation Costs>",
                "Amount": "<Amount if applicable>",
                "Justification": "<Why this relief is appropriate>"
            }}
        ],
        "Predicted_Outcomes": [
            {{
                "Relief": "<Type of outcome>",
                "Confidence": "<Percentage with range, e.g., 78% [70-85]>",
                "Probability_Assessment": "<High/Medium/Low>"
            }}
        ],
        "Total_Compensation_Range": {{
            "Minimum": "<Lower estimate>",
            "Maximum": "<Upper estimate>",
            "Most_Likely": "<Expected amount>"
        }},
        "Time_Frame": "<Expected duration for case resolution>",
        "Recommended_Forum": "<District Forum/State Commission/National Commission>",
        "Recommended_Action": "<Specific next steps for the consumer>"
    }},
    "Simulation_Metadata": {{
        "Case_Strength": "<Strong/Moderate/Weak>",
        "Success_Probability": "<Percentage>",
        "Key_Arguments_For_Consumer": ["<Main arguments consumer should make>"],
        "Key_Arguments_For_Opposite_Party": ["<Main counter-arguments>"],
        "Critical_Moments": ["<Key points where the case could turn>"],
        "Suggested_Witnesses": ["<Types of witnesses that could help>"],
        "Documentary_Evidence_Required": ["<Documents needed for trial>"],
        "Estimated_Hearing_Duration": "<Time estimate>",
        "Complexity_Level": "<Simple/Moderate/Complex>",
        "Similar_Cases_Referenced": ["<List of similar case names from context>"]
    }}
}}

Ensure all fields are populated with detailed, realistic information suitable for a courtroom simulation.
The response must be valid JSON that can be parsed directly.'''
    )
    
    # Create the RetrievalQA chain with custom prompt
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        return_source_documents=True,
        chain_type_kwargs={"prompt": legal_judgment_prompt}
    )
    
    return qa_chain


def get_supabase_client() -> Optional[Client]:
    """Initialize and return the Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Warning: Supabase credentials not configured. Data will only be saved locally.")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return supabase
    except Exception as e:
        print(f"⚠️ Error initializing Supabase client: {e}")
        return None


def save_to_supabase(
    supabase: Client,
    json_data: dict,
    query: str,
    user_id: Optional[str] = None,
    cpa_included: bool = False
) -> Optional[str]:
    """
    Save the judgment prediction to Supabase.
    
    Args:
        supabase: Supabase client instance
        json_data: The parsed judgment prediction JSON
        query: Original user query
        user_id: Optional user ID (UUID) for associating with a user
        cpa_included: Whether CPA 2019 was included in the context
        
    Returns:
        The ID of the created record, or None if failed
    """
    try:
        # Extract key fields from JSON for easier querying
        case_summary = json_data.get("Case_Summary", {})
        judgment_reasoning = json_data.get("Judgment_Reasoning", {})
        relief_granted = json_data.get("Relief_Granted", {})
        simulation_metadata = json_data.get("Simulation_Metadata", {})
        compensation_range = relief_granted.get("Total_Compensation_Range", {})
        
        # Prepare the record
        record = {
            "user_query": query,
            "case_title": case_summary.get("Title"),
            "case_type": case_summary.get("Case_Type"),
            "claim_amount": case_summary.get("Consumer_Details", {}).get("Claim_Amount"),
            "consumer_description": case_summary.get("Consumer_Details", {}).get("Description"),
            "opposite_party_description": case_summary.get("Opposite_Party_Details", {}).get("Description"),
            "case_strength": simulation_metadata.get("Case_Strength"),
            "success_probability": simulation_metadata.get("Success_Probability"),
            "liability_status": judgment_reasoning.get("Liability_Status"),
            "recommended_forum": relief_granted.get("Recommended_Forum"),
            "compensation_minimum": compensation_range.get("Minimum"),
            "compensation_maximum": compensation_range.get("Maximum"),
            "compensation_most_likely": compensation_range.get("Most_Likely"),
            "prediction_json": json_data,
            "cpa_2019_included": cpa_included,
        }
        
        # Add user_id if provided
        if user_id:
            record["user_id"] = user_id
        
        # Insert into Supabase
        result = supabase.table("judgment_predictions").insert(record).execute()
        
        if result.data and len(result.data) > 0:
            record_id = result.data[0].get("id")
            print(f"✅ Judgment prediction saved to Supabase with ID: {record_id}")
            return record_id
        else:
            print("⚠️ Warning: Insert succeeded but no data returned")
            return None
            
    except Exception as e:
        print(f"⚠️ Error saving to Supabase: {e}")
        return None


# Local file saving removed - predictions are stored only in Supabase


def parse_llm_response(response_text: str) -> dict:
    """Parse the LLM response text into a JSON object."""
    # Try to extract JSON from the response
    text = response_text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # If parsing fails, return an error structure
        return {
            "error": "Failed to parse LLM response as JSON",
            "parse_error": str(e),
            "raw_response": response_text
        }


def run_multimodal_prediction(
    text_query: str,
    documents: List[UploadedDocument],
    cpa_context: str,
    similar_cases_context: str,
    validation_summary: str = "",
) -> str:
    """
    Run a multimodal prediction with documents passed directly to Gemini.
    
    Args:
        text_query: The text portion of the query (case details)
        documents: List of uploaded documents (PDFs, images)
        cpa_context: Consumer Protection Act 2019 context
        similar_cases_context: Similar cases retrieved from vector store
        validation_summary: Pre-LLM validation report summary
        
    Returns:
        The LLM response as a string
    """
    # Initialize multimodal LLM
    llm = ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=0.3
    )
    
    # Build the full prompt with context
    cpa_section = ""
    if cpa_context:
        cpa_section = f"""
═══════════════════════════════════════════════════════════════════════════════
                    CONSUMER PROTECTION ACT, 2019 (REFERENCE)
═══════════════════════════════════════════════════════════════════════════════

The following is the full text of the Consumer Protection Act, 2019. Use this as your
PRIMARY LEGAL REFERENCE for identifying applicable sections, definitions, rights,
remedies, and procedures. Quote specific sections when relevant.

{cpa_context}

═══════════════════════════════════════════════════════════════════════════════
"""
    
    # Build validation section for prompt
    validation_section = ""
    if validation_summary:
        validation_section = f"""
═══════════════════════════════════════════════════════════════════════════════
                    PRE-ANALYSIS VALIDATION REPORT
═══════════════════════════════════════════════════════════════════════════════

The following automated validation was performed on the complaint data BEFORE
your analysis. You MUST account for these findings in your confidence scores.

{validation_summary}

═══════════════════════════════════════════════════════════════════════════════
"""

    # Build the complete prompt
    full_prompt = f'''You are an expert legal analyst specializing in Indian Consumer Protection law.
Your task is to analyze the user's case, predict the likely legal outcome based on similar past cases,
and format your response as a detailed JSON structure for a courtroom simulation.

{cpa_section}
═══════════════════════════════════════════════════════════════════════════════
                    SIMILAR PAST CASES FROM DATABASE
═══════════════════════════════════════════════════════════════════════════════

{similar_cases_context}

═══════════════════════════════════════════════════════════════════════════════
                    USER'S CURRENT CASE
═══════════════════════════════════════════════════════════════════════════════

{text_query}

{validation_section}
═══════════════════════════════════════════════════════════════════════════════
                    ATTACHED DOCUMENTS
═══════════════════════════════════════════════════════════════════════════════

The user has attached supporting documents (PDFs and/or images) which are included with this message.
Please carefully analyze these documents as evidence for the case. They may contain:
- Purchase receipts/invoices
- Product photos showing defects
- Communication records
- Medical reports
- Any other relevant evidence

═══════════════════════════════════════════════════════════════════════════════
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. Carefully analyze the user's case against the Consumer Protection Act, 2019 provisions above.
2. THOROUGHLY EXAMINE all attached documents (PDFs and images) for evidence.
3. Identify SPECIFIC sections from CPA 2019 that are applicable (e.g., Section 2(1), Section 35, etc.)
4. Quote the exact text of relevant sections where appropriate.
5. Compare with similar past cases from the database.
6. Provide a detailed judgment prediction.

═══════════════════════════════════════════════════════════════════════════════
                    STRICT CONFIDENCE SCORING RULES
═══════════════════════════════════════════════════════════════════════════════

You MUST follow these rules when assigning Liability_Confidence, Success_Probability,
and all Predicted_Outcomes Confidence values:

A) OBSERVE THE MAXIMUM CONFIDENCE CEILING in the validation report above.
   Your confidence numbers must NEVER exceed that ceiling.

B) MISSING INFORMATION PENALTIES (cumulative):
   - Each missing critical field (name, address, grievance, claim amount): -8-15%
   - Each missing major field (dates, category, relief sought): -4-6%
   - Missing grievance description entirely: confidence CANNOT exceed 30%
   - Very brief grievance description (<50 chars): confidence CANNOT exceed 55%

C) MISSING DOCUMENT PENALTIES:
   - No documents uploaded at all: confidence CANNOT exceed 45%
   - Missing mandatory filing docs (index, proforma, affidavit): -8% each
   - No purchase receipt when an amount is claimed: -7%
   - No supporting evidence (photos, communications): -10%

D) CONTRADICTION PENALTIES:
   - Date contradictions (deficiency before purchase): confidence CANNOT exceed 25%
   - Claim >10x purchase amount without justification: -12%
   - Category/deficiency type mismatch: -10%
   - Limitation period exceeded (>2 years): confidence CANNOT exceed 20%

E) BASELINE SCORING:
   - A fully complete case with all documents and no contradictions: 75-90%
   - A complete case but missing some supporting docs: 55-75%
   - A partially complete case with key gaps: 30-55%
   - A case with contradictions or minimal info: 15-35%

F) EXPLICITLY LIST every contradiction, missing field, and missing document
   in the Evidence_Analysis.Critical_Gaps array. Do NOT gloss over them.

═══════════════════════════════════════════════════════════════════════════════

Analyze the case thoroughly and respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON).
The JSON must follow this exact structure:

{{
    "Case_Summary": {{
        "Title": "<Generated case title based on parties involved>",
        "Case_Type": "<e.g., Deficiency in Service, Product Liability, Unfair Trade Practice>",
        "Consumer_Details": {{
            "Description": "<Brief description of the consumer/complainant>",
            "Claim_Amount": "<Amount claimed or product value>",
            "Key_Grievances": ["<List of main complaints>"]
        }},
        "Opposite_Party_Details": {{
            "Description": "<Brief description of the seller/service provider>",
            "Defense_Arguments": ["<List of defense arguments raised or likely to be raised>"]
        }},
        "Facts_of_Case": ["<Chronological list of key facts>"],
        "Evidence_Available": ["<List of evidence the consumer has - include details from attached documents>"],
        "Evidence_Missing": ["<List of evidence that would strengthen the case>"]
    }},
    "Legal_Grounds": {{
        "Applicable_Sections": [
            {{
                "Section": "<Section number, e.g., 2(1)(g)>",
                "Act": "<Full act name, e.g., Consumer Protection Act, 2019>",
                "Description": "<What this section covers>",
                "Relevance_to_Case": "<How it applies to this specific case>"
            }}
        ],
        "Precedents_Cited": [
            {{
                "Case_Name": "<Full case citation>",
                "Year": "<Year of judgment>",
                "Court": "<Court name>",
                "Key_Holding": "<Main principle established>",
                "Relevance": "<How it supports the current case>"
            }}
        ],
        "Legal_Principles": ["<Key legal principles applicable>"],
        "Contextual_Notes": "<Additional legal context for the simulation>"
    }},
    "Judgment_Reasoning": {{
        "Issues_Framed": [
            {{
                "Issue_Number": <1, 2, 3...>,
                "Issue": "<Legal question to be decided>",
                "Analysis": "<Detailed analysis of this issue>",
                "Finding": "<Conclusion on this issue>"
            }}
        ],
        "Findings": "<Overall findings summary>",
        "Key_Evidence": ["<Evidence that influenced the decision - reference attached documents>"],
        "Evidence_Analysis": {{
            "Consumer_Evidence_Strength": "<Strong/Moderate/Weak>",
            "Opposite_Party_Defense_Strength": "<Strong/Moderate/Weak>",
            "Critical_Gaps": ["<Any gaps in evidence or arguments>"],
            "Document_Analysis": "<Summary of what was found in the attached documents>"
        }},
        "Inference": "<Legal inference drawn from facts and law>",
        "Liability_Status": "<Established/Not Established/Partial>",
        "Liability_Confidence": "<Percentage confidence, e.g., 85%>",
        "Reasoning_Chain": ["<Step-by-step logical reasoning>"]
    }},
    "Relief_Granted": {{
        "Primary_Relief": {{
            "Type": "<Refund/Replacement/Compensation/Service Rectification>",
            "Amount": "<Specific amount if applicable>",
            "Description": "<Details of the relief>"
        }},
        "Additional_Relief": [
            {{
                "Type": "<e.g., Mental Agony Compensation, Litigation Costs>",
                "Amount": "<Amount if applicable>",
                "Justification": "<Why this relief is appropriate>"
            }}
        ],
        "Predicted_Outcomes": [
            {{
                "Relief": "<Type of outcome>",
                "Confidence": "<Percentage with range, e.g., 78% [70-85]>",
                "Probability_Assessment": "<High/Medium/Low>"
            }}
        ],
        "Total_Compensation_Range": {{
            "Minimum": "<Lower estimate>",
            "Maximum": "<Upper estimate>",
            "Most_Likely": "<Expected amount>"
        }},
        "Time_Frame": "<Expected duration for case resolution>",
        "Recommended_Forum": "<District Forum/State Commission/National Commission>",
        "Recommended_Action": "<Specific next steps for the consumer>"
    }},
    "Simulation_Metadata": {{
        "Case_Strength": "<Strong/Moderate/Weak>",
        "Success_Probability": "<Percentage>",
        "Key_Arguments_For_Consumer": ["<Main arguments consumer should make>"],
        "Key_Arguments_For_Opposite_Party": ["<Main counter-arguments>"],
        "Critical_Moments": ["<Key points where the case could turn>"],
        "Suggested_Witnesses": ["<Types of witnesses that could help>"],
        "Documentary_Evidence_Required": ["<Documents needed for trial>"],
        "Estimated_Hearing_Duration": "<Time estimate>",
        "Complexity_Level": "<Simple/Moderate/Complex>",
        "Similar_Cases_Referenced": ["<List of similar case names from context>"]
    }}
}}

Ensure all fields are populated with detailed, realistic information suitable for a courtroom simulation.
The response must be valid JSON that can be parsed directly.'''

    # Build multimodal content
    content_parts = []
    
    # Add text prompt first
    content_parts.append({"type": "text", "text": full_prompt})
    
    # Add documents as multimodal content
    doc_count = 0
    for doc in documents:
        b64_content = doc.base64_content
        if not b64_content and doc.file_content:
            b64_content = base64.b64encode(doc.file_content).decode("utf-8")
        
        if not b64_content:
            continue
        
        mime_type = doc.file_type
        
        # Add image
        if mime_type.startswith("image/"):
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{b64_content}"
                }
            })
            doc_count += 1
            print(f"  📷 Added image: {doc.name} ({doc.category})")
        
        # Add PDF - Gemini supports inline PDF data
        elif mime_type == "application/pdf":
            # For Gemini, we can pass PDF as inline data
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{b64_content}"
                }
            })
            doc_count += 1
            print(f"  📄 Added PDF: {doc.name} ({doc.category})")
    
    print(f"  ✅ Total documents added for multimodal processing: {doc_count}")
    
    # Create the message and invoke
    message = HumanMessage(content=content_parts)
    response = llm.invoke([message])
    
    return response.content


def run_judgment_prediction(
    query: Optional[str] = None,
    complaint_data: Optional[ConsumerComplaintData] = None,
    form_dict: Optional[dict] = None,
    documents: Optional[List[UploadedDocument]] = None,
    user_id: Optional[str] = None,
    save_to_db: bool = True
) -> tuple[dict, Optional[str]]:
    """
    Run the judgment prediction pipeline and save results to Supabase.
    
    Accepts input in multiple formats:
    1. Plain text query (legacy support)
    2. ConsumerComplaintData object (structured form data)
    3. Dictionary from API request (will be converted to ConsumerComplaintData)
    
    Documents (PDFs, images) are passed DIRECTLY to Google Gemini for multimodal
    analysis - no extraction or local storage required.
    
    Args:
        query: Plain text case description (legacy support)
        complaint_data: Structured ConsumerComplaintData object
        form_dict: Dictionary of form data (from API request)
        documents: List of uploaded documents (used with form_dict)
        user_id: Optional user ID (UUID) for associating prediction with a user
        save_to_db: Whether to save to Supabase database (default True)
        
    Returns:
        Tuple of (parsed JSON response, Supabase record ID or None)
    """
    # Determine the query to use and prepare complaint data
    final_query = ""
    input_type = "text"
    has_documents = False
    
    if complaint_data is not None:
        # Use structured data directly
        final_query = generate_case_query_from_form(complaint_data)
        has_documents = len(complaint_data.documents) > 0
        input_type = "structured_form"
        print("📋 Using structured ConsumerComplaintData input")
    elif form_dict is not None:
        # Convert dictionary to ConsumerComplaintData
        complaint_data = ConsumerComplaintData.from_dict(form_dict)
        if documents:
            complaint_data.documents = documents
        final_query = generate_case_query_from_form(complaint_data)
        has_documents = len(complaint_data.documents) > 0
        input_type = "form_dict"
        print("📋 Using form dictionary input")
    elif query is not None:
        # Use plain text query (legacy)
        final_query = query
        input_type = "text"
        print("📝 Using plain text query input")
    else:
        raise ValueError("Must provide either 'query', 'complaint_data', or 'form_dict'")
    
    # ── Run pre-LLM validation if we have structured data ─────────────────
    validation: Optional[ValidationReport] = None
    validation_summary = ""
    if complaint_data is not None:
        print("--- Step 0: Validating Complaint Data ---")
        validation = validate_complaint_data(complaint_data)
        validation_summary = validation.summary
        print(f"  Completeness: {validation.completeness_score:.0%}")
        print(f"  Document score: {validation.document_score:.0%}")
        print(f"  Contradictions: {len([i for i in validation.issues if i.category == 'contradiction'])}")
        print(f"  Max confidence cap: {validation.max_confidence_cap}%")
        print(f"  Total penalty points: {validation.total_penalty}")

    print("--- Step 1: Loading Consumer Protection Act 2019 ---")
    cpa_context = load_cpa_2019_context()
    
    print("\n--- Step 2: Loading Existing Vector Database ---")
    vectorstore = get_vectorstore()
    print(f"✅ Database loaded successfully from: '{VECTORSTORE_DIR}'")
    
    print("\n--- Step 3: Retrieving Similar Cases ---")
    # Get similar cases from vector store
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    similar_docs = retriever.invoke(final_query)
    similar_cases_context = "\n\n".join([doc.page_content for doc in similar_docs])
    print(f"✅ Retrieved {len(similar_docs)} similar cases")
    
    print("\n--- Step 4: Running Query ---")
    print(f"Query length: {len(final_query)} characters")
    print(f"Query preview: {final_query[:200]}..." if len(final_query) > 200 else f"Query: {final_query}")
    
    # Choose between multimodal and regular processing
    if has_documents and complaint_data:
        print(f"\n--- Step 4a: Processing {len(complaint_data.documents)} documents with multimodal LLM ---")
        response_text = run_multimodal_prediction(
            text_query=final_query,
            documents=complaint_data.documents,
            cpa_context=cpa_context,
            similar_cases_context=similar_cases_context,
            validation_summary=validation_summary,
        )
        source_docs_list = similar_docs
    else:
        print("\n--- Step 4a: Using standard RAG chain (no documents) ---")
        qa_chain = get_qa_chain(vectorstore, cpa_context, validation_summary=validation_summary)
        print("✅ LLM and retriever are ready.")
        response = qa_chain.invoke({"query": final_query})
        response_text = response["result"]
        source_docs_list = response.get("source_documents", [])
    
    # Parse the JSON response
    print("\n--- Step 5: Parsing Response ---")
    json_response = parse_llm_response(response_text)
    
    # ── Apply post-LLM confidence hard caps if validation ran ─────────────
    if validation is not None:
        print("\n--- Step 5a: Applying Confidence Adjustments ---")
        json_response = apply_confidence_adjustments(json_response, validation)
        print(f"  Applied max cap: {validation.max_confidence_cap}%")
    
    # Add source documents metadata to the response
    source_docs = []
    for doc in source_docs_list:
        source_docs.append({
            "metadata": doc.metadata if hasattr(doc, 'metadata') else {},
            "content_preview": doc.page_content[:500] if hasattr(doc, 'page_content') and doc.page_content else ""
        })
    json_response["_source_documents"] = source_docs
    json_response["_query"] = final_query
    json_response["_input_type"] = input_type
    json_response["_timestamp"] = datetime.now().isoformat()
    json_response["_cpa_2019_included"] = bool(cpa_context)
    json_response["_multimodal_processing"] = has_documents
    
    # Add form data reference if available
    if complaint_data:
        json_response["_form_data"] = {
            "complainant_name": complaint_data.complainant.name,
            "opposite_party_name": complaint_data.opposite_party.name,
            "case_category": complaint_data.case_details.case_category,
            "claim_amount": complaint_data.case_details.claim_consideration,
            "documents_count": len(complaint_data.documents),
            "document_types": [doc.file_type for doc in complaint_data.documents],
        }
    
    # Save to Supabase database (no local file saving)
    supabase_record_id = None
    if save_to_db:
        print("\n--- Step 6: Saving to Supabase Database ---")
        supabase = get_supabase_client()
        if supabase:
            supabase_record_id = save_to_supabase(
                supabase=supabase,
                json_data=json_response,
                query=final_query,
                user_id=user_id,
                cpa_included=bool(cpa_context)
            )
            if supabase_record_id:
                json_response["_supabase_id"] = supabase_record_id
                print(f"✅ Prediction saved to Supabase with ID: {supabase_record_id}")
        else:
            print("⚠️ Supabase client not available, prediction not saved to database")
    
    return json_response, supabase_record_id


def run_judgment_prediction_from_api(
    form_data: dict,
    file_data: Optional[List[dict]] = None,
    user_id: Optional[str] = None,
    save_to_db: bool = True
) -> tuple[dict, Optional[str]]:
    """
    Convenience function for API endpoints.
    
    Files are passed directly to Google Gemini as base64 - NO local storage required.
    Results are stored only in Supabase.
    
    Args:
        form_data: Dictionary containing all form fields from ConsumerComplaintTemplate
        file_data: List of file information dictionaries with keys:
                   - name: filename
                   - category: document category  
                   - file_type: MIME type (e.g., 'image/jpeg', 'application/pdf')
                   - content: base64 encoded file content (with or without data URI prefix)
        user_id: Optional user ID
        save_to_db: Whether to save to Supabase database
        
    Returns:
        Tuple of (prediction result, Supabase record ID)
    """
    # Convert form data to ConsumerComplaintData
    complaint_data = ConsumerComplaintData.from_dict(form_data)
    
    # Process uploaded files - keep as base64 for direct multimodal processing
    if file_data:
        print(f"📎 Processing {len(file_data)} uploaded files for multimodal analysis...")
        for file_info in file_data:
            # Get base64 content
            content_b64 = file_info.get("content", "")
            
            # Remove data URI prefix if present (e.g., "data:image/jpeg;base64,...")
            if "," in content_b64:
                content_b64 = content_b64.split(",")[1]
            
            # Create document with base64 content - no file storage needed
            doc = UploadedDocument(
                name=file_info.get("name", "unknown"),
                category=file_info.get("category", "Other"),
                file_type=file_info.get("file_type", "application/octet-stream"),
                base64_content=content_b64,  # Keep as base64 for direct Gemini processing
            )
            
            complaint_data.documents.append(doc)
            print(f"  ✓ Added: {doc.name} ({doc.file_type})")
    
    return run_judgment_prediction(
        complaint_data=complaint_data,
        user_id=user_id,
        save_to_db=save_to_db
    )


# ========== Main Execution ==========
if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("JUDGMENT PREDICTION - DEMO WITH STRUCTURED FORM DATA")
    print("=" * 70 + "\n")
    
    # Example 1: Using structured form data (ConsumerComplaintData)
    example_complaint = ConsumerComplaintData(
        complainant=ComplainantDetails(
            name="Rajesh Kumar",
            father_husband_name="Mohan Kumar",
            address="123, Gandhi Nagar, New Delhi - 110001",
            phone="9876543210",
            email="rajesh.kumar@email.com",
            age="35",
            occupation="Software Engineer",
        ),
        opposite_party=OppositePartyDetails(
            name="ABC Electronics Pvt. Ltd.",
            address="456, Nehru Place, New Delhi - 110019",
            phone="011-26789012",
            email="support@abcelectronics.com",
            designation="Authorized Dealer",
        ),
        case_details=CaseDetails(
            paid_as_consideration="25000",
            claim_consideration="50000",
            date_of_cause_of_action="2024-12-15",
            state_of_cause_of_action="Delhi",
            district_of_cause_of_action="South Delhi",
            case_category="CONSUMER DURABLES",
            sub_category="Mobile Phones",
        ),
        transaction=TransactionDetails(
            product_service_description="Samsung Galaxy S24 Ultra Smartphone",
            purchase_date="2024-12-14",
            purchase_amount="25000",
            payment_mode="Credit Card",
            invoice_number="INV-2024-12345",
        ),
        grievance=GrievanceDetails(
            grievance_description="""
            I purchased a Samsung Galaxy S24 Ultra smartphone on 14th December 2024. 
            On 15th December 2024, while the phone was charging normally using the original 
            charger provided, it suddenly started emitting smoke and exploded, causing minor 
            burns to my hand and damage to my bedside table.
            
            When I approached the seller with the damaged phone, original box, and purchase 
            receipt, they refused to accept responsibility. They claimed that the explosion 
            was due to my "improper usage pattern" without providing any evidence or 
            conducting any investigation.
            
            The defective product has caused me:
            1. Physical injury (burns on right hand)
            2. Property damage (bedside table)
            3. Mental agony and harassment
            4. Loss of the product value
            """,
            deficiency_type="Defective Product",
            date_of_deficiency="2024-12-15",
        ),
        prior_communication=PriorCommunication(
            prior_complaint_date="2024-12-16",
            prior_complaint_details="Visited the store with damaged phone and receipt. Spoke to store manager Mr. Amit Sharma.",
            response_received="Store refused responsibility, blamed user for improper usage without investigation.",
        ),
        relief_sought="""
        1. Refund of the full purchase amount of Rs. 25,000/-
        2. Compensation of Rs. 15,000/- for mental agony and harassment
        3. Compensation of Rs. 5,000/- for medical expenses (burn treatment)
        4. Compensation of Rs. 3,000/- for property damage (bedside table)
        5. Cost of litigation Rs. 2,000/-
        Total Claim: Rs. 50,000/-
        """,
        documents=[
            UploadedDocument(
                name="purchase_receipt.pdf",
                category="Purchase Receipt/Invoice",
                file_type="application/pdf",
            ),
            UploadedDocument(
                name="damaged_phone_photo1.jpg",
                category="Defect Photos/Videos",
                file_type="image/jpeg",
            ),
            UploadedDocument(
                name="damaged_phone_photo2.jpg",
                category="Defect Photos/Videos",
                file_type="image/jpeg",
            ),
            UploadedDocument(
                name="medical_report.pdf",
                category="Other Documents",
                file_type="application/pdf",
            ),
        ],
    )
    
    # Run prediction with structured data
    print("Running prediction with structured form data...\n")
    result, saved_file, supabase_id = run_judgment_prediction(
        complaint_data=example_complaint,
        save_to_db=False  # Set to True to save to Supabase
    )
    
    # Display results
    print("\n" + "=" * 70)
    print("JUDGMENT PREDICTION RESULT")
    print("=" * 70)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        print(f"Raw response:\n{result.get('raw_response', 'N/A')}")
    else:
        # Pretty print the main sections
        for section in ["Case_Summary", "Legal_Grounds", "Judgment_Reasoning", "Relief_Granted", "Simulation_Metadata"]:
            if section in result:
                print(f"\n{'─' * 50}")
                print(f"  {section}")
                print(f"{'─' * 50}")
                print(json.dumps(result[section], indent=2))
    
    print("\n" + "=" * 70)
    print(f"Full JSON saved to: {saved_file}")
    if supabase_id:
        print(f"Supabase record ID: {supabase_id}")
    print("Input type:", result.get("_input_type", "unknown"))
    print("=" * 70)
    
    # Example 2: Using form dictionary (as would come from API)
    print("\n\n" + "=" * 70)
    print("EXAMPLE 2: Using form dictionary (API-style input)")
    print("=" * 70 + "\n")
    
    api_form_data = {
        "complainantName": "Priya Sharma",
        "complainantAddress": "789, Sector 15, Noida, UP - 201301",
        "complainantPhone": "9123456789",
        "complainantEmail": "priya.sharma@email.com",
        "oppositePartyName": "XYZ Home Appliances",
        "oppositePartyAddress": "101, Mall Road, Noida",
        "paidAsConsideration": "45000",
        "claimConsideration": "60000",
        "caseCategory": "CONSUMER DURABLES",
        "subCategory": "Home Appliances",
        "dateOfCauseOfAction": "2024-11-20",
        "stateOfCauseOfAction": "Uttar Pradesh",
        "districtOfCauseOfAction": "Gautam Buddha Nagar",
        "deficiencyType": "Defective Product",
        "grievanceDescription": "Purchased a washing machine that stopped working after 3 days. Service center visited twice but could not fix the issue. Requesting full refund.",
        "reliefSought": "Full refund of Rs. 45,000/- plus compensation of Rs. 15,000/- for mental harassment.",
    }
    
    print("Form data preview:")
    print(json.dumps(api_form_data, indent=2))
    print("\n(Skipping actual API prediction to save time - use run_judgment_prediction_from_api() in production)")
    print("=" * 70)