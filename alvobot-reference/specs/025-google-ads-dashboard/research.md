# Research: Google Ads Performance Dashboard & Automation Engine

**Feature**: 025-google-ads-dashboard
**Date**: 2026-01-13

## 1. Google Ads API - Campaign Metrics Query

### Decision
Usar GAQL (Google Ads Query Language) para buscar métricas de campanhas com a biblioteca `google-ads-api`.

### Rationale
- GAQL é a forma oficial e mais eficiente de consultar dados no Google Ads API v17+
- Permite selecionar apenas os campos necessários, reduzindo payload
- Suporta filtros, ordenação e segmentação por período

### Implementation Details

```typescript
// GAQL Query para métricas de campanhas
const query = `
  SELECT
    campaign.id,
    campaign.name,
    campaign.status,
    campaign.advertising_channel_type,
    campaign_budget.amount_micros,
    metrics.impressions,
    metrics.clicks,
    metrics.ctr,
    metrics.cost_micros,
    metrics.conversions,
    metrics.conversions_value,
    metrics.cost_per_conversion,
    metrics.conversions_from_interactions_rate
  FROM campaign
  WHERE campaign.status != 'REMOVED'
    AND segments.date DURING LAST_7_DAYS
  ORDER BY metrics.cost_micros DESC
`;

// Campos calculados no backend:
// - CTR = clicks / impressions (já vem calculado)
// - CPA = cost_micros / conversions
// - ROAS = conversions_value / (cost_micros / 1_000_000)
```

### Alternatives Considered
- **Google Ads Reports API**: Descartado - mais complexo, melhor para relatórios em batch
- **REST API direta**: Descartado - a biblioteca `google-ads-api` já abstrai isso

---

## 2. Google Ads API - Campaign Mutations

### Decision
Usar `CampaignService.mutateCampaigns()` para pausar/ativar e `CampaignBudgetService.mutateCampaignBudgets()` para alterar orçamento.

### Rationale
- Métodos oficiais da API para mutações
- Suportam operações em batch (múltiplas campanhas de uma vez)
- Retornam erros detalhados por operação

### Implementation Details

```typescript
// Pausar/Ativar campanha
const operation = {
  updateMask: { paths: ['status'] },
  update: {
    resourceName: `customers/${customerId}/campaigns/${campaignId}`,
    status: enums.CampaignStatus.PAUSED // ou ENABLED
  }
};
await customer.campaigns.mutate([operation]);

// Alterar orçamento
const budgetOperation = {
  updateMask: { paths: ['amount_micros'] },
  update: {
    resourceName: `customers/${customerId}/campaignBudgets/${budgetId}`,
    amountMicros: newBudgetInMicros // valor em micros (R$10 = 10_000_000)
  }
};
await customer.campaignBudgets.mutate([budgetOperation]);
```

### Alternatives Considered
- **Batch API**: Considerado para operações em massa, mas overkill para ações individuais

---

## 3. Google Ads API - Campaign Duplication

### Decision
Duplicar campanha requer criar novos recursos: Campaign → AdGroups → Ads → Keywords. Não existe operação "copy" nativa.

### Rationale
- Google Ads API não oferece operação de duplicação built-in
- Precisamos ler a campanha original e criar novos recursos com mesmas configurações
- Nome da cópia recebe sufixo " - Cópia" ou " (2)"

### Implementation Details

```typescript
// Fluxo de duplicação:
// 1. Buscar campanha original com todos os recursos
const originalCampaign = await getCampaignWithDetails(campaignId);

// 2. Criar nova campanha com mesmas configs
const newCampaign = await createCampaign({
  ...originalCampaign,
  name: `${originalCampaign.name} - Cópia`,
  status: 'PAUSED' // sempre criar pausada por segurança
});

// 3. Duplicar ad groups
for (const adGroup of originalCampaign.adGroups) {
  const newAdGroup = await createAdGroup(newCampaign.id, adGroup);

  // 4. Duplicar ads
  for (const ad of adGroup.ads) {
    await createAd(newAdGroup.id, ad);
  }

  // 5. Duplicar keywords
  for (const keyword of adGroup.keywords) {
    await createKeyword(newAdGroup.id, keyword);
  }
}
```

### Alternatives Considered
- **Copy via UI only**: Não é opção - usuário quer fazer pelo AlvoBot
- **Template system**: Futuro - salvar campanha como template para reutilizar

---

## 4. NestJS Scheduler - Automation Jobs

### Decision
Usar `@nestjs/schedule` com cron jobs dinâmicos para executar automações.

### Rationale
- Integração nativa com NestJS
- Suporta cron expressions configuráveis
- Pode ser combinado com bull/redis para filas mais robustas se necessário

### Implementation Details

```typescript
// automation-runner.job.ts
@Injectable()
export class AutomationRunnerJob {
  constructor(
    private automationService: GoogleAutomationService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  @Cron('0 * * * *') // A cada hora - job master que verifica automações
  async runAutomations() {
    // 1. Buscar todas as automações ativas
    const automations = await this.automationService.getActiveAutomations();

    // 2. Para cada automação, verificar se é hora de executar
    for (const automation of automations) {
      if (this.shouldRun(automation)) {
        await this.evaluateAndExecute(automation);
      }
    }
  }

  private shouldRun(automation: AutomationRule): boolean {
    // Verificar frequência configurada pelo usuário
    // Verificar cooldown desde última execução
    // Verificar limite de execuções
  }

  private async evaluateAndExecute(automation: AutomationRule) {
    // 1. Buscar campanhas que matcham o escopo/filtro
    // 2. Para cada campanha, avaliar condições
    // 3. Se condições atendidas, executar ação
    // 4. Registrar no histórico
  }
}
```

### Alternatives Considered
- **Temporal.io**: Já usado no projeto, mas overkill para cron simples
- **Bull queues**: Considerado para escala, pode ser adicionado depois
- **External cron (AWS EventBridge)**: Descartado - mais complexidade operacional

---

## 5. Condition Builder UI

### Decision
Usar estrutura de árvore com grupos (AND/OR) e condições folha, similar ao padrão de query builders.

### Rationale
- Padrão bem estabelecido em ferramentas de automação (Zapier, n8n, Google Ads rules)
- Permite condições complexas sem código
- Fácil de serializar para JSON e avaliar no backend

### Implementation Details

```typescript
// Estrutura de dados para condições
interface ConditionGroup {
  type: 'group';
  operator: 'AND' | 'OR';
  children: (ConditionGroup | Condition)[];
}

interface Condition {
  type: 'condition';
  metric: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'conversions' | 'cpa' | 'runtime_hours';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  period?: 'today' | 'last_24h' | 'last_7d' | 'last_30d';
}

// Exemplo: "(CTR < 1% E custo > R$50) OU (impressões = 0 E tempo > 4h)"
const exampleCondition: ConditionGroup = {
  type: 'group',
  operator: 'OR',
  children: [
    {
      type: 'group',
      operator: 'AND',
      children: [
        { type: 'condition', metric: 'ctr', operator: '<', value: 0.01 },
        { type: 'condition', metric: 'cost', operator: '>', value: 50 }
      ]
    },
    {
      type: 'group',
      operator: 'AND',
      children: [
        { type: 'condition', metric: 'impressions', operator: '==', value: 0 },
        { type: 'condition', metric: 'runtime_hours', operator: '>', value: 4 }
      ]
    }
  ]
};
```

### UI Component Pattern

```tsx
// ConditionBuilder.tsx
<ConditionGroup operator="OR">
  <ConditionGroup operator="AND">
    <ConditionRow metric="ctr" operator="<" value={0.01} />
    <ConditionRow metric="cost" operator=">" value={50} />
  </ConditionGroup>
  <ConditionGroup operator="AND">
    <ConditionRow metric="impressions" operator="==" value={0} />
    <ConditionRow metric="runtime_hours" operator=">" value={4} />
  </ConditionGroup>
</ConditionGroup>
```

### Alternatives Considered
- **Simple AND-only**: Muito limitado para casos de uso reais
- **Code editor**: Complexo demais para usuários não-técnicos
- **Visual flow builder**: Overkill - condições são suficientes

---

## 6. Cache Strategy for Metrics

### Decision
Usar cache em memória com TTL de 5 minutos no backend para métricas de campanhas.

### Rationale
- Evita chamadas excessivas à API do Google Ads
- Dashboard pode ser recarregado várias vezes sem penalidade
- TTL curto garante dados relativamente frescos

### Implementation Details

```typescript
// No NestJS, usar @nestjs/cache-manager
@Injectable()
export class GoogleDashboardService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getCampaignMetrics(customerId: string, period: string): Promise<CampaignMetrics[]> {
    const cacheKey = `campaigns:${customerId}:${period}`;

    // Tentar cache primeiro
    const cached = await this.cacheManager.get<CampaignMetrics[]>(cacheKey);
    if (cached) return cached;

    // Buscar da API
    const metrics = await this.fetchFromGoogleAds(customerId, period);

    // Cachear por 5 minutos
    await this.cacheManager.set(cacheKey, metrics, 300_000);

    return metrics;
  }
}
```

### Alternatives Considered
- **Redis**: Overkill para cache de curta duração
- **Frontend cache only (React Query)**: Não protege contra múltiplos usuários/tabs
- **No cache**: Risco de rate limiting

---

## Summary

| Topic | Decision | Key Reason |
|-------|----------|------------|
| Metrics Query | GAQL via google-ads-api | Oficial, eficiente, flexível |
| Campaign Actions | CampaignService.mutate() | API oficial para mutações |
| Duplication | Criar novos recursos | Não existe copy nativo |
| Scheduler | @nestjs/schedule | Simples, integrado ao NestJS |
| Condition Builder | Tree structure (groups + conditions) | Padrão estabelecido, flexível |
| Cache | In-memory, 5min TTL | Protege rate limits, dados frescos |
