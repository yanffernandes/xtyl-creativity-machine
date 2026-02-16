# Automação de Anúncios — Especificação Técnica Completa

**Versão:** 3.0 — Dev-Ready com Exemplos Reais
**Data:** 06/02/2026
**Plataformas:** Meta Ads (Facebook/Instagram) + Google Ads

---

## 1. Visão Geral do Sistema

### 1.1 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION ENGINE                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  CRON    │ → │ FILTROS  │ → │ GATILHOS │ → │  AÇÕES   │     │
│  │ Scheduler│   │ (Scope)  │   │(Conditions)│  │ (Tasks)  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│        │                                            │           │
│        ▼                                            ▼           │
│  ┌──────────┐                                 ┌──────────┐      │
│  │ Timezone │                                 │ NOTIFIC. │      │
│  │ Manager  │                                 │ (Email)  │      │
│  └──────────┘                                 └──────────┘      │
├─────────────────────────────────────────────────────────────────┤
│                      DATA SOURCES                               │
│  ┌────────────┐  ┌────────────┐                                │
│  │  Meta Ads  │  │ Google Ads │                                │
│  │    API     │  │    API     │                                │
│  └────────────┘  └────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Plataformas Suportadas

| Plataforma | Níveis Hierárquicos | Max Contas/Regra |
|---|---|---|
| **Meta Ads** | Campaign → Ad Set → Ad → (Ad Account*) | 5 (mesma moeda) |
| **Google Ads** | Campaign → Ad Group → Ad / Keyword → (Ad Account*) | 1 |

\* Ad Account level restrito a ações de notificação apenas.

### 1.3 Limites Globais

| Limite | Valor | Mitigação |
|---|---|---|
| Entidades por regra | 2.000 | Adicionar filtro `Impressions Last 30d > 0` |
| Contas Meta por regra | 5 | Devem ter mesma moeda |
| Contas Google por regra | 1 | — |
| Campaign types Google por regra | 1 | Criar regras separadas por tipo |

---

## 2. Objeto Principal: `AutomationRule`

### 2.1 Schema Completo

```json
{
  "id": "rule_uuid_here",
  "name": "string (max 255 chars)",
  "description": "string (max 1000 chars)",
  "status": "active | paused | draft",
  
  "platform": "meta | google",
  "ad_account_ids": ["string"],
  "google_campaign_type": "search | display | shopping | app | performance_max | demand_gen | null",
  
  "level": "campaign | adset | ad | ad_group | keyword | ad_account",
  "entities_limit": 2000,
  
  "filters": "FilterGroup[]",
  "tasks": "Task[]",
  "schedule": "Schedule",
  
  "timezone": "string (IANA format)",
  "attribution": "AttributionConfig",
  "notifications": "NotificationConfig",
  
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime",
  "last_run_at": "ISO 8601 datetime | null",
  "next_run_at": "ISO 8601 datetime | null"
}
```

### 2.2 Enums Base

**`status`**
| Valor | Descrição | Comportamento |
|---|---|---|
| `active` | Regra ativa | Executa conforme schedule |
| `paused` | Regra pausada | Não executa, mantém configuração |
| `draft` | Rascunho | Nunca executou, editável |

**`platform`**
| Valor | Plataforma |
|---|---|
| `meta` | Meta Ads (Facebook + Instagram) |
| `google` | Google Ads |

**`level`** — Por Plataforma

| Level | Meta Ads | Google Ads | Descrição |
|---|---|---|---|
| `campaign` | ✅ | ✅ | Nível de campanha |
| `adset` | ✅ | — | Ad Set (Meta) |
| `ad_group` | — | ✅ | Ad Group (Google) |
| `ad` | ✅ | ✅ | Anúncio individual |
| `keyword` | — | ✅ | Palavra-chave (Google Search) |
| `ad_account` | ✅ (notify only) | ✅ (notify only) | Conta inteira |

**`google_campaign_type`** — Obrigatório quando `platform: "google"`
| Valor | Descrição | Restrições de Level |
|---|---|---|
| `search` | Campanhas de pesquisa | Todos os levels |
| `display` | Campanhas de display | Todos os levels |
| `shopping` | Campanhas de shopping | Todos os levels |
| `app` | Campanhas de app | Todos os levels |
| `performance_max` | Performance Max | Apenas `campaign` ou `ad_account` |
| `demand_gen` | Demand Gen | Todos os levels |
| `null` | Não aplicável | Quando `platform: "meta"` |

---

## 3. FILTROS (Scope)

Os filtros definem **QUAIS entidades** serão avaliadas pela regra. Estrutura de array de arrays para lógica complexa.

### 3.1 Estrutura de Dados

```json
{
  "filters": [
    [
      { "field": "...", "operator": "...", "value": "..." },
      { "field": "...", "operator": "...", "value": "..." }
    ],
    [
      { "field": "...", "operator": "...", "value": "..." }
    ]
  ]
}
```

**Lógica:**
- Filtros no **mesmo array interno** → conectados por **AND**
- **Arrays diferentes** → conectados por **OR**

### 3.2 Schema do Filtro Individual

```json
{
  "field": "string",
  "operator": "string", 
  "value": "string | number | string[]",
  "period": "string | null"
}
```

### 3.3 Campos Filtráveis — Meta Ads

| Campo | Tipo | Operadores Válidos | Exemplo de Valor |
|---|---|---|---|
| `campaign.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"23851234567890"` |
| `campaign.name` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN`, `START_WITH`, `END_WITH`, `REGEX` | `"Scale"` |
| `campaign.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ACTIVE"` |
| `campaign.effective_status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `["ACTIVE", "PAUSED"]` |
| `campaign.objective` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"OUTCOME_SALES"` |
| `campaign.buying_type` | enum | `EQUAL`, `NOT_EQUAL` | `"AUCTION"` |
| `campaign.bid_strategy` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"LOWEST_COST_WITHOUT_CAP"` |
| `campaign.daily_budget` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `100` |
| `campaign.lifetime_budget` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `1000` |
| `adset.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"23851234567891"` |
| `adset.name` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN`, `START_WITH`, `END_WITH`, `REGEX` | `"Lookalike"` |
| `adset.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ACTIVE"` |
| `adset.effective_status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ACTIVE"` |
| `adset.daily_budget` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `50` |
| `adset.lifetime_budget` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `500` |
| `adset.optimization_goal` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"OFFSITE_CONVERSIONS"` |
| `adset.billing_event` | enum | `EQUAL`, `NOT_EQUAL` | `"IMPRESSIONS"` |
| `adset.destination_type` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"WEBSITE"` |
| `ad.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"23851234567892"` |
| `ad.name` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN`, `START_WITH`, `END_WITH`, `REGEX` | `"Video_01"` |
| `ad.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ACTIVE"` |
| `ad.effective_status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ACTIVE"` |
| `ad.creative_type` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"VIDEO"` |
| `metrics.impressions` | number | `GREATER_THAN`, `LESS_THAN`, `EQUAL`, `BETWEEN` | `1000` |
| `metrics.spend` | number | `GREATER_THAN`, `LESS_THAN`, `EQUAL`, `BETWEEN` | `100` |
| `metrics.reach` | number | `GREATER_THAN`, `LESS_THAN`, `EQUAL`, `BETWEEN` | `5000` |

### 3.4 Campos Filtráveis — Google Ads

| Campo | Tipo | Operadores Válidos | Exemplo de Valor |
|---|---|---|---|
| `campaign.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"123456789"` |
| `campaign.name` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN`, `START_WITH`, `END_WITH`, `REGEX` | `"Brand"` |
| `campaign.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ENABLED"` |
| `campaign.advertising_channel_type` | enum | `EQUAL` | `"SEARCH"` |
| `campaign.bidding_strategy_type` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"TARGET_CPA"` |
| `campaign.budget_amount` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `50` |
| `ad_group.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"987654321"` |
| `ad_group.name` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN`, `START_WITH`, `END_WITH`, `REGEX` | `"Exact Match"` |
| `ad_group.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ENABLED"` |
| `ad_group.type` | enum | `EQUAL`, `NOT_EQUAL` | `"SEARCH_STANDARD"` |
| `ad_group.cpc_bid` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `2.50` |
| `ad.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"111222333"` |
| `ad.name` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN` | `"RSA_01"` |
| `ad.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ENABLED"` |
| `ad.type` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"RESPONSIVE_SEARCH_AD"` |
| `keyword.id` | string | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"444555666"` |
| `keyword.text` | string | `EQUAL`, `CONTAIN`, `NOT_CONTAIN`, `START_WITH`, `END_WITH` | `"comprar"` |
| `keyword.match_type` | enum | `EQUAL`, `NOT_EQUAL`, `IN` | `"EXACT"` |
| `keyword.status` | enum | `EQUAL`, `NOT_EQUAL`, `IN`, `NOT_IN` | `"ENABLED"` |
| `keyword.cpc_bid` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `1.50` |
| `keyword.quality_score` | number | `EQUAL`, `GREATER_THAN`, `LESS_THAN`, `BETWEEN` | `7` |

### 3.5 Operadores de Filtro

| Operador | Descrição | Tipos de Campo | Exemplo |
|---|---|---|---|
| `EQUAL` | Igual a | Todos | `"value": "ACTIVE"` |
| `NOT_EQUAL` | Diferente de | Todos | `"value": "PAUSED"` |
| `CONTAIN` | Contém texto | string | `"value": "Scale"` |
| `NOT_CONTAIN` | Não contém texto | string | `"value": "Test"` |
| `START_WITH` | Começa com | string | `"value": "[CBO]"` |
| `END_WITH` | Termina com | string | `"value": "_BR"` |
| `REGEX` | Expressão regular | string | `"value": "^Scale_[0-9]+"` |
| `IN` | Está na lista | enum, string | `"value": ["ACTIVE", "PAUSED"]` |
| `NOT_IN` | Não está na lista | enum, string | `"value": ["ARCHIVED", "DELETED"]` |
| `GREATER_THAN` | Maior que | number | `"value": 100` |
| `GREATER_THAN_OR_EQUAL` | Maior ou igual | number | `"value": 100` |
| `LESS_THAN` | Menor que | number | `"value": 50` |
| `LESS_THAN_OR_EQUAL` | Menor ou igual | number | `"value": 50` |
| `BETWEEN` | Entre dois valores | number | `"value": [10, 100]` |

### 3.6 Enums de Status e Objetivos

**Meta Ads — `effective_status`**
| Valor | Descrição |
|---|---|
| `ACTIVE` | Ativo e entregando |
| `PAUSED` | Pausado manualmente |
| `DELETED` | Excluído |
| `ARCHIVED` | Arquivado |
| `IN_PROCESS` | Em processamento |
| `WITH_ISSUES` | Com problemas |
| `PENDING_REVIEW` | Aguardando revisão |
| `DISAPPROVED` | Reprovado |
| `PREAPPROVED` | Pré-aprovado |
| `PENDING_BILLING_INFO` | Aguardando info de pagamento |
| `CAMPAIGN_PAUSED` | Pausado por campanha pai |
| `ADSET_PAUSED` | Pausado por ad set pai |

**Meta Ads — `objective` (ODAX)**
| Valor | Descrição |
|---|---|
| `OUTCOME_AWARENESS` | Reconhecimento |
| `OUTCOME_ENGAGEMENT` | Engajamento |
| `OUTCOME_LEADS` | Cadastros/Leads |
| `OUTCOME_APP_PROMOTION` | Promoção de app |
| `OUTCOME_TRAFFIC` | Tráfego |
| `OUTCOME_SALES` | Vendas/Conversões |

**Meta Ads — `optimization_goal`**
| Valor | Descrição |
|---|---|
| `NONE` | Nenhum |
| `APP_INSTALLS` | Instalações de app |
| `AD_RECALL_LIFT` | Recall de marca |
| `ENGAGED_USERS` | Usuários engajados |
| `EVENT_RESPONSES` | Respostas a eventos |
| `IMPRESSIONS` | Impressões |
| `LEAD_GENERATION` | Geração de leads |
| `QUALITY_LEAD` | Leads qualificados |
| `LINK_CLICKS` | Cliques no link |
| `OFFSITE_CONVERSIONS` | Conversões no site |
| `PAGE_LIKES` | Curtidas na página |
| `POST_ENGAGEMENT` | Engajamento no post |
| `QUALITY_CALL` | Ligações de qualidade |
| `REACH` | Alcance |
| `LANDING_PAGE_VIEWS` | Visualizações de landing page |
| `VISIT_INSTAGRAM_PROFILE` | Visitas ao perfil IG |
| `VALUE` | Valor de conversão |
| `THRUPLAY` | ThruPlay (vídeo) |
| `DERIVED_EVENTS` | Eventos derivados |
| `APP_INSTALLS_AND_OFFSITE_CONVERSIONS` | Instalações + conversões |
| `CONVERSATIONS` | Conversas |
| `IN_APP_VALUE` | Valor in-app |
| `MESSAGING_PURCHASE_CONVERSION` | Conversão de compra por mensagem |
| `SUBSCRIBERS` | Assinantes |
| `REMINDERS_SET` | Lembretes configurados |
| `MEANINGFUL_CALL_ATTEMPT` | Tentativa de ligação significativa |
| `PROFILE_VISIT` | Visita ao perfil |

**Meta Ads — `bid_strategy`**
| Valor | Descrição |
|---|---|
| `LOWEST_COST_WITHOUT_CAP` | Menor custo (Highest Volume) |
| `LOWEST_COST_WITH_BID_CAP` | Menor custo com bid cap |
| `COST_CAP` | Cost cap |
| `LOWEST_COST_WITH_MIN_ROAS` | ROAS mínimo |

**Meta Ads — `creative_type`**
| Valor | Descrição |
|---|---|
| `IMAGE` | Imagem estática |
| `VIDEO` | Vídeo |
| `CAROUSEL` | Carrossel |
| `COLLECTION` | Coleção |
| `SLIDESHOW` | Slideshow |
| `INSTANT_EXPERIENCE` | Experiência instantânea |

**Google Ads — `status`**
| Valor | Descrição |
|---|---|
| `ENABLED` | Ativo |
| `PAUSED` | Pausado |
| `REMOVED` | Removido |

**Google Ads — `bidding_strategy_type`**
| Valor | Descrição |
|---|---|
| `MANUAL_CPC` | CPC manual |
| `MANUAL_CPM` | CPM manual |
| `MANUAL_CPV` | CPV manual |
| `MAXIMIZE_CONVERSIONS` | Maximizar conversões |
| `MAXIMIZE_CONVERSION_VALUE` | Maximizar valor de conversão |
| `TARGET_CPA` | CPA desejado |
| `TARGET_IMPRESSION_SHARE` | Parcela de impressões desejada |
| `TARGET_ROAS` | ROAS desejado |
| `TARGET_SPEND` | Gasto desejado |
| `PERCENT_CPC` | CPC percentual |
| `COMMISSION` | Comissão |

**Google Ads — `keyword.match_type`**
| Valor | Descrição |
|---|---|
| `EXACT` | Correspondência exata |
| `PHRASE` | Correspondência de frase |
| `BROAD` | Correspondência ampla |

### 3.7 Filtragem Cross-Level

Filtros podem referenciar níveis **diferentes** do nível da regra:

| Cenário | Comportamento |
|---|---|
| Regra em `adset`, filtro em `campaign` | Retorna ad sets que **pertencem** a campaigns que atendem ao filtro |
| Regra em `campaign`, filtro em `adset` | Retorna campaigns que **contêm pelo menos 1** ad set que atende ao filtro |
| Regra em `ad`, filtro em `campaign` + `adset` | Retorna ads que pertencem a ad sets E campaigns que atendem aos filtros |

---

## 4. GATILHOS (Conditions)

Os gatilhos definem **QUANDO** a ação deve ser executada. Estrutura aninhada com lógica AND/OR.

### 4.1 Estrutura de ConditionGroup

```json
{
  "operator": "AND | OR",
  "conditions": [
    { "...Condition..." },
    { "...Condition..." },
    {
      "operator": "OR",
      "conditions": [
        { "...Condition..." },
        { "...Condition..." }
      ]
    }
  ]
}
```

### 4.2 Tipos de Condição

#### Tipo 1: `simple` — Métrica vs Valor Fixo

```json
{
  "type": "simple",
  "metric": "spend",
  "period": "last_7d",
  "operator": "GREATER_THAN",
  "value": 100
}
```

#### Tipo 2: `metric_comparison` — Métrica vs Métrica

```json
{
  "type": "metric_comparison",
  "metric": "purchase_roas",
  "period": "last_3d",
  "operator": "LESS_THAN",
  "compare_metric": "purchase_roas",
  "compare_period": "last_7d",
  "compare_multiplier": 0.8
}
```

> **Interpretação:** ROAS dos últimos 3 dias < 80% do ROAS dos últimos 7 dias (detecta deterioração)

#### Tipo 3: `ranking` — Top/Bottom N ou N%

```json
{
  "type": "ranking",
  "metric": "purchase_roas",
  "period": "last_7d",
  "position": "top",
  "ranking_type": "percentage",
  "ranking_value": 25,
  "include_zeros": false
}
```

#### Tipo 4: `time` — Horário do Dia

```json
{
  "type": "time",
  "operator": "BETWEEN",
  "value": "08:00",
  "value_end": "22:00"
}
```

#### Tipo 5: `lifecycle` — Idade da Entidade

```json
{
  "type": "lifecycle",
  "metric": "hours_since_creation",
  "operator": "GREATER_THAN",
  "value": 72
}
```

### 4.3 Schema Completo da Condition

```json
{
  "type": "simple | metric_comparison | ranking | time | lifecycle",
  
  "metric": "string",
  "period": "string",
  "operator": "string",
  "value": "number | string",
  "value_end": "number | string | null",
  
  "compare_metric": "string | null",
  "compare_period": "string | null",
  "compare_multiplier": "number | null",
  
  "position": "top | bottom | null",
  "ranking_type": "quantity | percentage | null",
  "ranking_value": "number | null",
  "include_zeros": "boolean | null"
}
```

### 4.4 Operadores de Condição

| Operador | Símbolo | Uso |
|---|---|---|
| `GREATER_THAN` | > | Estritamente maior |
| `GREATER_THAN_OR_EQUAL` | >= | Maior ou igual |
| `LESS_THAN` | < | Estritamente menor |
| `LESS_THAN_OR_EQUAL` | <= | Menor ou igual |
| `EQUAL` | = | Igual a |
| `NOT_EQUAL` | != | Diferente de |
| `BETWEEN` | ↔ | Dentro do intervalo (requer `value` + `value_end`) |

### 4.5 Períodos (Timeframes)

| Valor | Descrição | Inclui Hoje? |
|---|---|---|
| `current_hour` | Hora atual (desde o início) | Sim |
| `previous_hour` | Hora anterior completa | Não |
| `last_2_hours` | Últimas 2 horas | Sim |
| `last_3_hours` | Últimas 3 horas | Sim |
| `last_6_hours` | Últimas 6 horas | Sim |
| `last_12_hours` | Últimas 12 horas | Sim |
| `last_24_hours` | Últimas 24 horas (rolling) | Sim |
| `today` | Do início do dia até agora | Sim |
| `yesterday` | Dia anterior completo | Não |
| `last_2d` | Ontem + anteontem | Não |
| `last_3d` | Últimos 3 dias (excl. hoje) | Não |
| `last_3d_with_today` | Últimos 3 dias (incl. hoje) | Sim |
| `last_7d` | Últimos 7 dias (excl. hoje) | Não |
| `last_7d_with_today` | Últimos 7 dias (incl. hoje) | Sim |
| `last_14d` | Últimos 14 dias | Não |
| `last_14d_with_today` | Últimos 14 dias (incl. hoje) | Sim |
| `last_30d` | Últimos 30 dias | Não |
| `last_30d_with_today` | Últimos 30 dias (incl. hoje) | Sim |
| `this_week_mon` | Semana atual (segunda → hoje) | Sim |
| `this_week_sun` | Semana atual (domingo → hoje) | Sim |
| `last_week` | Semana anterior completa | Não |
| `this_month` | Mês atual (dia 1 → hoje) | Sim |
| `last_month` | Mês anterior completo | Não |
| `lifetime` | Todo o período da entidade | Sim |

### 4.6 Métricas Disponíveis — Meta Ads

| Métrica | Slug | Categoria | Descrição |
|---|---|---|---|
| Gasto | `spend` | Financeiro | Valor gasto no período |
| Orçamento Restante | `budget_remaining` | Financeiro | Budget - Spend |
| Orçamento Diário | `daily_budget` | Financeiro | Budget diário configurado |
| Orçamento Vitalício | `lifetime_budget` | Financeiro | Budget lifetime configurado |
| Impressões | `impressions` | Entrega | Total de impressões |
| Alcance | `reach` | Entrega | Pessoas únicas alcançadas |
| Frequência | `frequency` | Entrega | Impressões / Reach |
| CPM | `cpm` | Custo | Custo por mil impressões |
| Cliques no Link | `link_clicks` | Tráfego | Cliques no link de destino |
| CPC | `cpc` | Custo | Custo por clique |
| CTR | `ctr` | Engajamento | Click-through rate (%) |
| CTR de Saída | `outbound_ctr` | Engajamento | CTR de cliques de saída (%) |
| Visualizações de Landing Page | `landing_page_views` | Tráfego | Views na página de destino |
| Custo por Landing Page View | `cost_per_landing_page_view` | Custo | Spend / LPV |
| Compras | `purchases` | Conversão | Total de compras |
| Valor de Compra | `purchase_value` | Conversão | Receita total de compras |
| ROAS de Compra | `purchase_roas` | Conversão | Purchase Value / Spend |
| Custo por Compra | `cost_per_purchase` | Custo | Spend / Purchases |
| Adicionar ao Carrinho | `add_to_cart` | Conversão | Total de ATC |
| Custo por ATC | `cost_per_add_to_cart` | Custo | Spend / ATC |
| Iniciar Checkout | `initiate_checkout` | Conversão | Total de checkouts iniciados |
| Custo por Checkout | `cost_per_initiate_checkout` | Custo | Spend / Initiate Checkout |
| Leads | `leads` | Conversão | Total de leads |
| Custo por Lead | `cost_per_lead` | Custo | Spend / Leads |
| Registros Completos | `complete_registration` | Conversão | Total de cadastros |
| Custo por Registro | `cost_per_complete_registration` | Custo | Spend / Registros |
| Reações | `reactions` | Engajamento | Likes, loves, etc. |
| Comentários | `comments` | Engajamento | Total de comentários |
| Compartilhamentos | `shares` | Engajamento | Total de shares |
| Salvamentos | `saves` | Engajamento | Total de saves |
| Video Views | `video_views` | Vídeo | Visualizações de vídeo (3s+) |
| Video 25% | `video_p25` | Vídeo | Assistiu 25% |
| Video 50% | `video_p50` | Vídeo | Assistiu 50% |
| Video 75% | `video_p75` | Vídeo | Assistiu 75% |
| Video 95% | `video_p95` | Vídeo | Assistiu 95% |
| Video 100% | `video_p100` | Vídeo | Assistiu 100% |
| ThruPlay | `thruplay` | Vídeo | 15s ou completo |
| Custo por ThruPlay | `cost_per_thruplay` | Custo | Spend / ThruPlay |
| Hook Rate | `hook_rate` | Vídeo Custom | Video 3s / Impressions × 100 |
| Hold Rate | `hold_rate` | Vídeo Custom | ThruPlay / Video 3s × 100 |
| Taxa de Conversão | `conversion_rate` | Conversão | Purchases / Link Clicks × 100 |
| Instalações de App | `app_installs` | App | Instalações de aplicativo |
| Custo por App Install | `cost_per_app_install` | App | Spend / Installs |
| Eventos de App | `app_events` | App | Eventos customizados de app |
| Mensagens Iniciadas | `messaging_conversations_started` | Mensagens | Conversas iniciadas |
| Horas Desde Criação | `hours_since_creation` | Ciclo de Vida | Idade em horas |
| Dias Desde Criação | `days_since_creation` | Ciclo de Vida | Idade em dias |

### 4.7 Métricas Disponíveis — Google Ads

| Métrica | Slug | Categoria | Descrição |
|---|---|---|---|
| Custo | `cost` | Financeiro | Valor gasto |
| Orçamento | `budget` | Financeiro | Budget da campanha |
| Impressões | `impressions` | Entrega | Total de impressões |
| Cliques | `clicks` | Tráfego | Total de cliques |
| CTR | `ctr` | Engajamento | Clicks / Impressions × 100 |
| CPC Médio | `average_cpc` | Custo | Cost / Clicks |
| CPM | `cpm` | Custo | Cost / 1000 Impressions |
| Conversões | `conversions` | Conversão | Total de conversões |
| Valor de Conversão | `conversion_value` | Conversão | Receita total |
| Custo por Conversão | `cost_per_conversion` | Custo | Cost / Conversions |
| Taxa de Conversão | `conversion_rate` | Conversão | Conversions / Clicks × 100 |
| ROAS | `roas` | Conversão | Conversion Value / Cost |
| Parcela de Impressões | `search_impression_share` | Competitividade | % de impressões ganhas |
| Parcela Perdida (Budget) | `search_budget_lost_is` | Competitividade | % perdida por budget |
| Parcela Perdida (Rank) | `search_rank_lost_is` | Competitividade | % perdida por rank |
| Posição Média | `average_position` | Posicionamento | Posição média nos leilões |
| Quality Score | `quality_score` | Qualidade | Índice de qualidade (1-10) |
| Quality Score Esperado CTR | `expected_ctr` | Qualidade | Componente CTR |
| Relevância do Anúncio | `ad_relevance` | Qualidade | Componente de relevância |
| Experiência da LP | `landing_page_experience` | Qualidade | Componente da LP |
| Taxa de Cliques Inválidos | `invalid_click_rate` | Fraude | % de cliques inválidos |
| View-Through Conversions | `view_through_conversions` | Conversão | Conversões por visualização |
| Interações | `interactions` | Engajamento | Cliques + outras interações |
| Taxa de Interação | `interaction_rate` | Engajamento | Interactions / Impressions |
| Custo por Interação | `cost_per_interaction` | Custo | Cost / Interactions |
| Video Views | `video_views` | Vídeo | Visualizações de vídeo |
| Video View Rate | `video_view_rate` | Vídeo | Views / Impressions × 100 |
| Video 25% | `video_quartile_25` | Vídeo | Assistiu 25% |
| Video 50% | `video_quartile_50` | Vídeo | Assistiu 50% |
| Video 75% | `video_quartile_75` | Vídeo | Assistiu 75% |
| Video 100% | `video_quartile_100` | Vídeo | Assistiu 100% |
| Horas Desde Criação | `hours_since_creation` | Ciclo de Vida | Idade em horas |
| Dias Desde Criação | `days_since_creation` | Ciclo de Vida | Idade em dias |

---

## 5. AÇÕES (Tasks)

As ações definem **O QUE** fazer quando os gatilhos são atendidos.

### 5.1 Estrutura da Task

```json
{
  "action": "string",
  "params": { },
  "frequency_cap": "string",
  "conditions": { "ConditionGroup" }
}
```

### 5.2 Lista Completa de Ações

| Ação | Slug | Categoria | Meta | Google |
|---|---|---|---|---|
| Pausar | `pause` | Status | ✅ | ✅ |
| Ativar | `start` | Status | ✅ | ✅ |
| Estender Data Final | `extend_end_date` | Status | ✅ | ✅ |
| Aumentar Budget | `increase_budget` | Budget | ✅ | ✅ |
| Diminuir Budget | `decrease_budget` | Budget | ✅ | ✅ |
| Definir Budget | `set_budget` | Budget | ✅ | ✅ |
| Escalar Budget por Target | `scale_budget_by_target` | Budget | ✅ | ✅ |
| Aumentar Bid | `increase_bid` | Bid | ✅ | ✅ |
| Diminuir Bid | `decrease_bid` | Bid | ✅ | ✅ |
| Definir Bid | `set_bid` | Bid | ✅ | ✅ |
| Alterar Estratégia de Bid | `set_bid_strategy` | Bid | ✅ | ✅ |
| Duplicar | `duplicate` | Criação | ✅ | — |
| Adicionar ao Nome | `add_to_name` | Naming | ✅ | ✅ |
| Remover do Nome | `remove_from_name` | Naming | ✅ | ✅ |
| Substituir no Nome | `replace_in_name` | Naming | ✅ | ✅ |
| Notificar | `notify` | Notificação | ✅ | ✅ |

### 5.3 Disponibilidade por Nível

**Meta Ads:**
| Ação | Campaign | Ad Set | Ad |
|---|---|---|---|
| `pause` / `start` | ✅ | ✅ | ✅ |
| `extend_end_date` | ✅ | ✅ | — |
| `increase/decrease/set_budget` | ✅ (CBO) | ✅ (ABO) | — |
| `scale_budget_by_target` | ✅ | ✅ | — |
| `increase/decrease/set_bid` | — | ✅ | — |
| `set_bid_strategy` | ✅ | — | — |
| `duplicate` | ✅ | ✅ | ✅ |
| name actions | ✅ | ✅ | ✅ |
| `notify` | ✅ | ✅ | ✅ |

**Google Ads:**
| Ação | Campaign | Ad Group | Ad | Keyword |
|---|---|---|---|---|
| `pause` / `start` | ✅ | ✅ | ✅ | ✅ |
| `extend_end_date` | ✅ | — | — | — |
| `increase/decrease/set_budget` | ✅ | — | — | — |
| `scale_budget_by_target` | ✅ | — | — | — |
| `increase/decrease/set_bid` | — | ✅ | — | ✅ |
| `set_bid_strategy` | ✅ | — | — | — |
| `duplicate` | — | — | — | — |
| name actions | ✅ | ✅ | ✅ | ✅ |
| `notify` | ✅ | ✅ | ✅ | ✅ |

### 5.4 Parâmetros por Ação

#### `pause`
```json
{
  "action": "pause",
  "params": {}
}
```

#### `start`
```json
{
  "action": "start",
  "params": {}
}
```

#### `extend_end_date`
```json
{
  "action": "extend_end_date",
  "params": {
    "extend_by": 7,
    "extend_unit": "days"
  }
}
```

| Parâmetro | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `extend_by` | number | Sim | 1-365 |
| `extend_unit` | string | Sim | `days`, `hours` |

#### `increase_budget`
```json
{
  "action": "increase_budget",
  "params": {
    "change_type": "percentage",
    "change_value": 20,
    "max_budget": 500
  }
}
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `change_type` | string | Sim | `percentage` ou `fixed` |
| `change_value` | number | Sim | Valor do aumento |
| `min_budget` | number | Não | Trava mínima |
| `max_budget` | number | Não | Trava máxima |

#### `decrease_budget`
```json
{
  "action": "decrease_budget",
  "params": {
    "change_type": "percentage",
    "change_value": 15,
    "min_budget": 20
  }
}
```

#### `set_budget`
```json
{
  "action": "set_budget",
  "params": {
    "budget_value": 100,
    "budget_type": "daily"
  }
}
```

| Parâmetro | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `budget_value` | number | Sim | Valor absoluto |
| `budget_type` | string | Sim | `daily`, `lifetime` |

#### `scale_budget_by_target`
```json
{
  "action": "scale_budget_by_target",
  "params": {
    "target_metric": "cost_per_purchase",
    "target_value": 30,
    "target_period": "last_7d",
    "scale_direction": "proportional",
    "min_budget": 20,
    "max_budget": 1000
  }
}
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `target_metric` | string | Sim | Métrica alvo (CPA, ROAS, etc.) |
| `target_value` | number | Sim | Valor desejado da métrica |
| `target_period` | string | Sim | Período para cálculo |
| `scale_direction` | string | Sim | `proportional`, `aggressive`, `conservative` |
| `min_budget` | number | Não | Limite inferior |
| `max_budget` | number | Não | Limite superior |

#### `increase_bid`
```json
{
  "action": "increase_bid",
  "params": {
    "change_type": "percentage",
    "change_value": 10,
    "max_bid": 5.00
  }
}
```

#### `decrease_bid`
```json
{
  "action": "decrease_bid",
  "params": {
    "change_type": "fixed",
    "change_value": 0.25,
    "min_bid": 0.50
  }
}
```

#### `set_bid`
```json
{
  "action": "set_bid",
  "params": {
    "bid_value": 2.50
  }
}
```

#### `set_bid_strategy` — Meta Ads
```json
{
  "action": "set_bid_strategy",
  "params": {
    "bid_strategy": "cost_cap",
    "bid_amount": 30
  }
}
```

| `bid_strategy` (Meta) | Descrição | Requer `bid_amount`? |
|---|---|---|
| `lowest_cost` | Highest Volume | Não |
| `cost_cap` | Cost Cap | Sim |
| `bid_cap` | Bid Cap | Sim |
| `minimum_roas` | ROAS Mínimo | Sim (valor ROAS, ex: 2.5) |

#### `set_bid_strategy` — Google Ads
```json
{
  "action": "set_bid_strategy",
  "params": {
    "bid_strategy": "target_cpa",
    "target_cpa": 25
  }
}
```

| `bid_strategy` (Google) | Descrição | Parâmetros Adicionais |
|---|---|---|
| `manual_cpc` | CPC Manual | — |
| `maximize_clicks` | Maximizar Cliques | `max_cpc_limit` (opcional) |
| `maximize_conversions` | Maximizar Conversões | `target_cpa` (opcional) |
| `maximize_conversion_value` | Maximizar Valor | `target_roas` (opcional) |
| `target_cpa` | CPA Desejado | `target_cpa` (obrigatório) |
| `target_roas` | ROAS Desejado | `target_roas` (obrigatório) |
| `target_impression_share` | Parcela de Impressões | `location`, `percent` |

#### `duplicate`
```json
{
  "action": "duplicate",
  "params": {
    "original_action": "keep",
    "name_suffix": " - Copy",
    "append_number": true,
    "preserve_social_proof": true,
    "destination_campaign_id": null,
    "destination_adset_id": null
  }
}
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `original_action` | string | Sim | `keep` (manter ativo) ou `pause` (pausar original) |
| `name_suffix` | string | Não | Texto a adicionar ao nome (default: ` - Copy`) |
| `append_number` | boolean | Não | Adicionar número sequencial (default: true) |
| `preserve_social_proof` | boolean | Não | Manter reações/comentários/shares (default: true) |
| `destination_campaign_id` | string | Não | ID da campanha destino (se duplicar para outra) |
| `destination_adset_id` | string | Não | ID do ad set destino (se duplicar para outro) |

#### `add_to_name`
```json
{
  "action": "add_to_name",
  "params": {
    "text": " [WINNER]",
    "position": "suffix"
  }
}
```

| Parâmetro | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `text` | string | Sim | Texto a adicionar |
| `position` | string | Sim | `prefix`, `suffix` |

#### `remove_from_name`
```json
{
  "action": "remove_from_name",
  "params": {
    "text": "[TEST]"
  }
}
```

#### `replace_in_name`
```json
{
  "action": "replace_in_name",
  "params": {
    "find": "[TESTING]",
    "replace": "[SCALED]"
  }
}
```

#### `notify`
```json
{
  "action": "notify",
  "params": {
    "message": "ROAS caiu abaixo do target!",
    "include_metrics": ["spend", "purchase_roas", "cost_per_purchase"],
    "include_link": true
  }
}
```

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `message` | string | Sim | Mensagem customizada |
| `include_metrics` | string[] | Não | Métricas a incluir no email |
| `include_link` | boolean | Não | Link direto para a entidade |

### 5.5 Frequency Cap (Restrição por Entidade)

Define quantas vezes a ação pode ser executada na **mesma entidade individual**.

| Valor | Descrição |
|---|---|
| `no_limit` | Executa toda vez que condição é atendida |
| `once_per_hour` | Máximo 1x/hora por entidade |
| `once_per_2_hours` | Máximo 1x/2h |
| `once_per_4_hours` | Máximo 1x/4h |
| `once_per_6_hours` | Máximo 1x/6h |
| `once_per_8_hours` | Máximo 1x/8h |
| `once_per_12_hours` | Máximo 1x/12h |
| `once_per_day` | Máximo 1x/dia (mais usado para budget) |
| `once_per_2_days` | Máximo 1x/2 dias |
| `once_per_3_days` | Máximo 1x/3 dias |
| `once_per_week` | Máximo 1x/semana |
| `once_in_lifetime` | 1x na vida da entidade (nunca mais) |

> **Importante:** `frequency_cap` ≠ `check_interval`. A regra pode checar a cada 15 min, mas o cap garante que cada ad set é afetado no máximo 1x/dia (por exemplo).

---

## 6. SCHEDULE (Cron)

Define **QUANDO** a regra é executada.

### 6.1 Estrutura do Schedule

```json
{
  "schedule": {
    "type": "frequency | custom",
    "check_interval": "string | null",
    "custom_slots": "object[] | null",
    "date_range": {
      "start": "ISO 8601 | null",
      "end": "ISO 8601 | null"
    },
    "run_once": false
  }
}
```

### 6.2 Tipo: `frequency`

Executa em intervalo fixo, 24/7.

```json
{
  "type": "frequency",
  "check_interval": "1_hour",
  "custom_slots": null
}
```

**`check_interval`**
| Valor | Descrição |
|---|---|
| `15_minutes` | A cada 15 minutos |
| `30_minutes` | A cada 30 minutos |
| `1_hour` | A cada hora |
| `2_hours` | A cada 2 horas |
| `3_hours` | A cada 3 horas |
| `4_hours` | A cada 4 horas |
| `6_hours` | A cada 6 horas |
| `8_hours` | A cada 8 horas |
| `12_hours` | A cada 12 horas |
| `24_hours` | 1x por dia |
| `48_hours` | A cada 2 dias |
| `72_hours` | A cada 3 dias |

### 6.3 Tipo: `custom`

Executa em dias e horários específicos (dayparting).

```json
{
  "type": "custom",
  "check_interval": null,
  "custom_slots": [
    { "day": "mon", "hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { "day": "tue", "hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { "day": "wed", "hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { "day": "thu", "hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
    { "day": "fri", "hours": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }
  ]
}
```

**`day`**
| Valor | Dia |
|---|---|
| `mon` | Segunda |
| `tue` | Terça |
| `wed` | Quarta |
| `thu` | Quinta |
| `fri` | Sexta |
| `sat` | Sábado |
| `sun` | Domingo |

**`hours`:** Array de inteiros 0-23 representando as horas em que a regra deve rodar.

### 6.4 Date Range

Limita a execução a um período específico.

```json
{
  "date_range": {
    "start": "2026-02-01T00:00:00-03:00",
    "end": "2026-02-28T23:59:59-03:00"
  }
}
```

### 6.5 Run Once

Executa uma única vez e para.

```json
{
  "run_once": true
}
```

### 6.6 Timezone

```json
{
  "timezone": "America/Sao_Paulo"
}
```

**Timezones comuns:**
| Valor | Descrição |
|---|---|
| `America/Sao_Paulo` | Brasília (BRT/BRST) |
| `America/New_York` | Eastern (EST/EDT) |
| `America/Los_Angeles` | Pacific (PST/PDT) |
| `America/Chicago` | Central (CST/CDT) |
| `Europe/London` | Londres (GMT/BST) |
| `Europe/Paris` | Paris (CET/CEST) |
| `Europe/Lisbon` | Lisboa (WET/WEST) |
| `Asia/Tokyo` | Tokyo (JST) |
| `Australia/Sydney` | Sydney (AEST/AEDT) |
| `UTC` | UTC |

> **Importante:** 
> - **Schedule:** respeita o timezone configurado
> - **Métricas:** sempre reportadas no timezone da **conta de anúncios**
> - Se diferentes → condições de `type: "time"` podem não alinhar

---

## 7. NOTIFICAÇÕES

### 7.1 Estrutura

```json
{
  "notifications": {
    "emails": ["gestor@empresa.com", "equipe@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "Automação: {rule_name} executada"
  }
}
```

### 7.2 Parâmetros

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `emails` | string[] | Lista de emails destinatários |
| `notify_on_action` | boolean | Notificar quando ação é executada |
| `notify_on_error` | boolean | Notificar quando ocorre erro |
| `notify_on_no_match` | boolean | Notificar quando nenhuma entidade atende aos critérios |
| `include_summary` | boolean | Incluir resumo (X entidades afetadas, ação executada) |
| `include_entity_details` | boolean | Incluir lista de entidades afetadas |
| `include_metrics_snapshot` | boolean | Incluir snapshot das métricas no momento |
| `custom_subject` | string | Assunto customizado (suporta placeholders) |

### 7.3 Placeholders para Mensagens e Assunto

| Placeholder | Descrição |
|---|---|
| `{rule_name}` | Nome da regra |
| `{rule_id}` | ID da regra |
| `{action}` | Ação executada |
| `{entities_count}` | Número de entidades afetadas |
| `{platform}` | Plataforma (Meta/Google) |
| `{timestamp}` | Data/hora da execução |
| `{ad_account_name}` | Nome da conta de anúncios |

### 7.4 Template de Email

```
Subject: {custom_subject}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTOMATION REPORT

Rule: {rule_name}
Platform: {platform}
Executed at: {timestamp}
Action: {action}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUMMARY
• Entities evaluated: {entities_evaluated}
• Entities affected: {entities_count}
• Errors: {errors_count}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AFFECTED ENTITIES

[For each entity:]
• {entity_name} ({entity_id})
  └─ Spend: ${spend} | ROAS: {roas} | CPA: ${cpa}
  └─ Action: {action_description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View in platform: {platform_link}
Manage rule: {rule_link}
```

---

## 8. CUSTOM METRICS

### 8.1 Estrutura de Custom Metric

```json
{
  "id": "cm_blended_roas",
  "name": "Blended ROAS",
  "formula": {
    "operation": "divide",
    "operands": [
      { "type": "metric", "value": "purchase_value" },
      { "type": "metric", "value": "spend" }
    ]
  }
}
```

### 8.2 Operações

| Operação | Descrição | Exemplo |
|---|---|---|
| `add` | Soma | A + B |
| `subtract` | Subtração | A - B |
| `multiply` | Multiplicação | A × B |
| `divide` | Divisão | A ÷ B |
| `percentage` | Percentual | A ÷ B × 100 |

### 8.3 Tipos de Operando

| Tipo | Descrição | Exemplo |
|---|---|---|
| `metric` | Métrica nativa | `{ "type": "metric", "value": "spend" }` |
| `number` | Valor fixo | `{ "type": "number", "value": 100 }` |
| `custom_metric` | Outra custom metric | `{ "type": "custom_metric", "value": "cm_xyz" }` |

### 8.4 Exemplos de Custom Metrics

**Blended ROAS:**
```json
{
  "operation": "divide",
  "operands": [
    { "type": "metric", "value": "purchase_value" },
    { "type": "metric", "value": "spend" }
  ]
}
```

**Hook Rate (Video):**
```json
{
  "operation": "percentage",
  "operands": [
    { "type": "metric", "value": "video_views" },
    { "type": "metric", "value": "impressions" }
  ]
}
```

**CPM (Custo por Mil Impressões):**
```json
{
  "operation": "multiply",
  "operands": [
    {
      "operation": "divide",
      "operands": [
        { "type": "metric", "value": "spend" },
        { "type": "metric", "value": "impressions" }
      ]
    },
    { "type": "number", "value": 1000 }
  ]
}
```

**CPC Real (considerando todos os cliques):**
```json
{
  "operation": "divide",
  "operands": [
    { "type": "metric", "value": "spend" },
    { "type": "metric", "value": "clicks" }
  ]
}
```

---

## 9. ATTRIBUTION

### 9.1 Configuração

```json
{
  "attribution": {
    "use_entity_setting": true,
    "window": "7d_click_1d_view"
  }
}
```

### 9.2 Janelas de Atribuição — Meta Ads

| Valor | Descrição |
|---|---|
| `1d_click` | 1 dia após clique |
| `7d_click` | 7 dias após clique |
| `1d_click_1d_view` | 1 dia clique + 1 dia view |
| `7d_click_1d_view` | 7 dias clique + 1 dia view (padrão) |
| `28d_click_1d_view` | 28 dias clique + 1 dia view |

### 9.3 Janelas de Atribuição — Google Ads

| Valor | Descrição |
|---|---|
| `30_days` | 30 dias |
| `60_days` | 60 dias |
| `90_days` | 90 dias |
| `data_driven` | Data-driven attribution |

### 9.4 Cuidados

| Cenário | Problema | Solução |
|---|---|---|
| `use_entity_setting: false` + ad sets com attribution windows diferentes | Métricas de Pixel retornam **0** no nível Campaign | Usar `use_entity_setting: true` |
| Nível Ad Account + mixed attribution | Métricas retornam **0** | Evitar regras em Ad Account level com métricas de conversão |

---

## 10. EXEMPLOS REAIS COMPLETOS

### 10.1 STOP LOSS — Pausar Ad Sets Sem Performance

**Cenário:** Pausar ad sets que gastaram mais de $50 nos últimos 3 dias sem nenhuma compra.

```json
{
  "id": "rule_stop_loss_001",
  "name": "Stop Loss - Sem Compras após $50",
  "description": "Pausa ad sets que gastaram >$50 em 3 dias sem gerar compras",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "NOT_CONTAIN", "value": "[CBO]" },
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "campaign.objective", "operator": "IN", "value": ["OUTCOME_SALES"] },
      { "field": "adset.effective_status", "operator": "IN", "value": ["ACTIVE"] }
    ]
  ],
  
  "tasks": [
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN",
            "value": 50
          },
          {
            "type": "simple",
            "metric": "purchases",
            "period": "last_3d_with_today",
            "operator": "EQUAL",
            "value": 0
          }
        ]
      }
    },
    {
      "action": "add_to_name",
      "params": {
        "text": " [STOP LOSS]",
        "position": "suffix"
      },
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN",
            "value": 50
          },
          {
            "type": "simple",
            "metric": "purchases",
            "period": "last_3d_with_today",
            "operator": "EQUAL",
            "value": 0
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "1_hour",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🛑 STOP LOSS: {entities_count} ad sets pausados"
  }
}
```

---

### 10.2 SCALE UP — Aumentar Budget de Winners

**Cenário:** Aumentar budget em 20% para ad sets com ROAS > 2.5 e pelo menos $30 de gasto.

```json
{
  "id": "rule_scale_up_001",
  "name": "Scale Up - ROAS > 2.5",
  "description": "Aumenta budget 20% para ad sets com bom ROAS",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "NOT_CONTAIN", "value": "[CBO]" },
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "campaign.objective", "operator": "EQUAL", "value": "OUTCOME_SALES" },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "increase_budget",
      "params": {
        "change_type": "percentage",
        "change_value": 20,
        "max_budget": 500
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN_OR_EQUAL",
            "value": 30
          },
          {
            "type": "simple",
            "metric": "purchase_roas",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN",
            "value": 2.5
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "4_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "📈 SCALE UP: {entities_count} ad sets aumentados"
  }
}
```

---

### 10.3 SCALE DOWN — Reduzir Budget de Baixa Performance

**Cenário:** Diminuir budget em 25% para ad sets com ROAS < 1.5 e gasto > $100.

```json
{
  "id": "rule_scale_down_001",
  "name": "Scale Down - ROAS < 1.5",
  "description": "Diminui budget 25% para ad sets com ROAS ruim",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "NOT_CONTAIN", "value": "[CBO]" },
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "decrease_budget",
      "params": {
        "change_type": "percentage",
        "change_value": 25,
        "min_budget": 20
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 100
          },
          {
            "type": "simple",
            "metric": "purchase_roas",
            "period": "last_7d_with_today",
            "operator": "LESS_THAN",
            "value": 1.5
          },
          {
            "type": "simple",
            "metric": "purchases",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 0
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "6_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "📉 SCALE DOWN: {entities_count} ad sets reduzidos"
  }
}
```

---

### 10.4 DAYPARTING — Liga/Desliga por Horário

**Cenário:** Ligar campanhas às 6h e desligar às 23h (horário de Brasília).

```json
{
  "id": "rule_dayparting_001",
  "name": "Dayparting - 6h às 23h",
  "description": "Liga campanhas de manhã e desliga à noite",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "campaign",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "CONTAIN", "value": "[DAYPART]" }
    ]
  ],
  
  "tasks": [
    {
      "action": "start",
      "params": {},
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "time",
            "operator": "EQUAL",
            "value": "06:00"
          }
        ]
      }
    },
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "time",
            "operator": "EQUAL",
            "value": "23:00"
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "custom",
    "check_interval": null,
    "custom_slots": [
      { "day": "mon", "hours": [6, 23] },
      { "day": "tue", "hours": [6, 23] },
      { "day": "wed", "hours": [6, 23] },
      { "day": "thu", "hours": [6, 23] },
      { "day": "fri", "hours": [6, 23] },
      { "day": "sat", "hours": [6, 23] },
      { "day": "sun", "hours": [6, 23] }
    ],
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": false,
    "include_metrics_snapshot": false,
    "custom_subject": "⏰ DAYPARTING: Campanhas {action}"
  }
}
```

---

### 10.5 TREND DETECTION — Detectar Deterioração de Performance

**Cenário:** Notificar quando ROAS dos últimos 3 dias cair 30% em relação aos últimos 7 dias.

```json
{
  "id": "rule_trend_detection_001",
  "name": "Alerta - ROAS Caindo 30%",
  "description": "Notifica quando ROAS 3d < 70% do ROAS 7d",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" },
      { "field": "metrics.spend", "operator": "GREATER_THAN", "value": 100, "period": "last_7d" }
    ]
  ],
  
  "tasks": [
    {
      "action": "notify",
      "params": {
        "message": "⚠️ ROAS em queda! Performance deteriorando nos últimos 3 dias.",
        "include_metrics": ["spend", "purchase_roas", "cost_per_purchase", "purchases"],
        "include_link": true
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN",
            "value": 30
          },
          {
            "type": "metric_comparison",
            "metric": "purchase_roas",
            "period": "last_3d_with_today",
            "operator": "LESS_THAN",
            "compare_metric": "purchase_roas",
            "compare_period": "last_7d",
            "compare_multiplier": 0.7
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "6_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com", "equipe@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "⚠️ ALERTA: ROAS em queda em {entities_count} ad sets"
  }
}
```

---

### 10.6 RANKING — Pausar Bottom Performers

**Cenário:** Pausar os 20% piores ad sets por ROAS dentro de cada campanha.

```json
{
  "id": "rule_ranking_bottom_001",
  "name": "Pausar Bottom 20% ROAS",
  "description": "Pausa os 20% piores ad sets por ROAS",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_per_week",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 50
          },
          {
            "type": "ranking",
            "metric": "purchase_roas",
            "period": "last_7d_with_today",
            "position": "bottom",
            "ranking_type": "percentage",
            "ranking_value": 20,
            "include_zeros": false
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "24_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🏆 RANKING: {entities_count} bottom performers pausados"
  }
}
```

---

### 10.7 CREATIVE REFRESH — Pausar Ads Fatigados

**Cenário:** Pausar ads com frequência > 5 e CTR caindo.

```json
{
  "id": "rule_creative_fatigue_001",
  "name": "Creative Fatigue - Frequência Alta",
  "description": "Pausa ads com frequência >5 e CTR em queda",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "ad",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" },
      { "field": "ad.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "frequency",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 5
          },
          {
            "type": "simple",
            "metric": "impressions",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 10000
          },
          {
            "type": "metric_comparison",
            "metric": "ctr",
            "period": "last_3d_with_today",
            "operator": "LESS_THAN",
            "compare_metric": "ctr",
            "compare_period": "last_7d",
            "compare_multiplier": 0.7
          }
        ]
      }
    },
    {
      "action": "add_to_name",
      "params": {
        "text": " [FATIGUED]",
        "position": "suffix"
      },
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "frequency",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 5
          },
          {
            "type": "simple",
            "metric": "impressions",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 10000
          },
          {
            "type": "metric_comparison",
            "metric": "ctr",
            "period": "last_3d_with_today",
            "operator": "LESS_THAN",
            "compare_metric": "ctr",
            "compare_period": "last_7d",
            "compare_multiplier": 0.7
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "12_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com", "criativos@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🎨 CREATIVE FATIGUE: {entities_count} ads pausados"
  }
}
```

---

### 10.8 BUDGET SCHEDULING — Budget Diferente por Dia da Semana

**Cenário:** Budget $50/dia durante a semana, $100/dia no fim de semana.

```json
{
  "id": "rule_budget_schedule_001",
  "name": "Budget Schedule - Semana vs Weekend",
  "description": "Budget diferenciado por dia da semana",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "CONTAIN", "value": "[BUDGET-SCHEDULE]" },
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "set_budget",
      "params": {
        "budget_value": 50,
        "budget_type": "daily"
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "time",
            "operator": "EQUAL",
            "value": "00:15"
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "custom",
    "check_interval": null,
    "custom_slots": [
      { "day": "mon", "hours": [0] },
      { "day": "tue", "hours": [0] },
      { "day": "wed", "hours": [0] },
      { "day": "thu", "hours": [0] },
      { "day": "fri", "hours": [0] }
    ],
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": false,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": false,
    "include_entity_details": false,
    "include_metrics_snapshot": false,
    "custom_subject": "💰 BUDGET: Ajustado para dias de semana"
  }
}
```

**Regra complementar para fim de semana:**

```json
{
  "id": "rule_budget_schedule_002",
  "name": "Budget Schedule - Weekend $100",
  "description": "Budget $100 no fim de semana",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "CONTAIN", "value": "[BUDGET-SCHEDULE]" },
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "set_budget",
      "params": {
        "budget_value": 100,
        "budget_type": "daily"
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "time",
            "operator": "EQUAL",
            "value": "00:15"
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "custom",
    "check_interval": null,
    "custom_slots": [
      { "day": "sat", "hours": [0] },
      { "day": "sun", "hours": [0] }
    ],
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": false,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": false,
    "include_entity_details": false,
    "include_metrics_snapshot": false,
    "custom_subject": "💰 BUDGET: Ajustado para fim de semana"
  }
}
```

---

### 10.9 GOOGLE ADS — Stop Loss para Keywords

**Cenário:** Pausar keywords com Quality Score < 5 e gasto > $20 sem conversões.

```json
{
  "id": "rule_google_keyword_stop_001",
  "name": "Google - Stop Loss Keywords",
  "description": "Pausa keywords com QS baixo e sem conversões",
  "status": "active",
  
  "platform": "google",
  "ad_account_ids": ["123-456-7890"],
  "google_campaign_type": "search",
  
  "level": "keyword",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.status", "operator": "EQUAL", "value": "ENABLED" },
      { "field": "ad_group.status", "operator": "EQUAL", "value": "ENABLED" },
      { "field": "keyword.status", "operator": "EQUAL", "value": "ENABLED" }
    ]
  ],
  
  "tasks": [
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "quality_score",
            "period": "last_7d",
            "operator": "LESS_THAN",
            "value": 5
          },
          {
            "type": "simple",
            "metric": "cost",
            "period": "last_14d",
            "operator": "GREATER_THAN",
            "value": 20
          },
          {
            "type": "simple",
            "metric": "conversions",
            "period": "last_14d",
            "operator": "EQUAL",
            "value": 0
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "24_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🔑 GOOGLE: {entities_count} keywords pausadas"
  }
}
```

---

### 10.10 GOOGLE ADS — Ajuste de Bid por Performance

**Cenário:** Aumentar bid em 15% para keywords com ROAS > 4 e diminuir 20% para ROAS < 1.

```json
{
  "id": "rule_google_bid_adjust_001",
  "name": "Google - Bid Adjustment por ROAS",
  "description": "Ajusta bids de keywords baseado em ROAS",
  "status": "active",
  
  "platform": "google",
  "ad_account_ids": ["123-456-7890"],
  "google_campaign_type": "search",
  
  "level": "keyword",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.status", "operator": "EQUAL", "value": "ENABLED" },
      { "field": "campaign.bidding_strategy_type", "operator": "EQUAL", "value": "MANUAL_CPC" },
      { "field": "keyword.status", "operator": "EQUAL", "value": "ENABLED" }
    ]
  ],
  
  "tasks": [
    {
      "action": "increase_bid",
      "params": {
        "change_type": "percentage",
        "change_value": 15,
        "max_bid": 10.00
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "cost",
            "period": "last_7d",
            "operator": "GREATER_THAN",
            "value": 10
          },
          {
            "type": "simple",
            "metric": "roas",
            "period": "last_7d",
            "operator": "GREATER_THAN",
            "value": 4
          }
        ]
      }
    },
    {
      "action": "decrease_bid",
      "params": {
        "change_type": "percentage",
        "change_value": 20,
        "min_bid": 0.30
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "cost",
            "period": "last_7d",
            "operator": "GREATER_THAN",
            "value": 20
          },
          {
            "type": "simple",
            "metric": "conversions",
            "period": "last_7d",
            "operator": "GREATER_THAN",
            "value": 0
          },
          {
            "type": "simple",
            "metric": "roas",
            "period": "last_7d",
            "operator": "LESS_THAN",
            "value": 1
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "12_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "💵 GOOGLE BIDS: {entities_count} keywords ajustadas"
  }
}
```

---

### 10.11 CBO — Scale Up de Campaigns Inteiras

**Cenário:** Aumentar budget de campaigns CBO com ROAS > 3 (para quem usa Campaign Budget Optimization).

```json
{
  "id": "rule_cbo_scale_001",
  "name": "CBO Scale Up - ROAS > 3",
  "description": "Aumenta budget de campaigns CBO com bom ROAS",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "campaign",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "CONTAIN", "value": "[CBO]" },
      { "field": "campaign.effective_status", "operator": "EQUAL", "value": "ACTIVE" },
      { "field": "campaign.objective", "operator": "EQUAL", "value": "OUTCOME_SALES" }
    ]
  ],
  
  "tasks": [
    {
      "action": "increase_budget",
      "params": {
        "change_type": "percentage",
        "change_value": 15,
        "max_budget": 2000
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN_OR_EQUAL",
            "value": 100
          },
          {
            "type": "simple",
            "metric": "purchase_roas",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN",
            "value": 3
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "6_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🚀 CBO SCALE: {entities_count} campaigns aumentadas"
  }
}
```

---

### 10.12 DUPLICAR WINNERS — Criar Cópias de Ads Vencedores

**Cenário:** Duplicar ads com CTR > 3% e pelo menos 10 conversões.

```json
{
  "id": "rule_duplicate_winners_001",
  "name": "Duplicate Winners - CTR > 3%",
  "description": "Duplica ads vencedores para escalar",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "ad",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" },
      { "field": "ad.effective_status", "operator": "EQUAL", "value": "ACTIVE" },
      { "field": "ad.name", "operator": "NOT_CONTAIN", "value": "[DUPLICATED]" }
    ]
  ],
  
  "tasks": [
    {
      "action": "duplicate",
      "params": {
        "original_action": "keep",
        "name_suffix": " [DUPLICATED]",
        "append_number": true,
        "preserve_social_proof": true
      },
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "outbound_ctr",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN",
            "value": 3
          },
          {
            "type": "simple",
            "metric": "purchases",
            "period": "last_7d_with_today",
            "operator": "GREATER_THAN_OR_EQUAL",
            "value": 10
          },
          {
            "type": "lifecycle",
            "metric": "days_since_creation",
            "operator": "GREATER_THAN",
            "value": 7
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "24_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🏆 WINNERS: {entities_count} ads duplicados"
  }
}
```

---

### 10.13 LEARNING PHASE PROTECTION — Não Mexer em Ads Novos

**Cenário:** Regra de stop loss que ignora ad sets com menos de 72h de vida (protege learning phase).

```json
{
  "id": "rule_learning_protection_001",
  "name": "Stop Loss (Protege Learning Phase)",
  "description": "Stop loss que ignora ad sets com <72h",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "lifecycle",
            "metric": "hours_since_creation",
            "operator": "GREATER_THAN",
            "value": 72
          },
          {
            "type": "simple",
            "metric": "spend",
            "period": "lifetime",
            "operator": "GREATER_THAN",
            "value": 100
          },
          {
            "type": "simple",
            "metric": "purchases",
            "period": "lifetime",
            "operator": "EQUAL",
            "value": 0
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "4_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🛡️ STOP LOSS (Learning Protected): {entities_count} pausados"
  }
}
```

---

### 10.14 MULTI-CONDITION COMPLEX — Escalonamento Progressivo

**Cenário:** 3 níveis de scale up baseado em performance (10%, 20%, 30%).

```json
{
  "id": "rule_progressive_scale_001",
  "name": "Progressive Scale - 3 Níveis",
  "description": "Scale progressivo baseado em ROAS",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.name", "operator": "NOT_CONTAIN", "value": "[CBO]" },
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "increase_budget",
      "params": {
        "change_type": "percentage",
        "change_value": 10,
        "max_budget": 200
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN_OR_EQUAL",
            "value": 30
          },
          {
            "type": "simple",
            "metric": "purchase_roas",
            "period": "last_3d_with_today",
            "operator": "BETWEEN",
            "value": 2,
            "value_end": 3
          }
        ]
      }
    },
    {
      "action": "increase_budget",
      "params": {
        "change_type": "percentage",
        "change_value": 20,
        "max_budget": 400
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN_OR_EQUAL",
            "value": 30
          },
          {
            "type": "simple",
            "metric": "purchase_roas",
            "period": "last_3d_with_today",
            "operator": "BETWEEN",
            "value": 3,
            "value_end": 5
          }
        ]
      }
    },
    {
      "action": "increase_budget",
      "params": {
        "change_type": "percentage",
        "change_value": 30,
        "max_budget": 1000
      },
      "frequency_cap": "once_per_day",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {
            "type": "simple",
            "metric": "spend",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN_OR_EQUAL",
            "value": 30
          },
          {
            "type": "simple",
            "metric": "purchase_roas",
            "period": "last_3d_with_today",
            "operator": "GREATER_THAN",
            "value": 5
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "6_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "📊 PROGRESSIVE SCALE: {entities_count} ad sets escalados"
  }
}
```

---

### 10.15 NESTED CONDITIONS — Lógica Complexa (OR dentro de AND)

**Cenário:** Pausar se (Gasto > $50 E SEM compras) OU (ROAS < 1 E CPA > $50).

```json
{
  "id": "rule_complex_logic_001",
  "name": "Stop Loss - Lógica Complexa",
  "description": "Para com lógica OR aninhada",
  "status": "active",
  
  "platform": "meta",
  "ad_account_ids": ["act_123456789"],
  "google_campaign_type": null,
  
  "level": "adset",
  "entities_limit": 2000,
  
  "filters": [
    [
      { "field": "campaign.effective_status", "operator": "IN", "value": ["ACTIVE"] },
      { "field": "adset.effective_status", "operator": "EQUAL", "value": "ACTIVE" }
    ]
  ],
  
  "tasks": [
    {
      "action": "pause",
      "params": {},
      "frequency_cap": "once_in_lifetime",
      "conditions": {
        "operator": "OR",
        "conditions": [
          {
            "operator": "AND",
            "conditions": [
              {
                "type": "simple",
                "metric": "spend",
                "period": "last_3d_with_today",
                "operator": "GREATER_THAN",
                "value": 50
              },
              {
                "type": "simple",
                "metric": "purchases",
                "period": "last_3d_with_today",
                "operator": "EQUAL",
                "value": 0
              }
            ]
          },
          {
            "operator": "AND",
            "conditions": [
              {
                "type": "simple",
                "metric": "purchase_roas",
                "period": "last_7d_with_today",
                "operator": "LESS_THAN",
                "value": 1
              },
              {
                "type": "simple",
                "metric": "cost_per_purchase",
                "period": "last_7d_with_today",
                "operator": "GREATER_THAN",
                "value": 50
              }
            ]
          }
        ]
      }
    }
  ],
  
  "schedule": {
    "type": "frequency",
    "check_interval": "2_hours",
    "custom_slots": null,
    "date_range": null,
    "run_once": false
  },
  
  "timezone": "America/Sao_Paulo",
  
  "attribution": {
    "use_entity_setting": true,
    "window": null
  },
  
  "notifications": {
    "emails": ["gestor@empresa.com"],
    "notify_on_action": true,
    "notify_on_error": true,
    "notify_on_no_match": false,
    "include_summary": true,
    "include_entity_details": true,
    "include_metrics_snapshot": true,
    "custom_subject": "🛑 COMPLEX STOP LOSS: {entities_count} ad sets pausados"
  }
}
```

---

## 11. EDGE CASES E COMPORTAMENTOS ESPECIAIS

### 11.1 Comportamento de Métricas com Valor Zero

| Cenário | Comportamento | Solução |
|---|---|---|
| Sem dados | Métrica retorna **0** | Adicionar condição `spend > 0` |
| Condição `Metric < 3` sem dados | **Dispara incorretamente** (0 < 3) | Adicionar `impressions > 0` |
| CPA sem conversões | CPA = **0** | Condição `CPA > X` NÃO dispara |
| ROAS sem conversões | ROAS = **0** | Adicionar `purchases > 0` |

### 11.2 Separação CBO vs ABO (Meta Ads)

**CRÍTICO:** Regras de budget devem ser separadas:

| Tipo | Level | Filtro Obrigatório |
|---|---|---|
| CBO | `campaign` | `campaign.name CONTAIN "[CBO]"` |
| ABO | `adset` | `campaign.name NOT_CONTAIN "[CBO]"` |

> Misturar gera erro: não é possível alterar budget de ad set dentro de campaign CBO.

### 11.3 Google Ads — 1 Campaign Type por Regra

Criar regras separadas para cada tipo:
- Regra 1: `google_campaign_type: "search"`
- Regra 2: `google_campaign_type: "shopping"`
- Regra 3: `google_campaign_type: "performance_max"`

### 11.4 Performance Max — Restrições

| Restrição | Detalhe |
|---|---|
| Levels permitidos | Apenas `campaign` ou `ad_account` |
| Actions permitidas | Budget, Status, Notify (sem bid management granular) |

### 11.5 Attribution Window Mismatch

| Cenário | Problema |
|---|---|
| `use_entity_setting: false` + ad sets com attribution diferentes | Métricas de conversão retornam **0** no nível Campaign |
| Level `ad_account` + mixed attribution | Métricas de conversão retornam **0** |

**Solução:** Sempre usar `use_entity_setting: true`.

### 11.6 Timezone Mismatch

| Componente | Timezone |
|---|---|
| Schedule | Usa `timezone` configurado na regra |
| Métricas | Usa timezone da **conta de anúncios** |
| Condição `type: time` | Usa `timezone` da regra |

> Se diferentes: condições de horário podem não alinhar com dados de métricas.

---

## 12. LOGS E MONITORAMENTO

### 12.1 Estrutura de Log de Execução

```json
{
  "log_id": "log_uuid_here",
  "rule_id": "rule_uuid_here",
  "executed_at": "2026-02-06T10:00:00-03:00",
  "duration_ms": 1234,
  "status": "completed | partial | failed",
  
  "summary": {
    "entities_evaluated": 150,
    "entities_matched_filters": 45,
    "entities_matched_conditions": 12,
    "entities_affected": 10,
    "entities_skipped_frequency_cap": 2,
    "errors": 0
  },
  
  "affected_entities": [
    {
      "entity_id": "23851234567891",
      "entity_name": "Scale_Lookalike_BR",
      "entity_type": "adset",
      "action_executed": "increase_budget",
      "action_params": { "change_type": "percentage", "change_value": 20 },
      "previous_value": 50,
      "new_value": 60,
      "metrics_snapshot": {
        "spend_last_3d": 87.50,
        "purchase_roas_last_3d": 2.8,
        "purchases_last_3d": 7
      }
    }
  ],
  
  "errors": [],
  
  "notifications_sent": {
    "emails": ["gestor@empresa.com"],
    "sent_at": "2026-02-06T10:00:05-03:00"
  }
}
```

### 12.2 Status de Execução

| Status | Descrição |
|---|---|
| `completed` | Todas as ações executadas com sucesso |
| `partial` | Algumas ações falharam |
| `failed` | Execução falhou completamente |
| `skipped` | Nenhuma entidade atendeu aos critérios |
| `rate_limited` | API rate limit atingido |

---

## 13. REFERÊNCIAS DE API

### 13.1 Meta Ads API

| Endpoint | Uso |
|---|---|
| `GET /{ad_account_id}/campaigns` | Listar campanhas |
| `GET /{ad_account_id}/adsets` | Listar ad sets |
| `GET /{ad_account_id}/ads` | Listar ads |
| `POST /{entity_id}` | Atualizar entidade |
| `GET /{ad_account_id}/insights` | Obter métricas |

### 13.2 Google Ads API

| Service | Uso |
|---|---|
| `GoogleAdsService.Search` | Buscar entidades |
| `GoogleAdsService.Mutate` | Atualizar entidades |
| `CampaignService` | Gerenciar campanhas |
| `AdGroupService` | Gerenciar ad groups |
| `KeywordService` | Gerenciar keywords |

---

## 14. CHECKLIST DE IMPLEMENTAÇÃO

### 14.1 Backend

- [ ] CRUD de regras (create, read, update, delete)
- [ ] Validação de schema (filtros, condições, ações)
- [ ] Engine de execução de regras
- [ ] Scheduler (cron) com suporte a timezone
- [ ] Integração Meta Ads API
- [ ] Integração Google Ads API
- [ ] Sistema de logs
- [ ] Rate limiting (respeitar limites de API)
- [ ] Queue de execução (para muitas regras)
- [ ] Sistema de notificações (email)
- [ ] Frequency cap tracking por entidade

### 14.2 Frontend

- [ ] Builder visual de regras
- [ ] Seletor de filtros com autocomplete
- [ ] Builder de condições com aninhamento
- [ ] Preview de entidades afetadas
- [ ] Visualização de logs
- [ ] Dashboard de regras ativas
- [ ] Configuração de notificações
- [ ] Timezone picker
- [ ] Custom schedule builder (grid visual)

### 14.3 Infraestrutura

- [ ] Armazenamento de credenciais seguro
- [ ] Retry logic para falhas de API
- [ ] Monitoring e alertas
- [ ] Backup de configurações
- [ ] Ambiente de staging para testes

---

**FIM DO DOCUMENTO**
