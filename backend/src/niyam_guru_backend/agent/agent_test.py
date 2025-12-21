"""
Courtroom Simulation with LangGraph Multi-Agent System

A sophisticated courtroom simulation implementing:
- Graph-based agent orchestration with LangGraph
- Realistic Indian Consumer Court proceedings
- Dynamic phase management (opening → arguments → evidence → closing → verdict)
- Human-in-the-loop for consumer participation
- Judgment modification based on proceedings
"""

import json
import argparse
import operator
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal, TypedDict, Optional, Sequence

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from niyam_guru_backend.config import LLM_MODEL, SIMULATION_DIR


# ============================================================================
# Type Definitions & State Schema
# ============================================================================

class Message(TypedDict):
    """A message in the courtroom proceedings."""
    speaker: Literal["JUDGE", "DEFENSE", "CONSUMER", "SYSTEM"]
    content: str
    timestamp: str
    phase: str


class JudgmentUpdate(TypedDict):
    """A modification to the judgment data."""
    field: str
    old_value: Optional[str]
    new_value: str
    reason: str
    updated_by: str


class VerdictDetails(TypedDict):
    """Final verdict structure."""
    summary: str
    issues_determined: list[dict]
    final_order: str
    relief_granted: dict
    costs: str
    pronounced_on: str


class CourtroomState(TypedDict):
    """Complete state of the courtroom simulation."""
    # Core case data
    judgment_data: dict
    original_judgment_data: dict
    case_file_path: str
    
    # Proceeding state
    messages: Annotated[Sequence[Message], operator.add]
    phase: Literal["opening", "arguments", "evidence", "closing", "verdict"]
    hearing_number: int
    turn_count: int
    
    # Flow control
    next_speaker: Literal["JUDGE", "DEFENSE", "CONSUMER", "ROUTER"]
    concluded: bool
    awaiting_human_input: bool
    
    # Judgment modifications
    judgment_updates: Annotated[Sequence[JudgmentUpdate], operator.add]
    
    # Final verdict
    verdict: Optional[VerdictDetails]
    
    # Context for current turn
    last_significant_statement: str
    pending_questions: list[str]


# ============================================================================
# Prompts
# ============================================================================

JUDGE_SYSTEM_PROMPT = """You are an experienced Judge presiding over Consumer Complaint Case in an Indian District Consumer Disputes Redressal Commission.

═══════════════════════════════════════════════════════════════════════════════
                              CASE FILE
═══════════════════════════════════════════════════════════════════════════════

{case_details}

═══════════════════════════════════════════════════════════════════════════════
                         CURRENT PROCEEDINGS STATE
═══════════════════════════════════════════════════════════════════════════════

Current Phase: {phase}
Hearing Number: {hearing_number}
Turn Count: {turn_count}

═══════════════════════════════════════════════════════════════════════════════
                           YOUR JUDICIAL DUTIES
═══════════════════════════════════════════════════════════════════════════════

1. MAINTAIN DECORUM: Use formal, respectful Indian courtroom language.
   - Address parties appropriately ("learned counsel", "complainant")
   - Frame issues precisely using legal terminology
   
2. GUIDE PROCEEDINGS: Control the flow based on current phase:
   - OPENING: Frame the matter, identify issues, invite initial statement
   - ARGUMENTS: Allow both sides to present, probe weaknesses, seek clarity
   - EVIDENCE: Focus on documentary proof, witness reliability, gaps
   - CLOSING: Crystallize arguments, identify determinative points
   - VERDICT: Deliver reasoned judgment based on record

3. ACTIVE ADJUDICATION:
   - Ask pointed questions when facts are unclear
   - Note inconsistencies in testimony or evidence
   - Apply relevant legal principles (Consumer Protection Act, 2019)
   - Consider cited precedents

4. JUDGMENT MODIFICATIONS:
   If proceedings reveal new facts or arguments that genuinely affect your assessment,
   you may update the judgment. Include updates in your response as:
   
   <judgment_update>
   FIELD: [dot-separated path, e.g., "Judgment_Reasoning.Liability_Confidence"]
   OLD_VALUE: [current value]
   NEW_VALUE: [updated value]  
   REASON: [brief explanation]
   </judgment_update>

5. PHASE TRANSITIONS:
   When ready to move to the next phase, indicate:
   <phase_transition>NEXT_PHASE</phase_transition>
   
   Move to next phase when:
   - Opening complete → "arguments"
   - Arguments substantially made → "evidence" (if evidence focus needed)
   - Evidence examined → "closing"
   - Closing submissions done → "verdict"

6. SPEAKING DECISIONS:
   You should speak when:
   - Opening a hearing or new phase
   - A legally significant point is raised
   - Evidence needs judicial comment
   - Clarifying questions are needed
   - Delivering observations or verdict
   
   You should NOT speak:
   - After every minor exchange
   - When parties are still developing their points
   - When nothing substantive has been added

7. NEXT SPEAKER INDICATION:
   End your response with exactly one of:
   <next_speaker>CONSUMER</next_speaker> - Wait for complainant's response
   <next_speaker>DEFENSE</next_speaker> - Defense should respond
   <next_speaker>JUDGE</next_speaker> - You will continue (rarely needed)

═══════════════════════════════════════════════════════════════════════════════
                              STYLE GUIDE
═══════════════════════════════════════════════════════════════════════════════

Opening style examples:
- "This matter comes before me as a consumer complaint under Section 35 of the Consumer Protection Act, 2019..."
- "Heard the learned complainant. The gravamen of the grievance appears to be..."
- "Let the record reflect that both parties are present..."

Questioning style:
- "Mr./Ms. Complainant, can you clarify the exact date when..."
- "Learned counsel for the opposite party, what is your response to..."
- "The documentary evidence placed before me suggests... How does the defense explain..."

Phase transition style:
- "Having heard the initial contentions, the matter is ripe for detailed arguments."
- "The Court notes the documentary evidence on record. Let us proceed to closing submissions."
"""

OPPOSITE_PARTY_LAWYER_PROMPT = """You are an experienced defense advocate representing the Opposite Party (seller/service provider) in a Consumer Protection case before the District Consumer Disputes Redressal Commission.

═══════════════════════════════════════════════════════════════════════════════
                           YOUR CLIENT'S CASE
═══════════════════════════════════════════════════════════════════════════════

{defense_brief}

═══════════════════════════════════════════════════════════════════════════════
                        COMPLAINANT'S ALLEGATIONS
═══════════════════════════════════════════════════════════════════════════════

{consumer_allegations}

═══════════════════════════════════════════════════════════════════════════════
                         ADVOCACY GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

1. PROFESSIONAL CONDUCT:
   - Be firm but courteous; no personal attacks
   - Address the Court respectfully ("Your Honor", "May it please the Court")
   - Acknowledge valid points while defending your client's position

2. DEFENSE STRATEGY:
   - Challenge gaps in evidence (burden of proof lies on complainant)
   - Offer plausible alternative explanations
   - Cite warranty terms, store policies, industry standards
   - Invoke relevant legal defenses under Consumer Protection Act
   - Question credibility of evidence where appropriate

3. **IMPORTANT - YOU MUST PRESENT EVIDENCE:**
   You MUST actively present documentary evidence to support your client's defense.
   Generate and present realistic documents such as:
   
   📄 TECHNICAL/EXPERT REPORTS:
   "Your Honor, I place on record the Technical Inspection Report dated [date] from
   [Certified Technician Name], which states: '[specific technical findings]'..."
   
   📄 WARRANTY & POLICY DOCUMENTS:
   "I submit the Warranty Terms & Conditions document (Exhibit D-1) which clearly
   states at Clause [X]: '[specific warranty clause]'..."
   
   📄 SERVICE RECORDS:
   "Your Honor, I produce the Customer Service Log (Exhibit D-2) showing:
   - Date: [date] - Customer contacted regarding [issue]
   - Response: [what was offered/done]
   - Outcome: [resolution offered]..."
   
   📄 EMPLOYEE AFFIDAVITS:
   "I file the Affidavit of [Employee Name], [Designation], who states on oath:
   '[relevant sworn statement about the transaction/product]'..."
   
   📄 COMMUNICATION RECORDS:
   "Your Honor, I produce email/SMS correspondence (Exhibit D-3) dated [date]
   wherein my client clearly informed the complainant that '[relevant communication]'..."
   
   📄 INDUSTRY STANDARDS:
   "I submit documentation from [Industry Body/BIS] establishing that the industry
   standard for [product/service] is [standard], which my client has complied with..."
   
   📄 CCTV/PHOTOGRAPHIC EVIDENCE:
   "Your Honor, I produce photographs/CCTV footage description showing [relevant scene]..."
   
   📄 THIRD-PARTY REPORTS:
   "I submit the report from [Independent Agency] dated [date] which concludes..."

   RULES FOR EVIDENCE:
   - Present at least ONE piece of documentary evidence in the evidence phase
   - Label exhibits clearly (Exhibit D-1, D-2, etc.)
   - Quote specific relevant portions
   - Make evidence realistic and contextually appropriate
   - Challenge complainant's evidence with counter-evidence

4. RESPONDING APPROPRIATELY:
   Respond when:
   - Consumer makes a substantive allegation → COUNTER with evidence
   - Judge directs a question to you → Answer with supporting documents
   - New evidence is presented → REBUT with your own evidence
   - Opportunity to strengthen defense → PROACTIVELY present materials
   
   Keep responses:
   - Evidence-backed whenever possible
   - Focused and relevant
   - Grounded in facts and law

5. PHASE-SPECIFIC BEHAVIOR:
   - OPENING: State your defense briefly, reserve evidence
   - ARGUMENTS: Present your client's version WITH supporting documents
   - EVIDENCE: **ACTIVELY PRESENT MULTIPLE EXHIBITS** - This is your main phase!
     * Technical reports contradicting defect claims
     * Service records showing proper response
     * Policy documents limiting liability
     * Affidavits from staff/experts
   - CLOSING: Summarize evidence presented, highlight gaps in complainant's case

6. NEXT SPEAKER:
   End with exactly one of:
   <next_speaker>CONSUMER</next_speaker> - Complainant should respond
   <next_speaker>JUDGE</next_speaker> - Matter requires judicial observation

═══════════════════════════════════════════════════════════════════════════════
                              CURRENT STATE
═══════════════════════════════════════════════════════════════════════════════

Phase: {phase}
Hearing: {hearing_number}
Evidence Presented So Far: {evidence_presented}
Last Statement: {last_statement}
"""

ROUTER_SYSTEM_PROMPT = """You are the courtroom flow controller. Based on the current state of proceedings, determine who should speak next.

Current Phase: {phase}
Last Speaker: {last_speaker}
Last Statement Summary: {last_statement}
Turn Count: {turn_count}
Concluded: {concluded}

Recent Messages:
{recent_messages}

ROUTING RULES:

1. After JUDGE's opening statement → CONSUMER
2. After CONSUMER's substantive argument → DEFENSE (usually) or JUDGE (if directly addressed)
3. After DEFENSE's response → JUDGE (if significant) or CONSUMER (for rebuttal)
4. After JUDGE's question to a party → That party (CONSUMER or DEFENSE)
5. After evidence presentation → JUDGE for comment, then other party
6. In CLOSING phase → Alternate between parties, then JUDGE for verdict

PHASE PROGRESSION SIGNALS:
- If phase is "opening" and initial statements done → suggest "arguments"
- If phase is "arguments" and main contentions exhausted → suggest "evidence" or "closing"
- If phase is "closing" and final submissions done → suggest "verdict"

Respond with ONLY valid JSON:
{{
    "next_speaker": "CONSUMER" | "DEFENSE" | "JUDGE",
    "reasoning": "brief explanation",
    "suggest_phase_change": null | "arguments" | "evidence" | "closing" | "verdict",
    "should_conclude": false | true
}}
"""


# ============================================================================
# Helper Functions
# ============================================================================

def load_judgment_json(file_path: str) -> dict:
    """Load the judgment prediction JSON file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_judgment_json(data: dict, file_path: str) -> None:
    """Save the updated judgment JSON file."""
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def format_case_details(data: dict) -> str:
    """Format complete case details for judge prompt."""
    cs = data.get("Case_Summary", {})
    lg = data.get("Legal_Grounds", {})
    jr = data.get("Judgment_Reasoning", {})
    rg = data.get("Relief_Granted", {})
    
    sections = lg.get("Applicable_Sections", [])
    precedents = lg.get("Precedents_Cited", [])
    
    return f"""
CASE TITLE: {cs.get('Title', 'Consumer Complaint')}
CASE TYPE: {cs.get('Case_Type', 'N/A')}

─────────────────────────────────────────────────────────────────────────────
COMPLAINANT'S DETAILS:
─────────────────────────────────────────────────────────────────────────────
Description: {cs.get('Consumer_Details', {}).get('Description', 'N/A')}
Claim Amount: Rs. {cs.get('Consumer_Details', {}).get('Claim_Amount', 'N/A')}

Key Grievances:
{chr(10).join('  • ' + g for g in cs.get('Consumer_Details', {}).get('Key_Grievances', []))}

─────────────────────────────────────────────────────────────────────────────
OPPOSITE PARTY DETAILS:
─────────────────────────────────────────────────────────────────────────────
Description: {cs.get('Opposite_Party_Details', {}).get('Description', 'N/A')}

Defense Arguments on Record:
{chr(10).join('  • ' + a for a in cs.get('Opposite_Party_Details', {}).get('Defense_Arguments', []))}

─────────────────────────────────────────────────────────────────────────────
FACTS OF THE CASE:
─────────────────────────────────────────────────────────────────────────────
{chr(10).join('  ' + str(i+1) + '. ' + f for i, f in enumerate(cs.get('Facts_of_Case', [])))}

─────────────────────────────────────────────────────────────────────────────
EVIDENCE ON RECORD:
─────────────────────────────────────────────────────────────────────────────
Available:
{chr(10).join('  • ' + e for e in cs.get('Evidence_Available', []))}

Potentially Missing:
{chr(10).join('  • ' + e for e in cs.get('Evidence_Missing', []))}

─────────────────────────────────────────────────────────────────────────────
APPLICABLE LAW:
─────────────────────────────────────────────────────────────────────────────
{chr(10).join('  • Section ' + s.get('Section', '') + ' (' + s.get('Act', '') + '): ' + s.get('Description', '') for s in sections)}

─────────────────────────────────────────────────────────────────────────────
RELEVANT PRECEDENTS:
─────────────────────────────────────────────────────────────────────────────
{chr(10).join('  • ' + p.get('Case_Name', '') + ' (' + p.get('Year', '') + '): ' + p.get('Key_Holding', '') for p in precedents)}

─────────────────────────────────────────────────────────────────────────────
PRELIMINARY ASSESSMENT:
─────────────────────────────────────────────────────────────────────────────
Issues Framed:
{chr(10).join('  Issue ' + str(i.get('Issue_Number', '')) + ': ' + i.get('Issue', '') for i in jr.get('Issues_Framed', []))}

Current Findings: {jr.get('Findings', 'N/A')}
Liability Status: {jr.get('Liability_Status', 'N/A')}
Confidence: {jr.get('Liability_Confidence', 'N/A')}

Proposed Relief:
  Primary: {rg.get('Primary_Relief', {}).get('Type', 'N/A')} - Rs. {rg.get('Primary_Relief', {}).get('Amount', 'N/A')}
  Total Range: Rs. {rg.get('Total_Compensation_Range', {}).get('Minimum', 'N/A')} - Rs. {rg.get('Total_Compensation_Range', {}).get('Maximum', 'N/A')}
"""


def format_defense_brief(data: dict) -> str:
    """Format defense brief for defense counsel prompt."""
    cs = data.get("Case_Summary", {})
    op = cs.get("Opposite_Party_Details", {})
    sm = data.get("Simulation_Metadata", {})
    
    return f"""
CLIENT: {op.get('Description', 'Retail Seller')}

YOUR DEFENSE POINTS:
{chr(10).join('  • ' + a for a in op.get('Defense_Arguments', []))}

STRATEGIC COUNTER-ARGUMENTS:
{chr(10).join('  • ' + a for a in sm.get('Key_Arguments_For_Opposite_Party', []))}

CRITICAL MOMENTS TO EXPLOIT:
{chr(10).join('  • ' + m for m in sm.get('Critical_Moments', []))}

EVIDENCE GAPS IN COMPLAINANT'S CASE:
{chr(10).join('  • ' + e for e in cs.get('Evidence_Missing', []))}
"""


def format_consumer_allegations(data: dict) -> str:
    """Format consumer allegations for defense context."""
    cs = data.get("Case_Summary", {})
    cd = cs.get("Consumer_Details", {})
    sm = data.get("Simulation_Metadata", {})
    
    return f"""
CLAIM AMOUNT: Rs. {cd.get('Claim_Amount', 'N/A')}

GRIEVANCES:
{chr(10).join('  • ' + g for g in cd.get('Key_Grievances', []))}

THEIR KEY ARGUMENTS:
{chr(10).join('  • ' + a for a in sm.get('Key_Arguments_For_Consumer', []))}

EVIDENCE THEY POSSESS:
{chr(10).join('  • ' + e for e in cs.get('Evidence_Available', []))}
"""


def format_recent_messages(messages: list[Message], count: int = 5) -> str:
    """Format recent messages for context."""
    recent = messages[-count:] if len(messages) > count else messages
    return "\n".join([
        f"[{m['speaker']}]: {m['content'][:200]}..." if len(m['content']) > 200 else f"[{m['speaker']}]: {m['content']}"
        for m in recent
    ])


def parse_agent_response(response: str) -> dict:
    """Parse agent response for special tags."""
    import re
    
    result = {
        "clean_content": response,
        "next_speaker": None,
        "phase_transition": None,
        "judgment_updates": []
    }
    
    # Extract next_speaker
    next_speaker_match = re.search(r'<next_speaker>(\w+)</next_speaker>', response, re.IGNORECASE)
    if next_speaker_match:
        result["next_speaker"] = next_speaker_match.group(1).upper()
        result["clean_content"] = re.sub(r'<next_speaker>\w+</next_speaker>', '', result["clean_content"])
    
    # Extract phase_transition
    phase_match = re.search(r'<phase_transition>(\w+)</phase_transition>', response, re.IGNORECASE)
    if phase_match:
        result["phase_transition"] = phase_match.group(1).lower()
        result["clean_content"] = re.sub(r'<phase_transition>\w+</phase_transition>', '', result["clean_content"])
    
    # Extract judgment_updates
    update_pattern = r'<judgment_update>\s*FIELD:\s*(.+?)\s*(?:OLD_VALUE:\s*(.+?))?\s*NEW_VALUE:\s*(.+?)\s*REASON:\s*(.+?)\s*</judgment_update>'
    updates = re.findall(update_pattern, response, re.IGNORECASE | re.DOTALL)
    for update in updates:
        result["judgment_updates"].append({
            "field": update[0].strip(),
            "old_value": update[1].strip() if update[1] else None,
            "new_value": update[2].strip(),
            "reason": update[3].strip()
        })
    result["clean_content"] = re.sub(r'<judgment_update>.*?</judgment_update>', '', result["clean_content"], flags=re.DOTALL)
    
    result["clean_content"] = result["clean_content"].strip()
    
    return result


def update_judgment_field(data: dict, field_path: str, value: str) -> tuple[dict, str]:
    """Update a nested field in the judgment data. Returns (updated_data, old_value)."""
    keys = field_path.split(".")
    current = data
    old_value = None
    
    # Navigate to parent
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    # Get old value and set new
    old_value = current.get(keys[-1])
    current[keys[-1]] = value
    
    return data, str(old_value) if old_value else None


def create_message(speaker: str, content: str, phase: str) -> Message:
    """Create a formatted message."""
    return Message(
        speaker=speaker,
        content=content,
        timestamp=datetime.now().isoformat(),
        phase=phase
    )


# ============================================================================
# Graph Nodes
# ============================================================================

def judge_node(state: CourtroomState) -> dict:
    """Judge agent node - presides over proceedings."""
    llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.3)
    
    # Build conversation context
    conversation = "\n\n".join([
        f"[{m['speaker']}]: {m['content']}" 
        for m in state["messages"][-10:]  # Last 10 messages for context
    ])
    
    system_prompt = JUDGE_SYSTEM_PROMPT.format(
        case_details=format_case_details(state["judgment_data"]),
        phase=state["phase"],
        hearing_number=state["hearing_number"],
        turn_count=state["turn_count"]
    )
    
    user_prompt = f"""
PROCEEDINGS SO FAR:
{conversation}

{'─' * 40}

Based on the above proceedings and your judicial duties, provide your response.
Remember to:
1. Speak only if judicially appropriate at this juncture
2. Indicate who should speak next
3. Update judgment if warranted by new evidence/arguments
4. Signal phase transitions when appropriate
"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = llm.invoke(messages)
    parsed = parse_agent_response(response.content)
    
    # Process judgment updates
    updates = []
    judgment_data = state["judgment_data"].copy()
    for update in parsed["judgment_updates"]:
        judgment_data, old_val = update_judgment_field(
            judgment_data, 
            update["field"], 
            update["new_value"]
        )
        updates.append(JudgmentUpdate(
            field=update["field"],
            old_value=old_val,
            new_value=update["new_value"],
            reason=update["reason"],
            updated_by="JUDGE"
        ))
    
    # Determine next phase
    new_phase = state["phase"]
    if parsed["phase_transition"]:
        valid_phases = ["opening", "arguments", "evidence", "closing", "verdict"]
        if parsed["phase_transition"] in valid_phases:
            new_phase = parsed["phase_transition"]
    
    # Check if concluding
    concluded = new_phase == "verdict"
    
    # Create message
    new_message = create_message("JUDGE", parsed["clean_content"], new_phase)
    
    return {
        "messages": [new_message],
        "judgment_data": judgment_data,
        "judgment_updates": updates,
        "phase": new_phase,
        "next_speaker": parsed["next_speaker"] or "CONSUMER",
        "concluded": concluded,
        "turn_count": state["turn_count"] + 1,
        "last_significant_statement": parsed["clean_content"][:500],
        "awaiting_human_input": parsed["next_speaker"] == "CONSUMER"
    }


def defense_node(state: CourtroomState) -> dict:
    """Defense counsel agent node."""
    llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.4)
    
    # Get last statement for context
    last_msg = state["messages"][-1] if state["messages"] else {"content": "", "speaker": ""}
    
    # Build conversation context
    conversation = "\n\n".join([
        f"[{m['speaker']}]: {m['content']}" 
        for m in state["messages"][-8:]
    ])
    
    # Track defense evidence presented so far
    defense_messages = [m for m in state["messages"] if m["speaker"] == "DEFENSE"]
    evidence_keywords = ["exhibit", "document", "affidavit", "report", "record", "produce", "submit", "place on record"]
    evidence_presented = []
    for msg in defense_messages:
        content_lower = msg["content"].lower()
        if any(kw in content_lower for kw in evidence_keywords):
            # Extract exhibit references
            import re
            exhibits = re.findall(r'exhibit\s*[d\-]*\d*', content_lower)
            evidence_presented.extend(exhibits if exhibits else ["documentary evidence"])
    
    evidence_summary = ", ".join(set(evidence_presented)) if evidence_presented else "None yet - YOU MUST PRESENT EVIDENCE!"
    
    system_prompt = OPPOSITE_PARTY_LAWYER_PROMPT.format(
        defense_brief=format_defense_brief(state["judgment_data"]),
        consumer_allegations=format_consumer_allegations(state["judgment_data"]),
        phase=state["phase"],
        hearing_number=state["hearing_number"],
        evidence_presented=evidence_summary,
        last_statement=last_msg["content"][:500] if last_msg["content"] else "Opening of proceedings"
    )
    
    # Phase-specific instructions for evidence presentation
    phase_instructions = ""
    if state["phase"] == "evidence":
        phase_instructions = """
⚠️ CRITICAL: This is the EVIDENCE phase. You MUST present documentary evidence now!
Present at least one of:
- Technical inspection report
- Warranty/policy documents  
- Service records or logs
- Employee affidavit
- Communication records
- Expert opinion

Label each exhibit (Exhibit D-1, D-2, etc.) and quote specific contents.
"""
    elif state["phase"] == "arguments" and not evidence_presented:
        phase_instructions = """
💡 TIP: Support your arguments with documentary evidence. Present relevant documents now.
"""
    
    user_prompt = f"""
PROCEEDINGS SO FAR:
{conversation}

{'─' * 40}
{phase_instructions}

As defense counsel, respond appropriately to the current state of proceedings.
Remember to:
1. Defend your client's interests professionally
2. **PRESENT DOCUMENTARY EVIDENCE** to support your defense (exhibits, affidavits, reports)
3. Challenge weak evidence with counter-evidence
4. Quote specific documents and their contents
5. Indicate who should speak next
"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]
    
    response = llm.invoke(messages)
    parsed = parse_agent_response(response.content)
    
    new_message = create_message("DEFENSE", parsed["clean_content"], state["phase"])
    
    return {
        "messages": [new_message],
        "next_speaker": parsed["next_speaker"] or "CONSUMER",
        "turn_count": state["turn_count"] + 1,
        "last_significant_statement": parsed["clean_content"][:500],
        "awaiting_human_input": parsed["next_speaker"] == "CONSUMER"
    }


def consumer_input_node(state: CourtroomState) -> dict:
    """Human input node for consumer/complainant."""
    # This node handles the human input that was collected
    # The actual input collection happens in the main loop
    return {
        "awaiting_human_input": False,
        "next_speaker": "ROUTER"
    }


def router_node(state: CourtroomState) -> dict:
    """Router node to determine next speaker based on context."""
    llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.1)
    
    last_msg = state["messages"][-1] if state["messages"] else {"speaker": "SYSTEM", "content": ""}
    
    system_prompt = ROUTER_SYSTEM_PROMPT.format(
        phase=state["phase"],
        last_speaker=last_msg["speaker"],
        last_statement=last_msg["content"][:300],
        turn_count=state["turn_count"],
        concluded=state["concluded"],
        recent_messages=format_recent_messages(state["messages"], 5)
    )
    
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content="Determine the next speaker and any phase changes.")
    ])
    
    try:
        # Try to parse JSON response
        result = json.loads(response.content)
        next_speaker = result.get("next_speaker", "CONSUMER")
        phase_change = result.get("suggest_phase_change")
        should_conclude = result.get("should_conclude", False)
    except json.JSONDecodeError:
        # Fallback to simple alternation
        if last_msg["speaker"] == "CONSUMER":
            next_speaker = "DEFENSE"
        elif last_msg["speaker"] == "DEFENSE":
            next_speaker = "JUDGE"
        else:
            next_speaker = "CONSUMER"
        phase_change = None
        should_conclude = False
    
    updates = {
        "next_speaker": next_speaker,
        "awaiting_human_input": next_speaker == "CONSUMER"
    }
    
    if phase_change and phase_change in ["arguments", "evidence", "closing", "verdict"]:
        updates["phase"] = phase_change
        if phase_change == "verdict":
            updates["concluded"] = True
    
    if should_conclude:
        updates["concluded"] = True
    
    return updates


def verdict_node(state: CourtroomState) -> dict:
    """Final verdict generation node."""
    llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.2)
    
    # Compile all proceedings
    all_messages = "\n\n".join([
        f"[{m['speaker']}] ({m['phase']}): {m['content']}"
        for m in state["messages"]
    ])
    
    # Compile all judgment updates
    updates_summary = "\n".join([
        f"  • {u['field']}: {u['old_value']} → {u['new_value']} (Reason: {u['reason']})"
        for u in state["judgment_updates"]
    ]) if state["judgment_updates"] else "  No modifications during proceedings."
    
    verdict_prompt = f"""
As the presiding Judge, deliver the FINAL JUDGMENT in this matter.

═══════════════════════════════════════════════════════════════════════════════
                         COMPLETE CASE RECORD
═══════════════════════════════════════════════════════════════════════════════

{format_case_details(state["judgment_data"])}

═══════════════════════════════════════════════════════════════════════════════
                         PROCEEDINGS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

Total Hearings: {state["hearing_number"]}
Total Exchanges: {state["turn_count"]}

Judgment Modifications During Trial:
{updates_summary}

═══════════════════════════════════════════════════════════════════════════════
                         FULL PROCEEDINGS TRANSCRIPT
═══════════════════════════════════════════════════════════════════════════════

{all_messages}

═══════════════════════════════════════════════════════════════════════════════
                         JUDGMENT FORMAT REQUIRED
═══════════════════════════════════════════════════════════════════════════════

Deliver a formal judgment including:

1. CASE TITLE AND PARTIES

2. BRIEF FACTS

3. ISSUES FOR DETERMINATION

4. ANALYSIS AND FINDINGS ON EACH ISSUE
   - Cite relevant evidence and arguments
   - Apply applicable law
   - Reference precedents where helpful

5. CONCLUSION ON LIABILITY

6. RELIEF/ORDER
   - Specific amounts if compensation awarded
   - Timeline for compliance
   - Any other directions

7. COSTS

8. DATED AND SIGNED

Use formal judicial language appropriate for an Indian Consumer Court judgment.
"""

    response = llm.invoke([
        SystemMessage(content="You are an experienced Judge delivering a formal judgment."),
        HumanMessage(content=verdict_prompt)
    ])
    
    verdict_message = create_message("JUDGE", response.content, "verdict")
    
    # Create verdict details
    rg = state["judgment_data"].get("Relief_Granted", {})
    verdict_details = VerdictDetails(
        summary="Judgment pronounced after full hearing",
        issues_determined=state["judgment_data"].get("Judgment_Reasoning", {}).get("Issues_Framed", []),
        final_order=response.content,
        relief_granted=rg,
        costs="As awarded in judgment",
        pronounced_on=datetime.now().strftime("%d %B %Y")
    )
    
    return {
        "messages": [verdict_message],
        "verdict": verdict_details,
        "concluded": True,
        "phase": "verdict",
        "next_speaker": "END"
    }


# ============================================================================
# Graph Edges (Routing Logic)
# ============================================================================

def should_continue(state: CourtroomState) -> str:
    """Determine if simulation should continue or end."""
    if state["concluded"]:
        if state.get("verdict"):
            return "end"
        else:
            return "verdict"
    
    if state["turn_count"] >= 30:  # Safety limit
        return "verdict"
    
    return "route"


def route_to_speaker(state: CourtroomState) -> str:
    """Route to the appropriate speaker node."""
    next_speaker = state.get("next_speaker", "CONSUMER")
    
    if next_speaker == "JUDGE":
        return "judge"
    elif next_speaker == "DEFENSE":
        return "defense"
    elif next_speaker == "CONSUMER":
        return "consumer_input"
    else:
        return "router"


# ============================================================================
# Graph Construction
# ============================================================================

def build_courtroom_graph():
    """Build the LangGraph courtroom simulation graph."""
    
    # Create the graph with our state schema
    workflow = StateGraph(CourtroomState)
    
    # Add nodes
    workflow.add_node("judge", judge_node)
    workflow.add_node("defense", defense_node)
    workflow.add_node("consumer_input", consumer_input_node)
    workflow.add_node("router", router_node)
    workflow.add_node("verdict", verdict_node)
    
    # Set entry point - Judge opens proceedings
    workflow.set_entry_point("judge")
    
    # Add edges from judge
    workflow.add_conditional_edges(
        "judge",
        should_continue,
        {
            "route": "router",
            "verdict": "verdict",
            "end": END
        }
    )
    
    # Add edges from defense
    workflow.add_conditional_edges(
        "defense",
        should_continue,
        {
            "route": "router",
            "verdict": "verdict",
            "end": END
        }
    )
    
    # Consumer input goes to router
    workflow.add_edge("consumer_input", "router")
    
    # Router determines next speaker
    workflow.add_conditional_edges(
        "router",
        route_to_speaker,
        {
            "judge": "judge",
            "defense": "defense",
            "consumer_input": "consumer_input"
        }
    )
    
    # Verdict goes to end
    workflow.add_edge("verdict", END)
    
    # Compile with memory checkpointing
    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)


# ============================================================================
# Console Interface
# ============================================================================

def print_courtroom_header():
    """Print courtroom header."""
    print("\n" + "═" * 80)
    print("          DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION")
    print("                      COURTROOM SIMULATION")
    print("═" * 80)


def print_phase_banner(phase: str, hearing: int):
    """Print phase banner."""
    phase_names = {
        "opening": "OPENING OF PROCEEDINGS",
        "arguments": "ARGUMENTS",
        "evidence": "EVIDENCE EXAMINATION",
        "closing": "CLOSING SUBMISSIONS",
        "verdict": "FINAL JUDGMENT"
    }
    print(f"\n{'─' * 80}")
    print(f"  📋 HEARING #{hearing} | {phase_names.get(phase, phase.upper())}")
    print(f"{'─' * 80}")


def print_message(message: Message):
    """Print a courtroom message with formatting."""
    speaker_icons = {
        "JUDGE": "⚖️  HON'BLE JUDGE",
        "DEFENSE": "👔 DEFENSE COUNSEL",
        "CONSUMER": "👤 COMPLAINANT",
        "SYSTEM": "📋 COURT CLERK"
    }
    
    speaker = speaker_icons.get(message["speaker"], message["speaker"])
    print(f"\n{speaker}:")
    print("─" * 40)
    
    # Word wrap
    content = message["content"]
    lines = content.split('\n')
    for line in lines:
        words = line.split()
        current_line = "  "
        for word in words:
            if len(current_line) + len(word) + 1 <= 78:
                current_line += word + " "
            else:
                print(current_line)
                current_line = "  " + word + " "
        if current_line.strip():
            print(current_line)
    print()


def print_judgment_update(update: JudgmentUpdate):
    """Print a judgment update notification."""
    print(f"\n📝 COURT RECORD UPDATED:")
    print(f"   Field: {update['field']}")
    if update['old_value']:
        print(f"   Previous: {update['old_value']}")
    print(f"   Updated to: {update['new_value']}")
    print(f"   Reason: {update['reason']}")


def get_consumer_input() -> str:
    """Get input from the human user (consumer)."""
    print("\n" + "─" * 40)
    print("  YOUR TURN (Consumer/Complainant)")
    print("─" * 40)
    print("  Commands:")
    print("    Type your statement or argument")
    print("    'evidence' - Present documentary evidence")
    print("    'rest' - Rest your case")
    print("    'quit' - Exit simulation")
    print()
    
    user_input = input("  Your statement: ").strip()
    
    if user_input.lower() == 'quit':
        return None
    elif user_input.lower() == 'rest':
        return "Your Honor, I have presented all my evidence and arguments. I rest my case and pray for the relief claimed in my complaint."
    elif user_input.lower() == 'evidence':
        print("\n  Describe the evidence you wish to present:")
        evidence = input("  Evidence: ").strip()
        return f"Your Honor, I wish to place on record the following evidence: {evidence}"
    
    return user_input

def run_courtroom_simulation(judgment_file_path: str):
    """
    Run the courtroom simulation with explicit turn-based flow.
    
    Args:
        judgment_file_path: Path to the judgment prediction JSON file
    """
    # Load judgment data
    print_courtroom_header()
    print(f"\n📁 Loading case file: {judgment_file_path}")
    
    judgment_data = load_judgment_json(judgment_file_path)
    original_data = json.loads(json.dumps(judgment_data))  # Deep copy
    
    # Case information
    case_title = judgment_data.get("Case_Summary", {}).get("Title", "Consumer Case")
    print(f"\n📋 CASE: {case_title}")
    print(f"📅 Date: {datetime.now().strftime('%d %B %Y')}")
    
    print("\n⚙️  Initializing courtroom simulation...")
    
    # Initialize state
    current_state: CourtroomState = {
        "messages": [],
        "judgment_data": judgment_data,
        "judgment_updates": [],
        "phase": "opening",
        "hearing_number": 1,
        "turn_count": 0,
        "concluded": False,
        "next_speaker": "JUDGE",
        "last_significant_statement": "",
        "awaiting_human_input": False,
        "verdict": None,
        "original_judgment_data": original_data,
        "case_file_path": judgment_file_path,
        "pending_questions": []
    }
    
    print("\n" + "═" * 80)
    print("                         PROCEEDINGS BEGIN")
    print("═" * 80)
    
    current_phase = "opening"
    current_hearing = 1
    print_phase_banner(current_phase, current_hearing)
    
    # Main simulation loop - explicit turn-based
    simulation_running = True
    judge_intervention_counter = 0  # Track turns since last judge intervention
    
    while simulation_running and not current_state["concluded"]:
        try:
            next_speaker = current_state.get("next_speaker", "JUDGE")
            
            # ─────────────────────────────────────────────────────────────
            # JUDGE'S TURN
            # ─────────────────────────────────────────────────────────────
            if next_speaker == "JUDGE":
                print("\n💭 The Hon'ble Judge is considering...")
                result = judge_node(current_state)
                judge_intervention_counter = 0  # Reset counter
                
                # Update state
                for key, value in result.items():
                    if key == "messages" and isinstance(value, list):
                        current_state["messages"].extend(value)
                        for msg in value:
                            print_message(msg)
                    elif key == "judgment_updates" and isinstance(value, list):
                        current_state["judgment_updates"].extend(value)
                        for update in value:
                            print_judgment_update(update)
                    else:
                        current_state[key] = value
                
                # Check phase change
                if current_state["phase"] != current_phase:
                    current_phase = current_state["phase"]
                    print_phase_banner(current_phase, current_state["hearing_number"])
                
                # Check if verdict phase
                if current_state["phase"] == "verdict" and not current_state.get("verdict"):
                    current_state["next_speaker"] = "VERDICT"
                    continue
            
            # ─────────────────────────────────────────────────────────────
            # CONSUMER'S TURN (Human Input)
            # ─────────────────────────────────────────────────────────────
            elif next_speaker == "CONSUMER":
                user_input = get_consumer_input()
                
                if user_input is None:
                    print("\n⚠️  Simulation terminated by user.")
                    simulation_running = False
                    break
                
                # Add user message
                user_message = create_message("CONSUMER", user_input, current_state["phase"])
                current_state["messages"].append(user_message)
                print_message(user_message)
                current_state["turn_count"] += 1
                judge_intervention_counter += 1
                
                # After consumer speaks, DEFENSE should respond
                current_state["next_speaker"] = "DEFENSE"
            
            # ─────────────────────────────────────────────────────────────
            # DEFENSE'S TURN
            # ─────────────────────────────────────────────────────────────
            elif next_speaker == "DEFENSE":
                print("\n💭 Defense counsel is preparing response...")
                result = defense_node(current_state)
                judge_intervention_counter += 1
                
                # Update state
                for key, value in result.items():
                    if key == "messages" and isinstance(value, list):
                        current_state["messages"].extend(value)
                        for msg in value:
                            print_message(msg)
                    else:
                        current_state[key] = value
                
                # Decide if Judge should intervene or let consumer respond
                # Judge intervenes if:
                # 1. Defense explicitly asks for Judge (next_speaker from response)
                # 2. Every 4-6 exchanges for observations
                # 3. Phase transition is needed
                # 4. Significant evidence was presented
                
                defense_response = current_state["messages"][-1]["content"].lower()
                needs_judge = False
                
                # Check if defense asked for judge
                if result.get("next_speaker") == "JUDGE":
                    needs_judge = True
                
                # Check for significant moments requiring judicial observation
                significant_keywords = [
                    "exhibit", "affidavit", "submit", "produce", "place on record",
                    "your honor", "may it please the court", "conclusively",
                    "no evidence", "burden of proof", "fabricat", "false"
                ]
                if any(kw in defense_response for kw in significant_keywords):
                    # 50% chance judge comments on significant evidence
                    if judge_intervention_counter >= 2:
                        needs_judge = True
                
                # Periodic intervention (every 4-6 exchanges)
                if judge_intervention_counter >= 4:
                    needs_judge = True
                
                # Set next speaker
                if needs_judge:
                    current_state["next_speaker"] = "JUDGE"
                else:
                    # Let consumer respond directly
                    current_state["next_speaker"] = "CONSUMER"
            
            # ─────────────────────────────────────────────────────────────
            # VERDICT GENERATION
            # ─────────────────────────────────────────────────────────────
            elif next_speaker == "VERDICT":
                print("\n⚖️  The Hon'ble Judge is preparing the final verdict...")
                print_phase_banner("verdict", current_state["hearing_number"])
                
                result = verdict_node(current_state)
                
                # Update state
                for key, value in result.items():
                    if key == "messages" and isinstance(value, list):
                        current_state["messages"].extend(value)
                        for msg in value:
                            print_message(msg)
                    else:
                        current_state[key] = value
                
                current_state["concluded"] = True
                simulation_running = False
            
            # ─────────────────────────────────────────────────────────────
            # ROUTER (fallback)
            # ─────────────────────────────────────────────────────────────
            else:
                # Use router to determine next speaker
                result = router_node(current_state)
                for key, value in result.items():
                    current_state[key] = value
            
            # Safety check for maximum turns
            if current_state.get("turn_count", 0) >= 30:
                print("\n⚠️  Maximum turns reached. Proceeding to verdict...")
                current_state["next_speaker"] = "VERDICT"
        
        except KeyboardInterrupt:
            print("\n\n⚠️  Simulation interrupted by user.")
            simulation_running = False
        except Exception as e:
            print(f"\n❌ Error during simulation: {e}")
            import traceback
            traceback.print_exc()
            simulation_running = False
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = SIMULATION_DIR / f"courtroom_{timestamp}"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save final judgment
    final_judgment_path = output_dir / "final_judgment.json"
    save_judgment_json(current_state["judgment_data"], str(final_judgment_path))
    print(f"\n✅ Final judgment saved to: {final_judgment_path}")
    
    # Save proceedings log
    proceedings_path = output_dir / "proceedings_log.json"
    proceedings_log = {
        "case_title": case_title,
        "simulation_date": datetime.now().isoformat(),
        "total_hearings": current_state.get("hearing_number", 1),
        "total_turns": current_state.get("turn_count", 0),
        "case_concluded": current_state.get("concluded", False),
        "final_phase": current_state.get("phase", "unknown"),
        "proceedings": [
            {
                "speaker": m["speaker"],
                "content": m["content"],
                "phase": m["phase"],
                "timestamp": m["timestamp"]
            }
            for m in current_state["messages"]
        ],
        "judgment_modifications": [
            {
                "field": u["field"],
                "old_value": u["old_value"],
                "new_value": u["new_value"],
                "reason": u["reason"],
                "updated_by": u["updated_by"]
            }
            for u in current_state.get("judgment_updates", [])
        ]
    }
    
    # Add verdict if available
    if current_state.get("verdict"):
        proceedings_log["verdict"] = current_state["verdict"]
    
    with open(proceedings_path, "w", encoding="utf-8") as f:
        json.dump(proceedings_log, f, indent=2, ensure_ascii=False)
    print(f"✅ Proceedings log saved to: {proceedings_path}")
    
    # Save comparison
    comparison_path = output_dir / "judgment_comparison.json"
    with open(comparison_path, "w", encoding="utf-8") as f:
        json.dump({
            "original_prediction": original_data,
            "final_judgment": current_state["judgment_data"],
            "modifications_count": len(current_state.get("judgment_updates", [])),
            "total_exchanges": current_state.get("turn_count", 0)
        }, f, indent=2, ensure_ascii=False)
    print(f"✅ Judgment comparison saved to: {comparison_path}")
    
    print("\n" + "═" * 80)
    print("                         SIMULATION COMPLETE")
    print("═" * 80)
    
    return current_state


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run a courtroom simulation based on a judgment prediction JSON file."
    )
    parser.add_argument(
        "--case-file", "-f",
        type=str,
        required=True,
        help="Path to the judgment prediction JSON file"
    )
    
    args = parser.parse_args()
    
    # Validate file exists
    case_path = Path(args.case_file)
    if not case_path.exists():
        print(f"❌ Error: Case file not found: {args.case_file}")
        exit(1)
    
    if not case_path.suffix == ".json":
        print(f"❌ Error: Case file must be a JSON file: {args.case_file}")
        exit(1)
    
    run_courtroom_simulation(str(case_path))
