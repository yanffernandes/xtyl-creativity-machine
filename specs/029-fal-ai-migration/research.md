# Research: Image Studio Evolution - fal.ai Migration

## Research Tasks Completed

Based on Technical Context unknowns and dependencies, the following research was conducted:

1. fal.ai API capabilities and pricing
2. Best inpainting models comparison
3. Background removal solutions
4. Upscaling technologies
5. Canvas/brush implementation patterns
6. Provider comparison (fal.ai vs Replicate vs direct APIs)

---

## Decision 1: Image Generation Provider

**Decision**: Use fal.ai as the unified provider for all image operations

**Rationale**:
- Single API for OpenAI, Google, FLUX, and utility models
- 4x faster inference than competitors (optimized infrastructure)
- Most competitive pricing (~50% cheaper than Replicate for same models)
- Includes all required capabilities: generation, inpainting, utilities
- Growing model catalog with frequent updates

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| Replicate | Slower inference, higher pricing, general-purpose (not media-focused) |
| OpenAI Direct | No FLUX models, limited inpainting control, no utilities |
| Google Direct | Complex GCP setup, no FLUX models, limited editing |
| Multiple providers | Integration complexity, inconsistent APIs, harder maintenance |

---

## Decision 2: Inpainting Model

**Decision**: FLUX.1 Fill Pro (`fal-ai/flux-pro/v1/fill`) as primary inpainting model

**Rationale**:
- State-of-the-art benchmark results (outperforms all competitors)
- True pixel-perfect mask adherence (white=edit, black=preserve)
- Excellent context preservation outside masked area
- Fast generation (~15 seconds)
- Competitive pricing ($0.05/megapixel)

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| GPT Image 1.5 Edit | "Soft mask" - uses mask as guidance, not strict boundary |
| Qwen Image Edit | Lower quality, less consistent results |
| DALL-E 2 (deprecated) | Deprecated 05/2026, outdated quality |
| Stable Diffusion Inpainting | Requires self-hosting, inconsistent quality |

**API Format**:
```json
{
  "image_url": "https://...",
  "mask_url": "https://...",
  "prompt": "Add a tree here",
  "num_inference_steps": 50,
  "guidance_scale": 30
}
```

---

## Decision 3: Natural Language Editing Model

**Decision**: FLUX Kontext [pro] (`fal-ai/flux-pro/kontext`) for instruction-based editing

**Rationale**:
- 8x faster than GPT Image for editing operations
- Excellent at local edits without explicit masks
- Strong character/element preservation
- Good prompt adherence for style/background changes
- Competitive pricing ($0.04/image)

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| GPT Image 1.5 Edit | Slower (~30s vs ~4s), more expensive |
| FLUX Kontext [max] | 2.75x more expensive, overkill for most edits |
| Gemini 3 Pro Image | Requires multi-turn conversation, less precise |

**Best Practices for FLUX Kontext**:
- Be specific: "Change the blue shirt to red" vs "change colors"
- Preserve explicitly: "while keeping the face unchanged"
- Name subjects: "the woman with glasses" vs "her"

---

## Decision 4: Background Removal

**Decision**: Bria RMBG 2.0 (`fal-ai/bria/background/remove`)

**Rationale**:
- Enterprise-safe (trained exclusively on licensed data)
- Best-in-class edge quality
- Fast processing (~3-5 seconds)
- Clean alpha channel output
- Low cost ($0.018/image)

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| Remove.bg API | Separate integration, more expensive |
| ESRGAN variants | Designed for upscaling, poor at segmentation |
| Self-hosted U2Net | Infrastructure overhead, maintenance burden |

---

## Decision 5: Image Upscaling

**Decision**: Clarity Upscaler (`fal-ai/clarity-upscaler`) as default, with ESRGAN as fast option

**Rationale**:
- AI-enhanced upscaling (not just interpolation)
- Uses ControlNet for quality preservation
- Prompt-guided enhancement ("masterpiece, best quality")
- Good balance of quality/price/speed
- Supports up to 4x scaling

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| Topaz Upscale | More expensive, overkill for web use |
| ESRGAN only | Basic algorithm, less enhancement |
| Ideogram Upscale | Limited to 2x, less control |

**Configuration**:
- Default: Clarity Upscaler for quality
- Fast option: ESRGAN for quick 2x
- Premium option: Topaz for professional output

---

## Decision 6: Brush Canvas Implementation

**Decision**: Native HTML5 Canvas API with custom hooks

**Rationale**:
- Zero dependencies
- Best performance (native browser)
- Full control over rendering
- Easy to achieve 60fps
- Well-documented, stable API

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| Fabric.js | Heavy dependency (~300KB), overkill features |
| Konva.js | Extra abstraction layer, unnecessary complexity |
| React-canvas-draw | Limited customization, abandoned maintenance |
| SVG-based | Performance issues with complex paths |

**Implementation Pattern**:
```typescript
// useBrushCanvas hook structure
const useBrushCanvas = (imageUrl: string) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [mode, setMode] = useState<'brush' | 'eraser'>('brush');
  const [history, setHistory] = useState<ImageData[]>([]);

  const draw = useCallback((e: MouseEvent) => { /* ... */ }, []);
  const undo = useCallback(() => { /* ... */ }, []);
  const exportMask = useCallback(() => { /* ... */ }, []);

  return { canvasRef, brushSize, setBrushSize, mode, setMode, undo, exportMask };
};
```

---

## Decision 7: Mask Format

**Decision**: PNG with white (edit) / black (preserve) color scheme

**Rationale**:
- fal.ai standard for all inpainting models
- Lossless format preserves mask precision
- Compatible with alpha channel alternative
- Easy to generate from Canvas API
- Human-readable (can preview mask)

**Format Specification**:
- **White (255, 255, 255)**: Areas to be edited/inpainted
- **Black (0, 0, 0)**: Areas to preserve unchanged
- **Dimensions**: Must match input image exactly
- **File type**: PNG (lossless compression)

**Export Code**:
```typescript
function exportMask(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert painted areas to white mask
  for (let i = 0; i < imageData.data.length; i += 4) {
    const isPainted = imageData.data[i + 3] > 0; // Check alpha
    const value = isPainted ? 255 : 0;
    imageData.data[i] = value;     // R
    imageData.data[i + 1] = value; // G
    imageData.data[i + 2] = value; // B
    imageData.data[i + 3] = 255;   // A (always opaque)
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
```

---

## Pricing Summary

| Operation | Model | Price | Notes |
|-----------|-------|-------|-------|
| Generation | GPT Image 1.5 | ~$0.04/img | Best text rendering |
| Generation | FLUX Pro | $0.05/MP | Best photorealism |
| Generation | FLUX [dev] | $0.025/MP | Budget option |
| Inpainting | FLUX Fill Pro | $0.05/MP | Pixel-perfect masks |
| Editing | FLUX Kontext | $0.04/img | Fast natural language |
| Remove BG | Bria RMBG 2.0 | $0.018/img | Enterprise-safe |
| Upscale | Clarity | ~$0.02/img | AI-enhanced |
| Upscale | ESRGAN | ~$0.01/img | Basic, fast |

**Estimated Monthly Cost** (1000 images/month):
- Generation: $40-50
- Inpainting: $30-50
- Utilities: $20-30
- **Total: $90-130/month** (vs ~$150+ on OpenRouter)

---

## API Authentication

**Method**: API Key in Authorization header

```python
headers = {
    "Authorization": f"Key {FAL_API_KEY}",
    "Content-Type": "application/json"
}
```

**Environment Variable**: `FAL_API_KEY`

**Rate Limits**: Not explicitly documented, but fal.ai recommends:
- Concurrent requests: ~10 for standard accounts
- Retry with exponential backoff on 429 errors

---

## Error Handling

| Error Code | Meaning | Handling |
|------------|---------|----------|
| 401 | Invalid API key | Check FAL_API_KEY env var |
| 402 | Insufficient credits | Alert user, block operations |
| 429 | Rate limit | Exponential backoff (1s, 2s, 4s, 8s) |
| 500 | Server error | Retry up to 3 times |
| Timeout | Long generation | Increase timeout to 120s |

**Retry Implementation**:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=60)
)
async def call_fal_api(endpoint: str, payload: dict):
    # Implementation
    pass
```

---

## References

- [fal.ai Documentation](https://docs.fal.ai/)
- [fal.ai Pricing](https://fal.ai/pricing)
- [FLUX.1 Fill Pro](https://fal.ai/models/fal-ai/flux-pro/v1/fill)
- [FLUX Kontext](https://fal.ai/flux-kontext)
- [Bria RMBG 2.0](https://fal.ai/models/fal-ai/bria/background/remove)
- [Clarity Upscaler](https://fal.ai/models/fal-ai/clarity-upscaler)
- [HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
