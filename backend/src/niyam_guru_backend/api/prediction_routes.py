"""
API routes for judgment prediction.

This module provides FastAPI endpoints that receive consumer complaint data
from the frontend and pass it to the judgment prediction module.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import base64
import json

from niyam_guru_backend.simulation.judgement_prediction import (
    run_judgment_prediction_from_api,
    ConsumerComplaintData,
    UploadedDocument,
)

router = APIRouter(prefix="/api/prediction", tags=["Prediction"])


# ========== Pydantic Models for Request Validation ==========

class FileData(BaseModel):
    """Represents an uploaded file from the frontend."""
    name: str = Field(..., description="Original filename")
    category: str = Field(..., description="Document category (e.g., 'Purchase Receipt/Invoice')")
    file_type: str = Field(..., description="MIME type (e.g., 'application/pdf', 'image/jpeg')")
    content: str = Field(..., description="Base64 encoded file content")


class ComplaintFormData(BaseModel):
    """Consumer complaint form data from frontend."""
    # Complainant Details
    complainantName: str = ""
    complainantFatherHusbandName: str = ""
    complainantAddress: str = ""
    complainantPhone: str = ""
    complainantEmail: str = ""
    complainantAge: str = ""
    complainantOccupation: str = ""
    
    # Opposite Party Details
    oppositePartyName: str = ""
    oppositePartyAddress: str = ""
    oppositePartyPhone: str = ""
    oppositePartyEmail: str = ""
    oppositePartyDesignation: str = ""
    
    # Case Details
    paidAsConsideration: str = ""
    claimConsideration: str = ""
    dateOfCauseOfAction: str = ""
    stateOfCauseOfAction: str = ""
    districtOfCauseOfAction: str = ""
    caseCategory: str = ""
    subCategory: str = ""
    
    # Legacy/Forum fields
    forumName: str = ""
    districtName: str = ""
    stateName: str = ""
    complaintNumber: str = ""
    complaintYear: str = ""
    
    # Transaction Details
    productServiceDescription: str = ""
    purchaseDate: str = ""
    purchaseAmount: str = ""
    paymentMode: str = ""
    invoiceNumber: str = ""
    
    # Grievance Details
    grievanceDescription: str = ""
    deficiencyType: str = ""
    dateOfDeficiency: str = ""
    
    # Prior Communication
    priorComplaintDate: str = ""
    priorComplaintDetails: str = ""
    responseReceived: str = ""
    
    # Relief Sought
    reliefSought: str = ""
    
    # Supporting Documents
    documentsAttached: str = ""


class PredictionRequest(BaseModel):
    """Complete prediction request with form data and files."""
    formData: ComplaintFormData
    files: Optional[List[FileData]] = None
    userId: Optional[str] = None
    saveToDb: bool = True


class PredictionResponse(BaseModel):
    """Response from the prediction endpoint."""
    success: bool
    prediction: Optional[dict] = None
    predictionId: Optional[str] = None
    error: Optional[str] = None


# ========== API Endpoints ==========

@router.post("/analyze", response_model=PredictionResponse)
async def analyze_complaint(request: PredictionRequest):
    """
    Analyze a consumer complaint and predict the judgment.
    
    This endpoint receives:
    - Form data from ConsumerComplaintTemplate
    - Uploaded files (PDFs, images) as base64
    - Optional user ID for database association
    
    Files are passed directly to Google Gemini for multimodal analysis
    without any local storage.
    """
    try:
        print("\n" + "=" * 70)
        print("📩 Received prediction request from frontend")
        print("=" * 70)
        
        # Convert Pydantic model to dict for the prediction function
        form_dict = request.formData.model_dump()
        
        # Convert file data to the expected format
        file_data = None
        if request.files:
            file_data = [
                {
                    "name": f.name,
                    "category": f.category,
                    "file_type": f.file_type,
                    "content": f.content,
                }
                for f in request.files
            ]
            print(f"📎 Received {len(file_data)} files for analysis")
        
        # Log key form data
        print(f"👤 Complainant: {form_dict.get('complainantName', 'N/A')}")
        print(f"🏢 Opposite Party: {form_dict.get('oppositePartyName', 'N/A')}")
        print(f"📁 Category: {form_dict.get('caseCategory', 'N/A')}")
        print(f"💰 Claim Amount: Rs. {form_dict.get('claimConsideration', 'N/A')}")
        
        # Run the prediction
        result, supabase_id = run_judgment_prediction_from_api(
            form_data=form_dict,
            file_data=file_data,
            user_id=request.userId,
            save_to_db=request.saveToDb,
        )
        
        # Check for errors in the result
        if "error" in result:
            print(f"⚠️ Prediction completed with error: {result['error']}")
            return PredictionResponse(
                success=False,
                prediction=result,
                predictionId=supabase_id,
                error=result.get("error"),
            )
        
        print(f"✅ Prediction completed successfully, ID: {supabase_id}")
        return PredictionResponse(
            success=True,
            prediction=result,
            predictionId=supabase_id,
        )
        
    except Exception as e:
        print(f"❌ Error processing prediction request: {str(e)}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Error processing prediction: {str(e)}"
        )


@router.post("/analyze-multipart")
async def analyze_complaint_multipart(
    formData: str = Form(..., description="JSON string of form data"),
    files: List[UploadFile] = File(default=[], description="Uploaded files"),
    userId: Optional[str] = Form(default=None),
    saveToDb: bool = Form(default=True),
):
    """
    Alternative endpoint that accepts multipart/form-data.
    
    Useful when sending actual file uploads instead of base64.
    Files are read and converted to base64 for processing.
    """
    try:
        print("\n" + "=" * 70)
        print("📩 Received multipart prediction request")
        print("=" * 70)
        
        # Parse form data JSON
        form_dict = json.loads(formData)
        
        # Process uploaded files
        file_data = []
        for upload_file in files:
            content = await upload_file.read()
            b64_content = base64.b64encode(content).decode("utf-8")
            
            file_data.append({
                "name": upload_file.filename,
                "category": "Uploaded Document",  # Category would need to be passed separately
                "file_type": upload_file.content_type or "application/octet-stream",
                "content": b64_content,
            })
            print(f"📎 Processed file: {upload_file.filename} ({upload_file.content_type})")
        
        # Run the prediction
        result, supabase_id = run_judgment_prediction_from_api(
            form_data=form_dict,
            file_data=file_data if file_data else None,
            user_id=userId,
            save_to_db=saveToDb,
        )
        
        return {
            "success": "error" not in result,
            "prediction": result,
            "predictionId": supabase_id,
            "error": result.get("error") if "error" in result else None,
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid form data JSON: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing prediction: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "judgment-prediction"}
