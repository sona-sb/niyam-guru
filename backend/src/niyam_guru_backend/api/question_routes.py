"""
API routes for judge clarifying questions.

This module provides FastAPI endpoints for:
- Fetching AI-generated clarifying questions based on the case prediction
- Submitting user responses and updating the prediction accordingly
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional

from niyam_guru_backend.questionare.judge_questions import (
    get_judge_questions_for_prediction,
    submit_judge_responses,
)

router = APIRouter(prefix="/api/questions", tags=["Judge Questions"])


# ========== Pydantic Models ==========

class QuestionResponse(BaseModel):
    """Model for a single clarifying question."""
    question_id: int
    question_text: str
    context: str
    category: str


class GetQuestionsResponse(BaseModel):
    """Response model for getting questions."""
    success: bool
    prediction_id: Optional[str] = None
    case_title: Optional[str] = None
    opening_statement: Optional[str] = None
    questions: Optional[List[QuestionResponse]] = None
    error: Optional[str] = None


class UserAnswerInput(BaseModel):
    """Model for a single user answer."""
    question_id: int
    question_text: str
    response_text: str


class SubmitResponsesRequest(BaseModel):
    """Request model for submitting responses."""
    prediction_id: str = Field(..., description="UUID of the prediction")
    responses: List[UserAnswerInput] = Field(..., description="List of user responses")


class SubmitResponsesResponse(BaseModel):
    """Response model for submitting responses."""
    success: bool
    updated: Optional[bool] = None
    updates_applied: Optional[dict] = None
    new_factors: Optional[List[str]] = None
    analysis: Optional[str] = None
    judge_notes: Optional[str] = None
    response_analysis: Optional[List[dict]] = None
    contradictions_found: Optional[List[dict]] = None
    net_confidence_change: Optional[str] = None
    error: Optional[str] = None


# ========== Endpoints ==========

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "judge-questions"}


@router.get("/{prediction_id}")
async def get_questions(prediction_id: str) -> GetQuestionsResponse:
    """
    Get clarifying questions for a prediction.
    
    The AI analyzes the prediction and generates relevant questions
    that a judge would ask to clarify the case details.
    
    Args:
        prediction_id: UUID of the prediction record in Supabase
        
    Returns:
        GetQuestionsResponse with questions or error
    """
    try:
        result = get_judge_questions_for_prediction(prediction_id)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("error", "Failed to get questions")
            )
        
        return GetQuestionsResponse(
            success=True,
            prediction_id=result.get("prediction_id"),
            case_title=result.get("case_title"),
            opening_statement=result.get("opening_statement"),
            questions=[
                QuestionResponse(**q) for q in result.get("questions", [])
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting questions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )


@router.post("/submit")
async def submit_responses(request: SubmitResponsesRequest) -> SubmitResponsesResponse:
    """
    Submit user responses to clarifying questions.
    
    The AI analyzes the responses and may update the prediction
    based on new information provided by the user.
    
    Args:
        request: SubmitResponsesRequest with prediction_id and responses
        
    Returns:
        SubmitResponsesResponse with analysis result
    """
    try:
        # Convert to dict format expected by the function
        responses_list = [
            {
                "question_id": r.question_id,
                "question_text": r.question_text,
                "response_text": r.response_text
            }
            for r in request.responses
        ]
        
        result = submit_judge_responses(request.prediction_id, responses_list)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to process responses")
            )
        
        return SubmitResponsesResponse(
            success=True,
            updated=result.get("updated", False),
            updates_applied=result.get("updates_applied"),
            new_factors=result.get("new_factors"),
            analysis=result.get("analysis"),
            judge_notes=result.get("judge_notes"),
            response_analysis=result.get("response_analysis"),
            contradictions_found=result.get("contradictions_found"),
            net_confidence_change=result.get("net_confidence_change"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting responses: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )
