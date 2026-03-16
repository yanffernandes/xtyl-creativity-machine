# Tasks: Studio Image Quality Improvements

**Input**: `/specs/033-studio-image-quality-improvements/`
**Branch**: `033-studio-image-quality-improvements`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: User story a que pertence (US1–US7)
- Caminhos absolutos a partir da raiz do monorepo

---

## Phase 2: Foundational — DB-Driven Model Capabilities

**Propósito**: Estender `VisibleImageModelConfig` com flags de capability auto-detectadas do schema fal.ai. Bloqueia US1 (que precisa ler esses dados do `system_config` em runtime).

**⚠️ CRÍTICO**: US1 não pode começar até esta fase estar completa.

- [x] T001 Estender interface `VisibleImageModelConfig` e tipo `ModelSchema` em `apps/admin/src/lib/api.ts` adicionando campos: `supportsQuality?: boolean`, `qualityValue?: 'low' | 'medium' | 'high'`, `supportsResolution?: boolean`, `resolutionValue?: string`, `supportsNegativePrompt?: boolean`

- [x] T002 Atualizar `toggleImageModel` em `apps/admin/src/routes/models.tsx` para derivar automaticamente as capability flags do array `schema.parameters` retornado por `getModelSchema`, antes de montar o `fullConfig` e persistir no `enabledImageModels` — sem edição manual pelo admin

- [x] T003 [P] Criar helper `deriveCapabilitiesFromSchema(parameters: ModelSchema['parameters']): Partial<VisibleImageModelConfig>` em `apps/admin/src/lib/api.ts` que mapeia parâmetros do schema fal.ai (ex: param com `name === 'quality'`) para os campos de capability — centraliza a lógica de detecção

- [x] T004 Verificar que o `AdminService` (backend) em `apps/api/src/modules/admin/admin.service.ts` expõe um método para ler o `system_config` `visibleImageModels` e que o `ImageGenerationProcessor` consegue acessar esse dado — criar ou expor método `getEnabledImageModelConfig(modelId: string): Promise<VisibleImageModelConfig | null>` se ainda não existir

**Checkpoint**: Ao habilitar um modelo no Admin → Modelos, as capability flags (`supportsQuality`, `supportsNegativePrompt`, etc.) devem ser persistidas no `system_config` automaticamente. O processor consegue lê-las.

---

## Phase 3: User Story 1 — Quality Parameter Reaches fal.ai (P1) 🎯 MVP

**Goal**: O processor lê as capabilities do modelo no `system_config` e inclui os params corretos (`quality`, `resolution`) na chamada fal.ai — sem nenhum valor hardcoded no código.

**Independent Test**: Habilitar `fal-ai/gpt-image-1.5` no Admin, gerar uma imagem, inspecionar o log da chamada fal.ai — deve conter `quality: 'high'`. Com Gemini 3 Pro, deve conter `resolution: '2K'`. Com Gemini Flash (sem capabilities), nenhum param extra.

- [x] T005 [US1] Injetar `AdminService` (ou serviço equivalente) no `ImageGenerationProcessor` em `apps/api/src/modules/image-generation/image-generation.processor.ts` para poder chamar `getEnabledImageModelConfig(modelId)` — atualizar construtor e `image-generation.module.ts` se necessário

- [x] T006 [US1] Substituir o bloco `falParams` fixo no método `process()` de `apps/api/src/modules/image-generation/image-generation.processor.ts` por lógica dinâmica: ler capabilities via `getEnabledImageModelConfig(effectiveModel)` e adicionar `quality`, `resolution` condicionalmente usando spread — nenhum `if (model.includes('gpt'))` ou mapa hardcoded

- [x] T007 [US1] Adicionar campos `quality_param_sent` e `resolution_param_sent` no objeto `generationMetadata` salvo no documento em `apps/api/src/modules/image-generation/image-generation.processor.ts` — registra qual valor foi efetivamente enviado ao fal.ai para debug

**Checkpoint**: US1 completo e testável independentemente. Imagens com `gpt-image-1.5` devem mostrar melhora visível de qualidade.

---

## Phase 4: User Story 2 — Rich, Detailed Prompt Generation (P1)

**Goal**: O LLM gera prompts de 250–350 palavras com composição, iluminação, câmera, atmosfera, estilo visual e tipografia — em vez de frases genéricas de 60 palavras.

**Independent Test**: Chamar "Gerar Prompt" no Studio com qualquer copy. O prompt retornado deve ter 200+ palavras e conter descritores explícitos de composição e iluminação em inglês.

- [x] T008 [US2] Reescrever a função `buildSystemPrompt` (sem conceito) em `apps/web/src/hooks/useCreativePromptGenerator.ts` com o novo template que instrui o LLM a produzir prompt estruturado em 6 seções: Sujeito/Ação, Composição/Enquadramento, Iluminação, Atmosfera/Mood, Estilo Visual, Tipografia — máximo 350 palavras

- [x] T009 [US2] Reescrever o branch de `buildSystemPrompt` com conceito selecionado em `apps/web/src/hooks/useCreativePromptGenerator.ts` para usar o mesmo template de 6 seções, incorporando `concept.prompt_modifier`, `prompt_template_json.composition`, `requirements` e `visual_description` como diretivas estruturadas

**Checkpoint**: US2 completo. Prompts gerados devem ser 3–4x mais longos e descritivos que o baseline.

---

## Phase 5: User Story 3 — LLM Temperature Control (P1)

**Goal**: A chamada ao `POST /chat/completion` para geração de prompts inclui `temperature: 0.3`, eliminando variações incoerentes entre gerações do mesmo input.

**Independent Test**: Gerar o mesmo prompt 5 vezes consecutivas. Todos os outputs devem ter a mesma estrutura de seções (composição, iluminação, etc.), mesmo que os substantivos variem levemente.

- [x] T010 [P] [US3] Adicionar `temperature: 0.3` no payload do `api.post('/chat/completion', ...)` dentro de `generateCreativePrompt` em `apps/web/src/hooks/useCreativePromptGenerator.ts`

**Checkpoint**: US3 completo (1 linha de mudança). US1, US2 e US3 formam o MVP — maior impacto de qualidade com menor risco.

---

## Phase 6: User Story 4 — Global Visual Quality Rules (P2)

**Goal**: As 7 regras visuais globais (tipografia mínima, contraste, hierarquia, sem clutter) são injetadas em dois pontos: no system prompt do LLM (antes de gerar o prompt) e no enrichment do backend (antes de enviar ao fal.ai).

**Independent Test**: Inspecionar o `enriched_prompt` no `generationMetadata` de qualquer documento gerado — deve terminar com o bloco `GLOBAL VISUAL QUALITY RULES`. Inspecionar o system prompt enviado ao LLM — deve conter o mesmo bloco de regras.

- [x] T011 [US4] Adicionar constante `GLOBAL_VISUAL_RULES` (7 regras) como `private static readonly` em `apps/api/src/modules/image-generation/prompt-enrichment.service.ts` e anexar ao retorno de `enrichPrompt()` — sempre ao final, após brand context

- [x] T012 [P] [US4] Adicionar o bloco de Global Visual Rules como seção final nos dois templates de `buildSystemPrompt` (com e sem conceito) em `apps/web/src/hooks/useCreativePromptGenerator.ts` — garantindo que o LLM gere prompts que já respeitem tipografia e contraste

- [x] T013 [P] [US4] Quando brand context com `colorPalette` estiver presente, referenciar as cores no texto da regra de contraste (regra 3) em `apps/api/src/modules/image-generation/prompt-enrichment.service.ts` — ex: "Text must contrast strongly against background, preferring brand colors: #5B8DEF"

**Checkpoint**: US4 completo. Toda geração passa pelas regras visuais, independente da qualidade do prompt original.

---

## Phase 7: User Story 5 — Negative Prompts End-to-End (P2)

**Goal**: Usuário pode digitar um negative prompt no Studio (seção "Configurações Avançadas"). O valor percorre toda a stack (DTO → fila → processor → fal.ai). Modelos sem suporte mostram aviso inline. Prompt enriquecido final é visível como "Ver prompt completo".

**Independent Test**: Com Seedream habilitado (suporte a `negative_prompt`), digitar "blurry, watermark" e gerar. O log fal.ai deve incluir `negative_prompt`. Com GPT Image 1.5, o aviso inline deve aparecer abaixo do textarea.

- [x] T014 [US5] Adicionar campo `negative_prompt?: string` com decorators `@IsOptional()`, `@IsString()`, `@MaxLength(500)` no DTO de geração em `apps/api/src/modules/image-generation/dto/image-generation.dto.ts`

- [x] T015 [US5] Passar `negative_prompt` do DTO para o payload do job BullMQ em `apps/api/src/modules/image-generation/image-generation.service.ts` — junto com os demais campos já enfileirados por variação

- [x] T016 [US5] No método `process()` de `apps/api/src/modules/image-generation/image-generation.processor.ts`: ler `job.data.negative_prompt`, aplicar `DEFAULT_NEGATIVE_PROMPT` como fallback quando vazio, e incluir `negative_prompt` nos `falParams` condicionalmente usando `caps.supportsNegativePrompt` da capability lida do `system_config`

- [x] T017 [US5] Adicionar estado `negativePrompt` / `setNegativePrompt` em `apps/web/src/hooks/useImageStudio.ts` e incluir `negative_prompt: negativePrompt || undefined` no payload do `generateImageBatch()` — expor no retorno do hook

- [x] T018 [US5] Adicionar seção colapsável "Configurações Avançadas" em `apps/web/src/app/workspace/[id]/project/[projectId]/studio/page.tsx` usando `Collapsible` do Shadcn, contendo: (a) `Textarea` para negative prompt ligado a `studio.negativePrompt`/`studio.setNegativePrompt`; (b) aviso inline condicional abaixo do textarea quando o modelo selecionado tem `supportsNegativePrompt === false` no config

- [x] T019 [US5] Adicionar visualizador "Ver prompt completo" como segundo item colapsável dentro de "Configurações Avançadas" em `apps/web/src/app/workspace/[id]/project/[projectId]/studio/page.tsx` — somente leitura, exibe o `enriched_prompt` retornado no SSE event `variation_started` (ou busca do `generationMetadata` após conclusão)

**Checkpoint**: US5 completo. Negative prompts funcionam end-to-end para modelos suportados; usuário informado para modelos sem suporte.

---

## Phase 8: User Story 6 — Functional Creativity Slider (P2)

**Goal**: O slider de criatividade (0–100) mapeia para uma matriz 4×4 de modificadores — baixa criatividade = fidelidade ao conceito, alta criatividade = reinterpretação artística ousada, variando por índice de variação dentro do batch.

**Independent Test**: Gerar 4 variações com criatividade=0 e inspecionar `variationModifier` no `generationMetadata` de cada documento — devem ser variantes de "faithful". Repetir com criatividade=100 — devem ser variantes de "bold creative reimagination".

- [x] T020 [US6] Substituir o método `buildStyleModifier(index, _creativity)` em `apps/api/src/modules/image-generation/image-generation.processor.ts` pela versão com matriz 4×4: calcular `creativityBucket = Math.floor((creativity / 100) * 3.99)` e selecionar o modificador pela combinação bucket × index — remover o prefixo `_` do parâmetro `creativity`

**Checkpoint**: US6 completo. Slider agora tem efeito real e auditável via `generationMetadata`.

---

## Phase 9: User Story 7 — Structured Concept Usage in Enrichment (P3)

**Goal**: Quando o usuário digita o prompt manualmente (sem usar o gerador LLM) e tem um conceito selecionado com `prompt_template_json`, o enrichment do backend extrai os campos estruturados (composição, requirements, visual_description) como diretivas explícitas — não só prepend de texto livre.

**Independent Test**: Via API, enviar um batch com conceito que tem `prompt_template_json.composition` sem usar o gerador de prompt. Inspecionar `enriched_prompt` no `generationMetadata` — deve conter "Composition: layout=X, style=Y, main_element=Z".

- [x] T021 [US7] Criar método privado `buildConceptDirective(concept: any): string` em `apps/api/src/modules/image-generation/prompt-enrichment.service.ts` que extrai e formata campos de `prompt_template_json` (composition, requirements, visual_description) como diretivas estruturadas, com fallback para `prompt_modifier` quando JSON não disponível

- [x] T022 [US7] Substituir o bloco de prepend simples do conceito em `enrichPrompt()` de `apps/api/src/modules/image-generation/prompt-enrichment.service.ts` por chamada ao novo `buildConceptDirective()` — garantir que o fallback para `prompt_modifier` plain text mantém comportamento idêntico ao atual

**Checkpoint**: US7 completo. Conceito com `prompt_template_json` produz enriquecimento mais rico mesmo sem gerador LLM.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [x] T023 [P] Adicionar `enriched_prompt: finalPrompt` ao objeto `generationMetadata` em `apps/api/src/modules/image-generation/image-generation.processor.ts` — permite inspecionar o prompt exato enviado ao fal.ai sem acessar logs do servidor

- [x] T024 [P] Atualizar `data-model.md` e `research.md` em `specs/033-studio-image-quality-improvements/` para refletir a decisão final: capabilities via auto-detect do schema fal.ai, nenhum mapa hardcoded — substituir todas as referências ao `MODEL_CAPABILITIES` hardcoded

- [ ] T025 Executar validação manual do `quickstart.md`: gerar imagens com cada modelo habilitado, confirmar SC-001 a SC-005 dos Success Criteria — registrar resultado no `quickstart.md`

---

## Dependencies & Execution Order

### Ordem de Fases

- **Phase 2 (Foundational)**: Sem dependências — começar imediatamente. **Bloqueia US1.**
- **Phase 3 (US1)**: Depende da Phase 2 completa (capabilities no system_config)
- **Phase 4 (US2)**: Independente, pode rodar em paralelo com Phase 3
- **Phase 5 (US3)**: Independente, pode rodar em paralelo com Phase 3 e 4 — é 1 linha de mudança
- **Phase 6 (US4)**: Independente após Phase 2
- **Phase 7 (US5)**: Depende de T007 (capabilities lidas no processor) para o gating de `negative_prompt`
- **Phase 8 (US6)**: Independente, sem dependências externas
- **Phase 9 (US7)**: Independente
- **Phase 10 (Polish)**: Depende de todas as user stories desejadas estarem completas

### Dependências Entre Tasks

```
T001 → T003 → T002       (interface → helper → toggleImageModel)
T002 → T004              (admin persiste → backend lê)
T004 → T005 → T006       (serviço disponível → injetar → usar no processor)
T006 → T016              (capabilities no processor → usar para negative_prompt)
T014 → T015 → T016       (DTO → service → processor)
T016 → T017 → T018       (processor OK → hook → UI)
T008, T009 independentes entre si
T010 independente (mesma função, campo diferente de T008/T009)
T011, T012, T013 independentes entre si
T021 → T022              (criar método → substituir chamada)
```

### Oportunidades de Paralelismo

- **T003** pode rodar em paralelo com T001
- **US2 (T008, T009)** pode rodar em paralelo com **Phase 2**
- **US3 (T010)** pode rodar em paralelo com qualquer fase
- **US4 (T011, T012, T013)** todos paralelos entre si após Phase 2
- **US6 (T020)** pode rodar em paralelo com qualquer fase
- **T023, T024** paralelos entre si na fase de polish

---

## Parallel Example: MVP (US1 + US2 + US3)

```
# Paralelo 1 — Foundational + Prompt Expansion
Developer A: T001 → T003 → T002 → T004 → T005 → T006 → T007  (capability pipeline)
Developer B: T008 → T009 → T010                               (prompt generator)

# Após Foundational completo — paralelo adicional
Developer A: T011 → T013  (global rules no backend)
Developer B: T012         (global rules no LLM prompt)
```

---

## Implementation Strategy

### MVP (User Stories P1 — ~3–4h)

1. Completar **Phase 2** (Foundational) — T001 a T004
2. Completar **Phase 3** (US1) — T005 a T007
3. Completar **Phase 4** (US2) — T008, T009
4. Completar **Phase 5** (US3) — T010 (1 linha)
5. **VALIDAR**: gerar imagens e comparar com baseline

### Entrega Incremental Completa

1. MVP P1 (acima) → imagens visivelmente melhores
2. US4 (T011–T013) → safety net de qualidade universal
3. US5 (T014–T019) → negative prompts e transparência para usuário
4. US6 (T020) → slider funcional
5. US7 (T021–T022) → conceitos mais ricos sem LLM
6. Polish (T023–T025) → debug e validação final

---

## Summary

| Métrica | Valor |
|---|---|
| Total de tasks | 25 |
| Phase 2 Foundational | 4 tasks |
| US1 (P1) | 3 tasks |
| US2 (P1) | 2 tasks |
| US3 (P1) | 1 task |
| US4 (P2) | 3 tasks |
| US5 (P2) | 6 tasks |
| US6 (P2) | 1 task |
| US7 (P3) | 2 tasks |
| Polish | 3 tasks |
| Tasks paralelas [P] | 9 tasks |
| Arquivos modificados | 9 arquivos |
| MVP mínimo (P1) | T001–T010 (10 tasks) |
