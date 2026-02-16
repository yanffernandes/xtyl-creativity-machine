#!/usr/bin/env python3
"""
Generate Thumbnails for Style Presets

This script generates thumbnail images for style presets that don't have one,
using the Gemini image generation model.
"""

import asyncio
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal
from image_generation_service import generate_image_openrouter
from storage_service import upload_file
import base64
import uuid


# Model to use for thumbnail generation
THUMBNAIL_MODEL = "google/gemini-2.5-flash-image"

# Base prompt for generating style thumbnails
# Note: For Gemini, we need to explicitly request image generation
BASE_PROMPT = """Generate an image of a modern coffee shop interior with warm lighting and cozy atmosphere.
Apply the following artistic style: {style_modifier}
Make the image visually striking with no text or watermarks."""


async def generate_thumbnail_for_preset(preset_id: str, preset_name: str, prompt_modifier: str) -> str:
    """
    Generate a thumbnail for a single preset.

    Returns:
        URL of the generated thumbnail
    """
    print(f"\n{'='*60}")
    print(f"Generating thumbnail for: {preset_name}")
    print(f"ID: {preset_id}")
    print(f"Style: {prompt_modifier[:100]}...")

    # Create the full prompt
    full_prompt = BASE_PROMPT.format(style_modifier=prompt_modifier)

    try:
        # Generate the image
        result = await generate_image_openrouter(
            prompt=full_prompt,
            model=THUMBNAIL_MODEL,
            aspect_ratio="1:1",  # Square for thumbnails
            quality="standard"
        )

        # Check if we got an image URL (base64 data URL)
        image_url = result.get("image_url")

        if image_url and image_url.startswith("data:image"):
            # Extract base64 data from data URL
            # Format: data:image/png;base64,<base64_data>
            header, b64_data = image_url.split(",", 1)
            image_data = base64.b64decode(b64_data)

            # Upload to storage
            file_key = f"creative-concepts/{preset_id}/{uuid.uuid4()}.png"
            thumbnail_url = await upload_file(
                file_data=image_data,
                file_name=file_key,
                content_type="image/png"
            )

            print(f"✓ Generated and uploaded: {thumbnail_url}")
            return thumbnail_url
        else:
            print(f"✗ Failed to generate image: No valid image URL in response")
            return None

    except Exception as e:
        print(f"✗ Error generating thumbnail: {e}")
        return None


async def main():
    """Main function to generate thumbnails for all presets without them."""
    print("="*60)
    print("Style Preset Thumbnail Generator")
    print("="*60)

    db = SessionLocal()

    try:
        # Get all presets that need thumbnails
        result = db.execute(text("""
            SELECT id, name, name_pt, slug, prompt_modifier
            FROM creative_concepts
            WHERE thumbnail_url IS NULL AND is_active = true
            ORDER BY sort_order
        """))

        presets = result.fetchall()

        if not presets:
            print("\nNo presets need thumbnails. All done!")
            return

        print(f"\nFound {len(presets)} presets needing thumbnails:")
        for preset in presets:
            print(f"  - {preset.name_pt} ({preset.slug})")

        print("\nStarting thumbnail generation...")

        success_count = 0
        fail_count = 0

        for preset in presets:
            thumbnail_url = await generate_thumbnail_for_preset(
                preset_id=str(preset.id),
                preset_name=preset.name_pt,
                prompt_modifier=preset.prompt_modifier
            )

            if thumbnail_url:
                # Update the database
                db.execute(
                    text("UPDATE creative_concepts SET thumbnail_url = :url WHERE id = :id"),
                    {"url": thumbnail_url, "id": preset.id}
                )
                db.commit()
                success_count += 1
                print(f"  ✓ Database updated for {preset.name_pt}")
            else:
                fail_count += 1

            # Small delay between requests to avoid rate limiting
            await asyncio.sleep(2)

        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total presets processed: {len(presets)}")
        print(f"Success: {success_count}")
        print(f"Failed: {fail_count}")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
