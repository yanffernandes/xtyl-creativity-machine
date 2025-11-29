# Feature Specification: Workflow Visual Redesign

**Feature Branch**: `005-workflow-visual-redesign`
**Created**: 2025-11-27
**Status**: Completed
**Completed**: 2025-11-28
**Note**: This feature has been implemented. For current architecture details, see `007-hybrid-supabase-architecture`.
**Input**: User description: "Revisar e otimizar a tela de workflows com visual liquid glass, nós horizontais, workflows dentro de projetos, separação clara de templates vs workflows do usuário"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação para Workflows de um Projeto (Priority: P1)

O usuário acessa a área de workflows diretamente dentro de um projeto específico. Ao entrar em um projeto, existe uma aba ou seção dedicada que mostra todos os workflows associados àquele projeto. O usuário pode criar novos workflows, executar workflows existentes, ou duplicar templates para usar no projeto.

**Why this priority**: Workflows devem ser contextualizados dentro de projetos para manter organização e permitir fluxos de trabalho integrados com o Kanban, documentos e assets do projeto.

**Independent Test**: Pode ser testado navegando para um projeto e verificando que a seção de workflows está acessível e funcional, permitindo criar e executar workflows dentro do contexto do projeto.

**Acceptance Scenarios**:

1. **Given** o usuário está na página de um projeto, **When** clica na aba/seção de Workflows, **Then** vê uma lista de todos os workflows associados a este projeto
2. **Given** o usuário está na seção de workflows do projeto, **When** clica em "Novo Workflow", **Then** pode escolher entre criar do zero ou duplicar um template
3. **Given** o usuário tem workflows no projeto, **When** visualiza a lista, **Then** vê claramente o status, última execução e ações disponíveis para cada workflow

---

### User Story 2 - Visual Liquid Glass Consistente (Priority: P1)

A tela de workflows (builder/editor) segue o mesmo padrão visual da tela de projetos: barras laterais flutuantes com efeito liquid glass, cantos arredondados, e espaçamento que não encosta nas bordas da tela. Todos os componentes visuais (modais, seletores, painéis) seguem a mesma linguagem visual.

**Why this priority**: Consistência visual é essencial para uma experiência de usuário profissional e coesa. O design system já está estabelecido na tela de projetos e deve ser replicado.

**Independent Test**: Pode ser testado visualmente comparando a tela de workflows com a tela de projetos e verificando que os mesmos padrões de glassmorphism estão aplicados.

**Acceptance Scenarios**:

1. **Given** o usuário está no editor de workflows, **When** observa as barras laterais (paleta de nós, painel de configuração), **Then** vê que estão flutuando com efeito glass, sem tocar nas bordas da tela
2. **Given** o usuário abre qualquer modal ou dropdown no editor, **When** visualiza o componente, **Then** segue o mesmo estilo visual (blur, transparência, bordas suaves) da tela de projetos
3. **Given** o usuário interage com seletores de modelo, **When** abre o seletor, **Then** vê o mesmo componente estilo Raycast usado no assistente de IA

---

### User Story 3 - Nós com Conexões Horizontais (Priority: P1)

Todos os nós do workflow têm entrada (input) no lado esquerdo e saída (output) no lado direito, permitindo um fluxo visual da esquerda para a direita. Isso substitui o padrão atual de entrada no topo e saída embaixo.

**Why this priority**: Fluxos horizontais são mais intuitivos para leitura (esquerda para direita) e permitem melhor aproveitamento do espaço em telas widescreen.

**Independent Test**: Pode ser testado adicionando nós ao canvas e conectando-os, verificando que as conexões fluem horizontalmente.

**Acceptance Scenarios**:

1. **Given** o usuário adiciona um nó ao canvas, **When** observa o nó, **Then** vê o ponto de conexão de entrada à esquerda e saída à direita
2. **Given** o usuário conecta dois nós, **When** arrasta uma conexão, **Then** a linha vai do lado direito do nó origem para o lado esquerdo do nó destino
3. **Given** o usuário tem múltiplos nós conectados, **When** visualiza o fluxo completo, **Then** o fluxo progride visualmente da esquerda para a direita

---

### User Story 4 - Separação Clara de Templates vs Meus Workflows (Priority: P2)

A interface distingue claramente entre templates do sistema (que podem ser duplicados ou executados) e workflows que o usuário criou/customizou. Templates do sistema aparecem em uma seção separada, com indicação visual clara de que são modelos prontos. Workflows do usuário aparecem em outra seção com opções completas de edição.

**Why this priority**: A confusão atual entre templates e workflows próprios prejudica a usabilidade. Os usuários precisam saber rapidamente o que podem editar vs o que é só modelo.

**Independent Test**: Pode ser testado acessando a área de workflows e verificando que há separação visual e funcional clara entre templates e workflows próprios.

**Acceptance Scenarios**:

1. **Given** o usuário acessa a galeria de workflows, **When** visualiza a página, **Then** vê seções distintas: "Templates do Sistema" e "Meus Workflows"
2. **Given** o usuário vê um template do sistema, **When** clica nele, **Then** as opções disponíveis são "Duplicar para Meu Projeto" ou "Executar"
3. **Given** o usuário vê um workflow próprio, **When** clica nele, **Then** as opções incluem "Editar", "Executar", "Duplicar" e "Excluir"
4. **Given** o usuário quer criar um workflow do zero, **When** clica em criar novo, **Then** vai diretamente para o editor de workflows em branco

---

### User Story 5 - Navegação com Botão de Sair/Voltar (Priority: P2)

Todas as telas de workflow possuem navegação clara para sair ou voltar. O usuário sempre sabe como retornar à tela anterior ou ao projeto/workspace.

**Why this priority**: Navegação clara é fundamental para UX. Usuários não devem ficar "presos" em uma tela sem saber como sair.

**Independent Test**: Pode ser testado entrando em qualquer tela de workflow e verificando que existe um botão/link visível para voltar.

**Acceptance Scenarios**:

1. **Given** o usuário está no editor de workflows, **When** procura sair, **Then** encontra um botão de voltar ou breadcrumb visível no header
2. **Given** o usuário está na galeria de templates, **When** procura sair, **Then** encontra navegação clara para retornar ao projeto ou workspace
3. **Given** o usuário está visualizando uma execução, **When** quer voltar, **Then** pode navegar de volta ao workflow ou à lista de execuções

---

### User Story 6 - Nós Alinhados com Ferramentas do Assistente de IA (Priority: P2)

Os nós do workflow utilizam as mesmas capacidades e lógica das ferramentas disponíveis no assistente de IA. Isso permite criar fluxos complexos como: verificar documentos, gerar copy, criar prompts de imagem, gerar imagem, anexar ao documento e salvar em local específico do Kanban.

**Why this priority**: A integração entre workflows e as ferramentas do assistente garante consistência e permite automações poderosas que aproveitam todo o ecossistema.

**Independent Test**: Pode ser testado criando um workflow que utiliza múltiplos nós e verificando que cada nó executa corretamente e integra com o sistema.

**Acceptance Scenarios**:

1. **Given** o usuário configura um nó de Context Retrieval, **When** executa o workflow, **Then** o nó busca documentos do projeto usando os mesmos critérios disponíveis no assistente
2. **Given** o usuário configura um nó de Text Generation, **When** executa o workflow, **Then** o nó usa o mesmo serviço de LLM e configurações do assistente
3. **Given** o usuário configura um nó de Image Generation, **When** executa o workflow, **Then** a imagem é gerada e pode ser referenciada por nós subsequentes
4. **Given** o usuário configura um nó de Attach, **When** executa o workflow, **Then** o asset é anexado ao documento especificado no projeto
5. **Given** o usuário cria um fluxo completo (buscar contexto → gerar copy → gerar imagem → anexar → mover no Kanban), **When** executa, **Then** todas as etapas são executadas em sequência corretamente

---

### Edge Cases

- O que acontece quando o usuário tenta conectar nós incompatíveis (ex: saída de imagem para entrada que espera texto)? → Sistema impede a conexão e mostra feedback visual (handle vermelho/tooltip indicando incompatibilidade).
- Como o sistema lida quando um nó de Context Retrieval não encontra documentos correspondentes? → Continua a execução com resultado vazio e registra notificação no log de execução.
- O que acontece quando o usuário tenta excluir um workflow que está em execução? → Sistema impede a exclusão e informa que o workflow está em execução.
- Como o sistema se comporta quando um nó intermediário falha durante a execução? → Sistema pausa a execução e aguarda intervenção do usuário, permitindo investigar e corrigir antes de continuar ou abortar.
- O que acontece quando o usuário tenta duplicar um template para um projeto onde já existe um workflow com mesmo nome? → Sistema adiciona sufixo automático (ex: "Meu Workflow (2)").

## Requirements *(mandatory)*

### Functional Requirements

#### Navegação e Estrutura

- **FR-001**: Sistema DEVE permitir acesso a workflows diretamente de dentro de um projeto, via aba ou seção dedicada
- **FR-002**: Sistema DEVE exibir lista de workflows do projeto atual com status, última execução e ações disponíveis
- **FR-003**: Sistema DEVE fornecer navegação clara (botão voltar/breadcrumb) em todas as telas de workflow
- **FR-004**: Sistema DEVE manter o contexto do projeto ao navegar entre telas de workflow

#### Visual e Design

- **FR-005**: Sistema DEVE aplicar efeito liquid glass nas barras laterais do editor de workflows (paleta de nós, painel de configuração)
- **FR-006**: Sistema DEVE manter espaçamento entre sidebars e bordas da tela (sidebars flutuantes)
- **FR-007**: Sistema DEVE usar os mesmos componentes visuais da tela de projetos (modais, seletores, dropdowns)
- **FR-008**: Sistema DEVE usar o mesmo ModelSelector component (estilo Raycast) do assistente de IA
- **FR-009**: Sistema DEVE aplicar cantos arredondados consistentes (border-radius 16-24px) em todos os componentes glass

#### Nós e Canvas

- **FR-010**: Sistema DEVE posicionar handles de entrada (target) no lado esquerdo dos nós
- **FR-011**: Sistema DEVE posicionar handles de saída (source) no lado direito dos nós
- **FR-012**: Sistema DEVE renderizar conexões entre nós fluindo da esquerda para a direita
- **FR-013**: Sistema DEVE manter layout de nó compacto e legível com a nova orientação horizontal
- **FR-014**: Sistema DEVE validar compatibilidade de tipos ao conectar nós

#### Templates e Workflows

- **FR-015**: Sistema DEVE separar visualmente templates do sistema de workflows do usuário
- **FR-016**: Sistema DEVE exibir seções distintas: "Templates do Sistema" e "Meus Workflows"
- **FR-017**: Sistema DEVE permitir duplicar templates para um projeto (criando um workflow editável)
- **FR-018**: Sistema DEVE permitir executar templates diretamente sem duplicar
- **FR-019**: Sistema DEVE permitir edição completa apenas em workflows próprios do usuário
- **FR-020**: Sistema DEVE indicar visualmente quando um item é template (badge, ícone ou cor diferenciada)

#### Integração com Sistema

- **FR-021**: Nó de Context Retrieval DEVE usar os mesmos critérios de busca disponíveis no assistente de IA
- **FR-022**: Nó de Text Generation DEVE usar o mesmo serviço de LLM do assistente
- **FR-023**: Nó de Image Generation DEVE integrar com o serviço de geração de imagens existente
- **FR-024**: Nó de Attach DEVE poder anexar assets a documentos do projeto
- **FR-025**: Sistema DEVE permitir referência a saídas de nós anteriores via variáveis (ex: {{node_id.output}})
- **FR-026**: Sistema DEVE suportar fluxos que movem itens entre colunas do Kanban

### Key Entities

- **Workflow**: Representa um fluxo de trabalho criado pelo usuário, sempre vinculado a um projeto
- **WorkflowTemplate**: Modelo de workflow que pode ser do sistema (global) ou do workspace, usado como base para criar workflows
- **WorkflowNode**: Elemento individual do fluxo com tipo, configuração e posição no canvas
- **WorkflowExecution**: Instância de execução de um workflow, com status, progresso e resultados
- **NodeHandle**: Ponto de conexão de um nó (entrada à esquerda, saída à direita)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das telas de workflow possuem navegação visível para voltar/sair
- **SC-002**: Usuários conseguem identificar templates vs workflows próprios em menos de 3 segundos
- **SC-003**: Todos os nós do canvas exibem handles na orientação horizontal (esquerda/direita)
- **SC-004**: Visual das sidebars de workflow é consistente com sidebars da tela de projetos (validação visual)
- **SC-005**: Workflows podem ser acessados e executados a partir da tela de um projeto específico
- **SC-006**: Usuários conseguem criar um fluxo completo (5+ nós conectados) e executá-lo com sucesso
- **SC-007**: Tempo para criar um workflow simples (3 nós) a partir de um template reduz em comparação ao fluxo atual
- **SC-008**: Taxa de erro de conexão entre nós incompatíveis é zero (validação impede conexões inválidas)

## Clarifications

### Session 2025-11-27

- Q: Quando um nó intermediário falha durante a execução do workflow, qual deve ser o comportamento do sistema? → A: Pausar execução e aguardar intervenção do usuário
- Q: Quando o usuário tenta conectar nós com tipos incompatíveis, qual deve ser o comportamento? → A: Impedir conexão e mostrar feedback visual (handle vermelho/tooltip)
- Q: Quando o nó de Context Retrieval não encontra documentos correspondentes, qual deve ser o comportamento? → A: Continuar com resultado vazio e notificar no log de execução
- Q: Quando o usuário tenta duplicar um template para um projeto onde já existe workflow com mesmo nome? → A: Adicionar sufixo automático (ex: "Meu Workflow (2)")
- Q: Quando o usuário tenta excluir um workflow que está em execução, qual deve ser o comportamento? → A: Impedir exclusão e informar que está em execução

## Assumptions

- O design system Ethereal Blue + Liquid Glass já está implementado e documentado em `design-tokens.ts`
- O componente ModelSelector do assistente de IA pode ser reutilizado sem modificações significativas
- O backend já suporta workflows vinculados a projetos (campo `project_id` existe no modelo)
- A estrutura de ferramentas do assistente de IA está disponível para ser chamada pelos nós do workflow
- ReactFlow suporta mudança de posição de handles sem quebrar funcionalidade existente
