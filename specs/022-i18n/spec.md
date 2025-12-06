# Feature Specification: Sistema de Internacionalização (i18n)

**Feature Branch**: `022-i18n`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Ajustar tradução, deixar todo o sistema em portugues e em ingles, deixando o usuário escolher o idioma, verifique qual o melhor padrão do mercado para gerir e controlar esse sistema de multiplos idiomas no front. O idioma principal no momento vai ser o portugues."

## Clarifications

### Session 2025-12-05

- Q: Onde o seletor de idioma deve ser posicionado na interface? → A: Menu de configurações do usuário/perfil

## Resumo Executivo

Implementar suporte completo a múltiplos idiomas (Português e Inglês) em toda a aplicação frontend, permitindo que usuários escolham seu idioma preferido. O sistema utilizará **next-intl**, que é o padrão da indústria para internacionalização em Next.js 14+ com App Router, oferecendo excelente suporte a TypeScript, integração com Server Components, e formatação automática de datas/números.

**Idioma padrão**: Português (pt-BR)
**Idiomas suportados**: Português (pt-BR), Inglês (en)

## User Scenarios & Testing

### User Story 1 - Seleção de Idioma (Priority: P1)

Um usuário acessa a aplicação pela primeira vez e deseja usar o sistema em seu idioma preferido (Português ou Inglês). Ele pode facilmente encontrar e alterar a configuração de idioma, e essa preferência é lembrada em sessões futuras.

**Why this priority**: Esta é a funcionalidade central do sistema i18n. Sem ela, os usuários não podem escolher seu idioma, tornando todo o resto inútil.

**Independent Test**: Pode ser totalmente testado verificando se o seletor de idioma aparece, se a mudança de idioma atualiza a interface, e se a preferência persiste após recarregar a página.

**Acceptance Scenarios**:

1. **Given** um usuário novo acessa a aplicação, **When** a página carrega, **Then** o sistema exibe todo o conteúdo em Português (idioma padrão)
2. **Given** um usuário está na aplicação em Português, **When** ele seleciona Inglês no seletor de idioma, **Then** toda a interface muda imediatamente para Inglês
3. **Given** um usuário selecionou Inglês como preferência, **When** ele fecha e reabre o navegador, **Then** a aplicação carrega em Inglês

---

### User Story 2 - Textos da Interface Traduzidos (Priority: P1)

Todos os textos estáticos da interface (botões, labels, mensagens, menus, títulos) aparecem no idioma selecionado pelo usuário, proporcionando uma experiência nativa em ambos os idiomas.

**Why this priority**: É essencial para a usabilidade. Textos misturados em diferentes idiomas criam confusão e uma experiência fragmentada.

**Independent Test**: Pode ser testado navegando por diferentes seções da aplicação e verificando que todos os textos estão no idioma correto.

**Acceptance Scenarios**:

1. **Given** o idioma está configurado para Português, **When** o usuário navega pelo sistema, **Then** todos os botões, labels, menus e mensagens aparecem em Português
2. **Given** o idioma está configurado para Inglês, **When** o usuário navega pelo sistema, **Then** todos os botões, labels, menus e mensagens aparecem em Inglês
3. **Given** uma mensagem de erro ocorre, **When** o sistema exibe o erro, **Then** a mensagem está no idioma selecionado pelo usuário

---

### User Story 3 - Formatação de Datas e Números (Priority: P2)

Datas, horários e números são formatados de acordo com as convenções do idioma/região selecionado (ex: dd/mm/aaaa para Português, mm/dd/yyyy para Inglês).

**Why this priority**: Importante para evitar confusão em datas e valores, mas a aplicação funciona mesmo com formatação incorreta.

**Independent Test**: Pode ser testado verificando campos de data e valores numéricos em diferentes seções da aplicação em cada idioma.

**Acceptance Scenarios**:

1. **Given** o idioma é Português, **When** uma data é exibida, **Then** ela aparece no formato dd/mm/aaaa (ex: 05/12/2025)
2. **Given** o idioma é Inglês, **When** uma data é exibida, **Then** ela aparece no formato mm/dd/yyyy (ex: 12/05/2025)
3. **Given** o idioma é Português, **When** um número grande é exibido, **Then** ele usa ponto como separador de milhar e vírgula para decimais (ex: 1.234,56)

---

### User Story 4 - Mensagens de Validação e Feedback (Priority: P2)

Mensagens de validação de formulários, toasts de sucesso/erro, e feedback do sistema aparecem no idioma correto.

**Why this priority**: Afeta diretamente a capacidade do usuário de entender e corrigir erros, mas é secundário à tradução da interface principal.

**Independent Test**: Pode ser testado submetendo formulários com dados inválidos e verificando as mensagens em cada idioma.

**Acceptance Scenarios**:

1. **Given** o idioma é Português, **When** um formulário é submetido com erro, **Then** as mensagens de validação aparecem em Português
2. **Given** o idioma é Inglês, **When** uma ação é concluída com sucesso, **Then** o toast de confirmação aparece em Inglês

---

### Edge Cases

- **Texto dinâmico do backend**: Conteúdo gerado por IA ou inserido por usuários permanece no idioma original (não é traduzido)
- **Idioma não suportado no navegador**: Sistema usa Português como fallback
- **Textos muito longos**: Traduções que excedem o espaço visual devem truncar elegantemente com reticências
- **Componentes de terceiros**: Bibliotecas como ReactFlow podem ter labels próprios que precisam ser traduzidos manualmente
- **URLs e rotas**: As rotas permanecem em inglês (não são traduzidas) para manter consistência técnica

## Requirements

### Functional Requirements

- **FR-001**: Sistema DEVE detectar o idioma preferido do navegador do usuário na primeira visita
- **FR-002**: Sistema DEVE usar Português (pt-BR) como idioma padrão quando preferência do navegador não for suportada
- **FR-003**: Sistema DEVE permitir ao usuário selecionar entre Português e Inglês através de um seletor de idioma
- **FR-004**: Sistema DEVE persistir a preferência de idioma do usuário no localStorage
- **FR-005**: Sistema DEVE aplicar a mudança de idioma imediatamente sem necessidade de recarregar a página
- **FR-006**: Sistema DEVE traduzir todos os textos estáticos da interface (botões, labels, títulos, menus)
- **FR-007**: Sistema DEVE traduzir todas as mensagens de erro e validação de formulários
- **FR-008**: Sistema DEVE traduzir todas as mensagens de feedback (toasts, alertas)
- **FR-009**: Sistema DEVE formatar datas de acordo com a localidade selecionada (pt-BR: dd/mm/aaaa, en: mm/dd/yyyy)
- **FR-010**: Sistema DEVE formatar números de acordo com a localidade selecionada
- **FR-011**: Sistema DEVE exibir o seletor de idioma no menu de configurações do usuário/perfil
- **FR-012**: Sistema DEVE manter conteúdo gerado por usuários/IA no idioma original (sem tradução automática)
- **FR-013**: Sistema DEVE suportar pluralização correta em ambos os idiomas (ex: "1 projeto" vs "2 projetos")

### Key Entities

- **Locale**: Representa um idioma/região suportado (pt-BR, en)
- **Translation Bundle**: Conjunto de chaves e traduções para um idioma específico
- **User Preference**: Preferência de idioma armazenada localmente

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos textos da interface principal estão traduzidos em ambos os idiomas
- **SC-002**: Usuário consegue trocar de idioma em menos de 3 cliques a partir de qualquer tela
- **SC-003**: Mudança de idioma reflete na interface em menos de 500ms
- **SC-004**: Preferência de idioma persiste corretamente em 100% dos casos após recarregar página
- **SC-005**: Zero textos "undefined" ou chaves de tradução expostas na interface
- **SC-006**: Todas as datas e números seguem formatação correta do idioma selecionado
- **SC-007**: Sistema carrega no idioma correto (salvo ou padrão) em menos de 200ms após a página renderizar

## Assumptions

- O projeto já utiliza Next.js 14 com App Router
- Não há necessidade de traduzir conteúdo do backend (API responses, dados do banco)
- O conteúdo gerado por IA (texto, descrições) permanece no idioma em que foi gerado
- As rotas da aplicação permanecem em inglês (não serão localizadas)
- Não há necessidade de suporte a RTL (right-to-left) neste momento
- Arquivos de tradução serão armazenados em formato JSON
- next-intl será a biblioteca escolhida por ser o padrão da indústria para Next.js 14+

## Out of Scope

- Tradução automática de conteúdo gerado por usuários
- Tradução de dados vindos do backend/API
- Suporte a mais de 2 idiomas (pode ser expandido futuramente)
- Localização de URLs/rotas
- Suporte a idiomas RTL (árabe, hebraico)
- Tradução do painel administrativo (se existir requisito diferente, especificar)
