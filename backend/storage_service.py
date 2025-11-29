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
