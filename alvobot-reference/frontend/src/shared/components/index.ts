// Shared UI components barrel export

// Core components
export { Button, type ButtonProps } from './Button'
export { Input, type InputProps } from './Input'
export { Modal, type ModalProps } from './Modal'
export { Card, CardHeader, CardBody, CardFooter, type CardProps, type CardHeaderProps, type CardBodyProps, type CardFooterProps } from './Card'
export { Alert, type AlertProps } from './Alert'
export { Spinner, LoadingOverlay, type SpinnerProps, type LoadingOverlayProps } from './Spinner'
export { Select, type SelectProps, type SelectOption } from './Select'
export { Table, TableHead, TableBody, TableRow, TableHeader, TableCell, type TableProps, type TableHeadProps, type TableBodyProps, type TableRowProps, type TableHeaderProps, type TableCellProps } from './Table'
export { EmptyState, type EmptyStateProps } from './EmptyState'
export { Checkbox, type CheckboxProps } from './Checkbox'
export { Textarea, type TextareaProps } from './Textarea'
export { SearchableSelect, type SearchableSelectProps, type SearchableSelectOption } from './SearchableSelect'
export { MultiSelect, type MultiSelectProps, type MultiSelectOption } from './MultiSelect'
export { DropdownSelect, type DropdownSelectProps, type DropdownSelectOption, type DropdownSelectGroup } from './DropdownSelect'
export { Toggle, type ToggleProps } from './Toggle'
export { ToastProvider, toast, showToast, type ToastProviderProps } from './Toast'

// Skeleton components
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonAvatarProps,
  type SkeletonButtonProps,
} from './Skeleton'

// Badge components
export {
  Badge,
  StatusBadge,
  CounterBadge,
  type BadgeProps,
  type StatusBadgeProps,
  type CounterBadgeProps,
} from './Badge'

// Progress components
export {
  Progress,
  CircularProgress,
  IndeterminateProgress,
  type ProgressProps,
  type CircularProgressProps,
  type IndeterminateProgressProps,
} from './Progress'

// Tooltip
export {
  Tooltip,
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
  TooltipProvider,
  type TooltipProps,
} from './Tooltip'

// Row actions menu (kebab)
export { RowActionsMenu, type RowActionsMenuProps, type RowActionItem } from './RowActionsMenu'

// HelpTooltip (Contextual help icon)
export { HelpTooltip, type HelpTooltipProps } from './HelpTooltip'

// Popover
export {
  Popover,
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverAnchor,
  type PopoverProps,
} from './Popover'

// Tabs
export { Tabs, TabPanel, type TabsProps, type TabPanelProps, type Tab } from './Tabs'

// Accordion
export {
  Accordion,
  AccordionPanel,
  type AccordionProps,
  type AccordionPanelProps,
  type AccordionItemData,
} from './Accordion'

// DataTable (Advanced table with TanStack Table)
export {
  DataTable,
  createColumnHelper,
  type DataTableProps,
  type ColumnDef,
} from './DataTable'

// BentoGrid layout
export {
  BentoGrid,
  BentoItem,
  type BentoGridProps,
  type BentoItemProps,
} from './BentoGrid'

// Glassmorphism utilities
export {
  Glass,
  GlassCard,
  GlassPanel,
  GlassButton,
  GlassInput,
  GlassBadge,
  GlassOverlay,
  type GlassProps,
  type GlassCardProps,
  type GlassPanelProps,
  type GlassButtonProps,
  type GlassInputProps,
  type GlassBadgeProps,
  type GlassOverlayProps,
} from './Glass'

// NotificationBell
export { NotificationBell } from './NotificationBell'

// MaskedValue (Privacy mode)
export {
  MaskedValue,
  useMaskedValue,
  type MaskedValueProps,
  type MaskType,
} from './MaskedValue'

// SummaryCardsGrid (Dashboard metric cards)
export {
  SummaryCardsGrid,
  type SummaryCardsGridProps,
  type CardConfig,
} from './SummaryCardsGrid'

// TableToolbar (Standardized table toolbar)
export {
  TableToolbar,
  type TableToolbarProps,
  type ColumnConfig,
} from './TableToolbar'

// Page Layout Components (Unified Dashboard Standard)
export { PageLayout, type PageLayoutProps } from './PageLayout'
export { PageHeader, type PageHeaderProps } from './PageHeader'
export { FilterBar, type FilterBarProps } from './FilterBar'
export { ContentTabs, type ContentTabsProps, type Tab as ContentTab } from './ContentTabs'
export { PageNav, type PageNavProps, type PageNavItem } from './PageNav'// Period Selection (PADRÃO ÚNICO - usar este em todas as páginas)
export {
  PeriodSelector,
  type PeriodSelectorProps,
  type DateRange,
  type PeriodPreset,
  getPresetRange,
  detectPreset,
  getDefault7DayRange,
  getDefault30DayRange,
} from './PeriodSelector'