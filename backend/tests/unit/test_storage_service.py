"""
Unit tests for Storage Service (Cloudflare R2).

Tests file upload, download, deletion, and URL generation.
"""

import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError


class TestGetS3Client:
    """Tests for S3 client initialization."""

    def test_returns_none_when_not_configured(self):
        """Should return None when R2 credentials are not set."""
        import storage_service

        # Reset the cached client
        storage_service._s3_client = None

        with patch.dict('os.environ', {
            'R2_ENDPOINT': '',
            'R2_ACCESS_KEY': '',
            'R2_SECRET_KEY': ''
        }, clear=True):
            # Reload module-level variables
            storage_service.R2_ENDPOINT = ''
            storage_service.R2_ACCESS_KEY = ''
            storage_service.R2_SECRET_KEY = ''

            client = storage_service.get_s3_client()
            assert client is None

    def test_creates_client_with_credentials(self):
        """Should create boto3 client when credentials are provided."""
        import storage_service

        storage_service._s3_client = None

        with patch('storage_service.boto3.client') as mock_boto:
            mock_client = MagicMock()
            mock_boto.return_value = mock_client

            storage_service.R2_ENDPOINT = 'https://r2.example.com'
            storage_service.R2_ACCESS_KEY = 'access-key'
            storage_service.R2_SECRET_KEY = 'secret-key'

            client = storage_service.get_s3_client()

            mock_boto.assert_called_once()
            assert client == mock_client

    def test_returns_cached_client(self):
        """Should return cached client on subsequent calls."""
        import storage_service

        mock_client = MagicMock()
        storage_service._s3_client = mock_client

        client = storage_service.get_s3_client()

        assert client == mock_client


class TestUploadFile:
    """Tests for file upload functionality."""

    def test_upload_file_success(self):
        """Should successfully upload file and return URL."""
        from storage_service import upload_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            with patch('storage_service.R2_PUBLIC_URL', 'https://cdn.example.com'):
                with patch('storage_service.R2_BUCKET', 'test-bucket'):
                    url = upload_file(
                        file_data=b'test content',
                        file_name='test.txt',
                        content_type='text/plain',
                        folder='documents'
                    )

                    mock_client.put_object.assert_called_once()
                    assert 'https://cdn.example.com' in url
                    assert 'documents/test.txt' in url

    def test_upload_file_with_folder(self):
        """Should construct correct object key with folder."""
        from storage_service import upload_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            with patch('storage_service.R2_PUBLIC_URL', 'https://cdn.example.com'):
                with patch('storage_service.R2_BUCKET', 'test-bucket'):
                    upload_file(
                        file_data=b'content',
                        file_name='image.png',
                        content_type='image/png',
                        folder='projects/123/images'
                    )

                    call_args = mock_client.put_object.call_args
                    assert call_args.kwargs['Key'] == 'projects/123/images/image.png'

    def test_upload_file_without_folder(self):
        """Should handle upload without folder path."""
        from storage_service import upload_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            with patch('storage_service.R2_PUBLIC_URL', 'https://cdn.example.com'):
                with patch('storage_service.R2_BUCKET', 'test-bucket'):
                    upload_file(
                        file_data=b'content',
                        file_name='file.txt',
                        content_type='text/plain'
                    )

                    call_args = mock_client.put_object.call_args
                    assert call_args.kwargs['Key'] == 'file.txt'

    def test_upload_file_raises_when_client_not_initialized(self):
        """Should raise exception when client is not initialized."""
        from storage_service import upload_file

        with patch('storage_service.get_s3_client', return_value=None):
            with pytest.raises(Exception, match="not initialized"):
                upload_file(
                    file_data=b'content',
                    file_name='file.txt'
                )

    def test_upload_file_handles_client_error(self):
        """Should wrap ClientError in user-friendly exception."""
        from storage_service import upload_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            error_response = {'Error': {'Code': 'AccessDenied', 'Message': 'Access denied'}}
            mock_client.put_object.side_effect = ClientError(error_response, 'PutObject')

            with pytest.raises(Exception, match="R2 upload failed"):
                upload_file(file_data=b'content', file_name='file.txt')


class TestDownloadFile:
    """Tests for file download functionality."""

    def test_download_file_success(self):
        """Should successfully download file content."""
        from storage_service import download_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            mock_body = MagicMock()
            mock_body.read.return_value = b'file content'
            mock_client.get_object.return_value = {'Body': mock_body}

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                content = download_file('path/to/file.txt')

                assert content == b'file content'
                mock_client.get_object.assert_called_once()

    def test_download_file_strips_leading_slash(self):
        """Should strip leading slash from object name."""
        from storage_service import download_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            mock_body = MagicMock()
            mock_body.read.return_value = b'content'
            mock_client.get_object.return_value = {'Body': mock_body}

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                download_file('/path/to/file.txt')

                call_args = mock_client.get_object.call_args
                assert call_args.kwargs['Key'] == 'path/to/file.txt'

    def test_download_file_not_found(self):
        """Should raise exception when file not found."""
        from storage_service import download_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            error_response = {'Error': {'Code': 'NoSuchKey', 'Message': 'Not found'}}
            mock_client.get_object.side_effect = ClientError(error_response, 'GetObject')

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                with pytest.raises(Exception, match="File not found"):
                    download_file('nonexistent.txt')


class TestDeleteFile:
    """Tests for file deletion functionality."""

    def test_delete_file_success(self):
        """Should successfully delete file."""
        from storage_service import delete_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                result = delete_file('path/to/file.txt')

                assert result is True
                mock_client.delete_object.assert_called_once()

    def test_delete_file_handles_error(self):
        """Should raise exception on deletion error."""
        from storage_service import delete_file

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            error_response = {'Error': {'Code': 'InternalError', 'Message': 'Server error'}}
            mock_client.delete_object.side_effect = ClientError(error_response, 'DeleteObject')

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                with pytest.raises(Exception, match="R2 deletion failed"):
                    delete_file('file.txt')


class TestGetPresignedUrl:
    """Tests for presigned URL generation."""

    def test_get_presigned_url_success(self):
        """Should generate presigned URL."""
        from storage_service import get_presigned_url

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.generate_presigned_url.return_value = 'https://signed-url.example.com'

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                url = get_presigned_url('path/to/file.txt', expires=7200)

                assert url == 'https://signed-url.example.com'
                call_args = mock_client.generate_presigned_url.call_args
                assert call_args.kwargs['ExpiresIn'] == 7200

    def test_get_presigned_url_default_expiry(self):
        """Should use default expiry of 1 hour."""
        from storage_service import get_presigned_url

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.generate_presigned_url.return_value = 'https://signed-url.example.com'

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                get_presigned_url('file.txt')

                call_args = mock_client.generate_presigned_url.call_args
                assert call_args.kwargs['ExpiresIn'] == 3600


class TestListFiles:
    """Tests for file listing functionality."""

    def test_list_files_returns_keys(self):
        """Should return list of object keys."""
        from storage_service import list_files

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.list_objects_v2.return_value = {
                'Contents': [
                    {'Key': 'file1.txt'},
                    {'Key': 'file2.txt'},
                    {'Key': 'folder/file3.txt'}
                ]
            }

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                files = list_files()

                assert len(files) == 3
                assert 'file1.txt' in files

    def test_list_files_with_prefix(self):
        """Should filter files by prefix."""
        from storage_service import list_files

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.list_objects_v2.return_value = {
                'Contents': [
                    {'Key': 'folder/file1.txt'},
                    {'Key': 'folder/file2.txt'}
                ]
            }

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                list_files(prefix='folder/')

                call_args = mock_client.list_objects_v2.call_args
                assert call_args.kwargs['Prefix'] == 'folder/'

    def test_list_files_empty_bucket(self):
        """Should return empty list for empty bucket."""
        from storage_service import list_files

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.list_objects_v2.return_value = {}  # No 'Contents' key

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                files = list_files()

                assert files == []


class TestFileExists:
    """Tests for file existence check."""

    def test_file_exists_returns_true(self):
        """Should return True when file exists."""
        from storage_service import file_exists

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.head_object.return_value = {}

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                result = file_exists('existing-file.txt')

                assert result is True

    def test_file_exists_returns_false_for_missing_file(self):
        """Should return False when file does not exist."""
        from storage_service import file_exists

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client

            error_response = {'Error': {'Code': '404', 'Message': 'Not found'}}
            mock_client.head_object.side_effect = ClientError(error_response, 'HeadObject')

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                result = file_exists('nonexistent.txt')

                assert result is False

    def test_file_exists_returns_false_when_client_not_initialized(self):
        """Should return False when client is not initialized."""
        from storage_service import file_exists

        with patch('storage_service.get_s3_client', return_value=None):
            result = file_exists('file.txt')
            assert result is False


class TestGetPublicUrl:
    """Tests for public URL generation."""

    def test_get_public_url_with_public_url_configured(self):
        """Should use R2_PUBLIC_URL when configured."""
        from storage_service import get_public_url

        with patch('storage_service.R2_PUBLIC_URL', 'https://cdn.example.com'):
            url = get_public_url('path/to/file.txt')

            assert url == 'https://cdn.example.com/path/to/file.txt'

    def test_get_public_url_strips_leading_slash(self):
        """Should strip leading slash from object name."""
        from storage_service import get_public_url

        with patch('storage_service.R2_PUBLIC_URL', 'https://cdn.example.com'):
            url = get_public_url('/path/to/file.txt')

            assert url == 'https://cdn.example.com/path/to/file.txt'

    def test_get_public_url_fallback_to_endpoint(self):
        """Should fallback to endpoint URL when public URL not configured."""
        from storage_service import get_public_url

        with patch('storage_service.R2_PUBLIC_URL', ''):
            with patch('storage_service.R2_ENDPOINT', 'https://r2.example.com'):
                with patch('storage_service.R2_BUCKET', 'my-bucket'):
                    url = get_public_url('file.txt')

                    assert 'r2.example.com' in url
                    assert 'my-bucket' in url


class TestCheckConnection:
    """Tests for connection health check."""

    def test_check_connection_success(self):
        """Should return True when connection is working."""
        from storage_service import check_connection

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.head_bucket.return_value = {}

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                result = check_connection()

                assert result is True

    def test_check_connection_failure(self):
        """Should return False when connection fails."""
        from storage_service import check_connection

        with patch('storage_service.get_s3_client') as mock_get_client:
            mock_client = MagicMock()
            mock_get_client.return_value = mock_client
            mock_client.head_bucket.side_effect = Exception("Connection failed")

            with patch('storage_service.R2_BUCKET', 'test-bucket'):
                result = check_connection()

                assert result is False

    def test_check_connection_no_client(self):
        """Should return False when client not initialized."""
        from storage_service import check_connection

        with patch('storage_service.get_s3_client', return_value=None):
            result = check_connection()

            assert result is False
