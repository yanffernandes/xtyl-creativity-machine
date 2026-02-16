# Feature Specification: Andromeda Creative Diversity System

**Feature Branch**: `20260203-andromeda-creative-diversity`
**Created**: 2026-02-03
**Status**: Draft
**Input**: User description: "Atualizar módulo de geração de criativos para Meta Ads com sistema de diversificação Andromeda-compliant que gera criativos completamente distintos para a mesma campanha, evitando penalização do algoritmo, com suporte a nichos estratégicos (financeiro, empregos) e rotação de modelos de IA"

## Problem Statement

O algoritmo Andromeda do Facebook reconhece e penaliza criativos muito similares dentro da mesma campanha, resultando em menor alcance e performance degradada. O sistema atual de geração de criativos usa apenas 5 estilos visuais básicos e não possui mecanismos para garantir diversidade visual significativa entre os criativos gerados.

**Impacto atual:**
- Criativos visualmente similares competem entre si
- Penalização de performance pelo Andromeda
- Falta de estratégias específicas para nichos regulados (financeiro, empregos)
- Dependência de um único provedor de IA para imagens

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Geração de Criativos Diversificados (Priority: P1)

Como um usuário do AlvoAds Meta, eu quero gerar múltiplos criativos que sejam visualmente completamente distintos entre si, para que o algoritmo Andromeda não os identifique como similares e penalize minha campanha.

**Why this priority**: Este é o problema central que a feature resolve - sem diversidade real, todos os outros recursos são inúteis.

**Independent Test**: Pode ser testado gerando 5 criativos para um mesmo artigo e verificando visualmente que cada um usa conceito criativo completamente diferente.

**Acceptance Scenarios**:

1. **Given** um usuário com artigos selecionados para campanha, **When** ele solicita geração de criativos, **Then** o sistema gera criativos usando conceitos radicalmente diferentes (ex: um com UI de app, outro só-texto, outro depoimento).

2. **Given** 5 criativos sendo gerados para a mesma campanha, **When** a geração é concluída, **Then** nenhum criativo repete o mesmo conceito dos 2 anteriores.

3. **Given** um criativo já gerado com estilo "Simulador UI", **When** o usuário solicita variações adicionais, **Then** os novos criativos usam conceitos distintos (ex: Tipografia, Depoimento, Antes/Depois).

---

### User Story 2 - Modos de Geração: Preset vs Livre (Priority: P2)

Como um usuário do AlvoAds Meta, eu quero poder escolher entre usar modelos de criativos pré-definidos (com quantidade específica de cada) ou deixar o sistema decidir livremente, para ter controle quando quiser e conveniência quando não quiser.

**Why this priority**: Flexibilidade é essencial - alguns usuários querem controle granular, outros preferem automação total.

**Independent Test**: Pode ser testado alternando entre modo preset e modo livre e verificando que o sistema respeita a escolha.

**Acceptance Scenarios**:

1. **Given** usuário no modo "Preset", **When** ele seleciona "Simulador UI" (2x), "Depoimento" (2x) e "Antes/Depois" (1x), **Then** o sistema gera exatamente essa quantidade de cada conceito.

2. **Given** usuário no modo "Livre", **When** ele solicita 5 criativos, **Then** o sistema decide automaticamente os melhores conceitos baseado no contexto do artigo e nicho detectado.

3. **Given** usuário em modo Preset com presets selecionados, **When** ele alterna para modo "Livre", **Then** as seleções anteriores são ignoradas e o sistema assume controle total.

---

### User Story 3 - Estratégias para Nichos Estratégicos (Priority: P3)

Como um usuário que trabalha com nichos regulados (financeiro, empregos), eu quero que o sistema aplique automaticamente estratégias de criativos otimizadas para meu nicho, para que meus criativos sejam mais efetivos e compliance-friendly.

**Independent Test**: Pode ser testado gerando criativos para um artigo de nicho financeiro e verificando que o sistema aplica o template master de prompts financeiros automaticamente.

**Acceptance Scenarios**:

1. **Given** um usuário criando campanha para nicho financeiro (detectado automaticamente), **When** criativos são gerados, **Then** o sistema aplica o template master de prompts para criativos financeiros.

2. **Given** nicho financeiro detectado, **When** o sistema gera o prompt, **Then** inclui obrigatoriamente: título grande persuasivo, subtexto de apoio, botões de valores com moeda, CTA grande e visível.

3. **Given** nicho genérico (não-estratégico), **When** criativos são gerados, **Then** o sistema usa a estratégia de diversidade padrão baseada no contexto do artigo.

---

### User Story 4 - Rotação Automática de Modelos de IA (Priority: P4)

Como usuário do AlvoAds Meta, eu quero que o sistema alterne automaticamente entre diferentes modelos de IA para gerar imagens, para aumentar a diversidade visual.

**Why this priority**: Diferentes modelos de IA produzem imagens com características visuais distintas, aumentando a diversidade além do que é possível apenas com prompts diferentes.

**Independent Test**: Pode ser testado gerando 4 criativos e verificando nos metadados que pelo menos 2 modelos diferentes foram usados.

**Acceptance Scenarios**:

1. **Given** geração de múltiplos criativos, **When** o sistema processa cada imagem, **Then** ele alterna automaticamente entre Nano Banana Pro e GPT Image 1.5 via OpenRouter usando round-robin.

2. **Given** um modelo específico falha na geração, **When** o sistema detecta a falha, **Then** ele automaticamente tenta com o próximo modelo disponível (fallback).

3. **Given** criativos gerados com modelos diferentes, **When** o usuário visualiza a biblioteca de criativos, **Then** ele pode ver qual modelo foi usado para cada imagem.

---

### User Story 5 - Preview de Diversidade (Priority: P5)

Como usuário, eu quero visualizar um resumo das características de diversidade dos criativos antes de publicar, para garantir que tenho variedade suficiente para o Andromeda.

**Why this priority**: Feedback visual ajuda o usuário a entender e validar a diversidade antes de gastar créditos publicando.

**Independent Test**: Pode ser testado na tela de review de campanha verificando a exibição de tags de conceito e modelo para cada criativo.

**Acceptance Scenarios**:

1. **Given** uma campanha com 5 criativos prontos para publicar, **When** o usuário acessa a tela de review, **Then** ele vê tags visuais indicando o conceito criativo e modelo de cada criativo.

2. **Given** diversidade insuficiente detectada (ex: 3 criativos com mesmo conceito), **When** o sistema analisa a campanha, **Then** exibe um alerta sugerindo regenerar alguns criativos.

---

### Edge Cases

- O que acontece quando há menos artigos do que conceitos disponíveis? Sistema deve garantir máxima diversidade possível com os conceitos disponíveis, evitando repetição dentro do que for viável.

- Como o sistema lida quando todos os modelos de IA falham? Exibe erro amigável indicando problema de serviço externo, sugere tentar novamente mais tarde, não consome créditos.

- Como tratar nichos não-estratégicos? Sistema opera em modo automático inteligente, usando o contexto do artigo para decidir o melhor prompt.

- O que acontece se Nano Banana Pro estiver indisponível? Sistema usa GPT Image 1.5 automaticamente (e vice-versa).

- O que acontece se o usuário selecionar mais presets do que criativos solicitados? Sistema limite a seleção dos presets como número de criativos.

## Requirements *(mandatory)*

### Functional Requirements

**Provedores de IA (OpenRouter + Replicate):**

- **FR-001**: Sistema DEVE usar **OpenRouter** como provedor principal e **Replicate** como provedor adicional para modelos específicos de imagem.

- **FR-002**: Sistema DEVE suportar pelo menos dois modelos de imagem: **Nano Banana Pro** (Replicate) e **GPT Image 1.5** (Replicate), podendo incluir **Gemini 3 Pro** via OpenRouter para aumentar diversidade.

- **FR-003**: Sistema DEVE alternar automaticamente entre os modelos usando round-robin para garantir diversidade visual determinística.

- **FR-004**: Sistema DEVE registrar qual modelo foi usado para cada criativo gerado (campo `model_used` na creative_library).

- **FR-004A**: Sistema DEVE exibir o `model_used` na biblioteca de criativos e na tela de review.

- **FR-005**: Sistema DEVE implementar fallback automático: se um modelo falha, tenta com o outro automaticamente.

**Modos de Geração:**

- **FR-006**: Sistema DEVE oferecer dois modos de geração de criativos:
  - **Modo Preset**: Usuário seleciona um ou mais conceitos criativos pré-definidos e especifica quantidade de cada
  - **Modo Livre**: Sistema decide automaticamente os melhores conceitos baseado no contexto

- **FR-007**: No modo Preset, usuário DEVE poder selecionar múltiplos presets e definir quantidade para cada um (ex: "Simulador UI: 2", "Depoimento: 2", "Tipografia: 1").

- **FR-008**: No modo Livre, sistema DEVE usar IA para decidir o melhor mix de conceitos caso a caso, com critérios explícitos de relevância:
  - Signals mínimos: nicho detectado, keywords do artigo, objetivo da campanha, país, idioma
  - Desempate: aleatório controlado para evitar repetição
  - Deve respeitar a janela de diversidade (não repetir últimos 3 conceitos)

- **FR-009**: Sistema DEVE exibir claramente o modo atual selecionado e permitir alternar facilmente entre os modos.

**Presets de Criativos Universais (8 Conceitos para Nichos Genéricos):**

- **FR-010**: Sistema DEVE oferecer 8 presets de conceitos criativos universais para nichos genéricos:

  **1. Simulador / Calculadora UI (App Screenshot)**
  - O criativo se parece com uma interface real de app
  - Sliders de valor, botões de seleção, campos de input
  - Gera curiosidade interativa ("quero mexer nisso")
  - Funciona para: fintech, saúde, ecommerce, qualquer app

  **2. Tipografia Dominante (Só-texto)**
  - Headline provocativo ENORME que ocupa todo o criativo
  - Sem fotos, apenas texto e fundo sólido
  - Pattern interrupt mais puro - para o scroll por ser visualmente diferente
  - Funciona para: todos os nichos

  **3. Depoimento / Prova Social**
  - Cards de review estilo app store
  - Citação de pessoa real com foto, rating de estrelas
  - Pessoas confiam mais em outros usuários do que em claims da marca
  - Funciona para: todos os nichos (especialmente fintech pela confiança)

  **4. Antes / Depois (Problema → Solução)**
  - Split-screen visual com contraste claro
  - "Antes: problema/stress" vs "Depois: solução/alívio"
  - A transformação conta a história instantaneamente
  - Funciona para: todos os nichos

  **5. Hook de Pergunta (Curiosidade)**
  - Uma pergunta que fala diretamente com a dor do público
  - Headlines baseados em curiosidade geram CTR mais alto
  - Conceito visualmente distinto dos outros formatos
  - Funciona para: todos os nichos

  **6. Comparação / Versus**
  - "Tradicional vs. Nosso app" ou "Sem vs. Com"
  - Checkmarks vs X marks, layout split-screen
  - Simplifica a tomada de decisão para o usuário
  - Funciona para: todos os nichos

  **7. Native / UGC-style**
  - O ad se parece com um post orgânico
  - Screenshot de conversa, notificação de celular, post de rede social
  - Radicalmente diferente de um UI polished = diversidade real
  - Funciona para: todos os nichos

    **8. Banner / Professional Design**
  - O ad se parece com um banner de anúncio mesmo
  - Feito como se fosse por um designer profissional
  - Com botão de CTA, elementos, etc...
  - Funciona para: todos os nichos

- **FR-011**: Cada preset DEVE ter: nome, descrição, exemplos pré-gerados (10 por conceito, gerados manualmente via curl e armazenados em `example_images[]`), e `prompt_template_json` associado (JSON pronto para envio ao gerador de imagem, otimizado para renderização correta de texto na imagem).

- **FR-012**: No modo Livre para nichos genéricos, sistema DEVE priorizar presets baseado na relevância ao contexto do artigo.

**Presets de Criativos (28 Conceitos Especializados):**

- **FR-012A**: O sistema pode usar um banco de dados especializado de vários conceitos criativos organizados em categorias:

  **CATEGORIA: NARRATIVA (4 conceitos)**
  - Problema → Solução
  - Antes / Depois
  - Jornada do Cliente
  - Dia a Dia / Lifestyle

  **CATEGORIA: PROVA SOCIAL (4 conceitos)**
  - Card de Depoimento
  - Prova Social Numérica
  - Comunidade / Movimento
  - Selos de Confiança

  **CATEGORIA: PRODUTO / SERVIÇO (5 conceitos)**
  - Simulador / Calculadora UI
  - Smartphone Mockup Central
  - Destaque de Features
  - Comparação / Versus
  - Passo a Passo (3 Steps)

  **CATEGORIA: CURIOSIDADE / PATTERN INTERRUPT (6 conceitos)**
  - Hook de Pergunta Grande
  - Reveal / Masking
  - Notificação / Native UI
  - Listicle / Top N
  - Mito vs. Realidade
  - Estatística Chocante

  **CATEGORIA: ESTILO VISUAL ESPECIAL (9 conceitos)**
  - Editorial Luxury / Dark Premium
  - Editorial White / Minimal Clean
  - Cartoon / Ilustração Flat
  - Colagem / Scrapbook Editorial
  - 3D / Isométrico
  - Glassmorphism / Neomorphism
  - Gradiente Bold / Vibrant
  - Retro / Vintage
  - Jornal / Print Editorial

  **Nota**: "Seleção aleatória" é uma regra de escolha e **não** conta como conceito. O total permanece 28 conceitos fixos.

- **FR-012B**: Para nicho financeiro, a IA PODE acrescentar elementos do prompt abaixo (extraído dos melhores e mais escalados criativos dos últimos tempos) - @specs/20260203-andromeda-creative-diversity/prompt_finance.md

  - Nunca repetir o mesmo conceito nos últimos 3 criativos gerados
  - Distribuição balanceada entre as 5 categorias quando gerando múltiplos criativos

- **FR-012C**: Sistema PODE combinar o conceito criativo com um Grupo Visual (A-H) para máxima diversidade:
  - **Grupo A**: UI / Fintech (10 variações)
  - **Grupo B**: Dinheiro Realista (10 variações)
  - **Grupo C**: Dinheiro em Movimento (10 variações)
  - **Grupo D**: Malotes / Sacos (10 variações)
  - **Grupo E**: Bancos / Institucional (10 variações)
  - **Grupo F**: Pessoas Reais (10 variações)
  - **Grupo G**: Cartoon / Ilustração (10 variações)
  - **Grupo H**: Ultra Premium / Editorial (10 variações)

**Integração com Direcionamentos do Usuário (Funcionalidade Existente):**

- **FR-012D**: Sistema DEVE preservar o campo "Direcionamentos" existente (`userDirections`) na interface de geração de criativos.

- **FR-012E**: Os Direcionamentos do usuário DEVEM ser incorporados ao prompt final de geração de imagem, COMBINADOS com:
  - O conceito criativo selecionado (preset ou automático)
  - O grupo visual (para nicho financeiro)
  - O template master (para nichos estratégicos)
  - As configurações de targeting (país, idioma)

- **FR-012F**: Ordem de prioridade na composição do prompt:
  1. Direcionamentos do usuário (prioridade máxima - sempre respeitados)
  2. Template master do nicho (se aplicável)
  3. Conceito criativo + Grupo visual
  4. Configurações de formato e localização

- **FR-012G**: Sistema DEVE usar informações de targeting existentes:
  - `countries`: Para localização de moeda, símbolos culturais, idioma do texto
  - `languages`: Para determinar o idioma do texto no criativo
  - Ex: Se país = "BR" e idioma = "Português", textos no criativo em português com R$

**Inteligência de Prompts (Modo Livre):**

- **FR-013**: No modo Livre, sistema DEVE gerar um ranking interno de conceitos com score por relevância e registrar o conceito escolhido para observabilidade.

- **FR-014**: Para nichos estratégicos (financeiro, empregos), sistema DEVE aplicar templates de prompt específicos e validados além do conceito escolhido.

- **FR-015**: Para nichos genéricos, sistema DEVE garantir diversidade mínima:
  - Não repetir o mesmo conceito nos últimos 3 criativos
  - Em lotes de 5+, usar pelo menos 4 conceitos distintos

**Template Master - Nicho Financeiro (Andromeda Compliant):**

- **FR-016**: Para nicho financeiro, sistema DEVE aplicar o template master com as seguintes regras obrigatórias:

  **Formato fixo:**
  - Square 1:1
  - Alta legibilidade
  - Layout publicitário profissional

  **Proibições (NUNCA usar):**
  - Palavras: "imediato", "hoje", "agora", "instantâneo", "bani pe loc", "azi"
  - Promessas de aprovação, liberação ou dinheiro garantido
  - CTA pequeno
  - Botões sem valores
  - Layouts repetidos entre prompts

  **Texto obrigatório:**
  - Título EXTRA-GRANDE (ex: "Precisa de dinheiro?", "De quanto você precisa?")
  - Subtexto de apoio (ex: "Escolha o valor que faz sentido para você")
  - Botões de valores GRANDES com moeda (ex: [ 5K AED ] [ 10K AED ] [ 20K AED ])
  - CTA GRANDE e visível (ex: "Quero simular", "Simule agora")

**Sistema de Backgrounds:**

- **FR-017**: Sistema DEVE variar backgrounds para cada criativo: Dark Mode, Light/Clean, Gradient, Premium, Sólido com cor forte.

- **FR-018**: Sistema DEVE garantir que o mesmo background não se repita nos últimos 4 criativos.

- **FR-019**: Sistema DEVE incluir backgrounds "Andromeda-safe" com cores de alto contraste (coral, yellow, magenta, lime) e manter a paleta em dados dinâmicos (Supabase), não hardcoded.

**Detecção de Nicho:**

- **FR-020**: Sistema DEVE detectar automaticamente o nicho da campanha baseado em: keywords do artigo, categoria, conteúdo.

- **FR-021**: Nichos suportados: financeiro, empregos, ecommerce, saúde, genérico.

- **FR-022**: Para nicho detectado como financeiro, sistema DEVE aplicar automaticamente o template master (FR-016).

**Validação de Diversidade:**

- **FR-023**: Sistema DEVE calcular score de diversidade baseado em: conceitos únicos, backgrounds únicos, modelos usados, com fórmula explícita:
  - Score = (conceitos únicos / total) * 50 + (backgrounds únicos / total) * 30 + (modelos únicos / total) * 20 (0-100)

- **FR-024**: Sistema DEVE alertar o usuário se o score de diversidade estiver abaixo do limiar recomendado (70).

- **FR-025**: Se todos os modelos falharem na geração, o sistema DEVE retornar erro amigável e NÃO consumir créditos.

### Key Entities

- **AI Model**: Representa um modelo de geração de imagem via OpenRouter. Valores possíveis: `nano-banana-pro` (Google), `gpt-image-1.5` (OpenAI).

- **Creative Concept**: Conceito criativo pré-definido selecionável pelo usuário. Contém: id, name, description, icon, prompt_template, works_for_niches.

- **Creative Background**: Background disponível para geração. Contém: id, name, type (dark/clean/gradient/premium/solid), color_palette, is_andromeda_safe.

- **Generation Mode**: Modo de geração selecionado. Valores: `preset` (usuário escolhe) ou `free` (sistema decide).

- **Concept Selection**: Seleção de conceito pelo usuário no modo Preset. Contém: concept_id, quantity.

- **Niche Template**: Template de prompts específico para um nicho. Contém: niche_id, prompt_template, prohibited_words, required_elements.

- **Creative Generation Session**: Rastreia criativos gerados na sessão atual. Contém: mode, concept_selections, used_backgrounds, models_used.

### Non-Functional Requirements

- **NFR-001**: Tempo médio de geração de imagem < 30s por imagem; resposta de UI < 100ms para interações locais.
- **NFR-002**: Respeitar quotas e rate limits do OpenRouter por conexão (throttle + backoff; no burst acima do permitido pelo provedor).
- **NFR-003**: Todas as chamadas a integrações externas devem registrar sucesso/erro com payload mínimo e timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No modo Preset, sistema DEVE gerar exatamente a quantidade especificada de cada conceito selecionado (100% de precisão).

- **SC-002**: No modo Livre, cada conjunto de 5 criativos DEVE usar pelo menos 4 conceitos diferentes (80% de diversidade).

- **SC-003**: Cada conjunto de 5 criativos DEVE usar pelo menos 3 backgrounds diferentes (60% de diversidade).

- **SC-004**: Cada conjunto de 4+ criativos DEVE usar ambos os modelos (Nano Banana Pro e GPT Image 1.5).

- **SC-005**: Taxa de erro na geração de imagens DEVE permanecer abaixo de 5% com sistema de fallback entre modelos.

- **SC-006**: Sistema detecta nicho financeiro corretamente em 95% dos casos baseado em keywords (empréstimo, crédito, dinheiro, financiamento).

- **SC-007**: Para nicho financeiro, 100% dos criativos DEVEM incluir: título grande, botões de valores, CTA visível.

- **SC-008**: Usuários conseguem alternar entre modo Preset e Livre em menos de 5 segundos.

- **SC-009**: Score de diversidade exibido ao usuário antes de publicar campanha em 100% dos casos.

## Assumptions

- O algoritmo Andromeda penaliza principalmente similaridade visual (cores, composição, elementos) mais do que similaridade de copy.
- Nano Banana Pro e GPT Image 1.5 produzem resultados suficientemente distintos para contribuir com diversidade visual.
- OpenRouter fornece acesso confiável aos dois modelos de imagem com fallback adequado.
- Usuários experientes preferem modo Preset para controle granular; novos usuários preferem modo Livre.
- A IA consegue determinar o melhor prompt baseado no contexto do artigo e objetivo da campanha.
- O sistema atual de créditos (5 créditos por imagem) permanece inalterado.
- Nichos podem ser detectados por análise de keywords e categorias de artigos já existentes no sistema.
- Os 8 conceitos criativos universais funcionam para nichos genéricos (não-financeiros).
- O nicho financeiro requer um banco de dados especializado de conceitos + grupos visuais para máxima diversidade.
- Para nicho financeiro, a IA escolhe aleatoriamente entre os conceitos para maximizar diversidade automática.

**Funcionalidades Existentes Preservadas:**
- O campo "Direcionamentos" (`userDirections`) na tela de geração de criativos permanece disponível.
- As configurações de targeting (países, idiomas, faixa etária, gênero) continuam sendo usadas.
- O fluxo do wizard Meta Ads (`/alvoads-meta/criar`) permanece o mesmo, apenas com nova lógica de geração de prompts.
- A biblioteca de criativos e a seleção de imagens existentes continuam funcionando normalmente.

## Out of Scope

- Criação de novos conceitos pelo usuário (apenas os pré-definidos: 8 universais, financeiros)
- **Carrosséis / Multi-card** (apenas imagens únicas por enquanto)
- Geração de vídeo (apenas imagens estáticas)
- Tradução automática de copy para múltiplos idiomas (já existe no sistema atual)
- A/B testing automatizado de criativos (feature futura)
- Integração com outros canais além de Meta (Google Ads, TikTok)
- Edição manual de imagens geradas

## Appendix: Template Master - Nicho Financeiro

```
FORMAT:
Square 1:1. Alta legibilidade. Layout publicitário profissional.

CONCEPT:
[Conceito selecionado ou escolhido automaticamente - 1 dos 8]

BACKGROUND:
[Cor forte / contraste / editorial / clean - nunca repetir últimos 4]

COMPOSITION:
- Título: [Posição - rotacionar 6 opções]
- Botões: [Posição - rotacionar 10 opções]
- CTA: [Posição - rotacionar 8 opções]

TITLE (EXTRA-LARGE, bold, dominant):
[Variação de: "Precisa de dinheiro?", "De quanto você precisa?", "Um empréstimo te ajudaria?", "Quanto você quer solicitar?", "Pensando em um empréstimo?"]

SUBTEXT (smaller, supporting):
[Variação de: "Escolha o valor que faz sentido para você", "Selecione o valor desejado", "Comece escolhendo o montante", "Defina o valor do empréstimo"]

VALUE BUTTONS (LARGE, high contrast):
[ 5K {CURRENCY} ] [ 10K {CURRENCY} ] [ 20K {CURRENCY} ]

CTA (LARGE, visible, contrasting):
[Variação de: "Quero simular", "Simule agora", "Começar simulação", "Iniciar simulação"]

MANDATORY RULES:
- NUNCA usar: "imediato", "hoje", "agora", "instantâneo", "bani pe loc", "azi"
- NUNCA prometer aprovação, liberação ou dinheiro garantido
- CTA SEMPRE grande e visível
- Botões SEMPRE com valores e moeda
- NUNCA repetir layout entre prompts consecutivos
```

## Appendix: UI Mock - Modo de Seleção (Nichos Genéricos)

```
┌─────────────────────────────────────────────────────────────┐
│  Modo de Geração                                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ ○ Modo Preset   │  │ ● Modo Livre    │                   │
│  │   Eu escolho    │  │   IA decide     │                   │
│  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  Conceitos Disponíveis (modo Preset - nichos genéricos)     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Simulador   │  │ Tipografia  │  │ Depoimento  │         │
│  │     📱      │  │     🔤      │  │     ⭐      │         │
│  │   [- 2 +]   │  │   [- 1 +]   │  │   [- 2 +]   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Antes/Depois│  │ Pergunta    │  │ Comparação  │         │
│  │     ↔️      │  │     ❓      │  │     ⚖️      │         │
│  │   [- 0 +]   │  │   [- 0 +]   │  │   [- 0 +]   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐                                            │
│  │ Native/UGC  │                                            │
│  │     📲      │                                            │
│  │   [- 0 +]   │                                            │
│  └─────────────┘                                            │
│                                                             │
│  Total: 5 criativos                                         │
│                                                             │
│  [ Gerar Criativos ]                                        │
└─────────────────────────────────────────────────────────────┘
```

## Appendix: UI Mock - Nicho Financeiro (IA Decide)

```
┌─────────────────────────────────────────────────────────────┐
│  🏦 Nicho Detectado: FINANCEIRO                             │
│  IA escolherá automaticamente entre 28 conceitos            │
│  especializados + 8 grupos visuais                          │
├─────────────────────────────────────────────────────────────┤
│  Categorias de Conceitos (28 total)                         │
│                                                             │
│  📖 Narrativa (4)      ⭐ Prova Social (4)                  │
│  └ Problema→Solução    └ Card Depoimento                    │
│  └ Antes/Depois        └ Números                            │
│  └ Jornada             └ Comunidade                         │
│  └ Lifestyle           └ Selos de Confiança                 │
│                                                             │
│  💎 Produto (5)        🧲 Curiosidade (6)                   │
│  └ Simulador UI        └ Pergunta Hook                      │
│  └ Smartphone          └ Reveal/Mask                        │
│  └ Features            └ Notificação                        │
│  └ Comparação          └ Listicle                           │
│  └ Passo a Passo       └ Mito vs Realidade                  │
│                        └ Estatística                        │
│                                                             │
│  🎨 Estilo Visual (9)                                       │
│  └ Editorial Luxury   └ Editorial White   └ Cartoon         │
│  └ Colagem            └ 3D/Isométrico     └ Glassmorphism   │
│  └ Gradiente Bold     └ Retro/Vintage     └ Jornal/Print    │
├─────────────────────────────────────────────────────────────┤
│  Grupos Visuais (A-H) - combinados com conceitos            │
│                                                             │
│  [A] UI/Fintech    [B] Dinheiro    [C] Movimento            │
│  [D] Malotes       [E] Bancos      [F] Pessoas              │
│  [G] Cartoon       [H] Editorial                            │
├─────────────────────────────────────────────────────────────┤
│  Quantidade: [- 5 +]                                        │
│                                                             │
│  [ Gerar Criativos Financeiros ]                            │
└─────────────────────────────────────────────────────────────┘
```

## Appendix: Os 8 Conceitos Universais (Nichos Genéricos)

| # | Conceito | Descrição | Por que funciona |
|---|----------|-----------|------------------|
| 1 | **Simulador / Calculadora UI** | Interface de app com sliders, botões, campos | Gera curiosidade interativa, reduz atrito |
| 2 | **Tipografia Dominante** | Headline ENORME, sem fotos, fundo sólido | Pattern interrupt - diferente de tudo no feed |
| 3 | **Depoimento / Prova Social** | Review estilo app store, foto + rating | Confiança em outros usuários > claims da marca |
| 4 | **Antes / Depois** | Split-screen transformação visual | Conta a história instantaneamente |
| 5 | **Hook de Pergunta** | Pergunta provocativa que fala com a dor | Headlines de curiosidade = CTR mais alto |
| 6 | **Comparação / Versus** | Tradicional vs Nosso, checkmarks vs X | Simplifica decisão para o usuário |
| 7 | **Native / UGC-style** | Parece post orgânico, notificação, chat | Radicalmente diferente = diversidade real |

## Appendix: Os 28 Conceitos Financeiros (Nicho Financeiro)

### 📖 NARRATIVA (4 conceitos)

| ID | Conceito | Prompt Template |
|----|----------|-----------------|
| problem-solution | Problema → Solução | The image tells a visual story: a clear problem on one side (visual tension, stress, worry) resolved by the product/service on the other side. Split composition or sequential visual flow showing transformation from problem to solution. |
| before-after | Antes / Depois | Split-screen or side-by-side composition showing a dramatic before/after transformation. Left side shows the 'before' state (struggle, lack), right side shows the 'after' state (relief, success, money in hand). Clear visual contrast. |
| journey | Jornada do Cliente | Visual narrative showing the customer journey: from discovering the need → finding the service → achieving the result. Use visual flow elements like arrows, steps, or a path that guides the eye through the story. |
| day-in-life | Dia a Dia / Lifestyle | Product/service naturally integrated into an everyday lifestyle scene. Authentic, relatable moment — someone at home, at work, or on the go, naturally interacting with the service on their phone. Warm, lived-in feeling. |

### ⭐ PROVA SOCIAL (4 conceitos)

| ID | Conceito | Prompt Template |
|----|----------|-----------------|
| testimonial-card | Card de Depoimento | Testimonial-style card with a quote from a real-looking person. Photo of the person, their quote in large readable text, star rating or trust badge. Clean card UI floating over a subtle background. Feels like a real app review. |
| social-proof-numbers | Prova Social Numérica | Large, bold statistics and numbers as the hero element. Numbers like '50,000+ customers', '4.8★ rating', '98% approval'. Numbers are oversized and typographically dominant. Supporting visual elements reinforce trust. |
| community | Comunidade / Movimento | Multiple diverse people shown together or in a grid/collage, all connected by the service. Sense of belonging and community. Group energy, diverse faces, shared positive experience. |
| trust-badges | Selos de Confiança | Institutional trust elements: security badges, certification seals, bank logos, regulatory stamps. Clean, corporate layout that emphasizes safety, reliability and legitimacy. Premium institutional feel. |

### 💎 PRODUTO / SERVIÇO (5 conceitos)

| ID | Conceito | Prompt Template |
|----|----------|-----------------|
| simulator-ui | Simulador / Calculadora UI | Fintech app UI showing a loan simulator or calculator interface. Clean, modern app design with input fields, sliders, or value selection buttons. The UI IS the creative — it looks like a real app screenshot that invites interaction. |
| smartphone-mockup | Smartphone Mockup Central | A realistic smartphone in the center of the composition displaying the app/service interface. The phone is the hero element. Background complements but doesn't compete. Clean, product-focused. |
| feature-highlight | Destaque de Features | Multiple benefit/feature callouts arranged around a central element. Each feature has an icon and short text. Infographic-style layout that communicates multiple value propositions at once. |
| comparison | Comparação / Versus | Side-by-side comparison layout: 'Traditional way' vs 'Our way', or 'Without us' vs 'With us'. Clear visual contrast — one side negative/complicated, the other positive/simple. Checkmarks vs X marks. |
| step-by-step | Passo a Passo (3 Steps) | Three-step process visualization: Step 1 → Step 2 → Step 3. Each step has a number, icon, and short text. Clean flow from left to right or top to bottom. Makes the process feel simple and achievable. |

### 🧲 CURIOSIDADE / PATTERN INTERRUPT (6 conceitos)

| ID | Conceito | Prompt Template |
|----|----------|-----------------|
| question-hook | Hook de Pergunta Grande | The entire creative is dominated by a single large, provocative question that speaks directly to the viewer's pain point. The question is typographically massive — it IS the creative. Minimal supporting elements, maximum text impact. |
| reveal-mask | Reveal / Masking | Part of the image is visually hidden, blurred, or masked — creating curiosity about what's underneath. A 'scratch card' or 'peel' effect that makes the viewer want to tap/click to reveal the hidden content. |
| fake-notification | Notificação / Native UI | The creative mimics a native phone notification, chat message, or system UI element. It looks like a real notification saying something compelling about money or a loan. Stops the scroll because it feels like a real phone interaction. |
| listicle | Listicle / Top N | Numbered list format: '3 reasons to...', '5 things you didn't know about...'. Each item is visually distinct with numbers, icons, and short text. Educational and scannable. Magazine-style layout. |
| myth-vs-reality | Mito vs. Realidade | Two-column layout busting a common myth. Left: 'MYTH' with the misconception crossed out. Right: 'REALITY' with the truth highlighted. Bold typography, high contrast between myth (red/dark) and reality (green/bright). |
| shocking-stat | Estatística Chocante | One massive, surprising statistic dominates the creative. The number is enormous — takes up most of the visual space. A short line of context below explains what it means. Data-driven pattern interrupt. |

### 🎨 ESTILO VISUAL ESPECIAL (9 conceitos)

| ID | Conceito | Prompt Template |
|----|----------|-----------------|
| editorial-luxury | Editorial Luxury / Dark Premium | Ultra-premium dark editorial aesthetic. Black or deep navy background, gold or white accents, luxury typography. Feels like a high-end financial magazine ad. Sophisticated, exclusive, prestigious. |
| editorial-white | Editorial White / Minimal Clean | Ultra-clean white/light editorial design. Generous whitespace, refined typography, minimal elements. Every element is precisely placed. Scandinavian or Swiss design influence. Premium through simplicity. |
| cartoon-flat | Cartoon / Ilustração Flat | Flat design illustration style with cartoon characters, icons, and playful elements. Bright colors, clean vectors, friendly and approachable. The entire creative is illustrated — no photos. |
| collage-scrapbook | Colagem / Scrapbook Editorial | Mixed-media collage style combining photos, illustrations, textures, and typography. Cut-out shapes, layered elements, torn paper edges. Edgy, trend-driven, visually unique. Art-directed chaos. |
| 3d-isometric | 3D / Isométrico | Three-dimensional or isometric illustration style. Objects, UI elements, and money rendered in 3D with depth and perspective. Modern, tech-forward, visually distinctive. |
| glassmorphism | Glassmorphism / Neomorphism | Modern glassmorphism UI design: frosted glass panels, soft shadows, layered transparency, subtle blur effects. Premium, futuristic tech aesthetic. Cards and UI elements float with glass-like translucency. |
| gradient-bold | Gradiente Bold / Vibrant | Dominant gradient background with vibrant, eye-catching color transitions. The gradient IS the design — bold, saturated, modern. Text and elements sit on top with high contrast. Instagram-native aesthetic. |
| retro-vintage | Retro / Vintage | Retro or vintage-inspired design: aged paper textures, classic typography, sepia tones or bold retro color palettes. Nostalgia-driven aesthetic that stands out from modern designs in the feed. |
| newspaper-print | Jornal / Print Editorial | Newspaper or print-editorial layout mimicking a real newspaper page. Headlines in serif fonts, column layouts, 'breaking news' formatting. The creative looks like a newspaper clipping or magazine spread. |

## Appendix: Os 8 Grupos Visuais Financeiros (A-H)

| Grupo | Nome | Elementos (10 variações cada) |
|-------|------|-------------------------------|
| **A** | UI / Fintech | Flat fintech UI clean, Dark mode fintech UI, White minimal banking UI, Corporate blue banking UI, Simulator / calculator UI, Smartphone mockup central, Floating financial cards, Stacked button UI, Diagonal dynamic layout UI, Premium institutional UI |
| **B** | Dinheiro Realista | Realistic money stacks (editorial), Symmetric stacked bills, Close-up premium money, Blurred money background, Money on editorial desk, Money with depth of field, Money in dark studio, Money with magazine lighting, Money + UI overlay, Elegant minimalist money |
| **C** | Dinheiro em Movimento | Controlled flying money, Money in motion trails, Editorial money rain, Money orbiting buttons, Money in diagonals, Money silhouettes, Money with soft glow, Layered money, Money with visual arrows, Abstract money flow |
| **D** | Malotes / Sacos | Premium realistic money bags, Flat cartoon money bags, Dark editorial money bags, Stacked money bags, Symmetric money bags, Money bags as background, Money bags with clean UI, Institutional money bags, Minimalist money bags, High-contrast money bags |
| **E** | Bancos / Institucional | Modern glass bank facade, Classic columned bank, Urban minimalist bank, Flat illustrated bank, Premium editorial bank, Bank silhouette, Bank with UI overlay, Clean institutional bank, Illustrated bank entrance, Abstract corporate bank |
| **F** | Pessoas Reais | Real person + UI, Real woman + UI, Real man + UI, Real couple, Person using smartphone, Person in neutral setting, Premium editorial person, Institutional person, Person guiding eye to buttons, Person with discreet money |
| **G** | Cartoon / Ilustração | Flat fintech cartoon, Cartoon money icons, Cartoon UI cards, Cartoon flying money, Cartoon money bags, Cartoon bank, Simple cartoon character, Minimalist cartoon, Premium editorial cartoon, Hybrid real + cartoon |
| **H** | Ultra Premium / Editorial | Dark luxury editorial, White minimal editorial, Stone & glass editorial, Financial magazine editorial, Green private banking editorial, Beige luxury editorial, Corporate blue editorial, Black & red editorial, Paper / print editorial, Modern prestige editorial |
