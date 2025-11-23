"""
Image processing service with OCR and vision capabilities
"""
import os
import io
import base64
from typing import Optional, List, Dict, Any
from PIL import Image
import pytesseract
from pathlib import Path

class ImageService:
    """Service for processing images with OCR and metadata extraction"""

    def __init__(self):
        self.supported_formats = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}
        self.max_size_mb = 10

    def is_image(self, filename: str) -> bool:
        """Check if file is a supported image format"""
        ext = Path(filename).suffix.lower()
        return ext in self.supported_formats

    def validate_image(self, file_path: str) -> tuple[bool, Optional[str]]:
        """Validate image file size and format"""
        try:
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

            if file_size_mb > self.max_size_mb:
                return False, f"Image size ({file_size_mb:.2f}MB) exceeds maximum ({self.max_size_mb}MB)"

            # Try to open with PIL to verify it's a valid image
            with Image.open(file_path) as img:
                img.verify()

            return True, None
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"

    def generate_thumbnail(self, file_path: str, thumbnail_path: str, size: tuple[int, int] = (300, 300)) -> bool:
        """Generate a thumbnail for the image"""
        try:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')

                # Create thumbnail
                img.thumbnail(size, Image.Resampling.LANCZOS)
                img.save(thumbnail_path, "JPEG", quality=85, optimize=True)

            return True
        except Exception as e:
            print(f"Failed to generate thumbnail: {e}")
            return False

    def extract_text_ocr(self, file_path: str) -> Optional[str]:
        """Extract text from image using OCR (Tesseract)"""
        try:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')

                # Perform OCR
                text = pytesseract.image_to_string(img, lang='por+eng')

                # Clean up text
                text = text.strip()

                return text if text else None
        except Exception as e:
            print(f"OCR extraction failed: {e}")
            return None

    def get_image_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from image"""
        try:
            with Image.open(file_path) as img:
                return {
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                    'size_bytes': os.path.getsize(file_path),
                }
        except Exception as e:
            print(f"Failed to extract metadata: {e}")
            return {}

    def image_to_base64(self, file_path: str, max_size: tuple[int, int] = (1024, 1024)) -> Optional[str]:
        """Convert image to base64 for API transmission (with optional resize)"""
        try:
            with Image.open(file_path) as img:
                # Resize if too large
                if img.width > max_size[0] or img.height > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)

                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')

                # Save to bytes
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=90)
                img_bytes = buffer.getvalue()

                # Encode to base64
                return base64.b64encode(img_bytes).decode('utf-8')
        except Exception as e:
            print(f"Failed to convert image to base64: {e}")
            return None

    def optimize_image(self, input_path: str, output_path: str, quality: int = 85) -> bool:
        """Optimize image file size while maintaining quality"""
        try:
            with Image.open(input_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')

                # Save optimized
                img.save(output_path, "JPEG", quality=quality, optimize=True)

            return True
        except Exception as e:
            print(f"Failed to optimize image: {e}")
            return False


# Singleton instance
image_service = ImageService()
