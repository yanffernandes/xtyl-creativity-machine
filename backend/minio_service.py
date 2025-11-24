"""
MinIO Service - S3-Compatible Object Storage
Handles file upload, download, and management using MinIO
"""

import os
from minio import Minio
from minio.error import S3Error
from typing import Optional, BinaryIO
import io
from datetime import timedelta

# MinIO Configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "")  # Public URL for browser access
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "xtyl-storage")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

# Initialize MinIO client
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

# Lazy bucket initialization - will be done on first use
def ensure_bucket():
    """Ensure bucket exists. Call this before using MinIO."""
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
            print(f"✓ MinIO bucket '{MINIO_BUCKET}' created")
        else:
            print(f"✓ MinIO bucket '{MINIO_BUCKET}' exists")
    except Exception as e:
        print(f"✗ MinIO bucket check/creation failed: {e}")
        # Don't crash - let it fail on actual use if needed


def upload_file(
    file_data: bytes,
    file_name: str,
    content_type: str = "application/octet-stream",
    folder: str = ""
) -> str:
    """
    Upload file to MinIO storage

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
    # Ensure bucket exists before using
    ensure_bucket()

    try:
        # Build object name with folder path
        object_name = f"{folder}/{file_name}" if folder else file_name

        # Convert bytes to file-like object
        file_stream = io.BytesIO(file_data)
        file_size = len(file_data)

        # Upload to MinIO
        minio_client.put_object(
            MINIO_BUCKET,
            object_name,
            file_stream,
            file_size,
            content_type=content_type
        )

        # Generate public URL
        if MINIO_PUBLIC_URL:
            # Use configured public URL (for production)
            url = f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{object_name}"
        else:
            # Fallback to localhost for local development
            protocol = "https" if MINIO_SECURE else "http"
            external_endpoint = MINIO_ENDPOINT.replace("minio:9000", "localhost:9000")
            url = f"{protocol}://{external_endpoint}/{MINIO_BUCKET}/{object_name}"

        return url

    except S3Error as e:
        raise Exception(f"MinIO upload failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File upload error: {str(e)}")


def download_file(object_name: str) -> bytes:
    """
    Download file from MinIO storage

    Args:
        object_name: Path to the object in MinIO

    Returns:
        File content as bytes

    Raises:
        Exception: If download fails
    """
    if not minio_client:
        raise Exception("MinIO client not initialized")

    try:
        response = minio_client.get_object(MINIO_BUCKET, object_name)
        data = response.read()
        response.close()
        response.release_conn()
        return data

    except S3Error as e:
        raise Exception(f"MinIO download failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File download error: {str(e)}")


def delete_file(object_name: str) -> bool:
    """
    Delete file from MinIO storage

    Args:
        object_name: Path to the object in MinIO

    Returns:
        True if successful

    Raises:
        Exception: If deletion fails
    """
    if not minio_client:
        raise Exception("MinIO client not initialized")

    try:
        minio_client.remove_object(MINIO_BUCKET, object_name)
        return True

    except S3Error as e:
        raise Exception(f"MinIO deletion failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File deletion error: {str(e)}")


def get_presigned_url(object_name: str, expires: int = 3600) -> str:
    """
    Get presigned URL for temporary access to a file

    Args:
        object_name: Path to the object in MinIO
        expires: URL expiration time in seconds (default 1 hour)

    Returns:
        Presigned URL

    Raises:
        Exception: If URL generation fails
    """
    if not minio_client:
        raise Exception("MinIO client not initialized")

    try:
        url = minio_client.presigned_get_object(
            MINIO_BUCKET,
            object_name,
            expires=timedelta(seconds=expires)
        )
        return url

    except S3Error as e:
        raise Exception(f"MinIO presigned URL failed: {str(e)}")
    except Exception as e:
        raise Exception(f"URL generation error: {str(e)}")


def list_files(prefix: str = "") -> list:
    """
    List files in MinIO storage

    Args:
        prefix: Optional prefix to filter files

    Returns:
        List of object names

    Raises:
        Exception: If listing fails
    """
    if not minio_client:
        raise Exception("MinIO client not initialized")

    try:
        objects = minio_client.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True)
        return [obj.object_name for obj in objects]

    except S3Error as e:
        raise Exception(f"MinIO list failed: {str(e)}")
    except Exception as e:
        raise Exception(f"File listing error: {str(e)}")


def file_exists(object_name: str) -> bool:
    """
    Check if file exists in MinIO storage

    Args:
        object_name: Path to the object in MinIO

    Returns:
        True if file exists, False otherwise
    """
    if not minio_client:
        return False

    try:
        minio_client.stat_object(MINIO_BUCKET, object_name)
        return True
    except:
        return False
