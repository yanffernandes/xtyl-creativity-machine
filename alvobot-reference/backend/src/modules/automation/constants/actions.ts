// ============================================================================
// AUTOMATION ENGINE — ACTION DEFINITIONS
// All available automation actions, organized by platform + level availability.
// ============================================================================

export interface ActionDefinition {
  slug: string;
  label: string;
  category: string;
  description?: string;
  requiresParams: boolean;
}

// ============================================================================
// ALL ACTIONS (16 total)
// ============================================================================

export const ALL_ACTIONS: ActionDefinition[] = [
  // ── Status ──
  {
    slug: 'pause',
    label: 'Pausar',
    category: 'Status',
    description: 'Pausa a entidade',
    requiresParams: false,
  },
  {
    slug: 'start',
    label: 'Ativar',
    category: 'Status',
    description: 'Ativa a entidade',
    requiresParams: false,
  },
  {
    slug: 'extend_end_date',
    label: 'Estender Data Final',
    category: 'Status',
    description: 'Estende a data de encerramento',
    requiresParams: true,
  },

  // ── Budget ──
  {
    slug: 'increase_budget',
    label: 'Aumentar Budget',
    category: 'Budget',
    description: 'Aumenta o orçamento por % ou valor fixo',
    requiresParams: true,
  },
  {
    slug: 'decrease_budget',
    label: 'Diminuir Budget',
    category: 'Budget',
    description: 'Diminui o orçamento por % ou valor fixo',
    requiresParams: true,
  },
  {
    slug: 'set_budget',
    label: 'Definir Budget',
    category: 'Budget',
    description: 'Define um orçamento fixo',
    requiresParams: true,
  },
  {
    slug: 'scale_budget_by_target',
    label: 'Escalar Budget por Target',
    category: 'Budget',
    description: 'Ajusta o budget proporcionalmente a uma métrica-alvo',
    requiresParams: true,
  },

  // ── Bid ──
  {
    slug: 'increase_bid',
    label: 'Aumentar Bid',
    category: 'Bid',
    description: 'Aumenta o lance por % ou valor fixo',
    requiresParams: true,
  },
  {
    slug: 'decrease_bid',
    label: 'Diminuir Bid',
    category: 'Bid',
    description: 'Diminui o lance por % ou valor fixo',
    requiresParams: true,
  },
  {
    slug: 'set_bid',
    label: 'Definir Bid',
    category: 'Bid',
    description: 'Define um lance fixo',
    requiresParams: true,
  },
  {
    slug: 'set_bid_strategy',
    label: 'Alterar Estratégia de Bid',
    category: 'Bid',
    description: 'Altera a estratégia de lances da campanha',
    requiresParams: true,
  },

  // ── Criação ──
  {
    slug: 'duplicate',
    label: 'Duplicar',
    category: 'Criação',
    description: 'Cria uma cópia da entidade',
    requiresParams: true,
  },

  // ── Naming ──
  {
    slug: 'add_to_name',
    label: 'Adicionar ao Nome',
    category: 'Naming',
    description: 'Adiciona texto ao nome da entidade',
    requiresParams: true,
  },
  {
    slug: 'remove_from_name',
    label: 'Remover do Nome',
    category: 'Naming',
    description: 'Remove texto do nome da entidade',
    requiresParams: true,
  },
  {
    slug: 'replace_in_name',
    label: 'Substituir no Nome',
    category: 'Naming',
    description: 'Substitui texto no nome da entidade',
    requiresParams: true,
  },

  // ── Notificação ──
  {
    slug: 'notify',
    label: 'Notificar',
    category: 'Notificação',
    description: 'Envia notificação por email',
    requiresParams: true,
  },
];

// ============================================================================
// ACTIONS BY PLATFORM + LEVEL
// Maps which action slugs are available for each platform + entity level.
// ============================================================================

export const ACTIONS_BY_PLATFORM_LEVEL: Record<
  string,
  Record<string, string[]>
> = {
  meta: {
    campaign: [
      'pause',
      'start',
      'extend_end_date',
      'increase_budget',
      'decrease_budget',
      'set_budget',
      'scale_budget_by_target',
      'set_bid_strategy',
      'duplicate',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    adset: [
      'pause',
      'start',
      'extend_end_date',
      'increase_budget',
      'decrease_budget',
      'set_budget',
      'scale_budget_by_target',
      'increase_bid',
      'decrease_bid',
      'set_bid',
      'duplicate',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    ad: [
      'pause',
      'start',
      'duplicate',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    ad_account: ['notify'],
  },
  google: {
    campaign: [
      'pause',
      'start',
      'extend_end_date',
      'increase_budget',
      'decrease_budget',
      'set_budget',
      'scale_budget_by_target',
      'set_bid_strategy',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    ad_group: [
      'pause',
      'start',
      'increase_bid',
      'decrease_bid',
      'set_bid',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    ad: [
      'pause',
      'start',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    keyword: [
      'pause',
      'start',
      'increase_bid',
      'decrease_bid',
      'set_bid',
      'add_to_name',
      'remove_from_name',
      'replace_in_name',
      'notify',
    ],
    ad_account: ['notify'],
  },
};

// ============================================================================
// ACTION CATEGORIES
// ============================================================================

export const ACTION_CATEGORIES = [
  'Status',
  'Budget',
  'Bid',
  'Criação',
  'Naming',
  'Notificação',
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all action slugs available for a given platform + level.
 */
export function getActionSlugsForPlatformLevel(
  platform: string,
  level: string,
): string[] {
  return ACTIONS_BY_PLATFORM_LEVEL[platform]?.[level] ?? [];
}

/**
 * Get full ActionDefinition objects for a given platform + level.
 */
export function getActionsForPlatformLevel(
  platform: string,
  level: string,
): ActionDefinition[] {
  const slugs = getActionSlugsForPlatformLevel(platform, level);
  return ALL_ACTIONS.filter((a) => slugs.includes(a.slug));
}

/**
 * Find a single action definition by slug.
 */
export function findAction(slug: string): ActionDefinition | undefined {
  return ALL_ACTIONS.find((a) => a.slug === slug);
}

/**
 * Check if an action is available for a given platform + level.
 */
export function isActionAvailable(
  platform: string,
  level: string,
  actionSlug: string,
): boolean {
  const slugs = getActionSlugsForPlatformLevel(platform, level);
  return slugs.includes(actionSlug);
}
