# Specification Quality Checklist: Andromeda Creative Diversity System

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-02-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Validation Notes

### Validation 1 - 2026-02-03 (Initial)

**Status**: PASSED

Initial validation passed with all items checked.

### Validation 2 - 2026-02-03 (Modelos de IA)

**Status**: PASSED

User clarified:
- Modelos: Nano Banana Pro + GPT Image 1.5 (apenas esses dois)
- IA decide o melhor prompt caso a caso
- Template financeiro adicionado (Andromeda/Ideogram compliant)

### Validation 3 - 2026-02-03 (Modos de Geração + OpenRouter)

**Status**: PASSED

User provided additional clarifications:

1. **Provedor**: Usar **OpenRouter** para ambos os modelos de imagem
   - Já está integrado no sistema atual
   - Fallback automático entre modelos

2. **Dois Modos de Geração**:
   - **Modo Preset**: Usuário escolhe presets pré-definidos e quantidade de cada
     - Ex: "UI/Fintech: 3", "Editorial: 2"
     - Controle granular para usuários experientes
   - **Modo Livre**: Sistema decide completamente
     - IA decide melhores estilos baseado no contexto
     - Conveniência para usuários que preferem automação

3. **Presets de Criativos** (8 presets pré-definidos):
   - UI/Fintech
   - Dinheiro Realista
   - Dinheiro em Movimento
   - Malotes/Sacos
   - Bancos/Institucional
   - Pessoas Reais
   - Cartoon/Ilustração
   - Editorial Premium

4. **Rotação de Modelos de IA**: Automática (usuário não escolhe)
   - Sistema alterna entre Nano Banana Pro e GPT Image 1.5 automaticamente
   - Aumenta diversidade visual além dos prompts

5. **UI Mock adicionado**: Mockup ASCII da interface de seleção de modo

### Validation 4 - 2026-02-03 (Conceitos Especializados Financeiros + Sem Carrosséis)

**Status**: PASSED

User provided major clarifications:

1. **Carrosséis REMOVIDOS**: Apenas imagens únicas por enquanto
   - Reduz de 8 para 7 conceitos universais
   - Carrossel/Multi-card movido para Out of Scope

2. **Nicho Financeiro tem Conceitos Especializados**:
   - **28 conceitos** organizados em 5 categorias:
     - 📖 Narrativa (4): Problema→Solução, Antes/Depois, Jornada, Lifestyle
     - ⭐ Prova Social (4): Depoimento, Números, Comunidade, Selos
     - 💎 Produto (5): Simulador, Smartphone, Features, Comparação, Passos
     - 🧲 Curiosidade (6): Pergunta, Reveal, Notificação, Listicle, Mito/Realidade, Estatística
     - 🎨 Estilo Visual (9): Editorial, Cartoon, Colagem, 3D, Glassmorphism, etc.

   - **8 Grupos Visuais** (A-H) combinados com conceitos:
     - A: UI/Fintech, B: Dinheiro, C: Movimento, D: Malotes
     - E: Bancos, F: Pessoas, G: Cartoon, H: Editorial

   - **80+ combinações únicas** possíveis (28 conceitos × 8 grupos × backgrounds)

3. **Comportamento para Nicho Financeiro**:
   - IA escolhe **ALEATORIAMENTE** entre os 28 conceitos
   - Não repete mesmo conceito nos últimos 3 criativos
   - Combina com grupo visual e background para máxima diversidade
   - Template master financeiro (Andromeda/Ideogram) aplicado automaticamente

4. **Separação Clara**:
   - **Nichos Genéricos**: 8 conceitos universais + Modo Preset/Livre
   - **Nicho Financeiro**: Conceitos especializados + IA decide aleatoriamente

### Validation 5 - 2026-02-03 (Integração com Direcionamentos Existentes)

**Status**: PASSED

User solicitou garantir que a spec respeite a funcionalidade existente de "Direcionamentos" em `/alvoads-meta/criar`.

**Funcionalidades Preservadas:**
1. **Campo "Direcionamentos"** (`userDirections`) - Preservado na interface
   - Usuário pode digitar instruções específicas (ex: "tons de azul, pessoas sorrindo")
   - Limite de 500 caracteres (inalterado)

2. **Configurações de Targeting** - Integradas na geração de prompts
   - `countries`: Usado para localização (moeda, símbolos culturais)
   - `languages`: Usado para idioma do texto no criativo

3. **Ordem de Prioridade no Prompt**:
   - 1º Direcionamentos do usuário (sempre respeitados)
   - 2º Template master do nicho (se aplicável)
   - 3º Conceito criativo + Grupo visual
   - 4º Configurações de formato e localização

4. **Fluxo do Wizard** - Inalterado
   - StepCreatives.tsx mantém a mesma interface
   - Apenas a lógica de geração de prompts é aprimorada

**Novos Requisitos Adicionados:**
- FR-012D: Preservar campo Direcionamentos
- FR-012E: Combinar Direcionamentos com conceitos/templates
- FR-012F: Ordem de prioridade na composição do prompt
- FR-012G: Usar informações de targeting para localização

## Summary

| Aspecto | Valor |
|---------|-------|
| Provedor IA | OpenRouter (unificado) |
| Modelos | Nano Banana Pro, GPT Image 1.5 |
| Modos | Preset/Livre (genérico), IA automática (financeiro) |
| Conceitos Universais | 8 (incluindo Banner) |
| Conceitos Financeiros | Especializados em 5 categorias |
| Grupos Visuais | 8 (A-H) |
| User Stories | 5 |
| Requisitos | 33 (incluindo integração com Direcionamentos) |
| Critérios de Sucesso | 9 |

## Notes

- Spec **PRONTA** para `/speckit.clarify` ou `/speckit.plan`
- OpenRouter já integrado no sistema atual
- UI mocks incluídos para nichos genéricos e financeiro
- Carrosséis explicitamente fora do escopo (apenas imagens únicas)
- **Direcionamentos existentes preservados** - Campo `userDirections` continua funcionando
- **Targeting integrado** - Países e idiomas usados para localização de criativos
