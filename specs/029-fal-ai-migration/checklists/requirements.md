# Requirements Checklist: Image Studio Evolution - fal.ai Migration

## Phase 0: Planning

### Architecture & Design
- [ ] **P0-001**: Mapear todos os arquivos que serão modificados
- [ ] **P0-002**: Criar diagrama de arquitetura (OpenRouter + fal.ai)
- [ ] **P0-003**: Definir contratos de API para cada endpoint
- [ ] **P0-004**: Criar wireframes do brush tool
- [ ] **P0-005**: Criar wireframes das tabs (Criar, Editar, Ajustar, Vídeo)
- [ ] **P0-006**: Definir estratégia de feature flags
- [ ] **P0-007**: Criar plano de testes
- [ ] **P0-008**: Validar UX com stakeholders

---

## Phase 1: Backend - fal.ai Service

### Core Service
- [ ] **FR-001**: Criar `backend/services/fal_ai_service.py`
- [ ] **FR-002**: Implementar autenticação via FAL_API_KEY
- [ ] **FR-003**: Implementar retry com exponential backoff
- [ ] **FR-004**: Implementar cache de modelos (1 hora TTL)
- [ ] **FR-005**: Implementar logging de operações
- [ ] **FR-006**: Implementar error handling com mensagens claras

### Model Management
- [ ] **FR-007**: Criar tabela `fal_model_configs` no banco
- [ ] **FR-008**: Seed com modelos iniciais
- [ ] **FR-009**: Endpoint para listar modelos por categoria
- [ ] **FR-010**: Suporte a visibilidade de modelos (admin)

---

## Phase 2: Backend - Endpoints

### Inpaint Endpoint
- [ ] **FR-011**: Criar schema `InpaintRequest`
- [ ] **FR-012**: Criar schema `InpaintResponse`
- [ ] **FR-013**: Implementar `POST /image-generation/inpaint`
- [ ] **FR-014**: Validar formato da máscara (PNG com alpha)
- [ ] **FR-015**: Salvar operação em `image_operations`
- [ ] **FR-016**: Retornar documento com imagem editada

### Edit Endpoint
- [ ] **FR-017**: Criar schema `EditRequest`
- [ ] **FR-018**: Implementar `POST /image-generation/edit`
- [ ] **FR-019**: Suporte a `preserve_elements` opcional
- [ ] **FR-020**: Integrar com FLUX Kontext

### Remove Background Endpoint
- [ ] **FR-021**: Criar schema `RemoveBackgroundRequest`
- [ ] **FR-022**: Implementar `POST /image-generation/remove-background`
- [ ] **FR-023**: Garantir output PNG com transparência
- [ ] **FR-024**: Integrar com Bria RMBG 2.0

### Upscale Endpoint
- [ ] **FR-025**: Criar schema `UpscaleRequest`
- [ ] **FR-026**: Implementar `POST /image-generation/upscale`
- [ ] **FR-027**: Suporte a scale_factor (2x, 4x)
- [ ] **FR-028**: Integrar com Clarity Upscaler

### Enhance Endpoint
- [ ] **FR-029**: Criar schema `EnhanceRequest`
- [ ] **FR-030**: Implementar `POST /image-generation/enhance`
- [ ] **FR-031**: Suporte a enhancement_type (auto, faces, details, colors)

---

## Phase 3: Migration

### Replace OpenRouter
- [ ] **FR-032**: Atualizar `generate_image` para usar fal.ai
- [ ] **FR-033**: Atualizar `refine_image` para usar fal.ai
- [ ] **FR-034**: Atualizar batch generation para usar fal.ai
- [ ] **FR-035**: Manter SSE para progresso em tempo real
- [ ] **FR-036**: Adicionar `provider: "fal.ai"` nos metadados
- [ ] **FR-037**: Atualizar `/image-generation/models` para retornar modelos fal.ai

### Backwards Compatibility
- [ ] **FR-038**: Manter formato de response existente
- [ ] **FR-039**: Manter compatibilidade com imagens antigas
- [ ] **FR-040**: Manter refinement history funcionando

---

## Phase 4: Frontend - Brush Tool

### Canvas Component
- [ ] **FR-041**: Criar `BrushCanvas.tsx`
- [ ] **FR-042**: Implementar desenho com mouse
- [ ] **FR-043**: Implementar desenho com touch
- [ ] **FR-044**: Ajuste de tamanho do brush (5-50px)
- [ ] **FR-045**: Implementar borracha
- [ ] **FR-046**: Implementar undo (Ctrl+Z)
- [ ] **FR-047**: Implementar redo (Ctrl+Y)
- [ ] **FR-048**: Implementar limpar tudo
- [ ] **FR-049**: Export para PNG com alpha channel
- [ ] **FR-050**: Performance 60fps (< 16ms por frame)

### Brush Toolbar
- [ ] **FR-051**: Criar `BrushToolbar.tsx`
- [ ] **FR-052**: Slider de tamanho
- [ ] **FR-053**: Toggle brush/eraser
- [ ] **FR-054**: Botão limpar
- [ ] **FR-055**: Preview do tamanho do brush

### Mask Preview
- [ ] **FR-056**: Overlay semi-transparente (vermelho)
- [ ] **FR-057**: Opacidade ajustável
- [ ] **FR-058**: Toggle show/hide mask

---

## Phase 5: Frontend - UI Restructure

### Tab Navigation
- [ ] **FR-059**: Adicionar tabs ao ImageStudio
- [ ] **FR-060**: Tab "Criar" (default)
- [ ] **FR-061**: Tab "Editar"
- [ ] **FR-062**: Tab "Ajustar"
- [ ] **FR-063**: Tab "Vídeo" (desabilitada, "Em breve")
- [ ] **FR-064**: Manter estado entre tabs

### Quick Actions Bar
- [ ] **FR-065**: Criar `QuickActionsBar.tsx`
- [ ] **FR-066**: Botão "Remover Fundo"
- [ ] **FR-067**: Botão "Upscale 2x"
- [ ] **FR-068**: Botão "Enhance"
- [ ] **FR-069**: Botão "Download"
- [ ] **FR-070**: Loading states para cada ação
- [ ] **FR-071**: Tooltips com descrição

### Edit Mode
- [ ] **FR-072**: Criar `EditMode.tsx`
- [ ] **FR-073**: Seleção de imagem para editar
- [ ] **FR-074**: Toggle modo brush vs modo instrução
- [ ] **FR-075**: Preview lado a lado (antes/depois)
- [ ] **FR-076**: Campo de prompt para instrução

### Adjust Mode
- [ ] **FR-077**: Criar `AdjustMode.tsx`
- [ ] **FR-078**: Grid de funções rápidas
- [ ] **FR-079**: Preview antes/depois
- [ ] **FR-080**: Opções de configuração

### Model Selector
- [ ] **FR-081**: Agrupar modelos por categoria
- [ ] **FR-082**: Exibir preço estimado
- [ ] **FR-083**: Marcar modelo default

---

## Phase 6: Frontend - API Integration

### API Functions
- [ ] **FR-084**: Adicionar `inpaintImage()` em api.ts
- [ ] **FR-085**: Adicionar `editImage()` em api.ts
- [ ] **FR-086**: Adicionar `removeBackground()` em api.ts
- [ ] **FR-087**: Adicionar `upscaleImage()` em api.ts
- [ ] **FR-088**: Adicionar `enhanceImage()` em api.ts

### useImageStudio Hook
- [ ] **FR-089**: Adicionar estado para operação atual
- [ ] **FR-090**: Adicionar método `inpaint()`
- [ ] **FR-091**: Adicionar método `edit()`
- [ ] **FR-092**: Adicionar método `removeBg()`
- [ ] **FR-093**: Adicionar método `upscale()`
- [ ] **FR-094**: Adicionar método `enhance()`
- [ ] **FR-095**: Gerenciar loading por operação

---

## Phase 7: Testing

### Backend Tests
- [ ] **T-001**: Testes unitários para fal_ai_service.py
- [ ] **T-002**: Testes de integração para `/inpaint`
- [ ] **T-003**: Testes de integração para `/edit`
- [ ] **T-004**: Testes de integração para `/remove-background`
- [ ] **T-005**: Testes de integração para `/upscale`
- [ ] **T-006**: Testes de integração para `/enhance`
- [ ] **T-007**: Testes de error handling
- [ ] **T-008**: Testes de retry logic

### Frontend Tests
- [ ] **T-009**: Testes do BrushCanvas
- [ ] **T-010**: Testes de export de máscara
- [ ] **T-011**: Testes de integração com API
- [ ] **T-012**: Testes de UI (estados de loading)

### E2E Tests
- [ ] **T-013**: Fluxo completo de geração
- [ ] **T-014**: Fluxo completo de inpainting
- [ ] **T-015**: Fluxo de remove background
- [ ] **T-016**: Fluxo de upscale

---

## Phase 8: Documentation & Cleanup

### Documentation
- [ ] **D-001**: Atualizar CLAUDE.md com info fal.ai
- [ ] **D-002**: Documentar novos endpoints
- [ ] **D-003**: Atualizar .env.example com FAL_API_KEY
- [ ] **D-004**: Criar guia de troubleshooting

### Cleanup
- [ ] **C-001**: Remover código OpenRouter para imagens
- [ ] **C-002**: Limpar imports não utilizados
- [ ] **C-003**: Remover fallback models antigos
- [ ] **C-004**: Atualizar docker-compose.yml se necessário

---

## Non-Functional Requirements

### Performance
- [ ] **NFR-001**: Latência de geração ≤ OpenRouter atual
- [ ] **NFR-002**: Upscale 1024→2048 em < 30 segundos
- [ ] **NFR-003**: Remove background em < 10 segundos
- [ ] **NFR-004**: Canvas brush responde em < 16ms (60fps)
- [ ] **NFR-005**: UI funciona offline (desenho de máscara)

### Reliability
- [ ] **NFR-006**: Retry automático com backoff
- [ ] **NFR-007**: Circuit breaker para fal.ai
- [ ] **NFR-008**: Graceful degradation em falhas
- [ ] **NFR-009**: Logs de erro detalhados

### Security
- [ ] **NFR-010**: FAL_API_KEY em variável de ambiente
- [ ] **NFR-011**: Validação de file types
- [ ] **NFR-012**: Rate limiting por usuário
- [ ] **NFR-013**: Spending alerts/caps

---

## Success Criteria

- [ ] **SC-001**: 100% das gerações funcionam via fal.ai
- [ ] **SC-002**: Inpainting funciona com > 90% precisão
- [ ] **SC-003**: Remove BG funciona em > 95% das imagens
- [ ] **SC-004**: Upscale mantém qualidade (sem artefatos)
- [ ] **SC-005**: Latência ≤ baseline OpenRouter
- [ ] **SC-006**: Custo ≤ baseline OpenRouter
