# Quick Start: Brand Identity Settings Implementation

**Feature**: 012-brand-identity
**Date**: 2025-11-30
**Phase**: 1 - Design

## Overview

This guide provides a quick reference for implementing Brand Identity Settings. Follow the implementation order below for optimal development flow.

## Prerequisites

- Existing project settings infrastructure working
- Backend running with FastAPI
- Frontend running with Next.js 14

## Implementation Order

### Step 1: Backend Dependencies

```bash
cd backend
pip install Pillow scikit-learn
# Add to requirements.txt:
# Pillow>=10.0.0
# scikit-learn>=1.3.0
```

### Step 2: Backend Schemas

Add to `backend/schemas.py`:

```python
class BrandTypography(BaseModel):
    primary: Optional[str] = Field(None, max_length=100)
    secondary: Optional[str] = Field(None, max_length=100)
    tertiary: Optional[str] = Field(None, max_length=100)

class BrandIdentity(BaseModel):
    color_palette: List[str] = Field(default_factory=list, max_length=6)
    typography: Optional[BrandTypography] = None

    @field_validator('color_palette')
    @classmethod
    def validate_hex_colors(cls, colors):
        import re
        hex_pattern = re.compile(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')
        for color in colors:
            if not hex_pattern.match(color):
                raise ValueError(f"Invalid HEX color: {color}")
        return colors

# Add to ProjectSettingsUpdate:
class ProjectSettingsUpdate(BaseModel):
    # ... existing fields ...
    brand_identity: Optional[BrandIdentity] = None
```

### Step 3: Color Extraction Service

Create `backend/services/color_extraction.py`:

```python
from PIL import Image
from sklearn.cluster import KMeans
import numpy as np
import io
import time

def extract_colors(image_bytes: bytes, n_colors: int = 6) -> dict:
    start_time = time.time()

    # Load image
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # Resize for performance
    img = img.resize((150, 150))

    # Get pixels
    pixels = np.array(img).reshape(-1, 3)

    # K-means clustering
    kmeans = KMeans(n_clusters=n_colors, n_init=10, random_state=42)
    kmeans.fit(pixels)

    # Get colors sorted by prevalence
    colors = kmeans.cluster_centers_.astype(int)
    labels, counts = np.unique(kmeans.labels_, return_counts=True)
    sorted_indices = np.argsort(-counts)

    hex_colors = [f"#{colors[i][0]:02x}{colors[i][1]:02x}{colors[i][2]:02x}".upper()
                  for i in sorted_indices]

    processing_time = int((time.time() - start_time) * 1000)

    return {
        "colors": hex_colors,
        "processing_time_ms": processing_time
    }
```

### Step 4: Backend Endpoint

Add to `backend/routers/projects.py`:

```python
from fastapi import UploadFile, File
from services.color_extraction import extract_colors

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/{project_id}/extract-colors")
async def extract_colors_endpoint(
    project_id: str,
    file: UploadFile = File(...),
    n_colors: int = 6,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Validate project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "File type not supported. Use PNG, JPG, or WEBP.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large. Maximum size is 5MB.")

    # Extract colors
    try:
        result = extract_colors(content, min(n_colors, 6))
        result["source_filename"] = file.filename
        return result
    except Exception as e:
        raise HTTPException(422, f"Could not process image: {str(e)}")
```

### Step 5: Update AI Context

In `backend/routers/projects.py`, extend `format_project_context()`:

```python
def format_project_context(settings: dict) -> str:
    context_parts = []
    # ... existing code ...

    # Brand Identity
    brand = settings.get("brand_identity")
    if brand:
        colors = brand.get("color_palette", [])
        if colors:
            context_parts.append(f"Brand Colors: {', '.join(colors)} (primary to accent)")

        typo = brand.get("typography")
        if typo:
            fonts = [f"{k}: {v}" for k, v in typo.items() if v]
            if fonts:
                context_parts.append(f"Brand Fonts: {'; '.join(fonts)}")

    return "\n".join(context_parts)
```

### Step 6: Frontend Dependencies

```bash
cd frontend
npm install react-colorful @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 7: Frontend Types

Add to `frontend/src/lib/api.ts`:

```typescript
export interface BrandTypography {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
}

export interface BrandIdentity {
  color_palette: string[];
  typography: BrandTypography | null;
}

// Update ProjectSettings interface
export interface ProjectSettings {
  // ... existing ...
  brand_identity: BrandIdentity | null;
}

// Add API function
export async function extractColors(projectId: string, file: File): Promise<{
  colors: string[];
  source_filename: string;
  processing_time_ms: number;
}> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/projects/${projectId}/extract-colors`, formData);
  return response.data;
}
```

### Step 8: Frontend Components

Create `frontend/src/components/project/brand-identity/` directory with:

1. **ColorPalette.tsx** - Display and reorder colors
2. **ColorPicker.tsx** - Add/edit individual colors
3. **ColorExtractor.tsx** - Upload image and show suggestions
4. **TypographySettings.tsx** - Font dropdowns

### Step 9: Integration

Add Brand Identity section to `ProjectSettingsForm.tsx` between Basic Info and Advanced Settings:

```tsx
{/* Brand Identity Card */}
<div className="bg-surface-secondary rounded-xl border border-border-primary p-6">
  <h2 className="text-lg font-semibold text-text-primary mb-6">Brand Identity</h2>

  {/* Color Palette */}
  <div className="mb-6">
    <Label>Color Palette</Label>
    <ColorPalette
      colors={brandIdentity.color_palette}
      onChange={(colors) => setBrandIdentity({...brandIdentity, color_palette: colors})}
      maxColors={6}
    />
    <ColorExtractor
      projectId={projectId}
      onColorsExtracted={(colors) => /* add to palette */}
    />
  </div>

  {/* Typography */}
  <div>
    <Label>Typography</Label>
    <TypographySettings
      typography={brandIdentity.typography}
      onChange={(typo) => setBrandIdentity({...brandIdentity, typography: typo})}
    />
  </div>
</div>
```

## Testing Checklist

- [ ] Add color manually via HEX input
- [ ] Add color via color picker
- [ ] Reorder colors via drag-and-drop
- [ ] Remove color from palette
- [ ] Upload image and extract colors
- [ ] Add extracted color to palette
- [ ] Select font from dropdown
- [ ] Enter custom font name
- [ ] Save settings and reload page
- [ ] Generate image and verify colors in AI context

## Key Files

| File | Changes |
|------|---------|
| `backend/schemas.py` | Add `BrandIdentity`, `BrandTypography` |
| `backend/routers/projects.py` | Add extract-colors endpoint, update context |
| `backend/services/color_extraction.py` | NEW: K-means extraction |
| `frontend/src/lib/api.ts` | Add types and API functions |
| `frontend/src/components/project/ProjectSettingsForm.tsx` | Add Brand Identity section |
| `frontend/src/components/project/brand-identity/*.tsx` | NEW: UI components |

## Common Issues

1. **scikit-learn import slow**: First import can be slow; subsequent uses are fast
2. **Color picker z-index**: Ensure picker appears above other elements
3. **Drag-and-drop touch**: May need touch event handling for mobile
4. **HEX validation**: Use uppercase for consistency (#5B8DEF not #5b8def)
