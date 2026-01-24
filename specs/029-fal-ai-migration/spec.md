# Feature Specification: Image Studio Evolution - fal.ai Migration

**Feature Branch**: `029-fal-ai-migration`
**Created**: 2026-01-24
**Status**: Draft
**Input**: Migração do sistema de geração de imagens de OpenRouter para fal.ai, adicionando capacidades avançadas de edição com máscara, funções rápidas (remove background, upscale), e preparação para geração de vídeo.

## Contexto do Problema

O sistema atual de geração de imagens utiliza OpenRouter como provider único, o que apresenta limitações significativas:

1. **Sem suporte a inpainting com máscara**: OpenRouter não oferece endpoint de edição com máscara, impossibilitando edições localizadas em áreas específicas da imagem
2. **Sem funções utilitárias**: Não há suporte para remove background, upscale, enhance, etc.
3. **Sem geração de vídeo**: OpenRouter foca em LLMs e não oferece modelos de vídeo
4. **Edição limitada**: Atualmente só é possível passar imagens como "referência", sem controle preciso sobre o que editar
5. **Custo potencialmente maior**: fal.ai oferece preços mais competitivos para geração de mídia

### Decisão Arquitetural

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA HÍBRIDA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OpenRouter (MANTER)                                        │
│  └─→ Chat, LLM, texto, workflows de texto                  │
│  └─→ Já funciona, sem mudanças                             │
│                                                             │
│  fal.ai (NOVO - Image Studio)                              │
│  ├─→ Geração de imagens                                    │
│  ├─→ Edição com máscara (inpainting)                       │
│  ├─→ Edição por instrução (FLUX Kontext)                   │
│  ├─→ Funções rápidas (remove bg, upscale, enhance)         │
│  └─→ Geração de vídeo (futuro)                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Modelos fal.ai Disponíveis

### Geração de Imagem
| Modelo | Endpoint | Uso | Preço |
|--------|----------|-----|-------|
| GPT Image 1.5 | `fal-ai/gpt-image-1.5` | Melhor qualidade + texto | ~$0.04/img |
| FLUX Pro | `fal-ai/flux-pro` | Fotorrealismo | $0.05/MP |
| FLUX [dev] | `fal-ai/flux/dev` | Mais barato | $0.025/MP |
| Gemini 3 Pro Image | `fal-ai/gemini-3-pro-image-preview` | Edição conversacional | $0.039/img |
| Recraft V3 | `fal-ai/recraft-v3` | Vetores e branding | - |

### Edição de Imagem
| Modelo | Endpoint | Uso | Preço |
|--------|----------|-----|-------|
| FLUX.1 Fill Pro | `fal-ai/flux-pro/v1/fill` | Inpainting com máscara | $0.05/MP |
| FLUX Kontext [pro] | `fal-ai/flux-pro/kontext` | Edição local por texto | $0.04/img |
| FLUX Kontext [max] | `fal-ai/flux-kontext/max` | Máxima qualidade | $0.11/MP |
| GPT Image 1.5 Edit | `fal-ai/gpt-image-1.5/edit` | Edição por instrução | ~$0.04/img |
| Qwen Image Edit | `fal-ai/qwen-image-edit/inpaint` | Inpainting barato | $0.03/MP |

### Funções Utilitárias
| Modelo | Endpoint | Uso | Preço |
|--------|----------|-----|-------|
| Bria RMBG 2.0 | `fal-ai/bria/background/remove` | Remove background | $0.018/img |
| ESRGAN | `fal-ai/esrgan` | Upscale básico | - |
| Clarity Upscaler | `fal-ai/clarity-upscaler` | Upscale + enhance | - |
| Topaz Upscale | `fal-ai/topaz/upscale/image` | Upscale profissional | - |
| Recraft Crisp | `fal-ai/recraft/upscale/crisp` | Upscale + faces | - |

### Geração de Vídeo (Futuro)
| Modelo | Endpoint | Uso |
|--------|----------|-----|
| Veo 3.1 | `fal-ai/veo-3` | Google DeepMind |
| Kling 2.6 | `fal-ai/kling-video/v2.6` | Motion control |
| LTX-2 | `fal-ai/ltx-2` | Text/Image to video |
| Seedance Pro | `fal-ai/seedance/pro` | Multi-shot |

## User Scenarios & Testing

### User Story 1 - Edição com Máscara/Brush (Priority: P0)

Um designer precisa remover um objeto específico de uma imagem ou adicionar um elemento em uma área precisa. Ele usa uma ferramenta de brush para pintar a área desejada e descreve o que quer fazer.

**Why this priority**: Esta é a funcionalidade principal que motivou a migração - controle preciso sobre edições localizadas.

**Acceptance Scenarios**:

1. **Given** uma imagem no Image Studio, **When** o usuário ativa o modo brush e pinta uma área, **Then** o sistema exibe a máscara sobre a imagem em tempo real
2. **Given** uma máscara pintada, **When** o usuário digita "remova este objeto" e confirma, **Then** o sistema envia a imagem + máscara para FLUX Fill e retorna a imagem editada
3. **Given** uma máscara pintada, **When** o usuário digita "adicione uma árvore aqui", **Then** o sistema adiciona o objeto apenas na área mascarada, preservando o resto
4. **Given** uma edição concluída, **When** o usuário não está satisfeito, **Then** pode desfazer e repintar a máscara para tentar novamente

---

### User Story 2 - Edição por Instrução Natural (Priority: P1)

Um usuário quer fazer uma edição simples sem precisar pintar uma máscara. Ele simplesmente descreve o que quer mudar em linguagem natural.

**Why this priority**: Nem todas as edições precisam de máscara - edições globais ou bem definidas podem ser feitas por texto.

**Acceptance Scenarios**:

1. **Given** uma imagem no Image Studio, **When** o usuário digita "mude o fundo para uma praia ao pôr do sol", **Then** o sistema usa FLUX Kontext para fazer a edição
2. **Given** uma imagem com uma pessoa, **When** o usuário digita "mude a cor da camisa para azul", **Then** o sistema identifica e edita apenas a camisa
3. **Given** uma edição por instrução, **When** o resultado não preserva elementos importantes, **Then** o usuário pode adicionar "mantendo o rosto igual" ao prompt

---

### User Story 3 - Funções Rápidas (Priority: P1)

Um usuário precisa rapidamente remover o fundo de uma imagem, aumentar a resolução, ou melhorar a qualidade geral sem prompts complexos.

**Why this priority**: Funções utilitárias são essenciais para fluxos de trabalho profissionais e aumentam muito a produtividade.

**Acceptance Scenarios**:

1. **Given** uma imagem no Image Studio, **When** o usuário clica em "Remover Fundo", **Then** o sistema retorna a imagem com fundo transparente (PNG com alpha)
2. **Given** uma imagem de baixa resolução, **When** o usuário clica em "Upscale 2x", **Then** o sistema dobra a resolução mantendo qualidade
3. **Given** uma imagem, **When** o usuário clica em "Enhance", **Then** o sistema melhora nitidez, cores e detalhes automaticamente
4. **Given** qualquer função rápida, **When** processando, **Then** exibe indicador de progresso e tempo estimado

---

### User Story 4 - Geração de Imagem Melhorada (Priority: P1)

Um usuário quer gerar novas imagens com acesso a modelos melhores e mais opções de controle.

**Why this priority**: A geração continua sendo o caso de uso principal, agora com mais opções.

**Acceptance Scenarios**:

1. **Given** o Image Studio, **When** o usuário seleciona um modelo, **Then** vê opções como GPT Image 1.5, FLUX Pro, Gemini 3, Recraft
2. **Given** uma geração com FLUX Pro, **When** comparado ao antigo OpenRouter, **Then** a qualidade é igual ou superior com menor latência
3. **Given** um prompt, **When** o usuário gera variações, **Then** o sistema usa o mesmo provider (fal.ai) para consistência

---

### User Story 5 - Preparação para Vídeo (Priority: P2)

A interface deve estar preparada para adicionar geração de vídeo no futuro, mesmo que não seja implementada agora.

**Why this priority**: Evitar refatoração futura ao planejar a arquitetura desde já.

**Acceptance Scenarios**:

1. **Given** a arquitetura do Image Studio, **When** vídeo for adicionado, **Then** a estrutura de abas/modos já suporta
2. **Given** o backend, **When** vídeo for adicionado, **Then** o serviço fal.ai já está integrado e basta adicionar endpoints
3. **Given** a UI, **When** o usuário ver a tab "Vídeo" desabilitada, **Then** entende que está "em breve"

---

### Edge Cases

- **Máscara muito pequena**: Avisar usuário que áreas muito pequenas podem não ter resultado preciso
- **Máscara cobre imagem inteira**: Tratar como geração nova, não edição
- **Falha no fal.ai**: Retry automático com backoff, fallback para outro modelo se disponível
- **Imagem muito grande para upscale**: Limitar ou processar em tiles
- **Formato não suportado**: Converter automaticamente para PNG/JPEG
- **Sem créditos fal.ai**: Exibir mensagem clara e bloquear operações

## Requirements

### Functional Requirements

#### Backend - Serviço fal.ai
- **FR-001**: Sistema DEVE implementar novo serviço `fal_ai_service.py` para comunicação com API fal.ai
- **FR-002**: Sistema DEVE suportar autenticação via `FAL_API_KEY` em variável de ambiente
- **FR-003**: Sistema DEVE implementar retry com exponential backoff para falhas de API
- **FR-004**: Sistema DEVE cachear lista de modelos disponíveis por 1 hora
- **FR-005**: Sistema DEVE converter respostas fal.ai para formato compatível com estrutura existente

#### Backend - Endpoints de Imagem
- **FR-010**: Sistema DEVE manter endpoints existentes (`/image-generation/*`) funcionando
- **FR-011**: Sistema DEVE adicionar endpoint `POST /image-generation/inpaint` para edição com máscara
- **FR-012**: Sistema DEVE adicionar endpoint `POST /image-generation/edit` para edição por instrução
- **FR-013**: Sistema DEVE adicionar endpoint `POST /image-generation/remove-background`
- **FR-014**: Sistema DEVE adicionar endpoint `POST /image-generation/upscale`
- **FR-015**: Sistema DEVE adicionar endpoint `POST /image-generation/enhance`

#### Backend - Modelos e Metadados
- **FR-020**: Sistema DEVE salvar `provider: "fal.ai"` nos metadados de geração
- **FR-021**: Sistema DEVE salvar `mask_url` quando inpainting for usado
- **FR-022**: Sistema DEVE trackear custos por operação para billing futuro

#### Frontend - Brush Tool
- **FR-030**: Sistema DEVE implementar canvas de desenho sobre imagem para criar máscaras
- **FR-031**: Sistema DEVE permitir ajuste de tamanho do brush (pequeno, médio, grande)
- **FR-032**: Sistema DEVE permitir borracha para corrigir máscara
- **FR-033**: Sistema DEVE exibir máscara com overlay semi-transparente vermelho (padrão da indústria, 50% opacidade)
- **FR-034**: Sistema DEVE permitir limpar máscara completamente
- **FR-035**: Sistema DEVE exportar máscara como PNG com alpha channel

#### Frontend - Quick Actions
- **FR-040**: Sistema DEVE exibir barra de ações rápidas na visualização de imagem
- **FR-041**: Sistema DEVE incluir botões: Remove BG, Upscale, Enhance, Edit, Download
- **FR-042**: Sistema DEVE exibir loading state individual por operação (permite operações paralelas)
- **FR-043**: Sistema DEVE exibir preview antes/depois para upscale e enhance

#### Frontend - Model Selector
- **FR-050**: Sistema DEVE agrupar modelos por categoria (Geração, Edição, Utilitários)
- **FR-051**: Sistema DEVE exibir preço estimado por modelo
- **FR-052**: Sistema DEVE marcar modelo recomendado/default

### Non-Functional Requirements

- **NFR-001**: Latência de geração DEVE ser igual ou menor que OpenRouter atual
- **NFR-002**: Upscale de imagem 1024x1024 → 2048x2048 DEVE completar em < 30 segundos
- **NFR-003**: Remove background DEVE completar em < 10 segundos
- **NFR-004**: Canvas de brush DEVE responder em < 16ms (60fps)
- **NFR-005**: Sistema DEVE funcionar offline para operações de UI (desenho de máscara)

### Key Entities

```typescript
// Nova entidade para operações de edição
interface ImageEditOperation {
  id: string;
  document_id: string;
  operation_type: 'inpaint' | 'edit' | 'remove_bg' | 'upscale' | 'enhance';
  input_image_url: string;
  mask_url?: string;  // Para inpainting
  prompt?: string;    // Para edit/inpaint
  output_image_url: string;
  model_used: string;
  provider: 'fal.ai';
  cost_cents: number;
  created_at: Date;
}

// Configuração de modelos fal.ai
interface FalModelConfig {
  id: string;
  category: 'generation' | 'editing' | 'utility' | 'video';
  endpoint: string;
  display_name: string;
  description: string;
  price_per_mp?: number;
  price_per_image?: number;
  supports_mask: boolean;
  supports_reference: boolean;
  is_default: boolean;
  is_visible: boolean;
}
```

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% das gerações de imagem funcionam via fal.ai sem regressões
- **SC-002**: Inpainting com máscara funciona com precisão > 90% na área marcada
- **SC-003**: Remove background funciona em > 95% das imagens com objetos bem definidos
- **SC-004**: Upscale 2x mantém qualidade perceptível (sem artefatos visíveis)
- **SC-005**: Latência média de geração é igual ou menor que baseline OpenRouter
- **SC-006**: Custo médio por imagem é igual ou menor que OpenRouter

## Mudanças de Interface Propostas

### Image Studio - Nova Estrutura

```
┌─────────────────────────────────────────────────────────────┐
│  Image Studio                                    [?] [⚙️]   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│  │ Criar   │ │ Editar  │ │ Ajustar │ │ Vídeo (em breve)│   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [Área de Preview/Canvas]               │   │
│  │                                                     │   │
│  │  Quando em modo Editar:                            │   │
│  │  - Canvas com brush para desenhar máscara          │   │
│  │  - Toolbar: [Brush ▼] [Borracha] [Limpar] [Tamanho]│   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Prompt: [________________________________] [Gerar]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Actions (quando imagem selecionada):                │
│  [🎨 Remover Fundo] [📐 Upscale 2x] [✨ Enhance] [💾 Salvar]│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Variações geradas                                    │  │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                     │  │
│  │ │     │ │     │ │     │ │     │                     │  │
│  │ └─────┘ └─────┘ └─────┘ └─────┘                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Configurações Avançadas ▼                                 │
│  - Modelo: [GPT Image 1.5 ▼] ($0.04/img)                  │
│  - Aspect Ratio: [1:1 ▼]                                   │
│  - Criatividade: [────●────]                               │
│  - Assets de Referência: [Selecionar...]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tabs do Image Studio

1. **Criar** (default)
   - Geração de novas imagens do zero
   - Prompt + configurações
   - Variações

2. **Editar**
   - Selecionar imagem existente
   - Modo brush para máscara OU
   - Modo instrução (texto)
   - Preview lado a lado

3. **Ajustar**
   - Funções rápidas
   - Remove background
   - Upscale (2x, 4x)
   - Enhance

4. **Vídeo** (desabilitado)
   - Placeholder "Em breve"
   - Prepara estrutura para futuro

## Assumptions

- fal.ai mantém disponibilidade > 99.9%
- Preços fal.ai se mantêm estáveis
- Usuários têm conexão suficiente para upload de imagens
- Modelos fal.ai suportam formatos PNG e JPEG
- A API fal.ai suporta máscaras em formato PNG com alpha channel

## Out of Scope

- Geração de vídeo (apenas preparação de UI)
- Training de LoRAs customizados
- Integração com outras plataformas (Canva, Figma)
- Editor de imagem completo (layers, filtros, etc.)
- Billing/cobrança por uso

## Fase 1: Planejamento (PRIMEIRA TAREFA)

Antes de implementar, o spec exige um planejamento detalhado que deve incluir:

### 1.1 Análise de Impacto
- Mapear todos os arquivos que serão modificados
- Identificar breaking changes
- Definir estratégia de rollback

### 1.2 Design de API
- Especificar request/response de cada novo endpoint
- Definir schemas Pydantic
- Documentar erros possíveis

### 1.3 Design de UI
- Wireframes detalhados do brush tool
- Fluxo de interação completo
- Estados de loading e erro

### 1.4 Migração de Dados
- Como migrar imagens existentes (se necessário)
- Compatibilidade com metadados antigos

### 1.5 Testes
- Plano de testes para cada funcionalidade
- Critérios de aceitação detalhados

## Clarifications

### Session 2026-01-24

- Q: Manter OpenRouter para texto? → A: Sim, apenas imagem/vídeo migra para fal.ai
- Q: Remover OpenRouter de imagens completamente? → A: Sim, substituição total
- Q: Implementar vídeo agora? → A: Não, apenas preparar estrutura
- Q: Quais funções rápidas são prioridade? → A: Remove BG e Upscale são P1, Enhance é P2
- Q: Qual cor do overlay da máscara? → A: Vermelho (padrão da indústria, matches Photoshop/GIMP)
- Q: Operações simultâneas permitidas? → A: Sim, cada operação com loading state independente

## References

- [fal.ai Documentation](https://docs.fal.ai/)
- [fal.ai Models](https://fal.ai/models)
- [fal.ai Pricing](https://fal.ai/pricing)
- [FLUX.1 Fill Pro](https://fal.ai/models/fal-ai/flux-pro/v1/fill)
- [FLUX Kontext](https://fal.ai/flux-kontext)
- [Bria RMBG 2.0](https://fal.ai/models/fal-ai/bria/background/remove)
