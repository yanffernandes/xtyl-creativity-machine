# Feature Specification: Smart Image Generation

**Feature Branch**: `026-smart-image-generation`
**Created**: 2025-12-12
**Status**: Draft
**Input**: User description: "Otimização do sistema de criação de imagens via chat com geração automática de variações, melhor utilização de assets visuais e referências, para funcionar em 90% dos casos mesmo com prompts básicos"

## Contexto do Problema

O sistema atual de geração de imagens via chat apresenta as seguintes limitações identificadas:

1. **Decisão implícita**: O assistente de IA decide quando gerar imagens baseado apenas na interpretação do prompt do usuário, sem critérios explícitos
2. **Prompts fracos**: Usuários frequentemente fornecem descrições vagas ou incompletas, resultando em imagens que não atendem às necessidades de marketing digital
3. **Uma única variação**: Atualmente gera apenas uma imagem por solicitação, limitando as opções do usuário
4. **Subutilização de assets**: Os assets visuais do projeto (logos, referências de estilo) nem sempre são incorporados de forma efetiva
5. **Falta de contexto de negócio**: O sistema não considera automaticamente o propósito de marketing digital dos criativos

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Geração de Criativo com Prompt Simples (Priority: P1)

Um profissional de marketing digital precisa criar um anúncio visual para uma campanha. Ele digita um prompt básico como "criar uma imagem para anunciar nosso produto" e recebe automaticamente duas variações de criativos profissionais e prontos para uso em campanhas.

**Why this priority**: Este é o cenário mais comum e representa o core do problema - usuários com pouca experiência em prompts precisam de resultados profissionais sem esforço extra.

**Independent Test**: Pode ser testado enviando prompts simples no chat e verificando se o sistema gera duas variações com qualidade adequada para marketing digital.

**Acceptance Scenarios**:

1. **Given** um usuário com um projeto configurado, **When** ele solicita "cria uma imagem pro meu produto", **Then** o sistema gera automaticamente duas variações de criativos incorporando a identidade visual do projeto
2. **Given** um prompt vago como "faz um anúncio aí", **When** o sistema processa a solicitação, **Then** ele enriquece automaticamente o prompt com contexto do projeto e gera criativos funcionais para marketing digital
3. **Given** um usuário que não especifica estilo ou composição, **When** o sistema gera as imagens, **Then** aplica automaticamente boas práticas de design para anúncios (contraste, legibilidade, hierarquia visual)

---

### User Story 2 - Configuração de Número de Variações (Priority: P2)

Um administrador deseja controlar quantas variações são geradas por padrão para todos os usuários do sistema. Ele acessa o painel administrativo e pode escolher entre 1, 2 ou 3 variações padrão.

**Why this priority**: Oferece flexibilidade de configuração centralizada sem sobrecarregar usuários com opções. Administradores podem ajustar conforme necessidades do negócio.

**Independent Test**: Pode ser testado acessando o painel admin, alterando o número de variações e verificando se as próximas gerações de qualquer usuário respeitam a configuração.

**Acceptance Scenarios**:

1. **Given** um administrador no painel admin, **When** ele seleciona "3 variações" como padrão global, **Then** todas as gerações de imagem de todos os usuários criam 3 variações
2. **Given** a configuração padrão do sistema (2 variações), **When** qualquer usuário gera uma imagem, **Then** recebe exatamente 2 variações
3. **Given** um administrador que alterou para "1 variação", **When** qualquer usuário gera uma imagem, **Then** recebe apenas 1 imagem

---

### User Story 3 - Incorporação Inteligente de Assets Visuais (Priority: P2)

Um usuário que possui assets visuais cadastrados (logos, paleta de cores, referências de estilo) espera que esses elementos sejam incorporados automaticamente nos criativos gerados, garantindo consistência de marca.

**Why this priority**: A consistência de marca é essencial para marketing digital profissional e diferencia o sistema de geradores de imagem genéricos.

**Independent Test**: Pode ser testado gerando imagens em projetos com e sem assets configurados e verificando a incorporação visual.

**Acceptance Scenarios**:

1. **Given** um projeto com logo cadastrado, **When** o usuário solicita um criativo, **Then** o sistema considera o logo como referência de estilo (cores, tipografia) na geração
2. **Given** um projeto com paleta de cores definida, **When** uma imagem é gerada, **Then** as cores predominantes respeitam a paleta do projeto
3. **Given** um projeto com referências de estilo (moodboard), **When** o sistema gera criativos, **Then** utiliza essas referências para manter consistência visual

---

### User Story 4 - Override Explícito do Comportamento Padrão (Priority: P3)

Um usuário experiente deseja ter controle total sobre a geração, podendo desativar o enriquecimento automático de prompt ou especificar exatamente quantas variações quer naquela solicitação específica.

**Why this priority**: Usuários avançados não devem ser limitados pelo comportamento automático quando têm necessidades específicas.

**Independent Test**: Pode ser testado usando comandos ou sintaxe específica no prompt para desativar funcionalidades automáticas.

**Acceptance Scenarios**:

1. **Given** um usuário que escreve "gera exatamente isso: [prompt detalhado]", **When** o sistema processa, **Then** não adiciona enriquecimento automático ao prompt
2. **Given** um usuário que especifica "gera 1 variação apenas", **When** a imagem é gerada, **Then** cria apenas 1 imagem ignorando a configuração padrão
3. **Given** um usuário que diz "não usa as referências do projeto", **When** a imagem é gerada, **Then** o sistema não incorpora assets visuais

---

### Edge Cases

- O que acontece quando o usuário pede variações mas o modelo de IA falha em uma delas? O sistema deve entregar as que conseguiu gerar com mensagem explicativa
- Como o sistema lida com prompts que explicitamente pedem algo contrário ao estilo do projeto? Respeita a intenção explícita do usuário
- O que acontece se o projeto não tem assets visuais configurados? Sistema usa boas práticas genéricas de marketing digital
- Como tratar solicitações de imagens que claramente não são para marketing (ex: "desenha um gato")? Gera normalmente mas sem o contexto de marketing

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE gerar 2 variações de imagem por padrão em toda solicitação de geração via chat
- **FR-002**: Sistema DEVE permitir configuração do número padrão de variações (1, 2 ou 3) no painel administrativo (configuração global)
- **FR-003**: Sistema DEVE enriquecer automaticamente prompts básicos com contexto de marketing digital (CTA, contraste, hierarquia visual)
- **FR-004**: Sistema DEVE incorporar automaticamente a identidade visual do projeto (cores, tipografia, estilo) nos prompts enriquecidos
- **FR-005**: Sistema DEVE priorizar a inclusão de assets visuais cadastrados (logos, referências) na geração de criativos
- **FR-006**: Sistema DEVE permitir que usuários façam override do comportamento padrão através de instruções explícitas no prompt
- **FR-007**: Sistema DEVE manter registro de qual configuração foi usada em cada geração (para auditoria e aprendizado)
- **FR-008**: Sistema DEVE exibir todas as variações geradas de forma que o usuário possa comparar e escolher facilmente
- **FR-009**: Sistema DEVE gerar variações com diferenças significativas entre si através de modificadores de prompt distintos (ex: "versão minimalista", "versão vibrante", "versão bold")
- **FR-010**: Sistema DEVE aplicar templates de prompts otimizados para diferentes tipos de criativos (anúncio, post, banner)
- **FR-011**: Sistema DEVE entregar variações conforme cada uma completa (entrega parcial progressiva), exibindo indicador de progresso para variações pendentes

### Key Entities

- **ImageGenerationConfig**: Configurações globais de geração de imagem no painel admin (número de variações, comportamento de enriquecimento)
- **ImageVariationSet**: Conjunto de variações geradas a partir de uma única solicitação, relacionando as imagens entre si
- **PromptEnrichmentTemplate**: Templates de enriquecimento de prompt para diferentes contextos de marketing digital
- **GenerationMetadata**: Metadados de cada geração incluindo prompt original, prompt enriquecido, assets utilizados, configurações aplicadas

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% das solicitações de geração de imagem com prompts básicos (menos de 20 palavras) resultam em criativos utilizáveis para marketing digital sem necessidade de regeneração
- **SC-002**: Tempo médio do usuário para obter um criativo satisfatório reduz em 50% comparado ao sistema anterior (menos iterações de "tenta de novo")
- **SC-003**: 80% dos usuários utilizam pelo menos uma das variações geradas sem solicitar modificações
- **SC-004**: Taxa de uso dos assets visuais do projeto nas gerações aumenta para 70% (quando assets estão disponíveis)
- **SC-005**: Usuários conseguem configurar o número de variações em menos de 30 segundos
- **SC-006**: 95% das variações geradas em um mesmo conjunto apresentam diferenças visuais perceptíveis entre si

## Assumptions

- O modelo de IA utilizado para geração de imagens suporta múltiplas gerações em sequência sem degradação significativa de performance
- Os usuários preferem ter mais opções (variações) mesmo que isso aumente ligeiramente o tempo de geração
- O contexto de "marketing digital" é o caso de uso principal e deve ser priorizado nas otimizações automáticas
- A geração de variações é feita em paralelo para minimizar o tempo total de espera
- O sistema de enriquecimento de prompts existente pode ser estendido para incluir templates específicos de marketing
- A interface atual do chat pode exibir múltiplas imagens lado a lado para comparação

## Out of Scope

- Edição de imagens geradas (crop, filtros, ajustes)
- Geração de vídeos ou animações
- A/B testing automatizado de criativos
- Integração direta com plataformas de ads (Meta, Google)
- Treinamento de modelos customizados por projeto
- Geração de mockups com templates pré-definidos

## Clarifications

### Session 2025-12-12

- Q: Estratégia de geração de variações - como garantir diferenças significativas entre variações? → A: Prompts levemente modificados com diferentes modificadores de estilo (ex: "versão minimalista", "versão vibrante")
- Q: Comportamento quando uma variação falha ou demora? → A: Entrega parcial progressiva - exibir variações conforme completam, com indicador de progresso para pendentes
- Q: Escopo da configuração de variações (por projeto, usuário ou global)? → A: Configuração global no painel administrativo
