"""
Storage Router
Endpoints for file uploads and storage management.
Feature 029: Upload masks for image editing.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict
import uuid
import logging

from storage_service import upload_file
from supabase_auth import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/storage", tags=["storage"])


@router.post("/upload-mask")
async def upload_mask(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a mask image for inpainting operations.

    Feature 029: Accepts a PNG mask file and uploads to R2 storage.
    Returns the public URL of the uploaded mask.

    Args:
        file: PNG mask file (white = edit area, black = preserve area)
        project_id: Project ID for folder organization

    Returns:
        {"url": "https://..."}
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read file content
        file_data = await file.read()

        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        unique_filename = f"mask_{uuid.uuid4().hex}.{file_extension}"

        # Upload to R2 with project folder
        folder = f"projects/{project_id}/masks"
        url = upload_file(
            file_data=file_data,
            file_name=unique_filename,
            content_type=file.content_type or 'image/png',
            folder=folder
        )

        logger.info(f"Mask uploaded: {url}")

        return {"url": url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Mask upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
