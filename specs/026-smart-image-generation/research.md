# Research: Smart Image Generation

**Feature**: 026-smart-image-generation
**Date**: 2025-12-12

## Research Questions

### 1. Como implementar geração paralela de múltiplas variações?

**Decision**: Usar `asyncio.gather()` para executar múltiplas chamadas ao OpenRouter API em paralelo, com cada variação tendo um modificador de prompt distinto.

**Rationale**:
- O sistema atual já usa async/await em `image_generation_service.py`
- `asyncio.gather()` permite executar todas as variações simultaneamente
- Cada variação terá um modificador de estilo diferente para garantir diferenças visuais

**Alternatives Considered**:
- Execução sequencial: Rejeitado - tempo total seria multiplicado pelo número de variações
- Celery tasks: Rejeitado - overhead desnecessário para operações já async
- Threading: Rejeitado - Python async é mais adequado para I/O-bound operations

**Implementation Pattern**:
```python
async def generate_variations(prompt: str, num_variations: int, modifiers: list[str]):
    tasks = []
    for i, modifier in enumerate(modifiers[:num_variations]):
        enriched_prompt = f"{prompt} - {modifier}"
        tasks.append(generate_single_image(enriched_prompt))
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]
```

---

### 2. Como armazenar configuração global de variações?

**Decision**: Usar tabela `system_config` existente com chave `image_generation_default_variations`.

**Rationale**:
- A tabela `system_config` já existe e é usada para outras configurações globais (ex: modelos de IA)
- Evita criar nova tabela/migração
- Segue padrão existente do sistema

**Schema**:
```json
{
  "key": "image_generation_default_variations",
  "value": {
    "count": 2,
    "modifiers": ["versão minimalista e clean", "versão vibrante e impactante", "versão sofisticada e elegante"]
  },
  "description": "Número padrão de variações de imagem e modificadores de estilo"
}
```

**Alternatives Considered**:
- Coluna nova em Project: Rejeitado - spec define configuração global, não por projeto
- Nova tabela: Rejeitado - system_config já serve esse propósito

---

### 3. Como detectar override do usuário no prompt?

**Decision**: Usar detecção de padrões no prompt via LLM (já existe no chat) para identificar intenções explícitas.

**Rationale**:
- O assistente de IA (Claude) já interpreta a intenção do usuário
- Adicionar instruções no system prompt para reconhecer overrides
- Padrões como "gera exatamente isso:", "apenas 1 variação", "sem referências"

**Patterns para Override**:
| Intenção | Padrões de Detecção |
|----------|---------------------|
| Sem enriquecimento | "exatamente isso:", "literalmente:", "sem modificar" |
| N variações específicas | "X variação/variações", "apenas X" |
| Sem assets | "sem referências", "ignora o projeto", "do zero" |

**Implementation**: Atualizar system prompt do chat para instruir o assistente a passar parâmetros `skip_prompt_enrichment`, `override_variations`, `skip_visual_context` conforme detectado.

---

### 4. Quais modificadores de prompt garantem variações distintas?

**Decision**: Usar 3 modificadores pré-definidos focados em estilo visual para marketing:

1. **Minimalista**: "versão minimalista e clean, com espaço em branco, tipografia elegante"
2. **Vibrante**: "versão vibrante e impactante, cores saturadas, elementos dinâmicos"
3. **Sofisticada**: "versão sofisticada e premium, tons neutros, composição equilibrada"

**Rationale**:
- Modificadores descrevem estilos visuais distintos e comuns em marketing
- São complementares (não conflitantes)
- Funcionam bem com qualquer tipo de criativo (anúncio, post, banner)

**Alternatives Considered**:
- Modificadores técnicos (aspect ratio, resolução): Rejeitado - não garantem diferença visual perceptível
- Modificadores randomizados: Rejeitado - resultados inconsistentes
- Modificadores baseados em tipo de criativo: Pode ser adicionado futuramente

---

### 5. Como implementar entrega progressiva via SSE?

**Decision**: Estender o SSE existente em `/chat/stream` para emitir eventos de variação individual.

**Rationale**:
- Sistema já usa SSE para streaming de respostas do chat
- Adicionar novo tipo de evento `image_variation_complete`
- Frontend já tem infraestrutura para processar SSE

**Event Schema**:
```json
{
  "type": "image_variation_complete",
  "data": {
    "variation_index": 0,
    "total_variations": 2,
    "image_url": "https://...",
    "modifier_used": "versão minimalista",
    "document_id": "uuid"
  }
}
```

**Alternatives Considered**:
- WebSocket: Rejeitado - SSE já implementado e suficiente para este caso
- Polling: Rejeitado - menos eficiente, maior latência

---

### 6. Como exibir múltiplas variações na UI?

**Decision**: Grid responsivo com 2-3 colunas, skeleton loading por variação, animação de entrada ao completar.

**Rationale**:
- Grid permite comparação visual lado a lado
- Skeleton por variação mostra progresso individual
- Animação de entrada (Framer Motion) indica conclusão

**UI Behavior**:
1. Usuário solicita imagem
2. Grid aparece com N skeletons (conforme config)
3. Conforme cada variação completa, skeleton é substituído pela imagem com fade-in
4. Usuário pode clicar para expandir ou selecionar

**Alternatives Considered**:
- Carousel: Rejeitado - dificulta comparação lado a lado
- Lista vertical: Rejeitado - usa muito espaço vertical, comparação menos intuitiva

---

## Technical Decisions Summary

| Decision | Choice | Impact |
|----------|--------|--------|
| Parallel execution | asyncio.gather() | Tempo total ≈ tempo de 1 variação |
| Global config storage | system_config table | Sem migrações, padrão existente |
| Override detection | LLM via system prompt | Detecção inteligente, flexível |
| Style modifiers | 3 pré-definidos (minimalista, vibrante, sofisticada) | Variações distintas e profissionais |
| Progressive delivery | SSE events | Feedback em tempo real |
| UI layout | Responsive grid | Comparação visual eficiente |

## Dependencies Identified

1. **OpenRouter API**: Suporta múltiplas chamadas paralelas (rate limit a verificar)
2. **system_config table**: Já existe, apenas adicionar nova chave
3. **SSE infrastructure**: Já implementada em chat.py
4. **Framer Motion**: Já instalado no frontend

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rate limit OpenRouter | Medium | High | Implementar retry com backoff; considerar sequencial se falhar |
| Timeout em paralelo | Low | Medium | Usar asyncio.wait_for() com timeout individual |
| UI overload com muitas variações | Low | Low | Limitar a 3 variações máximo |

## Next Steps

1. ✅ Research complete
2. → Generate data-model.md
3. → Generate API contracts
4. → Generate quickstart.md
