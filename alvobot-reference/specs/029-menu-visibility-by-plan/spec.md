# Feature Specification: Visibilidade de Menu por Plano

**Feature Branch**: `029-menu-visibility-by-plan`
**Created**: 2025-01-16
**Status**: Draft
**Input**: Sistema de controle de visibilidade dos itens do menu lateral (Sidebar) baseado no plano do usuário, com opção de exibir itens bloqueados como "Em Breve" ou ocultar completamente, configurável via painel administrativo.

## Clarifications

### Session 2025-01-16
- Q: O critério de visibilidade será apenas por plano? → A: Sim, apenas por plano do usuário
- Q: Itens bloqueados podem aparecer como "Em Breve"? → A: Sim, configurável por item: oculto completamente OU visível como "Em Breve"
- Q: Onde será feita a configuração? → A: Painel admin, com interface para configurar cada item do menu
- Q: Como o menu deve se comportar durante o carregamento inicial da configuração? → A: Mostrar skeleton/loading no menu inteiro
- Q: Qual a estratégia de cache para a configuração de visibilidade do menu? → A: Cache de 5 minutos (balanceado)
- Q: Qual plano deve ser considerado para a visibilidade do menu? → A: Usar plano do workspace ativo se existir, senão plano pessoal
- Q: Qual o comportamento para itens marcados como essenciais? → A: Validação impede salvar configuração que oculte itens essenciais (sempre públicos ou com acesso)
- Q: Qual o comportamento padrão para novos itens de menu adicionados ao sistema? → A: Novos itens são ocultos por padrão (requerem configuração explícita pelo admin)

---

## Visão Geral

O **Sistema de Visibilidade de Menu por Plano** permite controlar quais páginas/funcionalidades do menu lateral ficam visíveis para usuários baseado no seu plano ativo. Administradores podem configurar para cada item do menu:

1. **Quais planos têm acesso** - Lista de planos que podem ver/acessar o item
2. **Comportamento para planos sem acesso** - Ocultar completamente OU mostrar como "Em Breve" (desabilitado, com badge)

### Principais Funcionalidades

1. **Configuração de Visibilidade** - Admin define quais planos veem cada item do menu
2. **Modo "Em Breve"** - Itens bloqueados podem aparecer desabilitados com badge "Em Breve"
3. **Filtragem Dinâmica** - Menu renderiza apenas itens permitidos para o plano do usuário
4. **Proteção de Rotas** - Usuários sem acesso são redirecionados ao tentar acessar diretamente

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar Visibilidade de Item do Menu (Admin) (Priority: P1)

Como um administrador, quero definir quais planos podem ver cada item do menu, para segmentar funcionalidades por nível de assinatura.

**Why this priority**: É a configuração base que permite todo o sistema funcionar.

**Independent Test**: Pode ser testado acessando o painel admin, selecionando um item do menu e definindo quais planos têm acesso.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado no painel admin, **When** ele acessa a seção de configuração de menu, **Then** o sistema exibe uma lista de todos os itens do menu com suas configurações atuais.

2. **Given** a lista de itens do menu, **When** o admin clica em um item para editar, **Then** o sistema exibe opções para selecionar planos com acesso e comportamento para planos sem acesso.

3. **Given** um item configurado para planos específicos, **When** o admin salva, **Then** as alterações são refletidas imediatamente no menu dos usuários afetados.

4. **Given** um item configurado, **When** o admin marca "Mostrar como Em Breve" para planos sem acesso, **Then** usuários desses planos veem o item desabilitado com badge.

---

### User Story 2 - Visualizar Menu Filtrado (Usuário) (Priority: P1)

Como um usuário da plataforma, quero ver apenas os itens do menu relevantes para meu plano, para ter uma experiência limpa e focada.

**Why this priority**: É a funcionalidade principal para o usuário final.

**Independent Test**: Pode ser testado logando com usuários de planos diferentes e verificando se os menus são diferentes.

**Acceptance Scenarios**:

1. **Given** um usuário com plano "Básico", **When** ele visualiza o menu lateral, **Then** vê apenas os itens configurados para seu plano.

2. **Given** um item marcado como "Mostrar Em Breve" para o plano do usuário, **When** ele visualiza o menu, **Then** vê o item desabilitado com badge "Em Breve" (não clicável).

3. **Given** um item completamente oculto para o plano do usuário, **When** ele visualiza o menu, **Then** o item não aparece no menu.

4. **Given** um usuário que faz upgrade de plano, **When** o novo plano tem mais itens, **Then** os novos itens aparecem imediatamente no menu.

---

### User Story 3 - Proteção de Rotas (Usuário) (Priority: P1)

Como um sistema, quero impedir que usuários acessem rotas bloqueadas diretamente pela URL, para garantir a integridade do controle de acesso.

**Why this priority**: Segurança essencial - sem isso, usuários poderiam burlar o controle.

**Independent Test**: Pode ser testado tentando acessar uma URL bloqueada diretamente e verificando o redirecionamento.

**Acceptance Scenarios**:

1. **Given** um usuário sem acesso a uma funcionalidade, **When** ele tenta acessar a URL diretamente, **Then** é redirecionado para uma página informativa ou dashboard.

2. **Given** um item marcado como "Em Breve" para o usuário, **When** ele tenta acessar a URL diretamente, **Then** vê uma página explicando que a funcionalidade está disponível em planos superiores.

3. **Given** um usuário com plano válido, **When** o plano expira, **Then** perde acesso às rotas restritas automaticamente.

---

### User Story 4 - Gerenciar Configuração em Massa (Admin) (Priority: P2)

Como um administrador, quero ver uma visão geral de todas as configurações de menu e editá-las facilmente, para gerenciar o acesso de forma eficiente.

**Why this priority**: Melhora a experiência do admin mas não é crítico para o funcionamento.

**Independent Test**: Pode ser testado acessando a lista de configurações e fazendo edições em múltiplos itens.

**Acceptance Scenarios**:

1. **Given** a página de configuração de menu, **When** o admin visualiza, **Then** vê uma tabela com todos os itens, seus planos permitidos e comportamento.

2. **Given** a tabela de configurações, **When** o admin filtra por plano, **Then** vê apenas itens disponíveis para aquele plano.

3. **Given** múltiplos itens selecionados, **When** o admin aplica uma configuração em lote, **Then** todos os itens selecionados são atualizados.

---

### User Story 5 - Usuário Sem Plano Ativo (Priority: P1)

Como um sistema, quero definir o comportamento do menu para usuários sem plano ativo, para que tenham uma experiência consistente.

**Why this priority**: Usuários com plano expirado ou sem plano precisam de tratamento específico.

**Independent Test**: Pode ser testado logando com um usuário sem plano ativo e verificando o menu.

**Acceptance Scenarios**:

1. **Given** um usuário sem plano ativo, **When** ele visualiza o menu, **Then** vê apenas itens marcados como acessíveis para "todos" ou "sem plano".

2. **Given** itens com "Mostrar Em Breve" para usuários sem plano, **When** visualizados, **Then** aparecem desabilitados incentivando upgrade.

3. **Given** um usuário sem plano, **When** ele tenta acessar uma rota protegida, **Then** é redirecionado para página de upgrade/assinatura.

---

### Edge Cases

- **O que acontece se um plano é excluído?** Itens configurados para esse plano perdem o acesso; admin recebe alerta para reconfigurar.
- **Como tratar usuários com múltiplos planos (workspaces)?** Usa o plano do workspace ativo se existir; caso contrário, usa o plano pessoal do usuário.
- **O que acontece se todos os planos de um item são removidos?** Item fica oculto para todos; admin recebe alerta.
- **Como tratar itens de menu que são seções (agrupadores)?** Seções são visíveis se pelo menos um item filho é visível para o plano.
- **O que acontece se a configuração não carrega?** Fallback para mostrar todos os itens (fail-open, melhor UX que menu vazio).
- **O que acontece com novos itens de menu adicionados ao código?** Ficam ocultos por padrão até que um admin configure a visibilidade explicitamente (segurança por padrão).

---

## Requirements *(mandatory)*

### Functional Requirements

#### Configuração Admin
- **FR-001**: Sistema DEVE permitir listar todos os itens do menu com suas configurações atuais
- **FR-002**: Sistema DEVE permitir selecionar quais planos têm acesso a cada item do menu
- **FR-003**: Sistema DEVE permitir configurar o comportamento para planos sem acesso (oculto vs "Em Breve")
- **FR-004**: Sistema DEVE permitir configurar um "plano base" que dá acesso a itens essenciais (ex: Dashboard, Configurações)
- **FR-005**: Sistema DEVE validar que itens essenciais não podem ser completamente ocultos (validação impede salvar; itens essenciais devem ser públicos ou ter pelo menos um plano com acesso)
- **FR-006**: Sistema DEVE permitir preview de como o menu ficará para cada plano
- **FR-007**: Sistema DEVE salvar configurações imediatamente (sem necessidade de deploy)
- **FR-023**: Sistema DEVE tratar novos itens de menu (sem configuração) como ocultos por padrão (segurança por padrão)

#### Renderização do Menu (Frontend)
- **FR-008**: Sistema DEVE filtrar itens do menu baseado no plano do usuário logado
- **FR-009**: Sistema DEVE exibir itens "Em Breve" com estilo visual distintivo (desabilitado + badge)
- **FR-010**: Sistema DEVE atualizar o menu quando o plano do usuário mudar (upgrade/downgrade/expiração)
- **FR-011**: Sistema DEVE ocultar seções inteiras se nenhum item filho estiver visível para o plano
- **FR-012**: Sistema DEVE manter a estrutura hierárquica do menu (seções colapsáveis)
- **FR-021**: Sistema DEVE exibir skeleton/loading no menu inteiro durante o carregamento inicial da configuração de visibilidade
- **FR-022**: Sistema DEVE cachear configuração de visibilidade por 5 minutos (staleTime) para balancear performance e atualização

#### Proteção de Rotas
- **FR-013**: Sistema DEVE bloquear acesso direto a rotas de itens sem permissão
- **FR-014**: Sistema DEVE redirecionar usuários sem acesso para página apropriada
- **FR-015**: Sistema DEVE exibir mensagem explicativa quando acesso é negado
- **FR-016**: Sistema DEVE permitir configurar URL de redirecionamento por item (opcional)

#### Comportamento para "Em Breve"
- **FR-017**: Itens "Em Breve" DEVEM ser visíveis mas não clicáveis
- **FR-018**: Itens "Em Breve" DEVEM exibir badge/tooltip indicando disponibilidade futura
- **FR-019**: Itens "Em Breve" DEVEM ter estilo visual diferenciado (opacidade reduzida, ícone de cadeado)
- **FR-020**: Sistema DEVE permitir configurar texto customizado para o tooltip de cada item "Em Breve"

### Key Entities

- **MenuItem**: Item do menu com identificador único, label, rota, ícone, seção pai
- **MenuVisibilityConfig**: Configuração de visibilidade de um item (plan_ids, show_as_coming_soon, coming_soon_text)
- **Plan**: Plano existente no sistema (já implementado)
- **UserPlan**: Relacionamento usuário-plano com status e validade (já implementado via views)

---

## Data Model

### Tabela Principal

```sql
-- Configuração de visibilidade dos itens do menu
CREATE TABLE menu_visibility_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_key VARCHAR(100) NOT NULL UNIQUE,  -- Identificador único do item (ex: 'dashboard', 'alvoads-meta', 'base-structure')
  plan_ids INTEGER[] DEFAULT '{}',              -- Planos com acesso total (array vazio = nenhum plano tem acesso)
  is_public BOOLEAN DEFAULT FALSE,              -- Se TRUE, todos os usuários autenticados veem (ignora plan_ids)
  show_as_coming_soon BOOLEAN DEFAULT FALSE,    -- Se TRUE, mostra como "Em Breve" para planos sem acesso; se FALSE, oculta completamente
  coming_soon_text VARCHAR(255) DEFAULT 'Disponível em breve', -- Texto do tooltip/badge
  redirect_url VARCHAR(255),                    -- URL para redirecionar quando acesso negado (opcional)
  is_essential BOOLEAN DEFAULT FALSE,           -- Itens essenciais não podem ser completamente ocultos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_menu_visibility_menu_item ON menu_visibility_config(menu_item_key);
CREATE INDEX idx_menu_visibility_public ON menu_visibility_config(is_public);

-- Trigger para updated_at
CREATE TRIGGER update_menu_visibility_config_updated_at
  BEFORE UPDATE ON menu_visibility_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE menu_visibility_config ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todas as configurações
CREATE POLICY "Admins can manage menu visibility" ON menu_visibility_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

-- Todos usuários autenticados podem ler (para renderizar o menu)
CREATE POLICY "Authenticated users can read menu visibility" ON menu_visibility_config
  FOR SELECT USING (auth.role() = 'authenticated');
```

### Dados Iniciais (Seed)

```sql
-- Seed com configuração padrão baseada no menu atual
INSERT INTO menu_visibility_config (menu_item_key, is_public, is_essential, show_as_coming_soon) VALUES
  -- Itens essenciais (públicos para todos)
  ('dashboard', TRUE, TRUE, FALSE),
  ('projects', TRUE, TRUE, FALSE),
  ('tasks', TRUE, TRUE, FALSE),
  ('settings', TRUE, TRUE, FALSE),
  ('connections', TRUE, TRUE, FALSE),

  -- Itens de funcionalidade (configuráveis por plano)
  ('courses', TRUE, FALSE, FALSE),
  ('base-structure', TRUE, FALSE, FALSE),
  ('base-articles', TRUE, FALSE, FALSE),
  ('keywords', TRUE, FALSE, FALSE),
  ('arrow-articles', TRUE, FALSE, FALSE),
  ('alvoads-meta', TRUE, FALSE, FALSE),
  ('alvoads-meta-library', TRUE, FALSE, FALSE),
  ('alvoads-google', TRUE, FALSE, FALSE),
  ('receita', TRUE, FALSE, FALSE),
  ('google-ads', TRUE, FALSE, FALSE),
  ('flows', TRUE, FALSE, FALSE),
  ('runs', TRUE, FALSE, FALSE),
  ('triggers', TRUE, FALSE, FALSE);
```

### View para Frontend

```sql
-- View que retorna configurações de menu para o usuário atual
CREATE OR REPLACE VIEW user_menu_visibility AS
WITH user_plan AS (
  SELECT
    t.plan_id,
    t.user_id
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.status IN ('approved', 'completed')
    AND (
      -- Verifica se ainda está válido
      t.timestamp_approved IS NOT NULL
      AND (
        t.timestamp_approved + (t.duration || ' months')::INTERVAL > NOW()
      )
    )
  ORDER BY t.timestamp_approved DESC
  LIMIT 1
)
SELECT
  mvc.menu_item_key,
  mvc.coming_soon_text,
  mvc.redirect_url,
  CASE
    WHEN mvc.is_public THEN 'visible'
    WHEN up.plan_id IS NOT NULL AND up.plan_id = ANY(mvc.plan_ids) THEN 'visible'
    WHEN mvc.show_as_coming_soon THEN 'coming_soon'
    ELSE 'hidden'
  END AS visibility_status
FROM menu_visibility_config mvc
LEFT JOIN user_plan up ON TRUE;
```

---

## Frontend Implementation

### Estrutura de Dados do Menu

```typescript
// frontend/src/shared/types/menu.ts

export type MenuVisibilityStatus = 'visible' | 'coming_soon' | 'hidden';

export interface MenuItemConfig {
  key: string;                    // Identificador único
  label: string;                  // Texto exibido
  path: string;                   // Rota
  icon: React.ComponentType;      // Componente de ícone
  section?: string;               // Seção pai (para agrupamento)
  accentColor?: string;           // Cor de destaque
}

export interface MenuVisibility {
  menu_item_key: string;
  visibility_status: MenuVisibilityStatus;
  coming_soon_text?: string;
  redirect_url?: string;
}

export interface MenuItemWithVisibility extends MenuItemConfig {
  visibility: MenuVisibilityStatus;
  comingSoonText?: string;
}
```

### Hook de Visibilidade

```typescript
// frontend/src/shared/hooks/useMenuVisibility.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/utils/supabase';
import { queryKeys } from '@/shared/utils/queryKeys';

export function useMenuVisibility() {
  return useQuery({
    queryKey: queryKeys.menuVisibility.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_menu_visibility')
        .select('*');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
```

### Componente de Item "Em Breve"

```typescript
// frontend/src/shared/components/MenuItemComingSoon/index.tsx

interface MenuItemComingSoonProps {
  icon: React.ComponentType;
  label: string;
  tooltipText?: string;
}

export function MenuItemComingSoon({ icon: Icon, label, tooltipText }: MenuItemComingSoonProps) {
  return (
    <div className={styles.comingSoon} title={tooltipText}>
      <Icon className={styles.icon} />
      <span className={styles.label}>{label}</span>
      <span className={styles.badge}>Em Breve</span>
    </div>
  );
}
```

### Componente de Proteção de Rota

```typescript
// frontend/src/shared/components/ProtectedFeatureRoute/index.tsx

interface ProtectedFeatureRouteProps {
  menuItemKey: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

export function ProtectedFeatureRoute({
  menuItemKey,
  children,
  fallbackPath = '/dashboard'
}: ProtectedFeatureRouteProps) {
  const { data: visibility, isLoading } = useMenuVisibility();
  const navigate = useNavigate();

  const itemVisibility = visibility?.find(v => v.menu_item_key === menuItemKey);

  useEffect(() => {
    if (!isLoading && itemVisibility?.visibility_status !== 'visible') {
      navigate(itemVisibility?.redirect_url || fallbackPath);
    }
  }, [isLoading, itemVisibility, navigate, fallbackPath]);

  if (isLoading) return <Spinner />;
  if (itemVisibility?.visibility_status !== 'visible') return null;

  return <>{children}</>;
}
```

---

## Admin UI

### Página de Configuração

**Rota**: `/admin/menu-visibility`

**Layout**:
- Tabela com todos os itens do menu
- Colunas: Item, Planos com Acesso, Comportamento, Ações
- Filtros: Por seção, Por plano, Por status
- Modal de edição ao clicar em um item

### Modal de Edição

**Campos**:
1. **Nome do Item** (readonly) - Ex: "AlvoADS Meta"
2. **Rota** (readonly) - Ex: "/alvoads-meta"
3. **Tipo de Acesso**:
   - Público (todos usuários autenticados)
   - Por Plano (selecionar planos)
4. **Planos com Acesso** (multi-select) - Lista de planos disponíveis
5. **Comportamento para Planos Sem Acesso**:
   - Ocultar completamente
   - Mostrar como "Em Breve"
6. **Texto do "Em Breve"** (text input) - Texto personalizado
7. **URL de Redirecionamento** (text input, opcional)

### Preview

- Seção "Preview por Plano" com select de plano
- Mostra como o menu ficará para um usuário daquele plano
- Inclui itens visíveis, itens "Em Breve" e ocultos marcados

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin consegue configurar visibilidade de um item em menos de 30 segundos
- **SC-002**: Mudanças de configuração refletem no menu do usuário em menos de 5 segundos
- **SC-003**: 100% das tentativas de acesso direto a rotas bloqueadas são interceptadas
- **SC-004**: Carregamento da configuração de menu não adiciona mais de 100ms ao tempo de carregamento inicial
- **SC-005**: Zero itens essenciais podem ser completamente ocultados (validação impede)
- **SC-006**: Preview do admin mostra exatamente o mesmo menu que o usuário veria

---

## Assumptions

- O sistema de planos (tabela `plans` e views `user_transactions_view`) já está implementado
- O Sidebar atual usa uma estrutura de dados estática que será convertida para dinâmica
- O hook `useUserPlan()` já fornece informações do plano do usuário
- O painel admin já existe e segue o padrão de outras páginas admin

---

## UI/UX Guidelines

### Menu Item "Em Breve"

**Visual**:
- Opacidade reduzida (0.5-0.6)
- Ícone de cadeado pequeno ou badge "Em Breve"
- Cursor: not-allowed
- Tooltip ao hover explicando a funcionalidade

**Exemplo de estilo CSS**:
```css
.comingSoon {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
  position: relative;
}

.comingSoon .badge {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  padding: 2px 6px;
  background: var(--color-warning);
  color: var(--color-text-inverted);
  border-radius: var(--radius-sm);
}
```

### Página de Acesso Negado

**Quando usuário tenta acessar rota bloqueada**:
- Título: "Funcionalidade não disponível"
- Mensagem explicando que a funcionalidade está disponível em outros planos
- CTA: "Ver planos disponíveis" ou "Voltar ao Dashboard"
- Visual clean, sem parecer erro

### Admin - Tabela de Configuração

**Colunas**:
| Item | Seção | Acesso | Comportamento | Ações |
|------|-------|--------|---------------|-------|
| Dashboard | Principal | Público | - | Editar |
| AlvoADS Meta | Escala | Pro, Enterprise | Em Breve | Editar |
| Mineração 10x | Validação | Todos Planos | Oculto | Editar |

**Legenda de cores**:
- Verde: Público
- Azul: Restrito mas configurado
- Amarelo: Mostrando como "Em Breve"
- Cinza: Completamente oculto

---

## Rotas

### Admin
- `/admin/menu-visibility` - Lista e configuração de visibilidade de menu

### Frontend (modificações)
- Todas as rotas existentes recebem verificação de acesso via wrapper

---

## Fora do Escopo (V1)

- Visibilidade configurável por workspace individual (usa plano do workspace ativo automaticamente)
- Visibilidade por usuário específico (apenas por plano)
- Personalização de ícones por plano
- Ordenação diferente do menu por plano
- Analytics de cliques em itens "Em Breve"
- A/B testing de configurações de menu
- Histórico de mudanças de configuração
- Notificações quando novas funcionalidades são liberadas

---

## Mapeamento de Itens do Menu Atual

Baseado no Sidebar.tsx atual, estes são os itens a serem configurados:

### Seção: PRINCIPAL
| Key | Label | Rota | Essencial |
|-----|-------|------|-----------|
| dashboard | Início | /dashboard | Sim |
| projects | Meus Blogs | /projects | Sim |
| tasks | Minhas Tarefas | /tasks | Sim |
| courses | Cursos | /courses | Não |

### Seção: FASE DE FUNDAÇÃO
| Key | Label | Rota | Essencial |
|-----|-------|------|-----------|
| base-structure | Estrutura de Base | /base-structure | Não |
| base-articles | Artigos de Base | /base-articles | Não |

### Seção: FASE DE VALIDAÇÃO
| Key | Label | Rota | Essencial |
|-----|-------|------|-----------|
| keywords | Mineração 10x | /keywords | Não |
| arrow-articles | Artigos Flecha | /arrow-articles | Não |

### Seção: FASE DE ESCALA
| Key | Label | Rota | Essencial |
|-----|-------|------|-----------|
| alvoads-meta | AlvoADS Meta | /alvoads-meta | Não |
| alvoads-meta-library | Biblioteca de Criativos | /alvoads-meta/biblioteca | Não |
| alvoads-google | AlvoADS Google | /alvoads-google | Não |
| receita | Receita | /receita | Não |
| google-ads | Google Ads Spy | /google-ads | Não |
| connections | Conexões | /connections | Sim |
| flows | Meus Fluxos | /flows | Não |
| runs | Disparos | /runs | Não |
| triggers | Acionadores | /triggers | Não |

### Rodapé (sempre visível)
| Key | Label | Rota | Essencial |
|-----|-------|------|-----------|
| settings | Configurações | /settings | Sim |
