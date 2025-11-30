# Data Model: Brand Identity Settings

**Feature**: 012-brand-identity
**Date**: 2025-11-30
**Phase**: 1 - Design

## Overview

Brand Identity data is stored within the existing `Project.settings` JSONB column. No database migrations required - we extend the existing JSON structure.

## Schema Design

### Project.settings JSONB Structure (Extended)

```json
{
  // Existing fields (unchanged)
  "client_name": "string (required)",
  "description": "string | null",
  "target_audience": "string | null",
  "brand_voice": "string | null",
  "brand_voice_custom": "string | null",
  "key_messages": ["string"] | null,
  "competitors": ["string"] | null,
  "custom_notes": "string | null",

  // NEW: Brand Identity section
  "brand_identity": {
    "color_palette": [
      "#5B8DEF",   // Index 0 = Primary color
      "#4A7AD9",   // Index 1 = Secondary color
      "#7AA5F5",   // Index 2 = Tertiary color
      "#FF6B6B",   // Index 3 = Accent 1
      "#4ECDC4",   // Index 4 = Accent 2
      "#F7DC6F"    // Index 5 = Accent 3 (max 6 colors)
    ],
    "typography": {
      "primary": "Inter",        // Headlines, titles
      "secondary": "Open Sans",  // Body text
      "tertiary": "Roboto"       // Accents, captions
    }
  }
}
```

### Field Specifications

#### brand_identity.color_palette

| Property | Type | Constraints | Description |
|----------|------|-------------|-------------|
| type | `string[]` | Max 6 items | Array of HEX color codes |
| item format | `string` | Regex: `^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$` | Valid HEX (#RGB or #RRGGBB) |
| ordering | Indexed | 0 = Primary | Array index determines priority |
| default | `[]` | Empty array | No colors by default |

**Validation Rules**:
- Maximum 6 colors
- Each color must be valid HEX format
- Duplicate colors allowed (user responsibility)
- Empty array is valid (no palette configured)

#### brand_identity.typography

| Property | Type | Constraints | Description |
|----------|------|-------------|-------------|
| primary | `string \| null` | Max 100 chars | Primary/headline font |
| secondary | `string \| null` | Max 100 chars | Body text font |
| tertiary | `string \| null` | Max 100 chars | Accent/caption font |
| default | All `null` | - | No fonts configured |

**Validation Rules**:
- Font names are free text (stored as reference for AI)
- Each font field is optional
- Empty string treated as null
- No font validation (user can enter any name)

---

## Pydantic Schemas (Backend)

### New Schemas

```python
# schemas.py additions

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re

class BrandTypography(BaseModel):
    """Typography settings for brand identity"""
    primary: Optional[str] = Field(None, max_length=100, description="Primary font for headlines")
    secondary: Optional[str] = Field(None, max_length=100, description="Secondary font for body text")
    tertiary: Optional[str] = Field(None, max_length=100, description="Tertiary font for accents")


class BrandIdentity(BaseModel):
    """Brand identity settings (colors + typography)"""
    color_palette: List[str] = Field(
        default_factory=list,
        max_length=6,
        description="Ordered list of HEX colors (index 0 = primary)"
    )
    typography: Optional[BrandTypography] = None

    @field_validator('color_palette')
    @classmethod
    def validate_hex_colors(cls, colors: List[str]) -> List[str]:
        hex_pattern = re.compile(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')
        for color in colors:
            if not hex_pattern.match(color):
                raise ValueError(f"Invalid HEX color: {color}")
        return colors


class ColorExtractionResult(BaseModel):
    """Result from color extraction endpoint"""
    colors: List[str] = Field(description="Extracted HEX colors sorted by prevalence")
    source_filename: str
    processing_time_ms: int
    message: Optional[str] = None  # For edge cases like "Limited colors found"
```

### Extended ProjectSettingsUpdate

```python
class ProjectSettingsUpdate(BaseModel):
    """Schema for updating project settings"""
    # Existing fields...
    client_name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    target_audience: Optional[str] = Field(None, max_length=1000)
    brand_voice: Optional[str] = None
    brand_voice_custom: Optional[str] = Field(None, max_length=500)
    key_messages: Optional[List[str]] = None
    competitors: Optional[List[str]] = None
    custom_notes: Optional[str] = Field(None, max_length=5000)

    # NEW: Brand Identity
    brand_identity: Optional[BrandIdentity] = None
```

---

## TypeScript Types (Frontend)

```typescript
// lib/api.ts additions

export interface BrandTypography {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
}

export interface BrandIdentity {
  color_palette: string[];  // HEX colors, max 6, ordered by priority
  typography: BrandTypography | null;
}

export interface ProjectSettings {
  // Existing fields...
  client_name: string;
  description: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  brand_voice_custom: string | null;
  key_messages: string[] | null;
  competitors: string[] | null;
  custom_notes: string | null;

  // NEW: Brand Identity
  brand_identity: BrandIdentity | null;
}

export interface ColorExtractionResult {
  colors: string[];
  source_filename: string;
  processing_time_ms: number;
  message: string | null;
}
```

---

## AI Context Format

When formatting project settings for AI prompts, brand identity is included:

```python
def format_project_context(settings: dict) -> str:
    """Format project settings as context for AI prompts"""
    context_parts = []

    # ... existing fields ...

    # Brand Identity
    brand_identity = settings.get("brand_identity")
    if brand_identity:
        colors = brand_identity.get("color_palette", [])
        if colors:
            context_parts.append(f"Brand Colors: {', '.join(colors)} (in order of priority: primary, secondary, accent)")

        typography = brand_identity.get("typography")
        if typography:
            fonts = []
            if typography.get("primary"):
                fonts.append(f"Primary: {typography['primary']}")
            if typography.get("secondary"):
                fonts.append(f"Secondary: {typography['secondary']}")
            if typography.get("tertiary"):
                fonts.append(f"Tertiary: {typography['tertiary']}")
            if fonts:
                context_parts.append(f"Brand Fonts: {'; '.join(fonts)}")

    return "\n".join(context_parts)
```

**Example AI Context Output**:

```
Client/Company: Acme Corp
Project Description: Marketing materials for Q1 2025 campaign
Target Audience: Young professionals aged 25-35
Brand Voice/Tone: Creative and Playful
Brand Colors: #5B8DEF, #4A7AD9, #7AA5F5 (in order of priority: primary, secondary, accent)
Brand Fonts: Primary: Montserrat; Secondary: Open Sans; Tertiary: Roboto
```

---

## Data Migration

**No migration required.** The `Project.settings` column already exists as JSONB with flexible schema. Adding new keys (`brand_identity`) is backward-compatible:

- Existing projects: `brand_identity` will be `null` or missing
- Frontend handles missing field gracefully (default to empty palette, null fonts)
- Backend validates only if field is present

---

## Default Values

When a project is created or brand identity is not configured:

```json
{
  "brand_identity": null
}
// or
{
  "brand_identity": {
    "color_palette": [],
    "typography": null
  }
}
```

Both representations are valid. Frontend normalizes to:

```typescript
const defaultBrandIdentity: BrandIdentity = {
  color_palette: [],
  typography: {
    primary: null,
    secondary: null,
    tertiary: null
  }
};
```
