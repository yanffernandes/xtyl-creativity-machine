# DataTable Standard - Regra de Ouro

> **OBRIGATÓRIO**: Toda nova implementação de datatable DEVE seguir este padrão.
> Violações deste padrão devem ser tratadas como bugs.

## 1. Componentes shadcn/ui Obrigatórios

```bash
# Dependências instaladas
@radix-ui/react-select
@radix-ui/react-popover
@radix-ui/react-dropdown-menu
@radix-ui/react-checkbox
@radix-ui/react-tooltip
@radix-ui/react-switch
```

## 2. Componentes de Filtro Disponíveis

| Componente | Uso | Import |
|------------|-----|--------|
| `PeriodFilter` | Seletor de período com presets | `@/components/ui/datatable` |
| `AccountFilter` | Multi-select agrupado por plataforma | `@/components/ui/datatable` |
| `StatusFilter` | Dropdown de status | `@/components/ui/datatable` |
| `ColumnVisibility` | Seletor de colunas visíveis | `@/components/ui/datatable` |
| `ExportDropdown` | Menu de exportação CSV/XLSX | `@/components/ui/datatable` |

## 3. Especificações Visuais (Regra de Ouro)

### 3.1 Toolbar

```css
/* PADRÃO OBRIGATÓRIO */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);                    /* 12px */
  padding: var(--space-3) var(--space-4); /* 12px 16px */
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
```

### 3.2 Search Input

```css
/* PADRÃO OBRIGATÓRIO */
.searchInput {
  height: 36px;
  min-width: 200px;
  max-width: 280px;
  padding-left: calc(var(--space-3) + 20px); /* espaço para ícone */
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.searchInput:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
```

### 3.3 Table Headers

```css
/* PADRÃO OBRIGATÓRIO */
.th {
  padding: var(--space-3) var(--space-4);       /* 12px 16px */
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  font-size: var(--font-size-xs);               /* 12px */
  text-transform: uppercase;                     /* OBRIGATÓRIO */
  letter-spacing: 0.05em;                        /* OBRIGATÓRIO */
  color: var(--color-text-secondary);
  position: sticky;
  top: 0;
  z-index: 20;
  cursor: pointer;
  user-select: none;
}

.th:hover {
  background: var(--color-bg-tertiary);
}
```

### 3.4 Cells

```css
/* PADRÃO OBRIGATÓRIO */
.td {
  padding: var(--space-3) var(--space-4);       /* 12px 16px */
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

/* Métricas numéricas */
.metricCell {
  text-align: right;
  font-variant-numeric: tabular-nums;           /* OBRIGATÓRIO */
}
```

### 3.5 Row Hierarchy

```css
/* PADRÃO OBRIGATÓRIO - Níveis de hierarquia */

/* Level 0 - Linhas principais */
.rowLevel0 {
  background: var(--color-bg-primary);
  font-weight: 500;
}

/* Level 1 - Primeiro nível de expansão */
.rowLevel1 {
  background: var(--color-bg-secondary);
}
.rowLevel1 .td:first-child {
  padding-left: var(--space-6);                 /* 24px indentação */
}

/* Level 2 - Segundo nível de expansão */
.rowLevel2 {
  background: color-mix(in srgb, var(--color-bg-secondary) 70%, var(--color-bg-primary));
}
.rowLevel2 .td:first-child {
  padding-left: var(--space-10);                /* 40px indentação */
}
```

### 3.6 Expand Button

```css
/* PADRÃO OBRIGATÓRIO */
.expandBtn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.expandBtn:hover:not(:disabled) {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.expandBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 3.7 Sort Icons

```css
/* PADRÃO OBRIGATÓRIO */
.sortIcon {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.sortIconActive {
  color: var(--color-primary);
  opacity: 1;
}
```

### 3.8 Skeleton Loading

```css
/* PADRÃO OBRIGATÓRIO */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  height: 16px;
  border-radius: var(--radius-sm);
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 0%,
    var(--color-bg-tertiary) 50%,
    var(--color-bg-secondary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

### 3.9 Pagination

```css
/* PADRÃO OBRIGATÓRIO */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  background: var(--color-bg-primary);
}

.pageButton.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
}
```

## 4. Breakpoints Responsivos

```css
/* PADRÃO OBRIGATÓRIO */
@media (max-width: 1024px) {
  .th, .td {
    padding: var(--space-2) var(--space-3);
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .rowLevel1 .td:first-child { padding-left: var(--space-4); }
  .rowLevel2 .td:first-child { padding-left: var(--space-6); }
}
```

## 5. Uso dos Componentes

### PeriodFilter

```tsx
import { PeriodFilter } from '@/components/ui/datatable'

<PeriodFilter
  value={{ startDate: '2024-01-01', endDate: '2024-01-31' }}
  onChange={(range) => setDateRange(range)}
  preset="7days"
  onPresetChange={setPreset}
/>
```

### AccountFilter

```tsx
import { AccountFilter } from '@/components/ui/datatable'

<AccountFilter
  groups={[
    {
      label: 'Google Ads',
      platform: 'google',
      options: [{ id: '1', name: 'Conta 1' }]
    },
    {
      label: 'Meta Ads',
      platform: 'meta',
      options: [{ id: '2', name: 'Conta 2' }]
    }
  ]}
  selectedIds={selectedAccountIds}
  onChange={setSelectedAccountIds}
/>
```

### ColumnVisibility

```tsx
import { ColumnVisibility } from '@/components/ui/datatable'

<ColumnVisibility
  columns={[
    { id: 'name', label: 'Nome', defaultVisible: true },
    { id: 'status', label: 'Status', defaultVisible: true },
    { id: 'budget', label: 'Orçamento', defaultVisible: false },
  ]}
  visibleColumns={visibleCols}
  onChange={setVisibleCols}
/>
```

### ExportDropdown

```tsx
import { ExportDropdown } from '@/components/ui/datatable'

<ExportDropdown
  onExport={(format) => handleExport(format)}
  isExporting={isExporting}
/>
```

### StatusFilter

```tsx
import { StatusFilter } from '@/components/ui/datatable'

<StatusFilter
  value={statusFilter}
  onChange={setStatusFilter}
  options={[
    { value: 'active', label: 'Ativo', color: '#10B981' },
    { value: 'paused', label: 'Pausado', color: '#F59E0B' },
    { value: 'removed', label: 'Removido', color: '#EF4444' },
  ]}
/>
```

## 6. O Que NUNCA Fazer

1. ❌ **Implementar dropdown/popover manual** - Usar shadcn/ui
2. ❌ **Headers sem uppercase** - SEMPRE uppercase
3. ❌ **Headers sem letter-spacing** - SEMPRE 0.05em
4. ❌ **Font-size de header diferente de 12px** - SEMPRE var(--font-size-xs)
5. ❌ **Números sem tabular-nums** - SEMPRE usar para métricas
6. ❌ **Hardcoded colors** - SEMPRE usar CSS variables
7. ❌ **Checkbox/Switch customizado** - Usar shadcn/ui
8. ❌ **Tooltip customizado** - Usar shadcn/ui Tooltip
9. ❌ **Select nativo** - Usar shadcn/ui Select

## 7. Checklist de Code Review

- [ ] Headers estão uppercase com letter-spacing?
- [ ] Font-size dos headers é 12px (--font-size-xs)?
- [ ] Métricas numéricas têm tabular-nums?
- [ ] Usando componentes shadcn/ui para interações?
- [ ] Hierarquia de linhas segue o padrão de indentação?
- [ ] Skeleton loading usa animação shimmer?
- [ ] Toolbar tem background secundário e border?
- [ ] Responsivo implementado nos breakpoints corretos?
