# Alvo Bot Reference - Visao Geral do Sistema de Criativos

## O Que Este Projeto Faz

O Alvo Bot implementa um sistema completo de criacao automatizada de anuncios para **Meta Ads (Facebook/Instagram)**. O fluxo principal permite que o usuario:

1. Selecione artigos como base de conteudo
2. Gere imagens automaticamente por IA com base no contexto dos artigos
3. Aprove/rejeite imagens em um grid visual
4. Gere textos de anuncio (headline, primary text, description, CTA) automaticamente
5. Configure segmentacao, orcamento e publique diretamente no Meta Ads

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ MetaAdsWizard│  │ ConceptSelect│  │  CreativeGrid             │ │
│  │  Page.tsx     │  │  or.tsx      │  │  (approve/reject/regen)   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬──────────────┘ │
│         │                  │                       │                │
│  ┌──────▼──────────────────▼───────────────────────▼──────────────┐ │
│  │                  metaAdsWizardStore (Zustand)                   │ │
│  └──────┬─────────────────────────────────────────────────────────┘ │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────────────────────┐│
│  │  useStreamingCreatives (SSE) + useCreatives (React Query)       ││
│  └──────┬──────────────────────────────────────────────────────────┘│
└─────────┼───────────────────────────────────────────────────────────┘
          │ HTTP + SSE
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                             │
│                                                                     │
│  ┌─────────────────────┐                                           │
│  │ creative.controller │ ← Endpoints REST + SSE                    │
│  └──────┬──────────────┘                                           │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────────────────────┐│
│  │                    ai-creative.service                           ││
│  │  (Orquestra geracao de imagens e textos)                        ││
│  └──┬──────┬──────────┬──────────────┬─────────────────────────────┘│
│     │      │          │              │                              │
│  ┌──▼──┐┌──▼───┐ ┌───▼────────┐ ┌──▼──────────────┐              │
│  │Niche││Prompt│ │Creative    │ │Creative          │              │
│  │Detec││Compo-│ │Session     │ │Library           │              │
│  │tor  ││ser   │ │(SSE/slots) │ │(persistencia)    │              │
│  └─────┘└──────┘ └────────────┘ └──────────────────┘              │
│                                                                     │
│  Providers de Imagem:                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │OpenRouter│ │Replicate │ │ OpenAI   │ │Google AI │             │
│  │(Gemini3) │ │(NanoBan.,│ │(DALL-E3) │ │(Imagen3) │             │
│  │          │ │GPT Img)  │ │          │ │          │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                           │
│                                                                     │
│  creative_library │ campaign_creatives │ system_prompts             │
│  generation_sessions │ pending_generations │ platform_settings      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14, React 18, TypeScript 5.x, Zustand (state), React Query |
| Backend | NestJS (Node.js), TypeScript |
| Banco de Dados | Supabase PostgreSQL |
| Storage | Supabase Storage (bucket `meta-creatives`) |
| IA - Texto | Gemini 3 Flash (via OpenRouter) |
| IA - Imagem | Gemini 3 Pro, Nano Banana Pro, GPT Image 1.5, DALL-E 3, Imagen 3 |
| Streaming | Server-Sent Events (SSE) via RxJS |

---

## Fluxo Principal de Geracao de Criativos

```
1. Usuario seleciona artigos
        │
        ▼
2. Sistema detecta nicho (financial, health, jobs, ecommerce, generic)
        │
        ▼
3. Usuario escolhe modo:
   ├── "free" → IA seleciona conceitos automaticamente
   └── "preset" → Usuario seleciona conceitos manualmente (ConceptSelector)
        │
        ▼
4. POST /meta/creatives/generate/init → Cria sessao com N slots
        │
        ▼
5. GET /meta/creatives/generate/stream → Abre conexao SSE
        │
        ▼
6. Para cada imagem (slot):
   a. PromptComposerService monta o prompt
      ├── Conceito (template de prompt)
      ├── Background (cor/gradiente/pattern)
      ├── VisualGroup (variacao visual)
      ├── NicheTemplate (regras do nicho)
      ├── Localizacao (idioma, moeda, pais)
      └── Direcoes do usuario
   b. AiCreativeService gera a imagem (com rotacao de modelos)
   c. Upload para Supabase Storage
   d. Salva na creative_library
   e. Emite evento SSE ("completed" + imageUrl)
        │
        ▼
7. Frontend exibe grid com imagens geradas
   ├── Aprovar ✓ (salva na biblioteca)
   ├── Rejeitar ✗ (remove da selecao)
   └── Regenerar ↻ (gera nova imagem)
        │
        ▼
8. Gera textos de anuncio (ad copy) para cada imagem aprovada
   ├── primary_text (max 125 chars)
   ├── headline (max 27 chars)
   ├── description (max 27 chars)
   └── CTA (LEARN_MORE, SHOP_NOW, etc.)
        │
        ▼
9. Review + Publicacao no Meta Ads
```

---

## Diferenciais Importantes para o Creativity Machine

### 1. Descricao Textual em Vez de Referencia de Imagem
O sistema **NAO usa imagens de referencia** para guiar o estilo. Em vez disso, usa **descricoes textuais detalhadas** via:
- **Conceitos criativos** (templates de prompt com slots de variavel)
- **Estilos visuais** (photorealistic, illustration, minimalist, cinematic, watercolor)
- **Backgrounds** (descricoes textuais de cor/gradiente/pattern)
- **Visual Groups** (agrupamentos de variacoes visuais)
- **Niche Templates** (regras especificas por setor - financeiro, saude, etc.)

### 2. Sistema de Diversidade "Andromeda"
Garante variedade nos criativos gerados:
- Rotacao automatica de **conceitos** (janela de diversidade de 3)
- Rotacao automatica de **backgrounds** (janela de 4)
- Rotacao automatica de **modelos de IA** (round-robin entre providers)
- Score de diversidade calculado: 50% conceitos + 30% backgrounds + 20% modelos

### 3. Streaming em Tempo Real
Usa SSE para mostrar progresso imagem por imagem, nao espera batch completo.

### 4. Prompts Configuraveis no Banco
Prompts de sistema armazenados em `system_prompts` - editaveis sem deploy.

### 5. Biblioteca de Criativos
Imagens aprovadas ficam salvas e podem ser reutilizadas sem custo de creditos.

---

## Arquivos-Chave

### Backend
| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `services/ai-creative.service.ts` | ~2.445 | Orquestra toda geracao de imagens e textos |
| `services/prompt-composer.service.ts` | ~1.317 | Monta prompts compostos com conceitos e diversidade |
| `services/niche-detector.service.ts` | ~743 | Detecta nicho dos artigos (financial, health, etc.) |
| `services/creative-session.service.ts` | ~367 | Gerencia sessoes SSE em memoria |
| `services/creative-library.service.ts` | ~895 | CRUD da biblioteca de criativos |
| `creative.controller.ts` | ~2.453 | Todos os endpoints REST + SSE |
| `dto/generate-creative.dto.ts` | ~292 | DTOs de request/response |

### Frontend
| Arquivo | Funcao |
|---------|--------|
| `components/wizard/StepCreatives.tsx` | UI principal de geracao de imagens |
| `components/wizard/CreativeGrid.tsx` | Grid de aprovacao/rejeicao |
| `components/wizard/ConceptSelector.tsx` | Selecao manual de conceitos |
| `stores/metaAdsWizardStore.ts` | State global do wizard (Zustand) |
| `hooks/useStreamingCreatives.ts` | Hook SSE para geracao em tempo real |
| `api/useCreatives.ts` | Hooks React Query para API |

---

## Proximos Documentos

- [02-modelo-dados.md](./02-modelo-dados.md) - Schema do banco de dados
- [03-geracao-imagens.md](./03-geracao-imagens.md) - Sistema de geracao de imagens
- [04-sistema-andromeda.md](./04-sistema-andromeda.md) - Sistema de diversidade
- [05-prompt-composition.md](./05-prompt-composition.md) - Composicao de prompts
- [06-streaming-sse.md](./06-streaming-sse.md) - Arquitetura de streaming
- [07-guia-migracao.md](./07-guia-migracao.md) - Guia de migracao para o Creativity Machine
