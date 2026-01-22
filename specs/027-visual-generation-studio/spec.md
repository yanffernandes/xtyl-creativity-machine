# Feature 027: Visual Generation Studio

## Resumo Executivo

Criar uma interface de geração visual direta com controles visuais (sliders, presets, grids), inspirada em Freepik Pikaso, Leonardo.ai e Midjourney Web. Complementa o chat existente com uma experiência otimizada para produção em volume.

## Problema

O fluxo atual de geração de imagens via chat é:
1. Usuário digita prompt em texto
2. Espera resposta da IA
3. Vê resultado
4. Digita novo prompt para ajustar
5. Repete até ficar satisfeito

**Problemas:**
- Cada ajuste = nova mensagem (lento)
- Difícil iterar rapidamente (5-10 min por imagem finalizada)
- Usuários visuais pensam em "mais colorido", não em texto
- Sem controle previsível (slider = resultado proporcional)

## Solução

Interface visual dedicada com:
- Controles de estilo via radio buttons/presets visuais
- Sliders para parâmetros (criatividade, intensidade de cor, etc.)
- Grid de 4 variações simultâneas
- Ações rápidas em cada imagem (refinar, usar como base, salvar)
- Presets de formato (1:1, 16:9, 9:16, 4:3)

## Escopo

### Incluído
- Nova aba "Imagens" na interface do projeto
- Painel de controles visuais (estilos, formatos, sliders)
- Grid de variações com ações contextuais
- Histórico de gerações na sessão
- Integração com assets de referência existentes
- Endpoint agregado `/projects/{id}/bootstrap` para performance

### Excluído
- Mudanças no workflow builder
- Mudanças no chat existente (apenas complementa)
- Editor de imagem (crop, filtros, etc.)
- Geração de texto nesta interface

## User Stories

### US-01: Gerar imagens com controles visuais
**Como** profissional de marketing
**Quero** gerar imagens usando controles visuais (sliders, presets)
**Para** iterar rapidamente sem digitar prompts longos

**Critérios de Aceite:**
- [ ] Campo de prompt principal visível
- [ ] Seletor de estilo com 6+ presets visuais
- [ ] Seletor de formato (1:1, 16:9, 9:16, 4:3)
- [ ] Seletor de modelo (Flux, Ideogram, DALL-E, Gemini)
- [ ] Slider de "Criatividade" (0-100%)
- [ ] Botão "Gerar 4 Variações"

### US-02: Visualizar e selecionar variações
**Como** usuário
**Quero** ver 4 variações lado a lado
**Para** escolher a melhor rapidamente

**Critérios de Aceite:**
- [ ] Grid 2x2 com as 4 imagens geradas
- [ ] Hover mostra ações: Download, Refinar, Usar como Base
- [ ] Clique abre imagem em tamanho maior
- [ ] Indicador de qual variação está selecionada

### US-03: Refinar uma variação específica
**Como** usuário
**Quero** refinar uma variação específica
**Para** melhorar sem perder o que já gostei

**Critérios de Aceite:**
- [ ] Botão "Refinar Esta" em cada variação
- [ ] Ao refinar, imagem selecionada vira referência
- [ ] Prompt pode ser ajustado antes de refinar
- [ ] Nova geração substitui o grid (com opção de voltar)

### US-04: Usar presets de estilo
**Como** usuário
**Quero** selecionar estilos predefinidos com preview visual
**Para** não precisar descrever o estilo em texto

**Critérios de Aceite:**
- [ ] Grid de presets com thumbnail de exemplo
- [ ] Mínimo 8 estilos: Fotográfico, Aquarela, 3D Render, Ilustração, Minimalista, Vibrante, Vintage, Cinematográfico
- [ ] Seleção aplica automaticamente ao próximo gerar
- [ ] Possível combinar preset + ajuste manual no prompt

### US-05: Salvar imagens no projeto
**Como** usuário
**Quero** salvar imagens geradas diretamente no projeto
**Para** usar depois em outras peças

**Critérios de Aceite:**
- [ ] Botão "Salvar no Projeto" em cada variação
- [ ] Opção de escolher pasta destino
- [ ] Imagem aparece no Kanban/lista de documentos
- [ ] Metadata preservada (prompt, modelo, configurações)

### US-06: Carregar página do projeto rapidamente
**Como** usuário
**Quero** que a página carregue em menos de 1 segundo
**Para** não perder tempo esperando

**Critérios de Aceite:**
- [ ] Endpoint `/projects/{id}/bootstrap` retorna todos os dados necessários
- [ ] Máximo 2 requests no carregamento inicial (auth + bootstrap)
- [ ] Skeleton/loading states enquanto carrega
- [ ] Cache local para dados estáticos (modelos, estilos)

### US-07: Onboarding guiado
**Como** novo usuário
**Quero** um tutorial interativo
**Para** entender como usar o sistema

**Critérios de Aceite:**
- [ ] Tour guiado com tooltips (5-7 passos)
- [ ] Aparece apenas na primeira visita
- [ ] Botão "Pular" sempre visível
- [ ] Cobre: criar projeto, gerar imagem, salvar, usar chat
- [ ] Marca como "visto" no localStorage

## Arquitetura Técnica

### Backend

#### Novo Endpoint: Bootstrap
```
GET /projects/{id}/bootstrap
```

Retorna em uma única chamada:
```json
{
  "project": { ... },
  "settings": { ... },
  "models": {
    "text": [...],
    "image": [...]
  },
  "visual_context": [...],
  "memories": [...],
  "recent_documents": [...],
  "style_presets": [...]
}
```

#### Novo Endpoint: Style Presets
```
GET /image-generation/style-presets
```

Retorna presets de estilo com exemplos:
```json
[
  {
    "id": "photographic",
    "name": "Fotográfico",
    "prompt_modifier": "professional photography, high resolution, natural lighting",
    "thumbnail_url": "https://..."
  },
  ...
]
```

### Frontend

#### Nova Estrutura de Abas
```
/workspace/[id]/project/[projectId]/
├── page.tsx (container principal)
├── tabs/
│   ├── ChatTab.tsx (chat existente, extraído)
│   ├── ImagesTab.tsx (NOVO - Visual Generation Studio)
│   ├── DocumentsTab.tsx (Kanban/lista existente)
│   └── AssetsTab.tsx (biblioteca de assets)
```

#### Componentes Novos
```
/components/image-studio/
├── ImageStudio.tsx (container principal)
├── PromptInput.tsx (campo de prompt com sugestões)
├── StylePresetGrid.tsx (grid de estilos visuais)
├── FormatSelector.tsx (seletor de aspect ratio)
├── ModelSelector.tsx (dropdown de modelos)
├── CreativitySlider.tsx (slider 0-100)
├── VariationGrid.tsx (grid 2x2 de resultados)
├── VariationCard.tsx (card individual com ações)
├── GenerationHistory.tsx (histórico da sessão)
└── ReferenceAssetPicker.tsx (seletor de assets de referência)
```

#### Hooks Novos
```typescript
// useProjectBootstrap.ts
function useProjectBootstrap(projectId: string) {
  // Carrega tudo em 1 request
  // Cache com TanStack Query
  // Retorna: project, settings, models, etc.
}

// useImageStudio.ts
function useImageStudio() {
  // Estado: prompt, style, format, model, creativity
  // Ações: generate, refine, save, reset
  // Histórico de gerações na sessão
}

// useOnboarding.ts
function useOnboarding() {
  // Verifica se é primeira visita
  // Controla passos do tour
  // Persiste no localStorage
}
```

### Fluxo de Dados

```
Usuário configura controles
  → useImageStudio atualiza estado local
  → Clica "Gerar"
  → POST /image-generation/generate-batch
    {
      prompt: "...",
      style_preset: "photographic",
      aspect_ratio: "16:9",
      model: "flux-pro",
      creativity: 0.7,
      count: 4
    }
  → Backend gera 4 variações em paralelo
  → SSE stream de progresso
  → Frontend atualiza grid conforme imagens ficam prontas
  → Usuário seleciona favorita
  → POST /documents para salvar
```

## Design Visual

### Layout Principal
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [← Voltar]  Projeto: Campanha Verão 2025                               │
├─────────────────────────────────────────────────────────────────────────┤
│  [💬 Chat]  [🖼️ Imagens]  [📄 Docs]  [🎨 Assets]                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Descreva sua imagem...                                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Fotográfico │ │  Aquarela   │ │  3D Render  │ │ Ilustração  │        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ Minimalista │ │  Vibrante   │ │   Vintage   │ │Cinematográf.│        │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                                          │
│  Formato: [1:1] [16:9] [9:16] [4:3]    Modelo: [Flux Pro ▼]             │
│                                                                          │
│  Criatividade: [████████████░░░░░░] 70%                                 │
│                                                                          │
│  [+ Adicionar Referência]              [ 🎨 Gerar 4 Variações ]         │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐                         │
│  │                    │  │                    │                         │
│  │     Variação 1     │  │     Variação 2     │                         │
│  │                    │  │                    │                         │
│  │  [⬇️] [🔄] [💾]     │  │  [⬇️] [🔄] [💾]     │                         │
│  └────────────────────┘  └────────────────────┘                         │
│  ┌────────────────────┐  ┌────────────────────┐                         │
│  │                    │  │                    │                         │
│  │     Variação 3     │  │     Variação 4     │                         │
│  │                    │  │                    │                         │
│  │  [⬇️] [🔄] [💾]     │  │  [⬇️] [🔄] [💾]     │                         │
│  └────────────────────┘  └────────────────────┘                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cores e Estilo
- Seguir design system existente (Ethereal Blue + Glassmorphism)
- Presets de estilo com borda azul quando selecionado
- Variações com hover suave mostrando ações
- Sliders com gradiente azul

## Fases de Implementação

### Fase 1: Fundação (Backend + Bootstrap)
- [ ] Criar endpoint `/projects/{id}/bootstrap`
- [ ] Criar endpoint `/image-generation/style-presets`
- [ ] Criar endpoint `/image-generation/generate-batch`
- [ ] Adicionar tabela `style_presets` no banco
- [ ] Popular presets iniciais (8 estilos)

### Fase 2: Interface Base
- [ ] Criar estrutura de abas no projeto
- [ ] Extrair ChatSidebar para ChatTab
- [ ] Criar ImageStudio container
- [ ] Implementar PromptInput
- [ ] Implementar StylePresetGrid
- [ ] Implementar FormatSelector e ModelSelector
- [ ] Implementar CreativitySlider

### Fase 3: Geração e Resultados
- [ ] Implementar useImageStudio hook
- [ ] Implementar VariationGrid e VariationCard
- [ ] Conectar com endpoint generate-batch
- [ ] Implementar SSE para progresso
- [ ] Implementar ações: download, refinar, salvar

### Fase 4: Polish e Onboarding
- [ ] Implementar GenerationHistory
- [ ] Implementar ReferenceAssetPicker
- [ ] Criar tour de onboarding
- [ ] Implementar useOnboarding hook
- [ ] Adicionar skeleton states
- [ ] Testar performance (meta: <1s carregamento)

## Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Tempo para gerar 4 variações | N/A (1 por vez) | <30s |
| Requests no carregamento | 8+ | 2 |
| Tempo de carregamento da página | ~3s | <1s |
| Iterações para imagem final | 5-10 (chat) | 2-3 |

## Dependências

- Feature 026 (Smart Image Generation) - Já em desenvolvimento
- Sistema de variações existente
- Endpoint de modelos existente
- Sistema de assets de referência existente

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Geração em batch sobrecarrega API | Média | Alto | Rate limiting, queue por usuário |
| Presets não cobrem todos os casos | Baixa | Médio | Permitir prompt manual sempre |
| Onboarding intrusivo | Baixa | Baixo | Opção de pular, não repetir |
