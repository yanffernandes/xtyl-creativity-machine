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

## Technical Architecture

### Estrutura de Arquivos

```
frontend/src/
├── i18n/
│   ├── config.ts          # Configuração de locales, tipos e detecção
│   ├── request.ts         # getRequestConfig para next-intl
│   └── storage.ts         # Persistência em localStorage
├── messages/
│   ├── pt-BR.json         # Traduções em Português
│   └── en.json            # Traduções em Inglês
├── contexts/
│   └── LocaleContext.tsx  # Provider de locale global
├── hooks/
│   └── use-locale.ts      # Hook para acessar/alterar locale
└── components/
    └── LocaleSwitcher.tsx # Componente seletor de idioma
```

### Convenções de Namespace

Os arquivos de tradução usam namespaces aninhados para organização:

```json
{
  "common": { },      // Textos genéricos (botões, ações)
  "auth": { },        // Autenticação (login, registro)
  "navigation": { },  // Menu e navegação
  "profile": { },     // Página de perfil
  "workspace": { },   // Funcionalidades de workspace
  "project": { },     // Funcionalidades de projeto
  "document": { },    // Documentos
  "workflow": { },    // Sistema de workflows
  "errors": { },      // Mensagens de erro
  "validation": { },  // Validação de formulários
  "success": { },     // Mensagens de sucesso
  "sidebar": { },     // Sidebar lateral
  "commandPalette": { }, // Command palette
  "settings": { },    // Configurações
  "admin": { },       // Painel administrativo
  "visualAssets": { }, // Biblioteca de assets visuais
  "chat": { },        // Chat/assistente IA
  "templates": { }    // Templates
}
```

### Padrões de Uso

#### Componentes Client-side
```tsx
"use client";
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("namespace");
  return <button>{t("buttonLabel")}</button>;
}
```

#### Pluralização
```json
{
  "projects": "{count, plural, =0 {Nenhum projeto} =1 {1 projeto} other {# projetos}}"
}
```

```tsx
t("projects", { count: 5 }) // "5 projetos"
```

#### Interpolação de Variáveis
```json
{
  "welcome": "Bem-vindo, {name}!",
  "itemsSelected": "{count} itens selecionados"
}
```

```tsx
t("welcome", { name: "João" }) // "Bem-vindo, João!"
```

#### Formatação de Datas
```tsx
import { useFormatter } from "next-intl";

const format = useFormatter();
format.dateTime(date, { dateStyle: "medium" });
// pt-BR: "5 de dez. de 2025"
// en: "Dec 5, 2025"
```

#### Formatação de Números
```tsx
format.number(1234.56, { style: "currency", currency: "BRL" });
// pt-BR: "R$ 1.234,56"
// en: "$1,234.56"
```

## Component Inventory

### P1 - Fluxo Principal (Must Have)

| Módulo | Componente | Status | Namespace |
|--------|------------|--------|-----------|
| Auth | login/page.tsx | ✅ Traduzido | auth |
| Auth | register/page.tsx | ✅ Traduzido | auth |
| Auth | forgot-password/page.tsx | ✅ Traduzido | auth |
| Auth | reset-password/page.tsx | ✅ Traduzido | auth |
| Navigation | WorkspaceSidebar.tsx | ✅ Traduzido | sidebar |
| Navigation | CommandPalette.tsx | ✅ Traduzido | commandPalette |
| Workspace | workspace/[id]/page.tsx | ✅ Traduzido | workspace |
| Workspace | workspace/[id]/settings/page.tsx | ✅ Traduzido | settings |
| Profile | workspace/[id]/profile/page.tsx | ✅ Traduzido | profile |
| Project | project/[projectId]/page.tsx | ❌ Pendente | project |
| Project | project/[projectId]/settings/page.tsx | ❌ Pendente | project |
| Document | DocumentEditor (interno) | ❌ Pendente | document |
| Chat | ChatSidebar.tsx | ❌ Pendente | chat |

### P2 - Features Secundárias (Should Have)

| Módulo | Componente | Status | Namespace |
|--------|------------|--------|-----------|
| Workflow | WorkflowCanvas.tsx | ✅ Traduzido | workflow |
| Workflow | NodeConfigPanel.tsx | ✅ Traduzido | workflow |
| Workflow | ExecutionMonitor.tsx | ✅ Traduzido | workflow |
| Workflow | WorkflowHeader.tsx | ❌ Pendente | workflow |
| Workflow | WorkflowList.tsx | ❌ Pendente | workflow |
| Workflow | LaunchWorkflowModal.tsx | ❌ Pendente | workflow |
| Workflow | TemplateCard.tsx | ❌ Pendente | workflow |
| Workflow | nodes/*.tsx (12 arquivos) | ❌ Pendente | workflow |
| Visual Assets | VisualAssetsLibrary.tsx | ❌ Pendente | visualAssets |
| Visual Assets | AssetUploadModal.tsx | ❌ Pendente | visualAssets |
| Visual Assets | AdvancedVisualSettingsModal.tsx | ❌ Pendente | visualAssets |
| Visual Assets | VisualContextSettings.tsx | ❌ Pendente | visualAssets |
| Templates | templates/page.tsx | ❌ Pendente | templates |
| Templates | TemplateCard.tsx | ❌ Pendente | templates |
| Share | ShareDialog.tsx | ❌ Pendente | common |
| Modals | AssetSelectorModal.tsx | ❌ Pendente | visualAssets |
| Modals | ImageViewer.tsx | ❌ Pendente | common |

### P3 - Admin & Extras (Nice to Have)

| Módulo | Componente | Status | Namespace |
|--------|------------|--------|-----------|
| Admin | admin/page.tsx | ❌ Pendente | admin |
| Admin | admin/users/page.tsx | ❌ Pendente | admin |
| Admin | admin/workspaces/page.tsx | ❌ Pendente | admin |
| Admin | admin/models/page.tsx | ❌ Pendente | admin |
| Admin | admin/settings/page.tsx | ❌ Pendente | admin |
| Admin | admin/messages/page.tsx | ❌ Pendente | admin |
| Admin | AdminHeader.tsx | ❌ Pendente | admin |
| Admin | UserTable.tsx | ❌ Pendente | admin |
| Admin | WorkspaceTable.tsx | ❌ Pendente | admin |
| Admin | ModelConfigForm.tsx | ❌ Pendente | admin |
| Loading | LoadingSkeleton.tsx | ❌ Pendente | common |
| Empty States | empty-*.tsx (3 arquivos) | ❌ Pendente | common |

## Progress Summary

| Prioridade | Total | Traduzidos | Pendentes | % Completo |
|------------|-------|------------|-----------|------------|
| P1 - Fluxo Principal | 13 | 10 | 3 | 77% |
| P2 - Features Secundárias | 18 | 3 | 15 | 17% |
| P3 - Admin & Extras | 14 | 0 | 14 | 0% |
| **Total** | **45** | **13** | **32** | **29%** |

## Implementation Notes

### Dependências Instaladas
- `next-intl`: Biblioteca principal de i18n para Next.js

### Configuração no layout.tsx
O `NextIntlClientProvider` deve envolver a aplicação no layout raiz, passando as mensagens do locale atual.

### Mudança de Idioma
Atualmente a mudança de idioma faz reload da página (`window.location.reload()`). Isso é necessário porque o next-intl carrega as mensagens no servidor. Para uma experiência sem reload, seria necessário migrar para um approach 100% client-side.

### Fallback de Traduções
Se uma chave não existir no idioma selecionado, o sistema deve:
1. Tentar usar o idioma padrão (pt-BR)
2. Se não existir, mostrar a própria chave (para debugging)

### Testes
- Verificar que nenhuma chave retorna `undefined`
- Testar pluralização em ambos os idiomas
- Testar formatação de datas/números
- Testar persistência do locale no localStorage
