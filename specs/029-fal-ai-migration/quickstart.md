# Quickstart: Image Studio Evolution - fal.ai Migration

## Prerequisites

1. **fal.ai Account**: Create account at [fal.ai](https://fal.ai)
2. **API Key**: Get your API key from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)
3. **Credits**: Add credits to your account (pay-as-you-go)

## Environment Setup

### 1. Add fal.ai API Key

```bash
# Add to .env file
echo "FAL_API_KEY=your_api_key_here" >> backend/.env
```

### 2. Install Python Dependencies

```bash
cd backend
pip install httpx tenacity
```

### 3. Verify Connection

```python
# Quick test script
import httpx
import os

async def test_fal_connection():
    api_key = os.getenv("FAL_API_KEY")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://queue.fal.run/fal-ai/flux-pro",
            headers={"Authorization": f"Key {api_key}"}
        )
        print(f"Status: {response.status_code}")
        return response.status_code == 200

# Run: python -c "import asyncio; asyncio.run(test_fal_connection())"
```

## Quick Implementation Guide

### Step 1: Create fal.ai Service

```python
# backend/services/fal_ai_service.py

import os
import httpx
from typing import Optional, Dict, Any

FAL_API_KEY = os.getenv("FAL_API_KEY")
FAL_BASE_URL = "https://queue.fal.run"

class FalAIService:
    def __init__(self):
        self.api_key = FAL_API_KEY
        self.client = httpx.AsyncClient(timeout=120.0)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json"
        }

    async def generate_image(
        self,
        prompt: str,
        model: str = "fal-ai/flux-pro",
        aspect_ratio: str = "1:1"
    ) -> Dict[str, Any]:
        response = await self.client.post(
            f"{FAL_BASE_URL}/{model}",
            headers=self._headers(),
            json={
                "prompt": prompt,
                "image_size": aspect_ratio,
                "num_images": 1
            }
        )
        response.raise_for_status()
        return response.json()

    async def inpaint(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
        model: str = "fal-ai/flux-pro/v1/fill"
    ) -> Dict[str, Any]:
        response = await self.client.post(
            f"{FAL_BASE_URL}/{model}",
            headers=self._headers(),
            json={
                "image_url": image_url,
                "mask_url": mask_url,
                "prompt": prompt,
                "num_inference_steps": 50,
                "guidance_scale": 30
            }
        )
        response.raise_for_status()
        return response.json()

    async def remove_background(
        self,
        image_url: str
    ) -> Dict[str, Any]:
        response = await self.client.post(
            f"{FAL_BASE_URL}/fal-ai/bria/background/remove",
            headers=self._headers(),
            json={"image_url": image_url}
        )
        response.raise_for_status()
        return response.json()

    async def upscale(
        self,
        image_url: str,
        scale: float = 2.0
    ) -> Dict[str, Any]:
        response = await self.client.post(
            f"{FAL_BASE_URL}/fal-ai/clarity-upscaler",
            headers=self._headers(),
            json={
                "image_url": image_url,
                "scale": scale
            }
        )
        response.raise_for_status()
        return response.json()

# Singleton instance
fal_service = FalAIService()
```

### Step 2: Add New Endpoints

```python
# backend/routers/image_generation.py (additions)

from services.fal_ai_service import fal_service

@router.post("/inpaint")
async def inpaint_image(request: InpaintRequest, user = Depends(get_current_user)):
    result = await fal_service.inpaint(
        image_url=request.image_url,
        mask_url=request.mask_url,
        prompt=request.prompt
    )

    # Download and store result
    image_url = result["images"][0]["url"]
    stored = await download_and_store_image(image_url, request.project_id)

    return {
        "document_id": stored["document_id"],
        "file_url": stored["file_url"],
        "thumbnail_url": stored["thumbnail_url"]
    }

@router.post("/remove-background")
async def remove_bg(request: RemoveBackgroundRequest, user = Depends(get_current_user)):
    result = await fal_service.remove_background(request.image_url)
    image_url = result["image"]["url"]
    stored = await download_and_store_image(image_url, request.project_id)
    return stored

@router.post("/upscale")
async def upscale_image(request: UpscaleRequest, user = Depends(get_current_user)):
    result = await fal_service.upscale(request.image_url, request.scale_factor)
    image_url = result["image"]["url"]
    stored = await download_and_store_image(image_url, request.project_id)
    return stored
```

### Step 3: Frontend API Functions

```typescript
// frontend/src/lib/api.ts (additions)

export async function inpaintImage(request: {
  image_url: string;
  mask_url: string;
  prompt: string;
  project_id: string;
}) {
  return api.post('/image-generation/inpaint', request);
}

export async function removeBackground(request: {
  image_url: string;
  project_id: string;
}) {
  return api.post('/image-generation/remove-background', request);
}

export async function upscaleImage(request: {
  image_url: string;
  project_id: string;
  scale_factor?: number;
}) {
  return api.post('/image-generation/upscale', request);
}
```

### Step 4: Simple Brush Canvas

```tsx
// frontend/src/components/image-studio/SimpleBrushCanvas.tsx

import { useRef, useEffect, useState } from 'react';

interface Props {
  imageUrl: string;
  onMaskReady: (maskDataUrl: string) => void;
}

export function SimpleBrushCanvas({ imageUrl, onMaskReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red overlay
    ctx.fill();
  };

  const exportMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Get original canvas data
    const ctx = canvas.getContext('2d');
    const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;

    // Convert red areas to white mask
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const isMarked = r > 200; // Red areas

      if (isMarked) {
        imageData.data[i] = 255;     // White
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
      } else {
        imageData.data[i] = 0;       // Black
        imageData.data[i + 1] = 0;
        imageData.data[i + 2] = 0;
      }
      imageData.data[i + 3] = 255;   // Full opacity
    }

    maskCtx.putImageData(imageData, 0, 0);
    onMaskReady(maskCanvas.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="range"
          min="5"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <span>Brush: {brushSize}px</span>
        <button onClick={exportMask}>Export Mask</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={() => setIsDrawing(true)}
        onMouseUp={() => setIsDrawing(false)}
        onMouseMove={draw}
        className="border cursor-crosshair"
      />
    </div>
  );
}
```

## Testing Commands

```bash
# Test generation
curl -X POST http://localhost:8000/image-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A sunset over mountains", "project_id": "..."}'

# Test remove background
curl -X POST http://localhost:8000/image-generation/remove-background \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://...", "project_id": "..."}'

# Test upscale
curl -X POST http://localhost:8000/image-generation/upscale \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://...", "project_id": "...", "scale_factor": 2}'
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check FAL_API_KEY is set correctly
   - Verify key has not expired

2. **Timeout errors**
   - Increase timeout in httpx client
   - Use async queue for long operations

3. **Image not loading**
   - Ensure CORS is configured
   - Check image URL is accessible

4. **Mask not working**
   - Verify mask is same dimensions as image
   - Check mask format is PNG with correct colors

## Next Steps

1. Run database migration for new tables
2. Implement full brush canvas with undo/redo
3. Add Quick Actions bar to Image Studio
4. Implement tab navigation (Create, Edit, Adjust)
5. Add error handling and loading states
