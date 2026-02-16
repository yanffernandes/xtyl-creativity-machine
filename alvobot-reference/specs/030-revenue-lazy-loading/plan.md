# Revenue Dashboard - Lazy Loading + Redis Cache

## Problema Atual

1. **Carregamento inicial pesado**: Busca TODOS os dados de uma vez ao carregar a página
2. **Cache in-memory limitado**: 100 entries máximo, perdido ao reiniciar servidor
3. **Dados históricos rebuscados**: Dados de ontem pra trás são rebuscados a cada load
4. **Sem lazy loading**: Todas as dimensões são carregadas mesmo sem expandir

## Solução Proposta

### Arquitetura de 3 Camadas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Load inicial: apenas TOTAIS (sem dimensões)                  │   │
│  │  2. Expand on-click: busca dimensão específica                   │   │
│  │  3. React Query cache: evita rebuscar dados já carregados        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS)                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  1. Novo endpoint: /report/summary (totais sem dimensões)        │   │
│  │  2. Endpoint existente: /report/expand (dimensão on-demand)      │   │
│  │  3. Redis cache com TTL inteligente                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           REDIS CACHE                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TTL Inteligente:                                                │   │
│  │  • Dados históricos (≤ ontem): 24h+ (dados não mudam)            │   │
│  │  • Dados de hoje: 15 min (pode mudar)                            │   │
│  │  • Período misto: 15 min (contém dados de hoje)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Redis Cache Service (Backend)

### 1.1 Criar Redis Cache Module

**Arquivo**: `backend/src/common/cache/redis-cache.module.ts`

```typescript
// Configuração do cache Redis para reports
// Reutilizar conexão existente do BullMQ

import { Module, Global } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-store'
import { createRedisConnection } from '../queues/bulk-operations.queue'

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => {
        const connection = createRedisConnection()
        return {
          store: redisStore,
          host: connection.host,
          port: connection.port,
          password: connection.password,
          ttl: 900, // Default 15 min
          max: 10000, // Muito mais que 100
        }
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
```

### 1.2 Criar Revenue Cache Service

**Arquivo**: `backend/src/modules/ad-manager/services/revenue-cache.service.ts`

```typescript
// Serviço de cache com TTL inteligente
// Dados históricos = TTL longo (24h)
// Dados de hoje = TTL curto (15min)

export class RevenueCacheService {
  // Determina TTL baseado no período
  calculateTTL(startDate: string, endDate: string): number {
    const today = new Date().toISOString().split('T')[0]
    const isHistorical = endDate < today

    if (isHistorical) {
      return 24 * 60 * 60 // 24 horas para dados históricos
    }
    return 15 * 60 // 15 minutos para dados que incluem hoje
  }

  // Cache keys com namespace
  buildCacheKey(type: 'summary' | 'expand', params: object): string {
    return `revenue:${type}:${JSON.stringify(params)}`
  }

  // Invalidação por padrão (Redis suporta!)
  async invalidatePattern(pattern: string): Promise<void> {
    // Redis SCAN + DEL para invalidar por padrão
  }
}
```

---

## Fase 2: Novo Endpoint de Summary (Backend)

### 2.1 Endpoint `/report/summary`

**Objetivo**: Retornar apenas métricas agregadas, SEM dimensões detalhadas

**Request**:
```typescript
POST /ad-manager/report/summary
{
  connectionId: string
  networkId: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}
```

**Response**:
```typescript
{
  metrics: {
    revenue: number      // Total em dólares
    impressions: number
    clicks: number
    requests: number
    ctr: number
    cpc: number
    rpm: number
    viewability: number
  }
  metadata: {
    networkId: string
    currencyCode: string
    dateRange: { start: string; end: string }
    cachedAt: string | null
    cacheExpiresAt: string | null  // NOVO: quando o cache expira
  }
}
```

**Implementação Backend**:
```typescript
// ad-manager-report.service.ts

async getSummary(dto: SummaryRequestDto, userId: string) {
  const cacheKey = this.cacheService.buildCacheKey('summary', {
    connectionId: dto.connectionId,
    networkId: dto.networkId,
    startDate: dto.startDate,
    endDate: dto.endDate,
  })

  // Check Redis cache
  const cached = await this.redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Buscar da API do Google (sem dimensões = mais rápido!)
  const metrics = await this.fetchSummaryFromGoogle(dto)

  // Calcular TTL inteligente
  const ttl = this.cacheService.calculateTTL(dto.startDate, dto.endDate)

  // Salvar no Redis
  await this.redis.set(cacheKey, JSON.stringify(result), 'EX', ttl)

  return result
}
```

### 2.2 Atualizar Endpoint `/report/expand`

**Modificações**:
1. Usar Redis em vez de cache in-memory
2. TTL inteligente por período
3. Suportar múltiplos níveis de expansão

---

## Fase 3: Refatoração Frontend

### 3.1 Novo Hook: `useLazyRevenueData`

**Arquivo**: `frontend/src/features/revenue-dashboard/hooks/useLazyRevenueData.ts`

```typescript
// Hook com lazy loading e cache
// 1. Carrega apenas summary no mount
// 2. Expande on-demand quando usuário clica

interface LazyRevenueResult {
  // Summaries por network/account (carregados imediatamente)
  summaries: Map<string, SummaryData>
  summaryLoading: boolean

  // Dados expandidos (carregados on-demand)
  expandedData: Map<string, ExpandedData>

  // Ações
  expand: (key: string, groupBy: string) => Promise<void>
  collapse: (key: string) => void

  // Estado combinado
  totalSummary: UnifiedRevenueSummary
  isLoading: boolean
  errors: Error[]
}

export function useLazyRevenueData(params: LazyRevenueParams): LazyRevenueResult {
  // Estado local para dados expandidos
  const [expandedData, setExpandedData] = useState(new Map())

  // Query para summaries (carrega automaticamente)
  const summaryQueries = useQueries({
    queries: [...networksToFetch, ...accountsToFetch].map(source => ({
      queryKey: ['revenue', 'summary', source.id, startDate, endDate],
      queryFn: () => fetchSummary(source),
      staleTime: 15 * 60 * 1000, // 15 min
      gcTime: 60 * 60 * 1000,    // 60 min
    }))
  })

  // Função para expandir on-demand
  const expand = useCallback(async (key: string, groupBy: string) => {
    // Verificar se já tem no cache local
    if (expandedData.has(key)) return

    // Buscar do backend
    const data = await api.post('/ad-manager/report/expand', {
      parentKey: key,
      subGroupBy: groupBy,
      // ...
    })

    setExpandedData(prev => new Map(prev).set(key, data))
  }, [expandedData])

  return { summaries, expand, collapse, totalSummary, isLoading, errors }
}
```

### 3.2 Atualizar `SiteAnalysisTable`

**Mudanças**:

1. **Estrutura hierárquica lazy**:
```typescript
// Antes: todas as rows pré-carregadas
<Row key={row.id} data={row} />

// Depois: rows carregadas on-demand
<Row
  key={row.id}
  summary={row}
  onExpand={() => expand(row.id, currentSubGroupBy)}
  expandedChildren={expandedData.get(row.id)}
  isExpanding={expandingKeys.has(row.id)}
/>
```

2. **Loading state por row**:
```typescript
// Spinner inline quando expandindo
{isExpanding && <Loader2 className={styles.rowSpinner} />}
```

3. **Cache de expansões**:
```typescript
// Não rebuscar se já expandiu antes
// React Query cuida disso automaticamente
```

### 3.3 Atualizar `AdManagerDashboardPage`

**Simplificações**:
- Remover `useSequentialRevenueData` complexo
- Usar novo `useLazyRevenueData`
- Progress bar mais simples (apenas summaries)

---

## Fase 4: TTL Inteligente

### 4.1 Lógica de TTL

```typescript
function calculateCacheTTL(startDate: string, endDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  // Dados 100% históricos (endDate < hoje)
  if (end < today) {
    // TTL longo - dados não mudam mais
    return 7 * 24 * 60 * 60 // 7 dias
  }

  // Dados incluem hoje
  return 15 * 60 // 15 minutos
}
```

### 4.2 Cache Keys Structure

```
revenue:summary:{connectionId}:{networkId}:{startDate}:{endDate}
revenue:expand:{connectionId}:{networkId}:{startDate}:{endDate}:{groupBy}:{parentKey}
```

### 4.3 Invalidação por Padrão

```typescript
// Invalidar todos os caches de um network
await redis.eval(`
  local keys = redis.call('KEYS', 'revenue:*:${connectionId}:${networkId}:*')
  for i, key in ipairs(keys) do
    redis.call('DEL', key)
  end
  return #keys
`)
```

---

## Fase 5: Migração de Cache In-Memory para Redis

### 5.1 Atualizar `AdManagerModule`

```typescript
// Antes
CacheModule.register({
  ttl: 15 * 60 * 1000,
  max: 100,
})

// Depois
RedisCacheModule // Global module com Redis
```

### 5.2 Atualizar Services

- `AdManagerReportService` → usar Redis
- `AdSenseApiService` → usar Redis
- Manter interface compatível (get/set)

---

## Fase 6: Métricas e Observabilidade

### 6.1 Cache Hit/Miss Metrics

```typescript
// Log cache performance
this.logger.log({
  event: 'cache_access',
  type: 'summary' | 'expand',
  hit: boolean,
  ttl: number,
  networkId: string,
})
```

### 6.2 Cache Stats Endpoint (Admin)

```typescript
GET /admin/cache/stats
{
  totalKeys: number
  hitRate: number
  memoryUsage: string
  topKeys: Array<{ key: string; hits: number }>
}
```

---

## Estimativa de Ganhos

### Performance

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Tempo load inicial | 5-15s | 1-3s | 70-80% |
| Dados transferidos | 500KB-2MB | 10-50KB | 95% |
| Requests por load | N (networks) | N (summaries) | Igual, mas mais leves |
| Requests por expand | 0 | 1 | Trade-off aceitável |

### Cache

| Cenário | TTL Atual | TTL Novo |
|---------|-----------|----------|
| Dados históricos | 15 min | 7 dias |
| Dados de hoje | 15 min | 15 min |
| Dados mistos | 15 min | 15 min |

---

## Ordem de Implementação

### Sprint 1: Backend Redis Cache
- [ ] Criar `RedisCacheModule`
- [ ] Criar `RevenueCacheService`
- [ ] Migrar `AdManagerReportService` para Redis
- [ ] Migrar `AdSenseApiService` para Redis
- [ ] Testar cache hit/miss

### Sprint 2: Backend Summary Endpoint
- [ ] Criar DTO `SummaryRequestDto`
- [ ] Implementar `/report/summary` endpoint
- [ ] Implementar TTL inteligente
- [ ] Atualizar `/report/expand` com Redis
- [ ] Testes de integração

### Sprint 3: Frontend Lazy Loading
- [ ] Criar hook `useLazyRevenueData`
- [ ] Atualizar `SiteAnalysisTable` para lazy expand
- [ ] Adicionar loading states por row
- [ ] Atualizar `AdManagerDashboardPage`
- [ ] Remover `useSequentialRevenueData` (deprecated)

### Sprint 4: Polish e Otimizações
- [ ] Cache warming para dados históricos
- [ ] Prefetch inteligente (expandir próximos?)
- [ ] Métricas de cache
- [ ] Documentação

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Redis não disponível | Baixa | Alto | Fallback para in-memory |
| Cache desatualizado | Média | Médio | Botão "Atualizar" + invalidação |
| UX de expand lento | Baixa | Médio | Loading inline + prefetch |
| Breaking changes | Média | Alto | Manter endpoints legados |

---

## Decisões de Design

### Por que não usar Supabase para cache?

1. **Latência**: Redis é in-memory, Supabase é disco
2. **TTL nativo**: Redis tem EXPIRE, Supabase precisa de cronjob
3. **Pattern matching**: Redis SCAN/KEYS, Supabase precisa de query
4. **Já tem Redis**: BullMQ já usa, infraestrutura pronta

### Por que separar summary de expand?

1. **Menos dados**: Summary retorna ~100 bytes, expand pode ser 100KB+
2. **Cache mais eficiente**: Summaries raramente mudam
3. **UX melhor**: Usuário vê dados imediatos, expande se quiser
4. **API Google mais rápida**: Sem dimensões = menos processamento

### Por que TTL de 7 dias para histórico?

1. **Dados não mudam**: Receita de ontem não vai mudar
2. **Economia de API calls**: Google tem quotas
3. **Economia de processamento**: Menos parse de reports
4. **Ainda pode invalidar**: Botão "Forçar atualização"
