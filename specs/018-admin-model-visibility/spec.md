# Feature Specification: Admin Model Visibility Configuration

**Feature Branch**: `018-admin-model-visibility`
**Created**: 2025-12-03
**Status**: Draft
**Input**: User description: "Separar configuração de modelos visíveis no admin em duas listas (texto e imagem), exibir valores/preços dos modelos, armazenar localmente para evitar requests ao OpenRouter, e remover seção de 'Modelos Recomendados' das configurações do workspace."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrador Configura Modelos de Texto Visíveis (Priority: P1)

O administrador acessa o painel admin e configura quais modelos de texto (LLM) estarão disponíveis para os usuários. Ele vê a lista de todos os modelos disponíveis com seus respectivos preços (input/output por 1M tokens), seleciona os modelos desejados, e salva a configuração.

**Why this priority**: Esta é a funcionalidade central - sem a separação de modelos de texto e imagem, os usuários não conseguem configurar adequadamente quais modelos aparecem em cada contexto (assistente de IA vs. geração de imagens).

**Independent Test**: Pode ser testado acessando /admin/models, navegando para a aba de modelos de texto visíveis, selecionando modelos e verificando se a lista é persistida corretamente.

**Acceptance Scenarios**:

1. **Given** o administrador está na página de modelos do admin, **When** ele acessa a aba "Modelos de Texto Visíveis", **Then** ele vê uma lista de todos os modelos de texto disponíveis com nome, ID e preços (input/output)
2. **Given** o administrador selecionou modelos de texto, **When** ele clica em "Salvar", **Then** a configuração é persistida e uma mensagem de sucesso é exibida
3. **Given** modelos de texto foram configurados, **When** um usuário acessa o seletor de modelo no assistente de IA, **Then** ele vê apenas os modelos configurados como visíveis

---

### User Story 2 - Administrador Configura Modelos de Imagem Visíveis (Priority: P1)

O administrador configura quais modelos de geração de imagem estarão disponíveis para os usuários. A interface é similar aos modelos de texto, com exibição de preços específicos para geração de imagens.

**Why this priority**: Complementar à configuração de modelos de texto - ambas são essenciais para o controle granular de quais modelos os usuários podem acessar.

**Independent Test**: Pode ser testado acessando /admin/models, navegando para a aba de modelos de imagem visíveis, selecionando modelos e verificando se aparecem no modal de geração de imagem.

**Acceptance Scenarios**:

1. **Given** o administrador está na página de modelos do admin, **When** ele acessa a aba "Modelos de Imagem Visíveis", **Then** ele vê uma lista de todos os modelos de imagem disponíveis com nome, ID e preços
2. **Given** o administrador selecionou modelos de imagem, **When** ele clica em "Salvar", **Then** a configuração é persistida separadamente dos modelos de texto
3. **Given** modelos de imagem foram configurados, **When** um usuário acessa o modal de criação de imagem, **Then** ele vê apenas os modelos de imagem configurados como visíveis

---

### User Story 3 - Usuário Vê Apenas Modelos Configurados pelo Admin (Priority: P1)

O usuário final, ao usar o assistente de IA ou o modal de geração de imagem, vê apenas os modelos que foram configurados como visíveis pelo administrador. O sistema não faz mais requisições diretas ao OpenRouter - lê os dados armazenados localmente.

**Why this priority**: Esta é a entrega de valor para o usuário final - uma experiência mais limpa e performática, sem modelos desnecessários na lista.

**Independent Test**: Pode ser testado com um usuário não-admin acessando o assistente de IA e verificando que apenas os modelos configurados aparecem no seletor.

**Acceptance Scenarios**:

1. **Given** o admin configurou 5 modelos de texto como visíveis, **When** um usuário acessa o seletor de modelo no assistente, **Then** ele vê exatamente esses 5 modelos
2. **Given** o admin configurou 3 modelos de imagem como visíveis, **When** um usuário acessa o modal de geração de imagem, **Then** ele vê exatamente esses 3 modelos
3. **Given** o sistema está carregando a lista de modelos, **When** a lista é exibida, **Then** não há requisição ao OpenRouter - os dados vêm do armazenamento local

---

### User Story 4 - Remoção da Seção "Modelos Recomendados" do Workspace (Priority: P2)

A seção "Modelos Recomendados" nas configurações do workspace é removida, simplificando a interface. A configuração de modelos visíveis agora é feita exclusivamente pelo admin no painel administrativo.

**Why this priority**: Esta é uma simplificação de UX que depende da implementação das histórias P1 - sem a configuração centralizada no admin, remover esta seção deixaria os usuários sem controle.

**Independent Test**: Pode ser testado acessando as configurações do workspace e verificando que a seção "Modelos Recomendados" não existe mais.

**Acceptance Scenarios**:

1. **Given** um usuário acessa as configurações de IA do workspace, **When** a página carrega, **Then** a seção "Modelos Recomendados" não é mais exibida
2. **Given** a seção foi removida, **When** o usuário navega pelas configurações de IA, **Then** apenas as configurações de modelos padrão permanecem

---

### Edge Cases

- Quando nenhum modelo de texto é configurado como visível, o sistema deve manter pelo menos um modelo padrão (fallback) para evitar que o assistente de IA fique inutilizável
- Quando nenhum modelo de imagem é configurado como visível, o botão/funcionalidade de geração de imagem deve ser ocultado ou desabilitado com mensagem explicativa
- Modelos que foram removidos do OpenRouter mas ainda estão na lista de visíveis devem ser automaticamente filtrados e sinalizados ao admin
- Se a sincronização com OpenRouter falhar durante a configuração do admin, deve exibir mensagem de erro e manter a configuração anterior

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE armazenar separadamente a lista de modelos de texto visíveis e modelos de imagem visíveis
- **FR-002**: Sistema DEVE exibir os preços dos modelos (input/output por 1M tokens) na interface de configuração do admin
- **FR-003**: Sistema DEVE buscar a lista de modelos disponíveis do OpenRouter apenas no painel admin, não na interface do usuário
- **FR-004**: Interface do usuário DEVE ler a lista de modelos visíveis do armazenamento local (banco de dados), não do OpenRouter
- **FR-005**: Sistema DEVE filtrar modelos de texto (output_modalities contém "text") dos modelos de imagem (output_modalities contém "image") automaticamente
- **FR-006**: Sistema DEVE remover a seção "Modelos Recomendados" das configurações de IA do workspace
- **FR-007**: Sistema DEVE manter cache dos modelos visíveis para otimizar performance
- **FR-008**: Administrador DEVE poder buscar/filtrar modelos por nome ou ID na interface de configuração
- **FR-009**: Sistema DEVE exibir contagem de modelos selecionados em cada lista
- **FR-010**: Sistema DEVE garantir que pelo menos um modelo de texto e um modelo de imagem permaneçam visíveis (prevenir configuração vazia)

### Key Entities

- **VisibleTextModels**: Lista de modelos de texto (LLM) que estão visíveis para usuários, armazenada com informações completas (id, nome, preços)
- **VisibleImageModels**: Lista de modelos de imagem que estão visíveis para usuários, armazenada com informações completas (id, nome, preços)
- **ModelInfo**: Informações do modelo incluindo id, nome, descrição, context_length, pricing_prompt, pricing_completion, output_modalities

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tempo de carregamento do seletor de modelos reduzido em pelo menos 50% (eliminando requisição externa ao OpenRouter)
- **SC-002**: Administradores podem configurar modelos visíveis em menos de 2 minutos
- **SC-003**: 100% dos usuários veem apenas os modelos configurados pelo admin (sem vazamento de modelos não-autorizados)
- **SC-004**: Interface de configuração do workspace simplificada - seção "Modelos Recomendados" removida completamente
- **SC-005**: Administradores conseguem visualizar preços de todos os modelos antes de selecionar

## Clarifications

### Session 2025-12-03

- Q: O que deve ser armazenado localmente - preços ou lista de modelos? → A: Apenas a lista de modelos visíveis com seus metadados. Preços são informativos apenas na tela do admin (vêm do OpenRouter em tempo real). O objetivo é eliminar chamadas ao OpenRouter na interface do usuário.

## Assumptions

- O sistema já possui infraestrutura para armazenar configurações no system_config (confirmado pela migration 016)
- A separação de modelos por output_modalities é confiável para distinguir modelos de texto vs. imagem
- Os preços dos modelos são exibidos em tempo real apenas na tela do admin (vindos do OpenRouter); não são armazenados localmente
- O campo workspace.available_models existente pode ser descontinuado após esta implementação
- Modelos visíveis armazenados incluem metadados básicos (id, nome) suficientes para exibição no seletor do usuário
