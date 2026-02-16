# Sistema de Geracao de Imagens

## Visao Geral

O sistema suporta **5 modelos de IA** para geracao de imagens, acessados via 4 providers diferentes. O sistema implementa **rotacao automatica de modelos** para maximizar diversidade visual nos criativos.

---

## Modelos Disponiveis

### Modelos Ativos (Rotacao)

| Provider | Modelo | Display Name | Uso |
|----------|--------|-------------|-----|
| OpenRouter | `google/gemini-3-pro-image-preview` | Gemini 3 Pro | Primario - melhor qualidade |
| Replicate | `google/nano-banana-pro` | Nano Banana Pro | Secundario - rapido |
| Replicate | `openai/gpt-image-1.5` | GPT Image 1.5 | Terciario - diversidade |

### Modelos Legados (Fallback)

| Provider | Modelo | Display Name | Uso |
|----------|--------|-------------|-----|
| OpenAI | `dall-e-3` | DALL-E 3 | Fallback quando outros falham |
| Google AI | `imagen-3.0-generate-002` | Imagen 3 | Fallback alternativo |

---

## Hierarquia de Metodos de Geracao

```
generateImageWithConcept()          ← Entrada principal (conceito + diversidade)
    │
    ├── PromptComposerService       ← Monta prompt detalhado
    │
    └── Escolha de modelo:
        ├── forcedModelId?          → generateImageWithSpecificModel()
        ├── usedModels?             → generateImageWithRotatedModel()
        └── default                 → generateImageWithConfiguredModel()
                                          │
                                          ├── getDefaultImageModel()  ← Lê platform_settings
                                          │
                                          └── Roteamento por provider:
                                              ├── openrouter → generateImageWithOpenRouter()
                                              ├── replicate  → generateImageWithReplicate()
                                              ├── google     → generateImageWithImagen()
                                              └── openai     → generateImageWithDallE()
```

---

## Rotacao de Modelos (Round-Robin)

O metodo `getNextModel()` implementa round-robin com base no uso:

```typescript
// Rastreia quantas vezes cada modelo foi usado na sessao
const modelUsage = {
  'openrouter/google/gemini-3-pro-image-preview': 2,
  'replicate/google/nano-banana-pro': 1,
  'replicate/openai/gpt-image-1.5': 1,
};

// Seleciona o modelo com MENOR uso
// Resultado: proximo modelo sera nano-banana-pro ou gpt-image-1.5
```

**Regra**: Em uma sessao com 9 imagens, cada modelo gera ~3 imagens, garantindo diversidade visual.

---

## Fallback Strategy

```
Modelo Primario (selecionado pela rotacao)
    │
    │ falha?
    ▼
Tenta cada modelo alternativo em ordem (AVAILABLE_MODELS)
    │
    │ EXCECAO: PendingGenerationException NAO dispara fallback
    │ (imagem pode estar sendo gerada em background)
    │
    │ todos falharam?
    ▼
Retorna erro original do modelo primario
```

### PendingGenerationException

Quando um modelo (especialmente Replicate) leva mais de 60s:
- O sistema **NAO** faz fallback para outro modelo
- Em vez disso, lanca `PendingGenerationException` com o `predictionId`
- O frontend pode verificar o status depois via polling
- A imagem pode ter sido gerada com sucesso no provider

---

## Formatos Suportados

| Formato | Aspect Ratio | DALL-E Size | Uso Tipico |
|---------|-------------|-------------|------------|
| `1:1` | 1:1 | 1024x1024 | Feed do Facebook/Instagram |
| `9:16` | 9:16 | 1024x1792 | Stories/Reels |
| `16:9` | 16:9 | 1792x1024 | Landscape/Banner |

---

## Geracao via OpenRouter (Gemini 3 Pro)

```typescript
async generateImageWithOpenRouter(prompt, model, format) {
  // Timeout: 60 segundos
  // Retry: 3 tentativas com backoff exponencial (500ms, 1s, 2s)
  // Rate limit: Detecta 429 e faz retry
  // Quota: Detecta "insufficient" e retorna erro amigavel

  const result = await this.openRouterService.generateImage(model, prompt, {
    aspectRatio: format  // '1:1', '9:16', '16:9'
  });

  return { imageBase64, mimeType: 'image/png' };
}
```

---

## Geracao via Replicate (Nano Banana Pro, GPT Image 1.5)

```typescript
async generateImageWithReplicate(prompt, model, format) {
  // Config especifica por modelo:
  const isNanoBanana = model.includes('nano-banana-pro');

  const config = isNanoBanana ? {
    resolution: '2K',
    safetyFilterLevel: 'block_only_high'
  } : {
    quality: 'high',
    background: 'auto',
    moderation: 'auto',
    inputFidelity: 'low'
  };

  // Quando timeout: PendingGenerationException (nao fallback!)
  if (result.status === 'pending') {
    throw new PendingGenerationException(predictionId, 'replicate', model, prompt);
  }

  return { imageBase64, mimeType: 'image/png' };
}
```

---

## Geracao via DALL-E 3

```typescript
async generateImageWithDallE(prompt, format) {
  // Mapeia formato para size DALL-E
  const sizeMap = {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792'
  };

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: sizeMap[format],
    quality: 'standard',
    response_format: 'b64_json'  // Retorna base64, nao URL
  });

  return { imageBase64, mimeType: 'image/png', revisedPrompt };
}
```

---

## Geracao via Google Imagen 3

```typescript
async generateImageWithImagen(prompt, format) {
  const response = await googleAI.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: format  // '1:1', '9:16', '16:9' nativo
    }
  });

  return { imageBase64: generatedImage.image.imageBytes, mimeType: 'image/png' };
}
```

---

## Upload e Persistencia

Apos geracao, a imagem e:

1. **Uploaded para Supabase Storage**:
```typescript
// Bucket: 'meta-creatives'
// Path: '{userId}/creative_{timestamp}.png'
const { url, path } = await uploadImageToStorage(imageBase64, mimeType, userId);
```

2. **Salva na creative_library**:
```typescript
await saveToLibraryWithConcept(userId, workspaceId, imageUrl, storagePath, articleId, {
  modelUsed: 'openrouter/google/gemini-3-pro-image-preview',
  conceptId: 'uuid-do-conceito',
  conceptSlug: 'testimonial-social',
  backgroundSlug: 'gradient-blue-purple',
  visualGroupCode: 'A',
  promptUsed: '{ json do prompt completo }',
}, format, sessionId, diversityMetadata);
```

---

## Geracao de Ad Copy (Textos)

### Metodo Principal: `generateAdCopyFromArticle()`

1. Busca prompt configuravel `meta-ads.complete-copy` do banco
2. Substitui variaveis: `{{article_title}}`, `{{keyword}}`, `{{language}}`, `{{valid_ctas}}`
3. Executa chat completion (Gemini 3 Flash via OpenRouter)
4. Retorna JSON: `{ primary_text, headline, description, suggested_cta }`
5. Sanitiza CTA com `sanitizeCTA()` (mapa de 30+ valores + correcao de typos)

### Sanitizacao de CTA

O sistema tem um mapa de correcao que converte:
- Typos: `LEAR_MORE` → `LEARN_MORE`
- Portugues: `SAIBA_MAIS` → `LEARN_MORE`, `COMPRAR_AGORA` → `SHOP_NOW`
- Variacoes: `SHOPNOW` → `SHOP_NOW`, `SEND_MESSAGE` → `MESSAGE_PAGE`
- Legacy: `SEND_MESSAGE` → `MESSAGE_PAGE` (nome oficial Meta)
- Fallback: Qualquer valor invalido → `LEARN_MORE`

### Metodos de Texto

| Metodo | Uso |
|--------|-----|
| `generateAdCopyFromArticle()` | Gera copy completo a partir de artigo |
| `generateAdCopy()` | Gera N variacoes de copy para produto |
| `generateHeadlines()` | Gera apenas headlines (operacao leve) |
| `generateIceBreakers()` | Gera greeting + 3 quick replies para Messenger |
| `suggestImprovements()` | Analisa copy existente e sugere melhorias |

---

## Geracao de Ice Breakers (Messenger)

Para campanhas de mensagens, o sistema gera:

```json
{
  "greeting": "Ola {{user_first_name}}! De que valor voce precisa?",
  "iceBreakers": [
    { "title": "Ate R$ 50.000", "response": "Otimo! Me envie seu telefone." },
    { "title": "Tenho uma duvida", "response": "Claro, me conta qual e." },
    { "title": "Como comecar?", "response": "Vou te mostrar o passo a passo." }
  ]
}
```

Regras:
- Detecta idioma do ad copy automaticamente
- Greeting: max 80 chars com `{{user_first_name}}`
- Titulos: max 40 chars (como botoes)
- Respostas: max 80 chars
- Sempre 3 ice breakers
- 1 emoji por titulo

---

## Metricas de Performance

| Metrica | Valor |
|---------|-------|
| Timeout por imagem | 60 segundos |
| Max retry por provider | 3 tentativas |
| Backoff rate limit | 500ms × 2^attempt |
| Batch maximo | 50 imagens por request |
| Storage | Supabase Storage bucket publico |
| Formato output | PNG (sempre) |
