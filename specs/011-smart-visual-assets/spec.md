# Feature Specification: Smart Visual Assets

**Feature Branch**: `011-smart-visual-assets`
**Created**: 2025-11-29
**Status**: Draft
**Input**: Classificação automática de assets visuais e contexto visual inteligente para o assistente IA

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload com Classificação Automática (Priority: P1)

Como usuário, ao fazer upload de um asset visual, quero que a IA analise automaticamente a imagem e sugira uma categoria (Logo, Pessoa, Background, Produto, Outro) e tags descritivas, para que eu possa organizar meus assets rapidamente sem precisar classificar manualmente.

**Why this priority**: Esta é a funcionalidade base que alimenta todo o sistema. Sem a classificação automática, os assets não terão metadados para uso inteligente pelo assistente. É o MVP mínimo que já entrega valor imediato ao usuário.

**Independent Test**: Pode ser testado fazendo upload de uma imagem e verificando se a classificação aparece antes de salvar. Entrega valor imediato de economia de tempo na organização.

**Acceptance Scenarios**:

1. **Given** usuário está na aba "Assets Visuais" do projeto, **When** faz upload de uma imagem de logo, **Then** sistema exibe sugestão de categoria "Logo" e tags como "logo, marca, corporativo" antes de salvar
2. **Given** sistema sugeriu categoria e tags, **When** usuário clica em "Confirmar", **Then** asset é salvo com os metadados sugeridos
3. **Given** sistema sugeriu categoria e tags, **When** usuário clica em "Editar", **Then** pode modificar categoria e tags antes de salvar
4. **Given** análise de IA falhou ou está indisponível, **When** upload é concluído, **Then** usuário pode classificar manualmente e asset é salvo normalmente

---

### User Story 2 - Configuração do Contexto Visual do Assistente (Priority: P2)

Como usuário, quero configurar no painel do assistente quais assets visuais devem ser usados automaticamente nas gerações de imagem, podendo escolher entre modo manual (seleção individual) ou automático (rotação inteligente), para manter a identidade visual consistente nas criações.

**Why this priority**: Depende da US1 para ter assets classificados. É a configuração que habilita o uso inteligente dos assets pelo assistente.

**Independent Test**: Pode ser testado acessando configurações do assistente, ativando contexto visual e selecionando modo de operação. Entrega valor de controle sobre a identidade visual.

**Acceptance Scenarios**:

1. **Given** usuário está nas configurações do assistente, **When** acessa seção "Assets Visuais", **Then** vê toggle para ativar/desativar contexto visual
2. **Given** contexto visual está ativado, **When** seleciona modo "Manual", **Then** pode escolher assets específicos via checkboxes organizados por categoria
3. **Given** contexto visual está ativado, **When** seleciona modo "Automático", **Then** vê resumo de quantos assets há em cada categoria e configuração de quantidade por categoria
4. **Given** modo automático configurado, **When** visualiza configurações, **Then** vê que logos serão sempre incluídos (regra fixa) e quantos assets de outras categorias serão selecionados

---

### User Story 3 - Geração de Imagem com Contexto Visual (Priority: P3)

Como usuário, quando peço ao assistente para gerar uma imagem (via chat ou modal), quero que o sistema use automaticamente os assets visuais configurados como referência, para que as imagens geradas mantenham minha identidade visual sem precisar anexar manualmente.

**Why this priority**: Depende das US1 e US2. É onde o valor final é entregue - imagens com identidade visual consistente.

**Independent Test**: Pode ser testado pedindo ao assistente para gerar uma imagem e verificando se assets configurados foram usados como referência. Entrega o valor final de identidade visual consistente.

**Acceptance Scenarios**:

1. **Given** contexto visual ativado no modo manual com assets selecionados, **When** usuário pede imagem no chat, **Then** sistema usa assets selecionados como referência na geração
2. **Given** contexto visual ativado no modo automático, **When** usuário pede imagem no chat, **Then** sistema seleciona automaticamente: todos os logos + N assets aleatórios de cada categoria
3. **Given** geração em andamento com assets, **When** processo inicia, **Then** usuário vê feedback indicando quais assets estão sendo usados como referência
4. **Given** usuário usa modal de geração de imagem, **When** abre o modal, **Then** assets do contexto visual aparecem pré-selecionados e podem ser ajustados antes de gerar

---

### User Story 4 - Rotação Inteligente de Assets (Priority: P4)

Como usuário em modo automático, quero que o sistema rotacione os assets selecionados para evitar repetição excessiva, para que minhas criações tenham variedade enquanto mantêm a identidade visual.

**Why this priority**: Refinamento da US3. Melhora a experiência mas não é essencial para o MVP.

**Independent Test**: Pode ser testado gerando múltiplas imagens em sequência e verificando se assets diferentes são usados. Entrega valor de variedade nas criações.

**Acceptance Scenarios**:

1. **Given** modo automático ativado com 5 assets de "Pessoas", **When** gera 3 imagens em sequência, **Then** sistema prioriza assets menos usados recentemente
2. **Given** asset foi usado há menos de 24 horas, **When** sistema seleciona assets, **Then** prioriza outros assets da mesma categoria (se disponíveis)

---

### Edge Cases

- O que acontece quando não há assets classificados? Sistema gera imagem sem referências visuais e exibe mensagem sugerindo adicionar assets
- Como sistema lida com falha na análise de IA do upload? Permite classificação manual e continua o fluxo normalmente
- O que acontece se usuário não tem nenhum logo cadastrado no modo automático? Sistema usa apenas assets de outras categorias disponíveis
- Como tratar uploads de arquivos não suportados? Exibe mensagem de erro clara indicando formatos aceitos
- O que acontece se todos os assets de uma categoria foram usados recentemente? Sistema reinicia o ciclo de rotação para essa categoria

## Requirements *(mandatory)*

### Functional Requirements

**Classificação Automática:**

- **FR-001**: Sistema DEVE analisar imagens no upload e sugerir categoria (Logo, Pessoa, Background, Produto, Outro)
- **FR-002**: Sistema DEVE gerar tags descritivas automaticamente baseadas no conteúdo visual da imagem
- **FR-003**: Sistema DEVE exibir sugestões de classificação antes de salvar, permitindo confirmação ou edição
- **FR-004**: Sistema DEVE permitir classificação manual caso análise automática falhe ou usuário discorde
- **FR-005**: Sistema DEVE persistir categoria, tags e descrição da IA no asset

**Contexto Visual do Assistente:**

- **FR-006**: Sistema DEVE oferecer toggle para ativar/desativar uso de assets visuais no assistente
- **FR-007**: Sistema DEVE suportar dois modos de operação: Manual (seleção individual) e Automático (seleção inteligente)
- **FR-008**: No modo Manual, sistema DEVE exibir assets organizados por categoria com checkboxes para seleção
- **FR-009**: No modo Automático, sistema DEVE sempre incluir todos os logos disponíveis como referência
- **FR-010**: No modo Automático, sistema DEVE selecionar N assets aleatórios de cada categoria (configurável, padrão: 2)
- **FR-011**: Sistema DEVE exibir resumo de assets disponíveis por categoria nas configurações

**Integração com Geração de Imagem:**

- **FR-012**: Sistema DEVE usar assets configurados como referência visual ao gerar imagens via chat
- **FR-013**: Sistema DEVE pré-selecionar assets do contexto visual no modal de geração de imagem
- **FR-014**: Sistema DEVE exibir feedback visual indicando quais assets estão sendo usados na geração
- **FR-015**: Sistema DEVE permitir ajuste dos assets selecionados antes de iniciar a geração (no modal)

**Rotação de Assets:**

- **FR-016**: Sistema DEVE registrar quando cada asset foi usado para geração
- **FR-017**: No modo automático, sistema DEVE priorizar assets menos usados recentemente na seleção

### Non-Functional Requirements

- **NFR-001**: Análise de classificação de imagem DEVE completar em ≤5 segundos por imagem
- **NFR-002**: Sistema DEVE suportar no máximo 100 assets visuais por projeto
- **NFR-003**: Sistema DEVE enviar no máximo 5 assets como referência visual por geração de imagem
- **NFR-004**: Sistema DEVE manter histórico de uso de assets por 30 dias para algoritmo de rotação
- **NFR-005**: Sistema DEVE aceitar arquivos de imagem com no máximo 10MB

### Key Entities

- **VisualAsset (expandido)**: Asset de imagem do projeto. Novos atributos: category (enum), tags (lista), ai_description (texto da análise)
- **AssistantVisualSettings**: Configurações de contexto visual por projeto. Atributos: is_enabled, mode (manual/auto), assets_per_category
- **AssistantAssetSelection**: Relação entre configuração e assets selecionados (modo manual). Atributos: asset_id, is_enabled
- **AssetUsageHistory**: Histórico de uso de assets para rotação. Atributos: asset_id, used_at, generation_id

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários classificam assets em menos de 10 segundos (vs ~30 segundos classificação manual)
- **SC-002**: 80% das classificações sugeridas pela IA são aceitas sem modificação
- **SC-003**: Usuários configuram contexto visual em menos de 2 minutos
- **SC-004**: 100% das gerações de imagem com contexto visual ativado incluem os assets configurados como referência
- **SC-005**: Imagens geradas mantêm elementos visuais consistentes com os assets de referência (validação qualitativa)
- **SC-006**: No modo automático, sistema não repete o mesmo conjunto exato de assets em gerações consecutivas

## Clarifications

### Session 2025-11-29

- Q: What is the acceptable latency for image analysis on upload? → A: ≤5 seconds per image (batch uploads naturally take longer, which users expect)
- Q: What is the maximum number of visual assets per project? → A: 100 assets per project
- Q: How many assets can be sent as visual references per generation? → A: Maximum 5 assets per generation
- Q: How long to retain asset usage history for rotation? → A: 30 days
- Q: What is the maximum file size for visual assets? → A: 10MB per image

## Assumptions

- A análise de imagem para classificação usará o serviço de visão já existente no sistema (vision_service)
- O sistema de geração de imagem já suporta referências visuais (reference_assets) - funcionalidade existente
- Categorias são fixas (Logo, Pessoa, Background, Produto, Outro) - não é necessário customização pelo usuário
- O contexto visual é configurado por projeto, não por usuário ou workspace
- Assets marcados como "is_reference_asset=true" já existem no sistema e serão expandidos com novos campos
