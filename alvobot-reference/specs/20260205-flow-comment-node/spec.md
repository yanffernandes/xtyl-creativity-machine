# Feature Specification: Comment Node & Flow Name Display

**Feature Branch**: `20260205-flow-comment-node`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Add a comment node type to flow editor and show flow name in call flow block"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Comment Node to Flow (Priority: P1)

Um usuário do editor de fluxos quer adicionar anotações visuais dentro do seu fluxo para documentar a lógica, deixar lembretes para si mesmo ou para outros membros da equipe que possam ver o fluxo. O nó de comentário não faz parte da execução do fluxo - é apenas uma ferramenta de documentação visual.

**Why this priority**: Comentários são essenciais para manter fluxos complexos organizados e compreensíveis. Sem isso, fluxos grandes se tornam difíceis de entender e manter.

**Independent Test**: Pode ser testado criando um fluxo, adicionando um nó de comentário, editando seu texto, e verificando que ele aparece no canvas mas não afeta a execução.

**Acceptance Scenarios**:

1. **Given** o editor de fluxos aberto, **When** o usuário arrasta o nó "Comentário" do dock para o canvas, **Then** um nó de comentário aparece no canvas com texto padrão "Comentário"
2. **Given** um nó de comentário no canvas, **When** o usuário clica para editar, **Then** a sidebar abre permitindo editar o texto do comentário
3. **Given** um nó de comentário no canvas, **When** o usuário tenta conectar uma edge a ele, **Then** a conexão não é permitida (nó não tem handles de entrada/saída)
4. **Given** um fluxo com nó de comentário salvo, **When** o fluxo é executado, **Then** o nó de comentário é ignorado e não afeta a execução

---

### User Story 2 - View Flow Name in Call Flow Node (Priority: P1)

Um usuário que usa nós "Chamar Fluxo" para conectar múltiplos fluxos quer ver o nome do fluxo selecionado diretamente no card do nó, em vez de apenas o ID (UUID), para entender rapidamente qual fluxo será chamado sem precisar abrir o editor.

**Why this priority**: Exibir o ID (UUID) é confuso e não dá contexto. O nome do fluxo é a informação que o usuário precisa para entender o fluxo visual.

**Independent Test**: Pode ser testado criando um nó "Chamar Fluxo", selecionando um fluxo existente, e verificando que o nome aparece no card.

**Acceptance Scenarios**:

1. **Given** um nó "Chamar Fluxo" com um fluxo selecionado, **When** o nó é renderizado no canvas, **Then** o card exibe "Executar: [Nome do Fluxo]" em vez do UUID
2. **Given** um nó "Chamar Fluxo" sem fluxo selecionado, **When** o nó é renderizado, **Then** o card exibe "Executar: Nenhum fluxo"
3. **Given** um nó "Chamar Fluxo" onde o fluxo referenciado foi deletado, **When** o nó é renderizado, **Then** o card exibe o ID (fallback) com indicação visual de erro

---

### Edge Cases

- O que acontece quando o texto do comentário é muito longo? Truncar visualmente no card, mostrar completo no hover/edição
- O que acontece quando um fluxo referenciado no "Chamar Fluxo" é deletado? Mostrar ID com indicação de erro
- O que acontece quando o usuário cola texto com formatação especial no comentário? Aceitar apenas texto puro
- Como o nó de comentário se comporta na validação do fluxo? Ignorado na validação (não gera erros)

## Requirements *(mandatory)*

### Functional Requirements

**Comment Node:**
- **FR-001**: Sistema DEVE adicionar um novo tipo de nó "comment" ao editor de fluxos
- **FR-002**: O nó de comentário DEVE ser adicionável via dock (drag) ou clique
- **FR-003**: O nó de comentário NÃO DEVE ter handles de conexão (entrada ou saída)
- **FR-004**: O nó de comentário DEVE permitir edição de texto multiline
- **FR-005**: O nó de comentário DEVE ser movível, selecionável e deletável como outros nós
- **FR-006**: O nó de comentário DEVE ser persistido no JSON do fluxo
- **FR-007**: O nó de comentário DEVE ser ignorado durante a execução do fluxo
- **FR-008**: O nó de comentário DEVE ser ignorado na validação do fluxo (não gera erros)

**Call Flow Node - Flow Name Display:**
- **FR-009**: O nó "Chamar Fluxo" DEVE exibir o nome do fluxo selecionado no card
- **FR-010**: Quando nenhum fluxo está selecionado, DEVE exibir "Nenhum fluxo"
- **FR-011**: Quando o fluxo referenciado não existe mais, DEVE exibir o ID com indicação visual de erro

### Key Entities

- **CommentNodeData**: Representa os dados de um nó de comentário
  - `type`: sempre "comment"
  - `text`: texto do comentário (string)

- **CallFlowNodeData** (extensão): Adicionar campo `flowName` para cache do nome do fluxo selecionado

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários podem adicionar nós de comentário em menos de 3 segundos (arrastar do dock)
- **SC-002**: 100% dos nós "Chamar Fluxo" exibem nome do fluxo em vez de UUID
- **SC-003**: Nós de comentário não afetam a execução do fluxo (0 impacto no processamento)
- **SC-004**: Fluxos existentes continuam funcionando sem modificação (retrocompatibilidade)

## Assumptions

- O editor de fluxos usa XYFlow (React Flow) como biblioteca de visualização
- O sistema de persistência já suporta novos tipos de nó sem migração de banco
- A lista de fluxos disponíveis já é carregada no editor (para resolver nomes)
- O design visual do nó de comentário deve seguir o design system existente (cores sóbrias, Lucide icons)
