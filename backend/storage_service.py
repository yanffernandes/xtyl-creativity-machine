"""
Storage Service - Cloudflare R2 (S3-Compatible Object Storage)
Handles file upload, download, and management using boto3 with R2
"""

import os
import io
from typing import Optional, List
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# R2 Configuration
R2_ENDPOINT = os.getenv("R2_ENDPOINT", "")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY", "")
R2_BUCKET = os.getenv("R2_BUCKET", "xtyl-storage")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")

# Initialize S3 client for R2
_s3_client = None

def get_s3_client():
    """Get or create the S3 client for R2."""
    global _s3_client

    if _s3_client is not None:
        return _s3_client

    if not R2_ENDPOINT or not R2_ACCESS_KEY or not R2_SECRET_KEY:
        print("Warning: R2 storage not configured. Set R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY environment variables.")
        return None

    try:
        _s3_client = boto3.client(
            's3',
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY,
            aws_secret_access_key=R2_SECRET_KEY,
            config=Config(
                signature_version='s3v4',
                retries={'max_attempts': 3, 'mode': 'standard'}
            )
        )
        print(f"✓ R2 storage service initialized: {R2_ENDPOINT}")
        return _s3_client
    except Exception as e:
        print(f"✗ R2 storage initialization failed: {e}")
        return None


def upload_file(
    file_data: bytes,
    file_name: str,
    content_type: str = "application/octet-stream",
    folder: str = ""
) -> str:
    """
    Upload file to R2 storage

    Args:
        file_data: File content as bytes
        file_name: Name of the file
        content_type: MIME type of the file
        folder: Optional folder path within bucket

    Returns:
        Public URL of the uploaded file

    Raises:
        Exception: If upload fails
    """
    client = get_s3_client()
    if not client:
        raise Exception("R2 storage client not initialized. Check R2 environment variables.")

    try:
        # Build object key with folder path
        object_key = f"{folder}/{file_name}" if folder else file_name

        # Remove leading slash if present
        object_key = object_key.lstrip('/')

        # Upload to R2
        client.put_object(
            Bucket=R2_BUCKET,
            Key=object_key,
            Body=file_data,
            ContentType=content_type
        )

        # Generate public URL (R2 bucket is configured as public)
        if R2_PUBLIC_URL:
            url = f"{R2_PUBLIC_URL.rstrip('/')}/{object_key}"
        else:
            # Fallback to endpoint URL (won't work without public access)
            url = f"{R2_ENDPOINT}/{R2_BUCKET}/{object_key}"

        return url

    except ClientError as e:
        raise Exception(f"R2 upload failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File upload error: {str(e)}")


def download_file(object_name: str) -> bytes:
    """
    Download file from R2 storage

    Args:
        object_name: Path to the object in R2

    Returns:
        File content as bytes

    Raises:
        Exception: If download fails
    """
    client = get_s3_client()
    if not client:
        raise Exception("R2 storage client not initialized")

    try:
        # Remove leading slash if present
        object_name = object_name.lstrip('/')

        response = client.get_object(Bucket=R2_BUCKET, Key=object_name)
        data = response['Body'].read()
        return data

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'NoSuchKey':
            raise Exception(f"File not found: {object_name}")
        raise Exception(f"R2 download failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File download error: {str(e)}")


def delete_file(object_name: str) -> bool:
    """
    Delete file from R2 storage

    Args:
        object_name: Path to the object in R2

    Returns:
        True if successful

    Raises:
        Exception: If deletion fails
    """
    client = get_s3_client()
    if not client:
        raise Exception("R2 storage client not initialized")

    try:
        # Remove leading slash if present
        object_name = object_name.lstrip('/')

        client.delete_object(Bucket=R2_BUCKET, Key=object_name)
        return True

    except ClientError as e:
        raise Exception(f"R2 deletion failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File deletion error: {str(e)}")


def get_presigned_url(object_name: str, expires: int = 3600) -> str:
    """
    Get presigned URL for temporary access to a file
    Note: For public buckets, you can use the direct public URL instead

    Args:
        object_name: Path to the object in R2
        expires: URL expiration time in seconds (default 1 hour)

    Returns:
        Presigned URL

    Raises:
        Exception: If URL generation fails
    """
    client = get_s3_client()
    if not client:
        raise Exception("R2 storage client not initialized")

    try:
        # Remove leading slash if present
        object_name = object_name.lstrip('/')

        url = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': R2_BUCKET, 'Key': object_name},
            ExpiresIn=expires
        )
        return url

    except ClientError as e:
        raise Exception(f"R2 presigned URL failed: {str(e)}")
    except Exception as e:
        raise Exception(f"URL generation error: {str(e)}")


def list_files(prefix: str = "") -> List[str]:
    """
    List files in R2 storage

    Args:
        prefix: Optional prefix to filter files

    Returns:
        List of object names

    Raises:
        Exception: If listing fails
    """
    client = get_s3_client()
    if not client:
        raise Exception("R2 storage client not initialized")

    try:
        response = client.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix)

        if 'Contents' not in response:
            return []

        return [obj['Key'] for obj in response['Contents']]

    except ClientError as e:
        raise Exception(f"R2 list failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File listing error: {str(e)}")


def file_exists(object_name: str) -> bool:
    """
    Check if file exists in R2 storage

    Args:
        object_name: Path to the object in R2

    Returns:
        True if file exists, False otherwise
    """
    client = get_s3_client()
    if not client:
        return False

    try:
        # Remove leading slash if present
        object_name = object_name.lstrip('/')

        client.head_object(Bucket=R2_BUCKET, Key=object_name)
        return True
    except ClientError as e:
        if e.response.get('Error', {}).get('Code') == '404':
            return False
        return False
    except:
        return False


def get_public_url(object_name: str) -> str:
    """
    Get the public URL for an object (for public buckets)

    Args:
        object_name: Path to the object in R2

    Returns:
        Public URL
    """
    # Remove leading slash if present
    object_name = object_name.lstrip('/')

    if R2_PUBLIC_URL:
        return f"{R2_PUBLIC_URL.rstrip('/')}/{object_name}"
    else:
        return f"{R2_ENDPOINT}/{R2_BUCKET}/{object_name}"


def check_connection() -> bool:
    """
    Check if R2 connection is working

    Returns:
        True if connection is successful
    """
    client = get_s3_client()
    if not client:
        return False

    try:
        client.head_bucket(Bucket=R2_BUCKET)
        return True
    except:
        return False


async def download_and_upload_image(
    image_url: str,
    project_id: str,
    filename_prefix: str = "image"
) -> dict:
    """
    Download an image from a URL and upload it to R2 storage.
    Feature 029: Used for storing fal.ai generated images.

    Args:
        image_url: URL of the image to download
        project_id: Project ID for organizing the file
        filename_prefix: Prefix for the filename

    Returns:
        Dict with file_url and thumbnail_url
    """
    import httpx
    import uuid
    from PIL import Image

    # Download the image
    async with httpx.AsyncClient() as client:
        response = await client.get(image_url, follow_redirects=True)
        response.raise_for_status()
        image_data = response.content

    # Determine content type from response headers
    content_type = response.headers.get("content-type", "image/png")
    if "jpeg" in content_type or "jpg" in content_type:
        extension = "jpg"
    elif "webp" in content_type:
        extension = "webp"
    else:
        extension = "png"

    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{filename_prefix}_{unique_id}.{extension}"
    folder = f"projects/{project_id}/generated"

    # Upload original image
    file_url = upload_file(
        file_data=image_data,
        file_name=filename,
        content_type=content_type,
        folder=folder
    )

    # Generate and upload thumbnail
    thumbnail_url = file_url  # Default to original if thumbnail fails
    try:
        img = Image.open(io.BytesIO(image_data))
        img.thumbnail((256, 256), Image.Resampling.LANCZOS)

        thumbnail_buffer = io.BytesIO()
        img_format = "JPEG" if extension == "jpg" else "PNG"
        img.save(thumbnail_buffer, format=img_format, quality=85)
        thumbnail_buffer.seek(0)

        thumb_filename = f"{filename_prefix}_{unique_id}_thumb.{extension}"
        thumbnail_url = upload_file(
            file_data=thumbnail_buffer.read(),
            file_name=thumb_filename,
            content_type=content_type,
            folder=folder
        )
    except Exception as e:
        print(f"Warning: Failed to create thumbnail: {e}")

    return {
        "file_url": file_url,
        "thumbnail_url": thumbnail_url
    }


async def generate_and_update_thumbnail(
    document_id: str,
    image_url: str,
    project_id: str
) -> Optional[str]:
    """
    Feature 030: Async thumbnail generation for fire-and-forget operations.
    Downloads image, creates thumbnail, uploads to R2, and updates document.

    Use with asyncio.create_task() for non-blocking thumbnail generation:
        asyncio.create_task(generate_and_update_thumbnail(doc_id, url, project_id))

    Args:
        document_id: Document ID to update with thumbnail URL
        image_url: URL of the original image
        project_id: Project ID for storage path

    Returns:
        Thumbnail URL if successful, None on failure
    """
    import httpx
    import uuid
    from PIL import Image

    try:
        # Download the original image
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, follow_redirects=True)
            response.raise_for_status()
            image_data = response.content

        # Determine format
        content_type = response.headers.get("content-type", "image/png")
        if "jpeg" in content_type or "jpg" in content_type:
            extension = "jpg"
            img_format = "JPEG"
        elif "webp" in content_type:
            extension = "webp"
            img_format = "WEBP"
        else:
            extension = "png"
            img_format = "PNG"

        # Create thumbnail
        img = Image.open(io.BytesIO(image_data))
        img.thumbnail((256, 256), Image.Resampling.LANCZOS)

        thumbnail_buffer = io.BytesIO()
        img.save(thumbnail_buffer, format=img_format, quality=85)
        thumbnail_buffer.seek(0)

        # Upload thumbnail
        unique_id = str(uuid.uuid4())[:8]
        thumb_filename = f"thumb_{unique_id}.{extension}"
        folder = f"projects/{project_id}/thumbnails"

        thumbnail_url = upload_file(
            file_data=thumbnail_buffer.read(),
            file_name=thumb_filename,
            content_type=content_type,
            folder=folder
        )

        # Update document in database
        from database import SessionLocal
        import models

        db = SessionLocal()
        try:
            doc = db.query(models.Document).filter(
                models.Document.id == document_id
            ).first()
            if doc:
                doc.thumbnail_url = thumbnail_url
                db.commit()
                print(f"✓ Thumbnail generated and updated for document {document_id}")
        finally:
            db.close()

        return thumbnail_url

    except Exception as e:
        print(f"✗ Async thumbnail generation failed for {document_id}: {e}")
        return None


async def download_and_upload_image_fast(
    image_url: str,
    project_id: str,
    filename_prefix: str = "image",
    document_id: Optional[str] = None
) -> dict:
    """
    Feature 030: Fast image upload that defers thumbnail generation.

    If document_id is provided, schedules background thumbnail generation.
    Returns immediately with file_url (thumbnail_url will be updated async).

    Args:
        image_url: URL of the image to download
        project_id: Project ID for organizing the file
        filename_prefix: Prefix for the filename
        document_id: Optional document ID for async thumbnail update

    Returns:
        Dict with file_url and thumbnail_url (may be same as file_url initially)
    """
    import httpx
    import uuid
    import asyncio

    # Download the image
    async with httpx.AsyncClient() as client:
        response = await client.get(image_url, follow_redirects=True)
        response.raise_for_status()
        image_data = response.content

    # Determine content type from response headers
    content_type = response.headers.get("content-type", "image/png")
    if "jpeg" in content_type or "jpg" in content_type:
        extension = "jpg"
    elif "webp" in content_type:
        extension = "webp"
    else:
        extension = "png"

    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{filename_prefix}_{unique_id}.{extension}"
    folder = f"projects/{project_id}/generated"

    # Upload original image
    file_url = upload_file(
        file_data=image_data,
        file_name=filename,
        content_type=content_type,
        folder=folder
    )

    # Schedule background thumbnail generation if document_id provided
    if document_id:
        asyncio.create_task(generate_and_update_thumbnail(
            document_id=document_id,
            image_url=file_url,  # Use uploaded URL for reliability
            project_id=project_id
        ))
        # Return file_url as placeholder for thumbnail
        return {
            "file_url": file_url,
            "thumbnail_url": file_url  # Will be updated async
        }
    else:
        # Fallback to sync thumbnail for backward compatibility
        return await download_and_upload_image(image_url, project_id, filename_prefix)
