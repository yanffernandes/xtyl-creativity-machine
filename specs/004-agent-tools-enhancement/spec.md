# Feature Specification: Melhoria do Sistema de Ferramentas do Assistente IA

**Feature Branch**: `004-agent-tools-enhancement`
**Created**: 2025-11-26
**Status**: Completed
**Completed**: 2025-11-28
**Note**: This feature has been implemented. For current architecture details, see `007-hybrid-supabase-architecture`.
**Input**: User description: "Melhoria do sistema de ferramentas do assistente IA com execução automática, lista de tarefas visual e novas tools"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modo Autônomo com Toggle Expandido (Priority: P1)

O usuário quer que o assistente execute todas as ações necessárias automaticamente, sem precisar aprovar cada ferramenta individualmente. O toggle atual "Aplicar edições automaticamente" será expandido para cobrir todas as ferramentas, não apenas edições de documentos.

**Why this priority**: Esta é a funcionalidade principal que permite ao assistente trabalhar de forma mais autônoma e eficiente, reduzindo significativamente a fricção do usuário.

**Independent Test**: Pode ser testado ativando o toggle e pedindo ao assistente para executar múltiplas ações em sequência - todas devem executar sem interrupção.

**Acceptance Scenarios**:

1. **Given** o toggle "Modo Autônomo" está ativado, **When** o assistente precisa criar um documento, **Then** a criação acontece automaticamente sem pedir aprovação
2. **Given** o toggle "Modo Autônomo" está ativado, **When** o assistente precisa executar múltiplas ferramentas (criar pasta, criar documento, mover arquivo), **Then** todas executam em sequência automaticamente
3. **Given** o toggle "Modo Autônomo" está desativado, **When** o assistente tenta usar uma ferramenta, **Then** o sistema pede aprovação do usuário antes de executar
4. **Given** o toggle muda de estado durante uma conversa, **When** o assistente executa a próxima ferramenta, **Then** o novo estado é respeitado imediatamente

---

### User Story 2 - Lista de Tarefas Visual (Priority: P1)

Antes de executar ações complexas, o assistente exibe uma lista de tarefas planejadas no chat, mostrando o que pretende fazer. Conforme executa, marca cada item como concluído, dando visibilidade ao progresso.

**Why this priority**: Aumenta a transparência e confiança do usuário, permitindo entender o que o assistente está fazendo mesmo no modo autônomo.

**Independent Test**: Pode ser testado pedindo ao assistente para fazer uma tarefa complexa (ex: "crie uma pasta Ideias e dentro crie 3 documentos") - deve aparecer a lista antes de executar.

**Acceptance Scenarios**:

1. **Given** o usuário faz uma solicitação complexa, **When** o assistente analisa a tarefa, **Then** uma lista de tarefas planejadas aparece no chat antes da execução
2. **Given** a lista de tarefas está visível, **When** o assistente completa uma tarefa, **Then** ela é marcada como concluída visualmente com animação
3. **Given** uma tarefa falha durante a execução, **When** o erro ocorre, **Then** a tarefa é marcada como falha com mensagem explicativa
4. **Given** o assistente está executando tarefas, **When** o usuário visualiza o chat, **Then** pode ver em tempo real qual tarefa está em progresso

---

### User Story 3 - Aumento do Limite de Iterações (Priority: P2)

O limite atual de 5 iterações é aumentado para permitir tarefas mais complexas que requerem múltiplas ações sequenciais.

**Why this priority**: Permite que o assistente complete tarefas mais complexas sem interrupção, melhorando a experiência do usuário.

**Independent Test**: Pode ser testado solicitando uma tarefa que requer mais de 5 ações - o assistente deve completar sem atingir o limite prematuramente.

**Acceptance Scenarios**:

1. **Given** o assistente precisa executar 10 ações sequenciais, **When** executa todas as ações, **Then** completa sem atingir limite de iterações
2. **Given** o assistente atinge o novo limite configurado, **When** o limite é atingido, **Then** uma mensagem clara informa o usuário e oferece opção de continuar
3. **Given** uma tarefa requer muitas iterações, **When** o assistente detecta loop potencial, **Then** protege contra loops infinitos e alerta o usuário

---

### User Story 4 - Ferramenta de Renomear Documento (Priority: P2)

O usuário pode pedir ao assistente para renomear documentos existentes através de linguagem natural.

**Why this priority**: Ferramenta básica de organização que complementa as funcionalidades existentes de criar e editar documentos.

**Independent Test**: Pode ser testado pedindo "renomeie o documento X para Y" - o documento deve ser renomeado.

**Acceptance Scenarios**:

1. **Given** um documento existe no projeto, **When** o usuário pede para renomeá-lo, **Then** o assistente usa a ferramenta rename e o documento aparece com o novo nome
2. **Given** o usuário tenta renomear para um nome já existente, **When** a ação é tentada, **Then** o assistente informa o conflito e sugere alternativas

---

### User Story 5 - Ferramenta de Criar Imagem Vinculada (Priority: P2)

Quando o assistente cria uma imagem, ela pode ser automaticamente anexada ao documento que está sendo editado ou a um documento especificado.

**Why this priority**: Integração natural entre geração de imagem e documentos, evitando passos manuais de vinculação.

**Independent Test**: Pode ser testado pedindo "crie uma imagem de um gato e anexe ao documento atual" - a imagem deve aparecer vinculada.

**Acceptance Scenarios**:

1. **Given** o usuário está editando um documento, **When** pede para criar uma imagem, **Then** o assistente oferece opção de anexar automaticamente ao documento
2. **Given** o modo autônomo está ativado e o usuário pede imagem para o documento, **When** a imagem é gerada, **Then** é automaticamente anexada sem aprovação adicional
3. **Given** uma imagem foi criada, **When** o usuário especifica um documento destino, **Then** a imagem é anexada ao documento especificado

---

### User Story 6 - Visualização de Execução de Ferramentas (Priority: P3)

Mesmo no modo autônomo, o usuário pode ver quais ferramentas estão sendo executadas em tempo real no chat, com indicadores visuais de progresso e conclusão.

**Why this priority**: Mantém a transparência mesmo quando ações são automáticas, permitindo que o usuário acompanhe o que está acontecendo.

**Independent Test**: Pode ser testado ativando modo autônomo e observando os indicadores visuais durante execução de múltiplas ferramentas.

**Acceptance Scenarios**:

1. **Given** o modo autônomo está ativado, **When** uma ferramenta é executada, **Then** um card de execução aparece mostrando nome, status e duração
2. **Given** múltiplas ferramentas estão sendo executadas, **When** o usuário olha o chat, **Then** vê todas as execuções com seus respectivos status
3. **Given** uma ferramenta falhou, **When** a falha ocorre, **Then** o card mostra erro com mensagem explicativa

---

### Edge Cases

- Quando o toggle é desativado no meio de uma sequência: sistema termina a tarefa atual e pede aprovação para as próximas
- Se uma ferramenta falha no meio de uma lista: tenta novamente 1x, se falhar de novo pausa e pergunta ao usuário se deve continuar
- O que acontece se o usuário fechar o chat durante uma execução em andamento?
- Timeout de ferramentas: 60s padrão com indicador de progresso e botão cancelar; geração de imagem tem 120s devido à natureza da operação
- O que acontece quando o assistente tenta acessar/modificar um documento que foi deletado por outro usuário?

## Requirements *(mandatory)*

### Functional Requirements

#### Modo Autônomo
- **FR-001**: Sistema DEVE ter um toggle "Modo Autônomo" que substitui o atual "Aplicar edições automaticamente"
- **FR-002**: Quando ativado, todas as ferramentas DEVEM executar sem solicitar aprovação individual
- **FR-003**: Quando desativado, sistema DEVE manter comportamento atual de solicitar aprovação para cada ferramenta
- **FR-004**: Toggle DEVE persistir estado globalmente por usuário (mesmo valor em todos os workspaces/projetos)

#### Lista de Tarefas
- **FR-005**: Sistema DEVE exibir lista de tarefas planejadas antes de executar ações complexas (2+ ações)
- **FR-006**: Cada tarefa na lista DEVE mostrar: descrição, status (pendente/executando/concluída/falha)
- **FR-007**: Atualização de status DEVE ocorrer em tempo real via streaming
- **FR-008**: Lista de tarefas DEVE ser exibida de forma visualmente distinta das mensagens normais

#### Limite de Iterações
- **FR-009**: Limite de iterações DEVE ser configurável (padrão: 15 iterações)
- **FR-010**: Sistema DEVE detectar e prevenir loops infinitos mesmo dentro do limite
- **FR-011**: Ao atingir limite, sistema DEVE informar usuário e oferecer opção de continuar

#### Novas Ferramentas
- **FR-012**: Sistema DEVE ter ferramenta `rename_document` para renomear documentos
- **FR-013**: Sistema DEVE ter ferramenta `rename_folder` para renomear pastas
- **FR-014**: Sistema DEVE ter ferramenta `get_folder_contents` para listar conteúdo de uma pasta específica (documentos e subpastas)
- **FR-015**: Ferramenta de geração de imagem DEVE ter parâmetro opcional para anexar a documento
- **FR-016**: Sistema DEVE manter ferramentas existentes funcionando: read, edit, create, delete, list, search, web_search, move_file, move_folder

#### Visualização de Execução
- **FR-017**: Execução de cada ferramenta DEVE ser visível no chat com indicador de status
- **FR-018**: Cards de execução DEVEM mostrar: nome da ferramenta, argumentos resumidos, status, duração
- **FR-019**: Erros de execução DEVEM ser exibidos de forma clara e compreensível
- **FR-020**: Ferramentas DEVEM ter timeout de 60s padrão com indicador de progresso e opção de cancelar
- **FR-021**: Geração de imagem DEVE ter timeout estendido de 120s devido à natureza da operação

### Key Entities

- **TaskList**: Representa a lista de tarefas planejadas pelo assistente (tarefas, status de cada uma, ordem de execução)
- **ToolExecution**: Registro de execução de uma ferramenta (ferramenta, argumentos, resultado, duração, status)
- **UserPreferences**: Configurações do usuário (modo autônomo ativado/desativado, persistido por usuário)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários em modo autônomo completam tarefas complexas 60% mais rápido (redução de cliques de aprovação)
- **SC-002**: 80% dos usuários conseguem entender o progresso de uma tarefa através da lista de tarefas visual
- **SC-003**: Assistente consegue completar tarefas que requerem até 15 iterações sem interrupção
- **SC-004**: Tempo médio para criar documento com imagem anexada reduz em 40% (comparado ao processo manual)
- **SC-005**: 95% das execuções de ferramentas mostram status visual em menos de 500ms após início
- **SC-006**: Taxa de abandono de tarefas complexas reduz em 30% (usuários não desistem por excesso de aprovações)

## Clarifications

### Session 2025-11-26

- Q: O que acontece quando o toggle é desativado no meio de uma sequência de execuções automáticas? → A: Termina a tarefa atual e pede aprovação para as próximas
- Q: Quais novas ferramentas devem ser adicionadas além de rename_document? → A: rename_document, rename_folder, get_folder_contents
- Q: Como o sistema se comporta se uma ferramenta falha no meio de uma lista de tarefas? → A: Tenta novamente 1x; se falhar de novo, pausa e pergunta se deve continuar com as próximas
- Q: Como lidar com timeout de ferramentas demoradas? → A: Timeout de 60s padrão com indicador de progresso e opção de cancelar; geração de imagem tem timeout estendido (120s) devido à natureza da operação
- Q: Onde persistir o estado do toggle "Modo Autônomo"? → A: Global por usuário (mesmo valor em todos os workspaces/projetos)

## Assumptions

- O sistema atual já possui infraestrutura de streaming SSE funcionando
- As ferramentas existentes (read_document, edit_document, etc.) continuam com a mesma interface
- O limite de iterações é uma proteção, não uma limitação de design - tarefas legítimas não devem atingi-lo frequentemente
- Usuários entendem que modo autônomo significa menos controle mas mais velocidade
- A lista de tarefas é gerada pelo próprio LLM como parte do planejamento
