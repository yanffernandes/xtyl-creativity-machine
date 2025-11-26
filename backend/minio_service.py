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

# Initialize MinIO client (MinIO 7.2+ API)
try:
    minio_client = Minio(
        endpoint=MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE
    )
    print(f"MinIO service initialized successfully: {MINIO_ENDPOINT}")
except Exception as e:
    minio_client = None
    print(f"Warning: MinIO service initialization failed: {e}")

# Lazy bucket initialization - will be done on first use
def ensure_bucket():
    """Ensure bucket exists and has public read access. Call this before using MinIO."""
    try:
        # Check if bucket exists, create if not (MinIO 7.2+ requires keyword arguments)
        if not minio_client.bucket_exists(bucket_name=MINIO_BUCKET):
            minio_client.make_bucket(bucket_name=MINIO_BUCKET)
            print(f"✓ MinIO bucket '{MINIO_BUCKET}' created")
        else:
            print(f"✓ MinIO bucket '{MINIO_BUCKET}' exists")

        # Set bucket policy to allow public read access
        # This allows anyone to view/download files but not upload or delete
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"]
                }
            ]
        }

        import json
        minio_client.set_bucket_policy(bucket_name=MINIO_BUCKET, policy=json.dumps(policy))
        print(f"✓ MinIO bucket '{MINIO_BUCKET}' policy set to public read")

    except Exception as e:
        print(f"✗ MinIO bucket setup failed: {e}")
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

        # Upload to MinIO (v7.2+ requires all keyword arguments)
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=file_stream,
            length=file_size,
            content_type=content_type
        )

        # Generate public URL through backend proxy
        # This allows files to be accessed without exposing MinIO directly
        # Format: http://localhost:8000/storage/bucket-name/path/to/file
        backend_url = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")
        url = f"{backend_url}/storage/{MINIO_BUCKET}/{object_name}"

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
