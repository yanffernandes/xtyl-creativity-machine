"""
Color Extraction Service (Feature 012)

Extracts dominant colors from images using K-means clustering.
"""

from PIL import Image
import numpy as np
import io
import time
from typing import List, Optional, Tuple


def extract_colors(
    image_bytes: bytes,
    n_colors: int = 6,
    resize_to: int = 150
) -> dict:
    """
    Extract dominant colors from an image using K-means clustering.

    Args:
        image_bytes: Raw image bytes (PNG, JPG, WEBP)
        n_colors: Number of colors to extract (max 6)
        resize_to: Resize image to this dimension for faster processing

    Returns:
        dict with:
            - colors: List of HEX colors sorted by prevalence
            - processing_time_ms: Time taken in milliseconds
            - message: Optional message for edge cases
    """
    start_time = time.time()

    # Clamp n_colors to valid range
    n_colors = max(1, min(n_colors, 6))

    try:
        # Load and convert image
        img = Image.open(io.BytesIO(image_bytes))

        # Handle transparency (convert RGBA to RGB with white background)
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize for performance (preserve aspect ratio, fit within resize_to x resize_to)
        img.thumbnail((resize_to, resize_to), Image.Resampling.LANCZOS)

        # Get pixels as numpy array
        pixels = np.array(img).reshape(-1, 3).astype(float)

        # Filter out near-white and near-black pixels (optional, improves results)
        # Keep pixels that aren't too close to pure white/black
        # This helps avoid extracting background colors
        brightness = np.mean(pixels, axis=1)
        mask = (brightness > 15) & (brightness < 245)  # Not too dark or too light
        filtered_pixels = pixels[mask] if np.sum(mask) > n_colors * 10 else pixels

        # Check for monochrome/limited color images
        unique_colors = len(np.unique(filtered_pixels, axis=0))
        if unique_colors < n_colors:
            # Return whatever unique colors we have
            actual_n = min(unique_colors, n_colors)
            if actual_n == 0:
                return {
                    "colors": [],
                    "processing_time_ms": int((time.time() - start_time) * 1000),
                    "message": "No significant colors found in image"
                }
            n_colors = actual_n

        # K-means clustering using scikit-learn
        from sklearn.cluster import KMeans

        kmeans = KMeans(
            n_clusters=n_colors,
            n_init=10,
            random_state=42,
            max_iter=100
        )
        kmeans.fit(filtered_pixels)

        # Get cluster centers (colors) and their sizes
        colors = kmeans.cluster_centers_.astype(int)
        labels, counts = np.unique(kmeans.labels_, return_counts=True)

        # Sort by prevalence (most common first)
        sorted_indices = np.argsort(-counts)

        # Convert to HEX
        hex_colors = []
        for i in sorted_indices:
            r, g, b = colors[i]
            # Clamp values to valid range
            r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
            hex_color = f"#{r:02X}{g:02X}{b:02X}"
            hex_colors.append(hex_color)

        processing_time = int((time.time() - start_time) * 1000)

        # Generate message for edge cases
        message = None
        if len(hex_colors) < 3:
            message = "Limited colors found - image may be monochrome or low-contrast"

        return {
            "colors": hex_colors,
            "processing_time_ms": processing_time,
            "message": message
        }

    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        raise ValueError(f"Failed to process image: {str(e)}")


def validate_image(
    content_type: str,
    file_size: int,
    max_size_mb: float = 5.0
) -> Tuple[bool, Optional[str]]:
    """
    Validate image file type and size.

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Allowed content types
    allowed_types = {
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp'
    }

    if content_type not in allowed_types:
        return False, f"File type not supported. Use PNG, JPG, or WEBP."

    max_size_bytes = int(max_size_mb * 1024 * 1024)
    if file_size > max_size_bytes:
        return False, f"File too large. Maximum size is {max_size_mb}MB."

    return True, None
