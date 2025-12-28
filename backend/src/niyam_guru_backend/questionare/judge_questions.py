"""
Judge Questions Module for Niyam Guru.

This module generates clarifying questions based on a predicted judgment,
processes user responses, and updates the prediction if necessary.
"""

import json
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from supabase import create_client, Client

from niyam_guru_backend.config import (
    LLM_MODEL,
    SUPABASE_URL,
    SUPABASE_KEY,
)


# ========== Data Classes ==========

@dataclass
class ClarifyingQuestion:
    """Represents a clarifying question from the judge."""
    question_id: int
    question_text: str
    context: str  # Why this question is being asked
    category: str  # e.g., "evidence", "timeline", "damages", "communication"


@dataclass
class UserResponse:
    """Represents a user's response to a clarifying question."""
    question_id: int
    question_text: str
    response_text: str


# ========== Supabase Functions ==========

def get_supabase_client() -> Client:
    """Get Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials not configured")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_prediction_from_supabase(prediction_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a prediction record from Supabase by ID.
    
    Args:
        prediction_id: UUID of the prediction record
        
    Returns:
        Dictionary containing the prediction data, or None if not found
    """
    try:
        supabase = get_supabase_client()
        response = supabase.table("judgment_predictions").select("*").eq("id", prediction_id).single().execute()
        return response.data
    except Exception as e:
        print(f"Error fetching prediction from Supabase: {e}")
        return None


def update_prediction_in_supabase(
    prediction_id: str, 
    updates: Dict[str, Any]
) -> bool:
    """
    Update a prediction record in Supabase.
    
    Args:
        prediction_id: UUID of the prediction record
        updates: Dictionary of fields to update
        
    Returns:
        True if successful, False otherwise
    """
    try:
        supabase = get_supabase_client()
        
        # Add updated_at timestamp
        updates["updated_at"] = "now()"
        
        response = supabase.table("judgment_predictions").update(updates).eq("id", prediction_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error updating prediction in Supabase: {e}")
        return False


# ========== LLM Functions ==========

def get_llm() -> ChatGoogleGenerativeAI:
    """Get the LLM instance."""
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=0.3,  # Lower temperature for more focused questions
    )


GENERATE_QUESTIONS_PROMPT = PromptTemplate(
    input_variables=["case_summary", "prediction_summary"],
    template="""You are a Consumer Disputes Redressal Forum Judge reviewing a consumer complaint case.

Based on the case details and the initial prediction analysis, you need to ask clarifying questions to the complainant before finalizing the judgment.

## Case Summary:
{case_summary}

## Initial Prediction Analysis:
{prediction_summary}

## Your Task:
Generate 2-4 clarifying questions (the number depends on how much clarity is needed for this specific case). Focus on:

1. **Evidence gaps**: Any missing documentation or proof that would strengthen/weaken the case
2. **Timeline clarity**: Any ambiguity in the sequence of events
3. **Communication attempts**: Prior attempts to resolve the matter with the opposite party
4. **Damages calculation**: How the claimed compensation amount was determined
5. **Additional circumstances**: Any relevant factors not mentioned in the complaint

## Important Guidelines:
- Questions should be professional and judicial in tone
- Each question should seek specific, relevant information
- Questions should help determine the fairness of the claimed compensation
- Don't ask redundant questions if information is already clear
- Questions should be open-ended to allow detailed responses

## Output Format:
Return a JSON object with the following structure:
{{
    "questions": [
        {{
            "question_id": 1,
            "question_text": "The actual question to ask the complainant",
            "context": "Brief explanation of why this information is needed",
            "category": "evidence|timeline|damages|communication|circumstances"
        }}
    ],
    "opening_statement": "A brief judicial opening statement before asking questions"
}}

Generate the questions now:
"""
)


def generate_clarifying_questions(
    prediction_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate clarifying questions based on the prediction data.
    
    Args:
        prediction_data: The prediction record from Supabase
        
    Returns:
        Dictionary containing opening_statement and list of questions
    """
    try:
        llm = get_llm()
        
        # Build case summary from prediction data
        case_summary = _build_case_summary(prediction_data)
        
        # Build prediction summary
        prediction_summary = _build_prediction_summary(prediction_data)
        
        # Generate questions using LLM
        prompt = GENERATE_QUESTIONS_PROMPT.format(
            case_summary=case_summary,
            prediction_summary=prediction_summary
        )
        
        response = llm.invoke(prompt)
        content = response.content
        
        # Parse JSON response
        # Handle markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        result = json.loads(content)
        return result
        
    except Exception as e:
        print(f"Error generating questions: {e}")
        # Return fallback questions
        return {
            "opening_statement": "I have reviewed your complaint. Before proceeding with the judgment, I need some clarifications.",
            "questions": [
                {
                    "question_id": 1,
                    "question_text": "Did you attempt to resolve this matter directly with the opposite party before filing this complaint? If yes, please describe their response.",
                    "context": "Understanding prior communication attempts",
                    "category": "communication"
                },
                {
                    "question_id": 2,
                    "question_text": "Can you provide details on how you calculated the compensation amount you are claiming?",
                    "context": "Verifying the basis for claimed damages",
                    "category": "damages"
                }
            ]
        }


def _build_case_summary(prediction_data: Dict[str, Any]) -> str:
    """Build a summary of the case from prediction data."""
    parts = []
    
    if prediction_data.get("case_title"):
        parts.append(f"**Case Title:** {prediction_data['case_title']}")
    
    if prediction_data.get("case_type"):
        parts.append(f"**Case Type:** {prediction_data['case_type']}")
    
    if prediction_data.get("claim_amount"):
        parts.append(f"**Claim Amount:** ₹{prediction_data['claim_amount']}")
    
    if prediction_data.get("consumer_description"):
        parts.append(f"**Consumer's Case:** {prediction_data['consumer_description']}")
    
    if prediction_data.get("opposite_party_description"):
        parts.append(f"**Opposite Party:** {prediction_data['opposite_party_description']}")
    
    # Add details from prediction_json if available
    prediction_json = prediction_data.get("prediction_json", {})
    if isinstance(prediction_json, str):
        try:
            prediction_json = json.loads(prediction_json)
        except:
            prediction_json = {}
    
    if prediction_json.get("grievance_description"):
        parts.append(f"**Grievance:** {prediction_json['grievance_description']}")
    
    if prediction_json.get("deficiency_type"):
        parts.append(f"**Deficiency Type:** {prediction_json['deficiency_type']}")
    
    return "\n".join(parts) if parts else "Case details not available"


def _build_prediction_summary(prediction_data: Dict[str, Any]) -> str:
    """Build a summary of the prediction analysis."""
    parts = []
    
    if prediction_data.get("case_strength"):
        parts.append(f"**Case Strength:** {prediction_data['case_strength']}")
    
    if prediction_data.get("success_probability"):
        parts.append(f"**Success Probability:** {prediction_data['success_probability']}")
    
    if prediction_data.get("liability_status"):
        parts.append(f"**Liability Assessment:** {prediction_data['liability_status']}")
    
    if prediction_data.get("recommended_forum"):
        parts.append(f"**Recommended Forum:** {prediction_data['recommended_forum']}")
    
    comp_min = prediction_data.get("compensation_minimum")
    comp_max = prediction_data.get("compensation_maximum")
    comp_likely = prediction_data.get("compensation_most_likely")
    
    if comp_min and comp_max:
        parts.append(f"**Compensation Range:** ₹{comp_min} - ₹{comp_max}")
    if comp_likely:
        parts.append(f"**Most Likely Compensation:** ₹{comp_likely}")
    
    return "\n".join(parts) if parts else "Prediction details not available"


# ========== Process Responses and Update Prediction ==========

ANALYZE_RESPONSES_PROMPT = PromptTemplate(
    input_variables=["case_summary", "original_prediction", "qa_session"],
    template="""You are a Consumer Disputes Redressal Forum Judge analyzing the complainant's responses to your clarifying questions.

## Original Case Summary:
{case_summary}

## Original Prediction:
{original_prediction}

## Clarifying Questions and Responses:
{qa_session}

## Your Task:
Based on the complainant's responses, determine if any aspects of the original prediction should be updated.

Consider:
1. Does new evidence strengthen or weaken the case?
2. Should the success probability be adjusted?
3. Should the compensation estimate be revised?
4. Are there any new factors that affect the case strength?
5. Any additional arguments that should be noted?

## Output Format:
Return a JSON object with the following structure:
{{
    "should_update": true/false,
    "updates": {{
        "case_strength": "STRONG/MODERATE/WEAK" (only if changed),
        "success_probability": "XX%" (only if changed),
        "compensation_minimum": "amount" (only if changed),
        "compensation_maximum": "amount" (only if changed),
        "compensation_most_likely": "amount" (only if changed)
    }},
    "new_factors": [
        "List of new factors revealed by responses that affect the case"
    ],
    "updated_analysis": "Brief explanation of how the responses affected the analysis",
    "judge_notes": "Any notes the judge wants to add based on the Q&A"
}}

If no updates are needed, set "should_update" to false and "updates" to an empty object.

Analyze the responses now:
"""
)


def process_user_responses(
    prediction_id: str,
    responses: List[UserResponse]
) -> Dict[str, Any]:
    """
    Process user responses to clarifying questions and update the prediction if needed.
    
    Args:
        prediction_id: UUID of the prediction record
        responses: List of UserResponse objects
        
    Returns:
        Dictionary containing the analysis result and any updates made
    """
    try:
        # Fetch the current prediction
        prediction_data = fetch_prediction_from_supabase(prediction_id)
        if not prediction_data:
            return {"success": False, "error": "Prediction not found"}
        
        llm = get_llm()
        
        # Build summaries
        case_summary = _build_case_summary(prediction_data)
        original_prediction = _build_prediction_summary(prediction_data)
        
        # Format Q&A session
        qa_session = _format_qa_session(responses)
        
        # Analyze responses using LLM
        prompt = ANALYZE_RESPONSES_PROMPT.format(
            case_summary=case_summary,
            original_prediction=original_prediction,
            qa_session=qa_session
        )
        
        response = llm.invoke(prompt)
        content = response.content
        
        # Parse JSON response
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        analysis = json.loads(content)
        
        # Update prediction if needed
        if analysis.get("should_update", False):
            updates = analysis.get("updates", {})
            
            # Also update prediction_json with new factors and notes
            current_json = prediction_data.get("prediction_json", {})
            if isinstance(current_json, str):
                try:
                    current_json = json.loads(current_json)
                except:
                    current_json = {}
            
            # Add new fields from analysis
            current_json["qa_new_factors"] = analysis.get("new_factors", [])
            current_json["qa_updated_analysis"] = analysis.get("updated_analysis", "")
            current_json["judge_notes"] = analysis.get("judge_notes", "")
            current_json["qa_completed"] = True
            current_json["qa_responses"] = [
                {"question": r.question_text, "response": r.response_text}
                for r in responses
            ]
            
            # Prepare full updates
            full_updates = {**updates, "prediction_json": json.dumps(current_json)}
            
            # Update in Supabase
            update_success = update_prediction_in_supabase(prediction_id, full_updates)
            
            return {
                "success": True,
                "updated": True,
                "updates_applied": updates,
                "new_factors": analysis.get("new_factors", []),
                "analysis": analysis.get("updated_analysis", ""),
                "db_update_success": update_success
            }
        else:
            # Just mark Q&A as completed without changing prediction
            current_json = prediction_data.get("prediction_json", {})
            if isinstance(current_json, str):
                try:
                    current_json = json.loads(current_json)
                except:
                    current_json = {}
            
            current_json["qa_completed"] = True
            current_json["qa_responses"] = [
                {"question": r.question_text, "response": r.response_text}
                for r in responses
            ]
            current_json["judge_notes"] = analysis.get("judge_notes", "No significant changes based on responses.")
            
            update_prediction_in_supabase(prediction_id, {"prediction_json": json.dumps(current_json)})
            
            return {
                "success": True,
                "updated": False,
                "analysis": "Responses reviewed. No changes to the original prediction were necessary.",
                "judge_notes": analysis.get("judge_notes", "")
            }
            
    except Exception as e:
        print(f"Error processing responses: {e}")
        return {"success": False, "error": str(e)}


def _format_qa_session(responses: List[UserResponse]) -> str:
    """Format the Q&A session for the LLM prompt."""
    qa_parts = []
    for r in responses:
        qa_parts.append(f"**Question {r.question_id}:** {r.question_text}")
        qa_parts.append(f"**Response:** {r.response_text}")
        qa_parts.append("")
    return "\n".join(qa_parts)


# ========== Main API Functions ==========

def get_judge_questions_for_prediction(prediction_id: str) -> Dict[str, Any]:
    """
    Main function to get clarifying questions for a prediction.
    
    Args:
        prediction_id: UUID of the prediction record
        
    Returns:
        Dictionary containing opening_statement and questions, or error
    """
    # Fetch prediction from Supabase
    prediction_data = fetch_prediction_from_supabase(prediction_id)
    
    if not prediction_data:
        return {
            "success": False,
            "error": "Prediction not found"
        }
    
    # Generate questions
    result = generate_clarifying_questions(prediction_data)
    
    return {
        "success": True,
        "prediction_id": prediction_id,
        "case_title": prediction_data.get("case_title", "Consumer Complaint"),
        "opening_statement": result.get("opening_statement", ""),
        "questions": result.get("questions", [])
    }


def submit_judge_responses(
    prediction_id: str,
    responses: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Main function to submit responses and update prediction.
    
    Args:
        prediction_id: UUID of the prediction record
        responses: List of response dictionaries with question_id, question_text, response_text
        
    Returns:
        Dictionary containing the result of processing
    """
    # Convert to UserResponse objects
    user_responses = [
        UserResponse(
            question_id=r.get("question_id", 0),
            question_text=r.get("question_text", ""),
            response_text=r.get("response_text", "")
        )
        for r in responses
    ]
    
    return process_user_responses(prediction_id, user_responses)
