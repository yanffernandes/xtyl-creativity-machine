# Quickstart: Agency-Scale Studio Flow

**Feature**: 028-agency-studio-flow
**Date**: 2025-01-14

## Prerequisites

- Running backend on port 8001: `./dev.sh backend`
- Running frontend on port 3002: `npm run dev -- -p 3002`
- Existing workspace with at least one project
- Project with documents (copies) in Kanban view

## Test Scenarios

### Scenario 1: Multi-Select Kanban and Generate Batch

**Goal**: Select multiple copies from Kanban and generate images in batch

**Steps**:
1. Navigate to project Kanban view
2. Hold Shift/Ctrl and click on 3-5 document cards
3. Click "Gerar Imagens" button (appears when multiple selected)
4. Verify: Studio opens with selected copies queued
5. Configure preset, format, creativity
6. Click "Gerar Todas"
7. Verify: Progress shows for each copy batch
8. Verify: Results appear linked to original documents

**Expected Result**: All copies generate 4 variations each, linked to originals

---

### Scenario 2: Copy Library CRUD

**Goal**: Create, use, and manage copy library items

**Steps**:
1. Navigate to any project
2. Open Copy Library drawer (sidebar or menu)
3. Click "Nova Copy"
4. Enter title: "Promo Black Friday"
5. Enter content: "Desconto de 50% em todos os produtos!"
6. Add tags: ["promo", "black-friday", "desconto"]
7. Save
8. Verify: Copy appears in library list
9. Click "Usar como Prompt" on the copy
10. Verify: Studio prompt is populated with copy content
11. Edit copy: Change discount to 60%
12. Delete copy
13. Verify: Copy removed from list

**Expected Result**: Full CRUD operations work, "Usar como Prompt" populates studio

---

### Scenario 3: Campaign Package Management

**Goal**: Create campaign and associate documents

**Steps**:
1. Navigate to project
2. Open Campaigns panel (or menu)
3. Click "Nova Campanha"
4. Enter name: "Campanha Natal 2025"
5. Select channel: "instagram"
6. Save
7. Verify: Campaign appears in list
8. Go to a document
9. Associate document with campaign (dropdown or action)
10. Filter documents by campaign
11. Verify: Only associated documents shown

**Expected Result**: Campaign created, documents associated and filterable

---

### Scenario 4: Brush Selection and Inpainting

**Goal**: Use brush to mask region and refine image

**Steps**:
1. Generate or find an existing image in Studio
2. Click "Refinar com Pincel" on the image
3. Brush canvas appears over image
4. Paint mask over region to edit (e.g., background)
5. Adjust brush size if needed
6. Enter prompt: "fundo azul degradê moderno"
7. Click "Refinar"
8. Wait for generation
9. Verify: New image appears with only masked region changed
10. Click "Limpar" and redraw mask
11. Click "Desfazer" to undo last stroke

**Expected Result**: Mask drawn, inpainting refines only masked area

---

### Scenario 5: Document Versioning

**Goal**: Edit document, view history, restore version

**Steps**:
1. Open a document (copy/text)
2. Note current content
3. Edit content and save
4. Edit content again and save (2 edits total)
5. Open version history panel
6. Verify: 2 previous versions shown
7. Click on first version
8. Click "Restaurar"
9. Verify: Content reverted to first version
10. Verify: History now shows 3 entries

**Expected Result**: Versions saved on edit, restore works, FIFO applies at 10

---

### Scenario 6: Batch with Visual Context

**Goal**: Generate batch using selected visual assets

**Steps**:
1. Ensure project has visual assets (logo, brand colors)
2. Select 2 copies in Kanban
3. Click "Gerar Imagens"
4. In Studio, expand "Contexto Visual" section
5. Select logo asset with mode "style"
6. Enable "Aplicar Brand Context"
7. Click "Gerar Todas"
8. Verify: Generated images reflect brand style/colors

**Expected Result**: Images incorporate selected assets and brand context

---

### Scenario 7: Metadata and Filtering

**Goal**: Add tags and filter documents

**Steps**:
1. Open a document
2. Add tags: ["instagram", "stories", "promo"]
3. Save
4. Open another document
5. Add tags: ["facebook", "feed", "promo"]
6. Save
7. Go to document list/gallery
8. Filter by tag "instagram"
9. Verify: Only first document shown
10. Filter by tag "promo"
11. Verify: Both documents shown

**Expected Result**: Tags saved, filtering works correctly

---

## API Quick Tests (curl)

### Create Copy Library Item
```bash
curl -X POST http://localhost:8001/workspaces/{workspace_id}/copies \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Copy",
    "content": "This is a test copy for quick testing",
    "tags": ["test", "quick"]
  }'
```

### Create Campaign
```bash
curl -X POST http://localhost:8001/projects/{project_id}/campaigns \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "channel": "instagram"
  }'
```

### Generate Batch with Assets
```bash
curl -X POST http://localhost:8001/image-generation/generate-batch \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern product photo",
    "project_id": "{project_id}",
    "count": 4,
    "reference_assets": ["{asset_id}"],
    "asset_mode": "style",
    "apply_brand_context": true
  }'
```

### Refine with Mask
```bash
curl -X POST http://localhost:8001/image-generation/refine-with-mask \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "{image_document_id}",
    "mask_base64": "{base64_png_mask}",
    "prompt": "blue gradient background"
  }'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Multi-select not working | Check Shift/Ctrl key is held while clicking |
| Brush not drawing | Ensure canvas loaded, check browser console for errors |
| Inpainting fails | Verify mask is valid PNG, check OpenRouter API status |
| Versions not saving | Check document has been modified (no-op edits skip versioning) |
| Campaign filter empty | Verify documents are associated with campaign |
