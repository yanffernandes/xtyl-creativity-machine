# Feature Specification: System Bugfixes - Pre-Launch Corrections

**Feature Branch**: `010-system-bugfixes`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Ajustes de vários pontos do sistema para colocar online - histórico de conversas não salvo, assets visuais aparecendo no kanban, histórico de atividades vazio, erro de acessibilidade no Dialog, sincronização de nome do projeto/cliente, email não exibido no perfil"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conversation History Persistence (Priority: P1)

O usuário inicia uma conversa com o assistente de IA, envia várias mensagens e depois fecha a janela. Ao retornar mais tarde, o usuário espera ver o histórico completo de todas as conversas anteriores ao clicar em "Histórico de Conversas".

**Why this priority**: Crítico para a experiência do usuário - perder contexto de conversas anteriores força o usuário a repetir informações, prejudicando a produtividade e a confiança no sistema.

**Independent Test**: Pode ser testado enviando mensagens no chat, fechando o navegador, reabrindo e verificando se as conversas aparecem no histórico.

**Acceptance Scenarios**:

1. **Given** o usuário enviou mensagens no chat, **When** o usuário clica em "Histórico de Conversas", **Then** todas as conversas anteriores são exibidas com data/hora e preview da mensagem.
2. **Given** o usuário está visualizando o histórico, **When** o usuário seleciona uma conversa, **Then** o contexto completo daquela conversa é carregado no chat.
3. **Given** o usuário iniciou uma nova conversa, **When** a conversa termina, **Then** ela é automaticamente salva e aparece no histórico.

---

### User Story 2 - Visual Assets Separate from Kanban (Priority: P1)

O usuário faz upload de imagens na seção "Assets Visuais" de um projeto. Esses assets são recursos de referência (logos, fotos, materiais) e NÃO devem aparecer como cards no Kanban, que é destinado apenas a documentos de trabalho (textos, criativos).

**Why this priority**: Bug funcional grave - assets aparecendo no Kanban polui a visualização de trabalho e confunde o fluxo de produção do usuário.

**Independent Test**: Fazer upload de uma imagem em Assets Visuais e verificar que ela NÃO aparece no Kanban.

**Acceptance Scenarios**:

1. **Given** o usuário está na seção Assets Visuais, **When** faz upload de uma imagem, **Then** a imagem aparece apenas em Assets Visuais e NÃO no Kanban.
2. **Given** o Kanban contém documentos de trabalho, **When** um asset visual é adicionado, **Then** a contagem e lista do Kanban permanecem inalteradas.
3. **Given** um asset visual existe, **When** o usuário abre o Kanban, **Then** apenas documentos (textos/criativos) são exibidos como cards.

---

### User Story 3 - Activity History Tracking (Priority: P2)

O usuário realiza diversas ações no sistema (criar documentos, editar, gerar imagens, etc.) e espera ver um registro dessas atividades no "Histórico de Atividades" para acompanhar o progresso e auditar o trabalho realizado.

**Why this priority**: Importante para transparência e rastreabilidade, mas não bloqueia o uso básico do sistema.

**Independent Test**: Realizar várias ações (criar documento, editar, gerar imagem) e verificar se aparecem no Histórico de Atividades.

**Acceptance Scenarios**:

1. **Given** o usuário criou um documento, **When** acessa o Histórico de Atividades, **Then** a ação "Documento criado" aparece com timestamp.
2. **Given** o usuário editou um documento, **When** acessa o Histórico de Atividades, **Then** a ação "Documento editado" aparece com detalhes.
3. **Given** o usuário gerou uma imagem via IA, **When** acessa o Histórico de Atividades, **Then** a ação de geração de imagem é registrada.

---

### User Story 4 - Project Name and Client Name Sync (Priority: P2)

O usuário acessa as configurações do projeto e altera o "Client Name". Como na prática o nome do projeto e o nome do cliente são a mesma informação (o projeto representa o cliente), o nome do projeto deve ser atualizado automaticamente para refletir o Client Name.

**Why this priority**: Evita confusão e duplicação de informação, mas não impede o uso do sistema.

**Independent Test**: Alterar o Client Name nas configurações e verificar se o nome do projeto é atualizado na sidebar e header.

**Acceptance Scenarios**:

1. **Given** o usuário está nas configurações do projeto, **When** altera o Client Name e salva, **Then** o nome do projeto na sidebar é atualizado imediatamente.
2. **Given** o Client Name foi alterado, **When** o usuário navega para outro projeto e volta, **Then** o nome do projeto reflete o Client Name salvo.
3. **Given** o projeto foi criado sem Client Name, **When** o usuário define o Client Name pela primeira vez, **Then** o nome do projeto é sincronizado.

---

### User Story 5 - Dialog Accessibility Fix (Priority: P2)

O sistema exibe um erro de acessibilidade no console relacionado ao CommandPalette (Command+K): "DialogContent requires a DialogTitle for screen reader users". Isso impacta usuários que dependem de leitores de tela e viola padrões de acessibilidade.

**Why this priority**: Importante para conformidade com acessibilidade (WCAG), mas não impede o uso funcional para a maioria dos usuários.

**Independent Test**: Abrir o DevTools, acionar Command+K e verificar que nenhum warning de acessibilidade aparece no console.

**Acceptance Scenarios**:

1. **Given** o usuário abre o CommandPalette (Cmd+K), **When** o dialog é renderizado, **Then** nenhum warning de acessibilidade aparece no console.
2. **Given** um usuário utiliza leitor de tela, **When** o CommandPalette é aberto, **Then** o título do dialog é anunciado corretamente.

---

### User Story 6 - Profile Email Display (Priority: P3)

O usuário acessa a tela "Meu Perfil" para visualizar suas informações de conta. O email do usuário não está sendo exibido, mesmo que esteja armazenado no sistema.

**Why this priority**: Informação básica de perfil, mas não impede o uso do sistema.

**Independent Test**: Acessar a tela Meu Perfil e verificar se o email do usuário logado é exibido.

**Acceptance Scenarios**:

1. **Given** o usuário está logado, **When** acessa a tela Meu Perfil, **Then** o email da conta é exibido claramente.
2. **Given** o email do usuário contém caracteres especiais, **When** é exibido no perfil, **Then** é renderizado corretamente sem encoding.

---

### Edge Cases

- O que acontece quando o histórico de conversas tem centenas de entradas? (Usar scroll infinito - carrega mais conversas ao rolar para baixo)
- O que acontece quando um asset visual muito grande é carregado? (Deve ser tratado sem aparecer no Kanban)
- O que acontece quando o Client Name é limpo/vazio? (O nome do projeto deve manter um valor padrão ou o último nome válido)
- O que acontece quando o usuário não tem email associado (login social sem email)? (Exibir mensagem "Email não disponível")

## Requirements *(mandatory)*

### Functional Requirements

**Histórico de Conversas:**
- **FR-001**: Sistema DEVE salvar cada mensagem de conversa no banco de dados com referência ao projeto e usuário.
- **FR-002**: Sistema DEVE exibir lista de conversas anteriores ordenadas por data (mais recente primeiro).
- **FR-003**: Sistema DEVE permitir ao usuário selecionar e carregar uma conversa anterior.

**Assets Visuais vs Kanban:**
- **FR-004**: Sistema DEVE distinguir entre "assets visuais" (uploads de referência) e "documentos" (conteúdo de trabalho).
- **FR-005**: Sistema NÃO DEVE exibir assets visuais como cards no Kanban.
- **FR-006**: Sistema DEVE exibir apenas documentos de trabalho no Kanban.

**Histórico de Atividades:**
- **FR-007**: Sistema DEVE registrar ações do usuário (criar, editar, deletar, gerar) em um log de atividades.
- **FR-008**: Sistema DEVE exibir o histórico de atividades com descrição da ação, timestamp e usuário.

**Sincronização Project Name / Client Name:**
- **FR-009**: Sistema DEVE atualizar o nome do projeto quando o Client Name for alterado nas configurações.
- **FR-010**: Sistema DEVE refletir a mudança de nome imediatamente na sidebar e header do projeto.

**Acessibilidade do Dialog:**
- **FR-011**: Sistema DEVE incluir DialogTitle (visível ou oculto) em todos os Dialog/CommandDialog para conformidade com acessibilidade.

**Exibição de Email no Perfil:**
- **FR-012**: Sistema DEVE exibir o email do usuário na tela Meu Perfil.
- **FR-013**: Sistema DEVE exibir mensagem apropriada quando email não está disponível.

### Key Entities

- **ChatConversation**: Representa uma sessão de conversa com o assistente de IA, contendo mensagens, projeto associado, usuário e timestamps.
- **ChatMessage**: Mensagem individual dentro de uma conversa, com role (user/assistant), conteúdo e timestamp.
- **VisualAsset**: Arquivo de imagem/recurso visual de referência, distinto de Document (conteúdo de trabalho).
- **ActivityLog**: Registro de ação do usuário com tipo de ação, entidade afetada, timestamp e detalhes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das conversas enviadas são recuperáveis no Histórico de Conversas após recarregar a página.
- **SC-002**: 0% dos assets visuais aparecem como cards no Kanban.
- **SC-003**: 100% das ações principais (criar, editar, deletar documento/imagem) são registradas no Histórico de Atividades.
- **SC-004**: Alterar Client Name atualiza o nome do projeto em menos de 1 segundo na interface.
- **SC-005**: 0 warnings de acessibilidade relacionados a DialogTitle no console do navegador.
- **SC-006**: Email do usuário é exibido corretamente na tela Meu Perfil para 100% dos usuários com email cadastrado.

## Clarifications

### Session 2025-11-29

- Q: Qual estratégia de carregamento usar para o histórico de conversas quando houver muitas entradas? → A: Scroll infinito (carrega mais ao rolar para baixo)

## Assumptions

- O sistema já possui infraestrutura de banco de dados para persistir dados.
- O Supabase Auth já fornece o email do usuário autenticado.
- A distinção entre asset visual e documento pode ser feita por tipo de arquivo ou flag específica.
- O CommandPalette utiliza componentes Radix UI Dialog que suportam VisuallyHidden para títulos ocultos.
