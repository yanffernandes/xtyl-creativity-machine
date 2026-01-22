# Quickstart: Smart Image Generation

**Feature**: 026-smart-image-generation
**Date**: 2025-12-12

## Overview

Este guia descreve como implementar a geração inteligente de múltiplas variações de imagem no sistema.

## Prerequisites

- Backend FastAPI rodando (`./dev.sh backend`)
- Frontend Next.js rodando (`./dev.sh frontend`)
- Acesso ao painel admin (usuário com role admin)
- OpenRouter API key configurada

## Quick Implementation Guide

### Backend Changes

#### 1. Database Migration

Criar migration para novos campos em Document:

```bash
cd backend
alembic revision --autogenerate -m "add_image_variation_fields"
alembic upgrade head
```

#### 2. Atualizar `tools.py` - generate_image_tool

```python
# Em tools.py, modificar generate_image_tool para suportar variações

async def generate_image_tool(
    prompt: str,
    project_id: str,
    aspect_ratio: str = "1:1",
    num_variations: int = None,  # None = usar config global
    skip_prompt_enrichment: bool = False,
    skip_visual_context: bool = False,
    ...
) -> list[dict]:
    """Gera múltiplas variações de imagem."""

    # 1. Buscar config global se num_variations não especificado
    if num_variations is None:
        config = await get_variation_config(db)
        num_variations = config.get("count", 2)
        modifiers = config.get("modifiers", DEFAULT_MODIFIERS)

    # 2. Criar variation_set_id único
    variation_set_id = str(uuid.uuid4())

    # 3. Gerar variações em paralelo
    tasks = []
    for i in range(num_variations):
        modifier = modifiers[i] if i < len(modifiers) else modifiers[0]
        enriched_prompt = f"{prompt} - {modifier}" if not skip_prompt_enrichment else prompt
        tasks.append(
            generate_single_variation(
                prompt=enriched_prompt,
                variation_set_id=variation_set_id,
                variation_index=i,
                variation_modifier=modifier,
                ...
            )
        )

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 4. Retornar resultados (incluindo falhas parciais)
    return [r for r in results if not isinstance(r, Exception)]
```

#### 3. Adicionar endpoint admin em `routers/admin.py`

```python
@router.get("/config/image-generation")
async def get_image_generation_config(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    config = db.query(SystemConfig).filter(
        SystemConfig.key == "image_generation_default_variations"
    ).first()

    if not config:
        return {"count": 2, "enabled": True, "modifiers": DEFAULT_MODIFIERS}

    return config.value

@router.put("/config/image-generation")
async def update_image_generation_config(
    update: ImageGenerationConfigUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    config = db.query(SystemConfig).filter(
        SystemConfig.key == "image_generation_default_variations"
    ).first()

    if not config:
        config = SystemConfig(
            key="image_generation_default_variations",
            value={"count": 2, "enabled": True, "modifiers": DEFAULT_MODIFIERS}
        )
        db.add(config)

    if update.count is not None:
        config.value["count"] = update.count
    if update.enabled is not None:
        config.value["enabled"] = update.enabled

    db.commit()
    return config.value
```

#### 4. Atualizar SSE em chat.py

```python
# Adicionar evento de variação no stream
async def emit_variation_event(
    websocket_or_sse,
    event_type: str,  # variation_started, variation_complete, variation_failed
    variation_data: dict
):
    event = {
        "type": event_type,
        "data": variation_data
    }
    # Enviar via SSE
    yield f"data: {json.dumps(event)}\n\n"
```

### Frontend Changes

#### 1. Componente ImageVariationGrid

```tsx
// src/components/chat/ImageVariationGrid.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageVariation {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  modifier: string;
  index: number;
}

interface Props {
  totalVariations: number;
  completedVariations: ImageVariation[];
  onSelect?: (variation: ImageVariation) => void;
}

export function ImageVariationGrid({
  totalVariations,
  completedVariations,
  onSelect
}: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: totalVariations }).map((_, index) => {
        const variation = completedVariations.find(v => v.index === index);

        return (
          <div key={index} className="aspect-square relative rounded-lg overflow-hidden">
            <AnimatePresence mode="wait">
              {variation ? (
                <motion.img
                  key={variation.id}
                  src={variation.thumbnailUrl}
                  alt={`Variação ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => onSelect?.(variation)}
                />
              ) : (
                <Skeleton className="w-full h-full" />
              )}
            </AnimatePresence>
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
              {variation ? variation.modifier.split(',')[0] : `Gerando ${index + 1}/${totalVariations}...`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### 2. Hook useImageVariations

```tsx
// src/hooks/useImageVariations.ts
import { useState, useCallback } from "react";

interface VariationState {
  variationSetId: string | null;
  totalVariations: number;
  completedVariations: ImageVariation[];
  isGenerating: boolean;
  error: string | null;
}

export function useImageVariations() {
  const [state, setState] = useState<VariationState>({
    variationSetId: null,
    totalVariations: 0,
    completedVariations: [],
    isGenerating: false,
    error: null,
  });

  const handleVariationEvent = useCallback((event: any) => {
    switch (event.type) {
      case "variation_started":
        setState(prev => ({
          ...prev,
          variationSetId: event.data.variation_set_id,
          totalVariations: event.data.total_variations,
          isGenerating: true,
        }));
        break;

      case "variation_complete":
        setState(prev => ({
          ...prev,
          completedVariations: [
            ...prev.completedVariations,
            {
              id: event.data.document_id,
              imageUrl: event.data.image_url,
              thumbnailUrl: event.data.thumbnail_url,
              modifier: event.data.modifier_used,
              index: event.data.variation_index,
            }
          ],
        }));
        break;

      case "all_variations_complete":
        setState(prev => ({
          ...prev,
          isGenerating: false,
        }));
        break;

      case "variation_failed":
        // Continua com as outras variações
        console.error("Variation failed:", event.data.error);
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      variationSetId: null,
      totalVariations: 0,
      completedVariations: [],
      isGenerating: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    handleVariationEvent,
    reset,
  };
}
```

#### 3. Admin Settings Component

```tsx
// src/components/admin/ImageGenerationSettings.tsx
"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function ImageGenerationSettings() {
  const [variationCount, setVariationCount] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/admin/config/image-generation", {
        method: "PUT",
        body: JSON.stringify({ count: variationCount }),
      });
      toast({ title: "Configuração salva!" });
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Geração de Imagens</h3>

      <div className="space-y-4">
        <Label>Número de variações por geração</Label>
        <RadioGroup
          value={String(variationCount)}
          onValueChange={(v) => setVariationCount(Number(v))}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1" id="v1" />
            <Label htmlFor="v1">1 variação (mais rápido)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="2" id="v2" />
            <Label htmlFor="v2">2 variações (recomendado)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3" id="v3" />
            <Label htmlFor="v3">3 variações (mais opções)</Label>
          </div>
        </RadioGroup>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
```

## Testing

### Backend Tests

```python
# tests/test_image_variations.py
import pytest
from unittest.mock import patch, AsyncMock

@pytest.mark.asyncio
async def test_generate_variations_default_count():
    """Test that default 2 variations are generated."""
    with patch("tools.generate_single_variation", new_callable=AsyncMock) as mock:
        mock.return_value = {"document_id": "test-id", "image_url": "http://..."}

        result = await generate_image_tool(
            prompt="Test prompt",
            project_id="test-project"
        )

        assert mock.call_count == 2
        assert len(result) == 2

@pytest.mark.asyncio
async def test_generate_variations_custom_count():
    """Test override variation count."""
    with patch("tools.generate_single_variation", new_callable=AsyncMock) as mock:
        mock.return_value = {"document_id": "test-id", "image_url": "http://..."}

        result = await generate_image_tool(
            prompt="Test prompt",
            project_id="test-project",
            num_variations=3
        )

        assert mock.call_count == 3

@pytest.mark.asyncio
async def test_generate_variations_partial_failure():
    """Test that partial failures don't break the entire generation."""
    async def mock_generate(*args, **kwargs):
        if kwargs.get("variation_index") == 1:
            raise Exception("API Error")
        return {"document_id": "test-id"}

    with patch("tools.generate_single_variation", side_effect=mock_generate):
        result = await generate_image_tool(
            prompt="Test prompt",
            project_id="test-project",
            num_variations=2
        )

        # Should return 1 successful result
        assert len(result) == 1
```

### Frontend Tests

```tsx
// tests/components/ImageVariationGrid.test.tsx
import { render, screen } from "@testing-library/react";
import { ImageVariationGrid } from "@/components/chat/ImageVariationGrid";

describe("ImageVariationGrid", () => {
  it("shows skeletons for pending variations", () => {
    render(
      <ImageVariationGrid
        totalVariations={2}
        completedVariations={[]}
      />
    );

    expect(screen.getAllByRole("status")).toHaveLength(2); // Skeletons
  });

  it("shows images when variations complete", () => {
    render(
      <ImageVariationGrid
        totalVariations={2}
        completedVariations={[
          { id: "1", imageUrl: "http://...", thumbnailUrl: "http://...", modifier: "minimalista", index: 0 }
        ]}
      />
    );

    expect(screen.getByAltText("Variação 1")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1); // 1 skeleton remaining
  });
});
```

## Verification Checklist

- [ ] Migration executada com sucesso
- [ ] system_config tem a nova chave
- [ ] Endpoint admin GET/PUT funcionando
- [ ] Chat gera 2 variações por padrão
- [ ] SSE emite eventos de progresso
- [ ] UI mostra grid com skeletons
- [ ] Variações aparecem conforme completam
- [ ] Override via prompt funciona
- [ ] Admin pode alterar número de variações
