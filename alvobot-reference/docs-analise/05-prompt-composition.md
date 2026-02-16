# Sistema de Composicao de Prompts

## Visao Geral

O `PromptComposerService` e o cerebro do sistema de geracao de imagens. Ele monta prompts detalhados combinando multiplas fontes de informacao, **sem usar imagens de referencia** - tudo e baseado em **descricao textual**.

---

## Arquitetura do Prompt

O prompt final e construido em camadas:

```
┌──────────────────────────────────────────────────────────┐
│                    PROMPT FINAL                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. CONCEITO CRIATIVO (template com variaveis)      │  │
│  │    "Create a social proof ad showing a testimonial  │  │
│  │     from a satisfied customer about {{keyword}}"    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 2. VISUAL GROUP (variacao especifica)              │  │
│  │    "Mobile app screenshot style, dark mode,         │  │
│  │     with notification badge and green accents"      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 3. BACKGROUND (estilo de fundo)                    │  │
│  │    "Gradient from deep navy #1a1a2e to royal        │  │
│  │     blue #16213e, subtle geometric pattern"         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 4. NICHE TEMPLATE (regras do setor)                │  │
│  │    "Financial sector: no guaranteed promises,       │  │
│  │     include disclaimer, large CTA button"           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 5. TEXT OVERLAY (se aplicavel)                      │  │
│  │    "Headline: 'Simule seu emprestimo' at 48pt,      │  │
│  │     CTA button: 'Calcular' in green #10B981"       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 6. LOCALIZACAO (idioma, moeda, contexto cultural)  │  │
│  │    "Text in Brazilian Portuguese, currency BRL      │  │
│  │     (R$) before number, mobile-first design"        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 7. DIRECOES DO USUARIO (opcional)                  │  │
│  │    "Cores quentes, sem pessoas, estilo corporativo" │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 8. REGRAS GLOBAIS                                  │  │
│  │    "PNG format, no carousel, no banned words,       │  │
│  │     headlines min 48pt, mobile-optimized"           │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Metodo Principal: `composeConceptPrompt()`

```typescript
async composeConceptPrompt(
  article: ArticleContext,
  concept: CreativeConcept,
  options: {
    background?: CreativeBackground,
    nicheTemplate?: NicheTemplate,
    visualGroup?: VisualGroup,
    userDirections?: string,
    autoDirections?: string,
    textOverlay?: TextOverlay,
    targeting?: { countries: string[], languages?: Array<{key, name}> },
    format: ImageFormat
  }
): Promise<PromptComposeResult>
```

### Retorno

```typescript
interface PromptComposeResult {
  promptText: string;     // Prompt final para o modelo de imagem
  promptJson: string;     // JSON estruturado para auditoria
  conceptUsed: string;    // Slug do conceito
  backgroundUsed: string; // Slug do background
  visualGroupCode: string;// Codigo do visual group
}
```

---

## Etapa 1: Template JSON Estruturado

O sistema primeiro monta um JSON template com todas as informacoes:

```json
{
  "meta": {
    "version": "prompt-master-json-v1",
    "generated_at": "2026-01-15T10:30:00Z"
  },
  "input": {
    "article": {
      "title": "Emprestimo Pessoal: Taxas a partir de 1.99% ao mes",
      "keyword": "emprestimo pessoal",
      "excerpt": "Compare as melhores opcoes de emprestimo..."
    },
    "concept": {
      "slug": "simulator-ui",
      "name": "Interface de Simulador",
      "template": "A mobile phone screen showing a loan simulator app..."
    },
    "background": {
      "slug": "gradient-finance-blue",
      "description": "Professional gradient from navy to royal blue"
    },
    "visual_group": {
      "code": "A",
      "name": "Mobile App Dark",
      "variation": "Dark mode with green accents"
    },
    "format": "9:16",
    "user_directions": null,
    "localization": {
      "language": "portugues",
      "country": "BR",
      "currency_symbol": "R$",
      "currency_position": "before"
    }
  },
  "constraints": {
    "output_format": "png",
    "banned_words": ["imediato", "hoje", "agora", "instantaneo"],
    "no_carousel": true,
    "text_policy": "Do not add text unless explicitly requested",
    "typography": {
      "headline_min_pt": 48,
      "body_min_pt": 28,
      "ui_labels_min_pt": 22
    }
  }
}
```

---

## Etapa 2: Refinamento por IA

O JSON template e enviado para **Gemini 3 Flash** que gera o prompt final detalhado:

```typescript
const systemPrompt = `You are a senior performance creative director.
Return ONLY valid JSON with:
{
  "prompts": [{ "id": 1, "prompt": "DETAILED PROMPT STRING" }],
  "validation_summary": {
    "total_prompts": 1,
    "prohibited_words_found": []
  }
}

Rules:
- Prompt must be highly detailed (composition, lighting, style, camera, texture)
- Output format PNG
- Do not add text unless user_directions explicitly request it
- Never use carousel
- Do NOT include banned words
- CRITICAL: Headlines min 48pt, body min 28pt, UI labels min 22pt
- Mobile-first: image will display at ~350px width on phones
`;
```

---

## Etapa 3: Prompt Fallback (Sem IA)

Se o refinamento por IA falhar, o sistema usa um fallback textual:

```typescript
function buildFallbackPromptText(article, concept, background, format) {
  let prompt = `Professional advertisement image for Meta/Facebook ads`;
  prompt += ` about "${article.title}".`;
  prompt += ` Focus on: ${article.keyword}.`;
  prompt += ` Visual concept: ${concept.template}.`;
  prompt += ` Background: ${background.description}.`;
  prompt += ` Style: high quality, professional composition.`;
  prompt += ` No text in the image.`;

  if (userDirections) {
    prompt += ` Additional: ${userDirections}`;
  }

  return prompt;
}
```

---

## Conceitos Criativos (CreativeConcept)

```typescript
interface CreativeConcept {
  id: string;           // UUID
  slug: string;         // 'testimonial-social'
  name: string;         // 'Prova Social com Depoimento'
  category: string;     // 'narrativa' | 'prova_social' | 'produto' | ...
  template: string;     // Template de prompt com {{variaveis}}
  niches: string[];     // ['financial', 'generic'] - nichos compativeis
  isActive: boolean;
}
```

### Categorias de Conceitos

| Categoria | Exemplos |
|-----------|---------|
| `narrativa` | question-hook, storytelling, before-after |
| `prova_social` | testimonial, social-proof, user-count |
| `produto` | product-showcase, feature-highlight |
| `ui_simulacao` | simulator-ui, dashboard, app-screenshot |
| `lifestyle` | aspiration, success-story, day-in-life |
| `comparacao` | comparison, pros-cons, pricing-table |

### Ranking de Conceitos

O sistema rankeia conceitos por relevancia para o artigo:

```
1. Tenta ranking por IA (Gemini 3 Flash)
   - Envia artigo + lista de conceitos
   - IA retorna score de relevancia 0-1 para cada

2. Fallback: ranking por keywords
   - Busca keywords do conceito no titulo/keyword/excerpt do artigo
   - Calcula score por matching
```

---

## Visual Groups

Agrupamentos de variacoes visuais especificos por nicho:

```typescript
interface VisualGroup {
  code: string;           // 'A', 'B', 'C', ...
  name: string;           // 'Mobile App Dark'
  niche: string;          // 'financial'
  variations: string[];   // ['Dark mode + green', 'Light mode + blue', ...]
}
```

A selecao rotaciona para evitar repeticao:
```typescript
selectRandomVisualGroup(groups, usedGroups) {
  // Filtra grupos ja usados recentemente
  const available = groups.filter(g => !usedGroups.includes(g.code));
  // Seleciona aleatorio entre os disponiveis
  return available[Math.floor(Math.random() * available.length)];
}
```

---

## Backgrounds

```typescript
interface CreativeBackground {
  slug: string;          // 'gradient-blue-purple'
  name: string;          // 'Gradiente Azul Roxo'
  type: string;          // 'solid' | 'gradient' | 'pattern' | 'photo'
  description: string;   // Descricao textual para o prompt
  cssValue?: string;     // CSS para preview no frontend
}
```

Selecao com janela de diversidade:
```typescript
selectNextBackground(backgrounds, usedBackgrounds) {
  // Janela de 4: evita repetir os ultimos 4 backgrounds
  const recentlyUsed = usedBackgrounds.slice(-4);
  const available = backgrounds.filter(b => !recentlyUsed.includes(b.slug));
  return available[Math.floor(Math.random() * available.length)];
}
```

---

## Regras Globais

Aplicadas a TODO prompt gerado:

1. **Formato**: Sempre PNG
2. **Sem carousel**: Nunca gerar multiplas imagens
3. **Sem promessas garantidas**: Nao prometer aprovacao, credito, dinheiro
4. **Palavras banidas**: `imediato`, `hoje`, `agora`, `instantaneo`, `bani pe loc`, `azi`
5. **Tipografia mobile-first**:
   - Headlines: minimo 48pt
   - Body text: minimo 28pt
   - UI labels: minimo 22pt
   - Texto 2-3x maior que o real para ser legivel em ~350px mobile
6. **Texto na imagem**: So se o usuario pedir explicitamente
7. **CTA na imagem**: Se requisitado, deve ser grande e visivel

---

## Localizacao

O sistema extrai contexto de localizacao do artigo:

```typescript
interface LocalizationInfo {
  language: string;          // 'portugues', 'english', 'spanish'
  country: string;           // 'BR', 'US', 'PT'
  currency_symbol: string;   // 'R$', '$', '€'
  currency_position: string; // 'before' ou 'after'
  cultural_notes: string[];  // Notas culturais especificas
}

// Prioridade de idioma:
// 1. keyword_snapshot.language (do artigo)
// 2. article.language
// 3. 'portugues' (fallback)
```

---

## Comparacao com o Creativity Machine Atual

| Aspecto | Alvo Bot (Referencia) | Creativity Machine (Atual) |
|---------|----------------------|---------------------------|
| Estilo visual | Descricao textual (conceitos) | Imagem de referencia (style) |
| Diversidade | Andromeda (score + janelas) | Manual |
| Prompt builder | PromptComposerService (7 camadas) | Prompt simples |
| Nicho | Deteccao automatica (5 nichos) | Nao tem |
| Localizacao | Automatica (idioma, moeda, pais) | Manual |
| Texto na imagem | Controlado por regras + tipografia | Livre |
| Compliance | Palavras banidas + regras por nicho | Nao tem |

### O Que Devemos Adotar

1. **Descricao textual em vez de imagem de referencia** para estilos
2. **Conceitos criativos** como templates reutilizaveis de prompt
3. **Regras de tipografia** para mobile (48pt headlines, 28pt body)
4. **Palavras banidas** para compliance
5. **Localizacao automatica** baseada no contexto do projeto
6. **Prompt em camadas** (conceito + background + regras + direcoes)
