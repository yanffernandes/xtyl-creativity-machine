"""
Attachment Processing Service
Handles PDF text extraction, image analysis, and vision model integration
"""

import os
import io
import base64
from typing import Optional, Dict, Any, Tuple
from pathlib import Path
import PyPDF2
from pdf2image import convert_from_bytes
from PIL import Image
from vision_service import vision_service
from llm_service import chat_completion

class AttachmentService:
    def __init__(self):
        self.supported_image_formats = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        self.supported_pdf_format = '.pdf'
        self.max_file_size = 10 * 1024 * 1024  # 10MB

    async def process_attachment(
        self,
        file_content: bytes,
        filename: str,
        model: Optional[str] = None,
        user_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process an attachment (PDF or image) and extract/analyze its content.

        Args:
            file_content: The raw file bytes
            filename: Original filename
            model: AI model to use for analysis (vision model)
            user_question: Optional question about the attachment

        Returns:
            Dict with 'type', 'content', 'metadata'
        """
        file_ext = Path(filename).suffix.lower()

        # Check file size
        if len(file_content) > self.max_file_size:
            raise ValueError(f"File size exceeds maximum of {self.max_file_size / 1024 / 1024}MB")

        # Route to appropriate processor
        if file_ext == self.supported_pdf_format:
            return await self._process_pdf(file_content, filename, model, user_question)
        elif file_ext in self.supported_image_formats:
            return await self._process_image(file_content, filename, model, user_question)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

    async def _process_pdf(
        self,
        file_content: bytes,
        filename: str,
        model: Optional[str] = None,
        user_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process PDF: try text extraction first, fallback to image analysis if needed.
        """
        # Step 1: Try to extract text from PDF
        extracted_text = self._extract_text_from_pdf(file_content)

        # If we got meaningful text, return it
        if extracted_text and len(extracted_text.strip()) > 50:
            return {
                'type': 'pdf_text',
                'content': extracted_text,
                'filename': filename,
                'extraction_method': 'text',
                'page_count': self._get_pdf_page_count(file_content),
                'metadata': {
                    'char_count': len(extracted_text),
                    'word_count': len(extracted_text.split())
                }
            }

        # Step 2: Fallback to image-based analysis (for scanned PDFs)
        print(f"⚠️ PDF text extraction yielded minimal text. Falling back to image analysis for {filename}")
        return await self._process_pdf_as_images(file_content, filename, model, user_question)

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF using PyPDF2."""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            text_parts = []
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text:
                    text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

            return "\n\n".join(text_parts)
        except Exception as e:
            print(f"❌ PDF text extraction failed: {e}")
            return ""

    def _get_pdf_page_count(self, file_content: bytes) -> int:
        """Get number of pages in PDF."""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            return len(pdf_reader.pages)
        except:
            return 0

    async def _process_pdf_as_images(
        self,
        file_content: bytes,
        filename: str,
        model: Optional[str] = None,
        user_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert PDF pages to images and analyze with vision model.
        """
        try:
            # Convert first 3 pages to images (to avoid processing huge PDFs)
            images = convert_from_bytes(file_content, first_page=1, last_page=3)

            if not images:
                raise ValueError("Could not convert PDF to images")

            # Analyze each page with vision model
            page_analyses = []
            for i, img in enumerate(images):
                # Convert PIL Image to base64
                buffered = io.BytesIO()
                img.save(buffered, format="PNG")
                img_base64 = base64.b64encode(buffered.getvalue()).decode()

                # Save image temporarily
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    img.save(tmp.name, format='PNG')
                    tmp_path = tmp.name

                # Analyze image
                prompt = user_question or f"Describe the content of page {i+1} of this PDF document in detail."
                result = vision_service.analyze_image(
                    image_path=tmp_path,
                    prompt=prompt
                )

                # Clean up temp file
                import os
                os.unlink(tmp_path)

                analysis = result.get('analysis', '') if result else ''

                page_analyses.append({
                    'page': i + 1,
                    'analysis': analysis
                })

            # Combine analyses
            combined_content = "\n\n".join([
                f"**Page {p['page']}:**\n{p['analysis']}"
                for p in page_analyses
            ])

            return {
                'type': 'pdf_image',
                'content': combined_content,
                'filename': filename,
                'extraction_method': 'vision',
                'page_count': len(images),
                'model_used': model,
                'metadata': {
                    'pages_analyzed': len(page_analyses),
                    'total_pages': self._get_pdf_page_count(file_content)
                }
            }

        except Exception as e:
            raise ValueError(f"Failed to process PDF as images: {str(e)}")

    async def _process_image(
        self,
        file_content: bytes,
        filename: str,
        model: Optional[str] = None,
        user_question: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process image file with vision model.
        """
        try:
            # Get image dimensions
            img = Image.open(io.BytesIO(file_content))
            width, height = img.size
            format_name = img.format

            # Save image temporarily
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=f'.{format_name.lower()}', delete=False) as tmp:
                tmp.write(file_content)
                tmp_path = tmp.name

            # Analyze with vision model
            prompt = user_question or "Describe this image in detail. What objects, text, or information does it contain?"
            result = vision_service.analyze_image(
                image_path=tmp_path,
                prompt=prompt
            )

            # Clean up temp file
            import os
            os.unlink(tmp_path)

            analysis = result.get('analysis', '') if result else 'Failed to analyze image'

            return {
                'type': 'image',
                'content': analysis,
                'filename': filename,
                'model_used': model or 'default',
                'metadata': {
                    'width': width,
                    'height': height,
                    'format': format_name,
                    'file_size': len(file_content)
                }
            }

        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")

    def is_supported_file(self, filename: str) -> bool:
        """Check if file format is supported."""
        file_ext = Path(filename).suffix.lower()
        return file_ext in self.supported_image_formats or file_ext == self.supported_pdf_format

# Singleton instance
attachment_service = AttachmentService()
