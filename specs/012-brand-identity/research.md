# Research: Brand Identity Settings

**Feature**: 012-brand-identity
**Date**: 2025-11-30
**Phase**: 0 - Research

## Color Extraction Algorithm Analysis

### Problem Statement

Extract dominant colors from uploaded images (logos, brand assets) to suggest a color palette for the project. The algorithm must:
- Handle various image formats (PNG, JPG, WEBP)
- Process images up to 5MB efficiently (< 5 seconds)
- Return up to 6 visually distinct dominant colors
- Handle edge cases (monochrome images, photos vs. graphics)

### Algorithm Comparison

#### 1. K-Means Clustering (RECOMMENDED)

**How it works**: Partitions pixel colors into K clusters by minimizing within-cluster variance. Each cluster centroid becomes a dominant color.

**Pros**:
- Well-established, predictable results
- Available in scikit-learn (already Python ecosystem)
- Configurable cluster count (k=6 for our use case)
- Produces visually distinct colors

**Cons**:
- Computationally more expensive than histogram methods
- May not capture small but important accent colors
- Sensitive to initialization (use k-means++ to mitigate)

**Implementation**:
```python
from sklearn.cluster import KMeans
from PIL import Image
import numpy as np

def extract_colors_kmeans(image_path, n_colors=6):
    # Load and resize for performance
    img = Image.open(image_path).convert('RGB')
    img = img.resize((150, 150))  # Downsample for speed

    pixels = np.array(img).reshape(-1, 3)

    kmeans = KMeans(n_clusters=n_colors, n_init=10, random_state=42)
    kmeans.fit(pixels)

    # Get colors sorted by cluster size (prevalence)
    colors = kmeans.cluster_centers_.astype(int)
    labels, counts = np.unique(kmeans.labels_, return_counts=True)
    sorted_indices = np.argsort(-counts)

    return [rgb_to_hex(colors[i]) for i in sorted_indices]
```

**Performance**: ~0.5-2 seconds for 5MB image (after resize to 150x150)

#### 2. Median Cut Algorithm

**How it works**: Recursively divides the color space by cutting along the longest axis until reaching desired number of colors.

**Pros**:
- Faster than K-means
- Good for images with clear color regions
- Deterministic (no random initialization)

**Cons**:
- Can produce less visually distinct colors
- Harder to get exactly N colors (produces 2^n)
- Less common in Python libraries

**Implementation**: Would require custom implementation or use `colorthief` library.

#### 3. Histogram-based (Simple Quantization)

**How it works**: Creates color histogram, groups into bins, returns most frequent bins.

**Pros**:
- Very fast
- Simple implementation

**Cons**:
- Less accurate for continuous gradients
- May return similar shades as "different" colors
- Requires post-processing to ensure visual distinctness

### Decision: K-Means Clustering

**Rationale**:
1. Best balance of accuracy and performance for our use case
2. scikit-learn already available, well-maintained
3. Produces visually distinct colors (important for brand palettes)
4. Industry standard in design tools (Figma, Adobe use similar approaches)

### Optimization Strategy

1. **Resize images** to 150x150 before processing (preserves color distribution, massive speed boost)
2. **Remove near-white/near-black pixels** before clustering (optional, improves results for photos)
3. **Use k-means++** initialization for consistent results
4. **Cache results** if same image uploaded twice
5. **Filter very similar colors** (< 10% HSL difference) in post-processing

### Edge Cases

| Case | Handling |
|------|----------|
| Monochrome image | Return 1-2 colors, inform user "Limited colors found" |
| All white/black | Return empty result with message "No significant colors found" |
| Very large image (>5MB) | Reject with error before processing |
| Transparent PNG | Convert to RGB with white background |
| CMYK image | Convert to RGB |
| Corrupt/invalid file | Return validation error |

---

## Typography Font List Curation

### Methodology

Fonts selected based on:
1. **Availability**: Commonly available across platforms (Google Fonts primary source)
2. **Versatility**: Work well across different creative contexts
3. **Legibility**: Clear at various sizes
4. **Category coverage**: Sans-serif, serif, display, monospace

### Curated Font List (15 fonts)

| Font | Category | Best For | Notes |
|------|----------|----------|-------|
| Inter | Sans-serif | UI, Body text | Modern, highly legible |
| Roboto | Sans-serif | Body text, Mobile | Android default, versatile |
| Open Sans | Sans-serif | Body text | Neutral, widely used |
| Lato | Sans-serif | Body, Headlines | Warm, friendly |
| Montserrat | Sans-serif | Headlines, Display | Geometric, modern |
| Poppins | Sans-serif | Headlines, Display | Geometric, round |
| Raleway | Sans-serif | Display, Headlines | Elegant, thin variants |
| Nunito | Sans-serif | Body, UI | Rounded, friendly |
| Arial | Sans-serif | Universal | System font, safe default |
| Helvetica | Sans-serif | Universal | Design industry standard |
| Playfair Display | Serif | Headlines | Elegant, high contrast |
| Merriweather | Serif | Body text | Excellent readability |
| Source Serif Pro | Serif | Body text | Modern serif |
| Oswald | Display | Headlines | Bold, condensed |
| Ubuntu | Sans-serif | UI, Technical | Humanist, warm |

### Font Hierarchy Guidance

When presenting to users:

- **Primary Font**: Headlines, titles, CTAs - recommend display/bold fonts
- **Secondary Font**: Body text, paragraphs - recommend readable fonts
- **Tertiary Font**: Accents, captions, metadata - recommend versatile fonts

### Custom Font Input

Allow users to enter any font name as free text. The system stores the name as-is for AI context. Note in UI: "Custom fonts are used as reference for AI-generated content."

---

## Similar Feature Analysis

### Canva Brand Kit

**Implementation**:
- Up to 100 colors in Pro
- 3 font slots (heading, subheading, body)
- Color picker with HEX input
- No automatic extraction in free tier

**Learnings**: Clear hierarchy in fonts, generous color limits for enterprise.

### Figma Styles

**Implementation**:
- Color styles with naming
- Text styles (not just fonts, but full text presets)
- Team-wide shared libraries

**Learnings**: Names/labels for colors can help organization, consider for future.

### Coolors.co

**Implementation**:
- Extract palette from image
- 5 color default palette
- Lock colors while generating variations
- Export in multiple formats

**Learnings**: 5-6 colors is standard for brand palettes. Lock/unlock pattern useful.

### Adobe Color

**Implementation**:
- Advanced color wheel
- Multiple color harmony rules
- Extract from image with AI refinement
- Integration with Creative Cloud

**Learnings**: Color harmony suggestions could be future enhancement.

---

## Technical Dependencies

### Backend

```txt
# requirements.txt additions
Pillow>=10.0.0          # Image processing
scikit-learn>=1.3.0     # K-means clustering
numpy>=1.24.0           # Already likely present
```

### Frontend

```json
// package.json additions
{
  "dependencies": {
    "react-colorful": "^5.6.1",     // Lightweight color picker
    "@dnd-kit/core": "^6.1.0",      // Drag and drop
    "@dnd-kit/sortable": "^8.0.0"   // Sortable lists
  }
}
```

### Alternative Frontend Libraries Considered

| Library | Size | Notes |
|---------|------|-------|
| react-colorful | 2.8KB | Minimal, headless, RECOMMENDED |
| react-color | 140KB | Too heavy, legacy |
| @radix-ui/colors | - | Color system, not picker |

---

## Recommendations Summary

1. **Use K-Means** with k=6 for color extraction
2. **Resize to 150x150** before processing for performance
3. **15 curated fonts** plus custom input option
4. **react-colorful** for frontend color picker
5. **@dnd-kit** for drag-and-drop reordering
6. Store in existing `Project.settings` JSONB - no migration needed
