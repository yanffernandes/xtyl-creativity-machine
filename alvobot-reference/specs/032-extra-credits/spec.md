# Feature Specification: Sistema de Créditos Extras

**Feature Branch**: `031-extra-credits`
**Created**: 2026-01-22
**Status**: Draft
**Input**: Sistema de créditos extras/avulsos que permite usuários comprarem créditos adicionais além da assinatura mensal, com consumo prioritário dos créditos do plano antes dos extras.

## Visão Geral

Este sistema permite que usuários adquiram créditos extras (avulsos) além dos créditos mensais incluídos em sua assinatura. Os créditos extras funcionam como um "banco de créditos" que só é consumido após o esgotamento dos créditos mensais do plano. Administradores podem gerenciar, visualizar e adicionar créditos extras para qualquer usuário.

## Clarifications

### Session 2026-01-22

- Q: Como funciona a expiração de créditos - por transação ou individualmente? → A: Expiração por transação (cada adição de créditos é um "pacote" com sua própria data de validade), com opção de créditos sem expiração (permanentes).
- Q: Qual a ordem de consumo entre múltiplas transações de créditos extras? → A: FIFO por expiração - créditos que expiram primeiro são consumidos primeiro, permanentes por último.
- Q: Existe limite máximo de créditos extras por usuário? → A: Não, sem limite. Usuário pode acumular qualquer quantidade.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrador Adiciona Créditos Extras (Priority: P1)

Um administrador do sistema precisa adicionar créditos extras para um usuário específico, seja como cortesia, compensação por problemas, ou venda manual de pacotes de créditos.

**Why this priority**: Esta é a funcionalidade core que habilita todo o sistema de créditos extras. Sem ela, não há como créditos extras existirem no sistema.

**Independent Test**: Pode ser totalmente testado acessando o painel admin, selecionando um usuário e adicionando créditos. O saldo de créditos extras do usuário deve aumentar imediatamente.

**Acceptance Scenarios**:

1. **Given** o administrador está na página de gerenciamento de usuários, **When** ele clica em "Adicionar Créditos" para um usuário, **Then** um modal é exibido solicitando quantidade e motivo
2. **Given** o modal de adição de créditos está aberto, **When** o admin informa 100 créditos com motivo "Cortesia suporte", **Then** os créditos são adicionados e uma transação é registrada
3. **Given** créditos foram adicionados, **When** o admin visualiza o histórico do usuário, **Then** a transação aparece com data, quantidade, motivo e nome do admin que executou

---

### User Story 2 - Usuário Visualiza Saldo de Créditos Extras (Priority: P1)

Um usuário autenticado deseja ver quantos créditos extras ele possui disponíveis, separadamente dos créditos mensais do plano.

**Why this priority**: O usuário precisa ter visibilidade do seu saldo para entender seu poder de compra e planejar seu uso.

**Independent Test**: Pode ser testado fazendo login como usuário e acessando a página de créditos/financeiro. Os créditos extras devem aparecer separados dos créditos do plano.

**Acceptance Scenarios**:

1. **Given** o usuário está logado e tem créditos extras, **When** ele acessa a página de créditos, **Then** ele vê seu saldo de créditos extras separado dos créditos mensais
2. **Given** o usuário não tem créditos extras, **When** ele acessa a página de créditos, **Then** ele vê "0 créditos extras" e informação sobre como obter mais
3. **Given** o usuário tem histórico de transações, **When** ele acessa a página de créditos, **Then** ele pode ver o histórico de adições e consumos de créditos extras

---

### User Story 3 - Sistema Consome Créditos na Ordem Correta (Priority: P1)

Quando o usuário realiza uma ação que consome créditos, o sistema deve primeiro consumir os créditos mensais do plano. Somente quando estes se esgotam, os créditos extras começam a ser consumidos.

**Why this priority**: Esta é a regra de negócio fundamental que define o comportamento do sistema. Sem ela, o sistema não atende ao requisito do cliente.

**Independent Test**: Pode ser testado criando um usuário com poucos créditos mensais restantes e alguns créditos extras, executando ações que consomem créditos e verificando qual saldo é decrementado primeiro.

**Acceptance Scenarios**:

1. **Given** usuário tem 10 créditos mensais e 50 extras, **When** consome 5 créditos, **Then** fica com 5 mensais e 50 extras
2. **Given** usuário tem 5 créditos mensais e 50 extras, **When** consome 10 créditos, **Then** fica com 0 mensais e 45 extras
3. **Given** usuário tem 0 créditos mensais e 50 extras, **When** consome 10 créditos, **Then** fica com 0 mensais e 40 extras
4. **Given** usuário tem 0 mensais e 0 extras, **When** tenta consumir créditos, **Then** a ação é bloqueada com mensagem apropriada

---

### User Story 4 - Admin Visualiza Dashboard de Créditos (Priority: P2)

Um administrador precisa ter uma visão geral do uso de créditos extras no sistema: total distribuído, total consumido, usuários com mais créditos, etc.

**Why this priority**: Importante para gestão e auditoria, mas não bloqueia a funcionalidade principal.

**Independent Test**: Pode ser testado acessando a página de dashboard admin de créditos e verificando se as métricas são exibidas corretamente.

**Acceptance Scenarios**:

1. **Given** existem transações de créditos extras no sistema, **When** o admin acessa o dashboard, **Then** ele vê total de créditos distribuídos, consumidos e saldo geral
2. **Given** o admin está no dashboard, **When** ele busca por um usuário específico, **Then** ele vê o saldo e histórico de créditos daquele usuário
3. **Given** o admin está visualizando a lista de usuários, **When** ele ordena por créditos extras, **Then** a lista é ordenada pelo saldo de créditos extras

---

### User Story 5 - Créditos Extras com Expiração Opcional (Priority: P3)

Administradores podem definir uma data de expiração ao adicionar créditos extras. Créditos expirados não podem ser consumidos.

**Why this priority**: Funcionalidade avançada que adiciona controle, mas o sistema funciona sem ela.

**Independent Test**: Pode ser testado adicionando créditos com expiração, avançando a data do sistema e verificando que os créditos não podem mais ser usados.

**Acceptance Scenarios**:

1. **Given** admin está adicionando créditos, **When** ele define uma data de expiração, **Then** os créditos são criados com essa data limite
2. **Given** usuário tem créditos que expiram hoje, **When** ele tenta usar após meia-noite, **Then** esses créditos não são considerados no saldo disponível
3. **Given** usuário tem créditos expirados, **When** ele visualiza seu saldo, **Then** os créditos expirados aparecem separadamente como "expirados"

---

### Edge Cases

- O que acontece quando uma ação consome mais créditos do que o usuário tem (mensais + extras)? Sistema bloqueia a ação antes de iniciar.
- O que acontece se créditos extras expiram durante uma operação em andamento? A operação já iniciada deve completar (créditos são reservados no início).
- Como lidar com estornos de créditos? O sistema deve permitir adicionar créditos negativos (débito) com registro de motivo.
- O que acontece no ciclo de renovação mensal? Apenas os créditos mensais são renovados; créditos extras permanecem inalterados.
- O que acontece se o usuário cancela a assinatura? Créditos extras permanecem disponíveis até expirarem ou serem consumidos.

## Requirements *(mandatory)*

### Functional Requirements

#### Gestão de Créditos Extras (Admin)

- **FR-001**: Sistema DEVE permitir que administradores adicionem créditos extras a qualquer usuário
- **FR-002**: Sistema DEVE registrar quem adicionou os créditos, quando, quantidade e motivo
- **FR-003**: Sistema DEVE permitir adicionar créditos com data de expiração opcional (cada transação é um "pacote" independente; créditos sem data de expiração são permanentes)
- **FR-004**: Sistema DEVE permitir visualizar o histórico completo de transações de créditos de um usuário
- **FR-005**: Sistema DEVE exibir um dashboard com métricas agregadas de créditos extras (total distribuído, consumido, saldo)
- **FR-006**: Sistema DEVE permitir buscar e filtrar usuários por saldo de créditos extras
- **FR-007**: Sistema DEVE permitir adicionar créditos negativos (débito) para estornos, com registro de motivo

#### Consumo de Créditos

- **FR-008**: Sistema DEVE consumir primeiro os créditos mensais do plano antes dos créditos extras
- **FR-009**: Sistema DEVE verificar saldo total (mensais + extras) antes de permitir ações que consomem créditos
- **FR-010**: Sistema DEVE registrar cada consumo de crédito extra como uma transação separada
- **FR-011**: Sistema DEVE bloquear ações quando saldo total é insuficiente, com mensagem clara
- **FR-012**: Sistema DEVE ignorar créditos extras expirados no cálculo de saldo disponível
- **FR-012.1**: Sistema DEVE consumir primeiro créditos extras com expiração mais próxima (FIFO por data de expiração), deixando créditos permanentes por último

#### Visualização do Usuário

- **FR-013**: Sistema DEVE exibir saldo de créditos extras separadamente dos créditos mensais
- **FR-014**: Sistema DEVE exibir histórico de transações de créditos extras do usuário
- **FR-015**: Sistema DEVE indicar claramente quais créditos têm data de expiração e quando expiram
- **FR-016**: Sistema DEVE mostrar créditos expirados separadamente (para referência histórica)

#### Renovação e Ciclo

- **FR-017**: Sistema NÃO DEVE alterar créditos extras durante a renovação mensal do plano
- **FR-018**: Sistema DEVE manter créditos extras mesmo se usuário cancelar assinatura
- **FR-019**: Sistema DEVE aplicar expiração de créditos automaticamente (job diário ou verificação em tempo real)

### Key Entities

- **Credit Transaction**: Representa uma transação de crédito extra (adição, consumo ou expiração). Atributos: usuário, tipo de transação, quantidade, saldo antes/depois, motivo, data de expiração opcional (null = permanente), admin que executou, operação relacionada. Cada transação de adição é um "pacote" independente com seu próprio saldo restante e expiração.
- **User Credits Summary**: Representa o saldo consolidado de um usuário. Atributos: créditos mensais, créditos extras disponíveis, créditos extras expirados, total disponível.
- **Admin Action Log**: Registro de auditoria de ações administrativas relacionadas a créditos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administradores conseguem adicionar créditos extras a um usuário em menos de 30 segundos
- **SC-002**: Usuários conseguem visualizar seu saldo de créditos extras em menos de 2 cliques a partir do menu principal
- **SC-003**: 100% das transações de consumo seguem a regra de prioridade (mensais primeiro, depois extras)
- **SC-004**: Todas as transações de créditos extras são registradas com auditoria completa (quem, quando, quanto, por quê)
- **SC-005**: Créditos expirados são automaticamente excluídos do saldo disponível em até 1 hora após expiração
- **SC-006**: O dashboard admin carrega métricas agregadas de créditos em menos de 3 segundos
- **SC-007**: 100% dos estornos/débitos são registrados com motivo obrigatório

## Assumptions

- A tabela `credit_transactions` existente será adaptada/utilizada para armazenar as transações de créditos extras
- O campo `transaction_type` diferenciará entre créditos do plano e créditos extras
- A view `user_credits_summary` será atualizada para incluir cálculo de créditos extras
- Administradores já possuem sistema de autenticação e permissões (AdminUsersPage já existe)
- A página de créditos do usuário será adicionada à área de configurações/financeiro existente
- Não há limite máximo de créditos extras por usuário (controle feito via processo de aprovação de quem pode adicionar)

## Out of Scope

- Compra de créditos pelo próprio usuário via pagamento online (futuro)
- Transferência de créditos entre usuários
- Conversão de créditos extras em créditos mensais ou vice-versa
- Notificações por email sobre créditos (pode ser adicionado posteriormente)
- API pública para gestão de créditos (apenas interface admin)
