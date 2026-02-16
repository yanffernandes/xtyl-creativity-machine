# Research: AlvoADS Meta - Geracao Automatizada de Criativos por IA

**Date**: 2026-01-02
**Feature**: [spec.md](./spec.md)

## Research Topics

### 1. Integração Google Gemini/Imagen para Geração de Imagens

**Decision**: Usar Imagen 3 via Google AI SDK (`@google/genai`)

**Rationale**:
- Imagen 3 é o modelo de geração de imagens mais recente do Google
- Preço competitivo: $0.03 por imagem
- Suporte a múltiplos aspect ratios
- SynthID watermark incluso (transparência)
- Alta qualidade para materiais de marketing

**Model Details**:
- Model ID: `imagen-3.0-generate-002`
- Max prompt: 480 tokens
- Images per request: 1-4
- Output: Base64-encoded PNG

**Code Pattern**:
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

const response = await ai.models.generateImages({
  model: 'imagen-3.0-generate-002',
  prompt: 'Professional advertisement image...',
  config: {
    numberOfImages: 1,
  },
});

const imageBytes = response.generatedImages[0].image.imageBytes;
const buffer = Buffer.from(imageBytes, "base64");
```

**Alternatives Considered**:
- Gemini 2.5 Flash Image: Menor resolução (1024px), menos qualidade
- Gemini 3 Pro Image: Em preview, mais caro, recursos avançados desnecessários
- Midjourney: Sem API oficial, integração complexa

**Sources**:
- [Imagen 3 Documentation](https://ai.google.dev/gemini-api/docs/imagen)
- [Imagen 3 Announcement](https://developers.googleblog.com/imagen-3-arrives-in-the-gemini-api/)

---

### 2. Comparação DALL-E vs Imagen 3

**Decision**: Oferecer ambos com fallback automático

| Aspecto | DALL-E 3 | Imagen 3 |
|---------|----------|----------|
| Modelo | `dall-e-3` | `imagen-3.0-generate-002` |
| Preço | ~$0.04/imagem (standard) | $0.03/imagem |
| Resolução | 1024x1024, 1792x1024, 1024x1792 | Múltiplos aspect ratios |
| Qualidade | Excelente | Excelente (mais realista) |
| SDK | OpenAI SDK (já instalado) | Google AI SDK (novo) |
| Timeout | ~20-30s | ~15-25s |

**Rationale**:
- DALL-E: Já integrado no projeto, familiar
- Imagen 3: Alternativa competitiva, diversidade de resultados
- Fallback: Se um falhar, tenta o outro automaticamente

---

### 3. Armazenamento de Imagens no Supabase Storage

**Decision**: Bucket dedicado `meta-creatives` com estrutura organizada

**Rationale**:
- Supabase Storage já configurado no projeto
- RLS para controle de acesso por usuário
- URLs públicas para uso no Meta Ads

**Structure**:
```
meta-creatives/
├── {user_id}/
│   └── {creative_id}/
│       └── image.png
```

**Implementation**:
```typescript
const bucket = 'meta-creatives';
const path = `${userId}/${creativeId}/image.png`;

await supabase.storage
  .from(bucket)
  .upload(path, buffer, {
    contentType: 'image/png',
    cacheControl: '3600',
  });

const { data: { publicUrl } } = supabase.storage
  .from(bucket)
  .getPublicUrl(path);
```

---

### 4. Variação Automática de Estilos

**Decision**: Prompt engineering com array de estilos pré-definidos

**Rationale**:
- Não requer lógica complexa
- Estilos são distribuídos ciclicamente entre imagens
- Usuário pode adicionar direcionamentos opcionais

**Styles Array**:
```typescript
const CREATIVE_STYLES = [
  'photorealistic, high quality, professional lighting',
  'digital illustration, vibrant colors, modern design',
  'minimalist, clean, white background, simple composition',
  'cinematic, dramatic lighting, movie poster style',
  'watercolor, artistic, soft edges, elegant',
];
```

**Distribution**:
```typescript
function getStyleForIndex(index: number): string {
  return CREATIVE_STYLES[index % CREATIVE_STYLES.length];
}
```

---

### 5. System Prompt para Geração de Prompts de Imagem

**Decision**: Novo prompt `meta-ads.image-prompt-generator` no banco

**Rationale**:
- Segue padrão existente do projeto (system_prompts)
- Editável sem deploy
- Variáveis substituíveis ({{article_title}}, {{keyword}}, etc.)

**Prompt Template**:
```sql
INSERT INTO system_prompts (key, system_prompt, user_prompt_template, ...)
VALUES (
  'meta-ads.image-prompt-generator',
  'Você é um especialista em criar prompts para geração de imagens por IA...',
  '### CONTEXTO\n- Título: {{article_title}}\n- Palavra-chave: {{keyword}}\n...',
  ...
);
```

---

### 6. Limites de Caracteres do Meta Ads

**Decision**: Validação no frontend e backend

| Campo | Limite | Validação |
|-------|--------|-----------|
| Primary Text | 125 caracteres | Zod schema + truncate |
| Headline | 27 caracteres | Zod schema + truncate |
| Description | 27 caracteres | Zod schema + truncate |

**Implementation**:
```typescript
const adCopySchema = z.object({
  primaryText: z.string().max(125),
  headline: z.string().max(27),
  description: z.string().max(27),
});
```

---

### 7. Custo de Créditos para Operações

**Decision**: Seguir estrutura existente em credits.service.ts

| Operação | Créditos |
|----------|----------|
| CREATIVE_AI_GENERATED | 5 |
| AD_COPY_GENERATION | 2 |
| Regeneração (imagem) | 5 |
| Regeneração (texto) | 2 |
| Usar da biblioteca | 0 |

**Rationale**:
- Valores já definidos em CREDIT_COSTS
- Biblioteca sem custo incentiva reutilização
- Regenerações consomem créditos normalmente

---

## Dependencies to Install

```bash
# Backend - Google AI SDK para Imagen
cd backend && npm install @google/genai
```

## Environment Variables Needed

```env
# Backend .env
GOOGLE_AI_API_KEY=xxx  # Para Imagen 3
```

## Conclusions

1. **Imagen 3** será integrado como alternativa ao DALL-E existente
2. **Armazenamento** seguirá padrão Supabase Storage existente
3. **Estilos** serão variados via prompt engineering
4. **Créditos** seguem estrutura existente
5. **Fallback** automático entre modelos garante resiliência
