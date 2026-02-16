# Feature Specification: Ads Automation Engine

**Feature Branch**: `20260206-ads-automation-engine`  
**Created**: 2026-02-06  
**Status**: Draft  
**Input**: Motor de automação de anúncios para Meta Ads e Google Ads com regras, filtros, condições, ações, agendamento, notificações e métricas customizadas.

---

## Referências

- **Especificação técnica completa**: [`reference-spec-automacao-completa-v3.md`](./reference-spec-automacao-completa-v3.md) — Contém todos os enums, campos filtráveis, métricas, operadores, parâmetros de ações, exemplos reais completos (15 cenários), edge cases e schemas JSON. Este documento é a **fonte de verdade** para qualquer detalhe de implementação não coberto nesta spec funcional.

- **Referência de UX**: [bir.ch (Revealbot)](https://bir.ch) — A interface do builder de regras, filtros com grupos AND/OR, condition builder e layout geral segue os padrões e UX do Revealbot. Consultar para referência visual.

- **Research existente**: `docs/research/` — Contém requests capturados da API do birch.app para referência de padrões de API.

---

## Rotas e Localização

| Rota | Página | Descrição |
|------|--------|-----------|
| `/ads/automations` | AdsAutomationsPage | Lista, criação e edição de regras de automação |
| `/ads/history` | AdsHistoryPage | Histórico de execuções e logs de ações |

---

## Implementação Existente

> **Decisão: ESTENDER a implementação existente, não reescrever.**

O sistema já possui uma implementação substancial de automação para **Google Ads only**. A estratégia é estender essa base para suportar Meta Ads e as funcionalidades adicionais desta spec.

**O que já existe e deve ser preservado/estendido:**

| Componente | Status | Arquivos |
|------------|--------|----------|
| DB: `google_ads_automation_rules` | Completo | `supabase/migrations/20260113_google_ads_automations.sql` |
| DB: `google_ads_action_logs` | Completo | Mesma migration |
| DB: `google_ads_automation_executions` | Completo | Mesma migration |
| DB: `meta_action_logs` | Completo | `supabase/migrations/20260127_meta_action_logs.sql` |
| Backend: `GoogleAutomationService` | Completo (~1470 linhas) | `backend/src/modules/google/services/google-automation.service.ts` |
| Backend: `GoogleAutomationController` | Completo (8 endpoints) | `backend/src/modules/google/controllers/google-automation.controller.ts` |
| Backend: `AutomationRunnerJob` | Completo (cron a cada minuto) | `backend/src/common/jobs/automation-runner.job.ts` |
| Backend: `EmailService` (Resend) | Completo (usado para workspace invites) | `backend/src/modules/email/email.service.ts` |
| Frontend: `AutomationForm` | Completo (Google only) | `frontend/src/features/alvoads-google-dashboard/components/AutomationForm/` |
| Frontend: `ConditionBuilder` (AND/OR) | Completo | `frontend/src/features/alvoads-google-dashboard/components/ConditionBuilder/` |
| Frontend: `useConditionBuilder` hook | Completo | `frontend/src/features/alvoads-google-dashboard/hooks/useConditionBuilder.ts` |
| Frontend: Unified Adapters | Parcial (Meta stubbed) | `frontend/src/features/ads-unified/adapters/` |
| Frontend: `AdsAutomationsPage` | Completo (Meta "em breve") | `frontend/src/features/ads-unified/pages/AdsAutomationsPage.tsx` |
| Frontend: `AdsHistoryPage` | Completo | `frontend/src/features/ads-unified/pages/AdsHistoryPage.tsx` |

**O que precisa ser construído/estendido:**
- Backend: `MetaAutomationService` seguindo os mesmos padrões do Google
- DB: Tabela `meta_automation_rules` (ou unificar em tabela platform-agnostic)
- Backend: Abstração do `AutomationRunnerJob` para iterar ambas as plataformas
- Backend: Wiring do `EmailService` (Resend) no fluxo de execução de automação
- Backend: Novos tipos de condição (metric_comparison, ranking, time, lifecycle)
- Backend: Novos tipos de ação (duplicate, name actions, notify, scale_budget_by_target)
- Backend: Schedule avançado (custom slots, date_range, run_once)
- Frontend: Extensão do AutomationForm para Meta Ads
- Frontend: Expansão do ConditionBuilder com novos tipos de condição
- Frontend: UI de métricas customizadas
- Frontend: Configuração de notificações

---

## Integração de Email

O envio de notificações por email utiliza a **API do Resend** já configurada no backend:

- **Serviço existente**: `backend/src/modules/email/email.service.ts`
- **Variáveis de ambiente**: `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, `RESEND_SENDER_NAME` (já no `.env`)
- **Uso atual**: Apenas workspace invitations — deve ser estendido para notificações de automação

---

## Problem Statement

Gestores de tráfego pago precisam monitorar e ajustar campanhas de anúncios **manualmente**, verificando métricas, pausando entidades com baixa performance, escalando orçamentos de winners, e reagindo a mudanças no mercado. Esse processo é:

- **Demorado**: Verificações constantes consomem horas por dia
- **Propenso a erros**: Decisões manuais podem atrasar reações a quedas de ROAS
- **Não-escalável**: Quanto mais campanhas/contas, mais difícil gerenciar tudo manualmente
- **Limitado por horário**: Gestores não monitoram 24/7, perdendo oportunidades fora do expediente

O Ads Automation Engine permite que gestores criem **regras automáticas** que avaliam métricas, aplicam condições e executam ações nas campanhas de forma autônoma, em ambas as plataformas (Meta Ads e Google Ads).

---

## User Scenarios & Testing

### User Story 1 — Criar e Gerenciar Regras de Automação (Priority: P1)

O gestor acessa a seção de automação, cria uma nova regra definindo: plataforma (Meta ou Google), nível de atuação (campanha, ad set, ad group, ad, keyword, ou ad account para notificações), filtros para delimitar o escopo, e salva como rascunho. Pode editar, ativar, pausar ou excluir regras existentes.

**Why this priority**: Sem o CRUD básico de regras, nenhuma outra funcionalidade faz sentido. É o alicerce do sistema inteiro.

**Independent Test**: Pode ser testado criando, editando e excluindo regras em estado de rascunho — sem necessidade de execução ou integração com APIs externas.

**Acceptance Scenarios**:

1. **Given** o gestor está na página de automações, **When** clica em "Nova Regra" e seleciona plataforma Meta + nível "Ad Set", **Then** o formulário apresenta os campos relevantes para essa combinação (filtros de campaign e adset, sem campos de keyword).
2. **Given** existe uma regra em rascunho, **When** o gestor edita o nome e salva, **Then** a alteração é persistida e visível na lista de regras.
3. **Given** existe uma regra ativa, **When** o gestor clica em "Pausar", **Then** o status muda para "Pausado" e a regra deixa de ser executada no próximo ciclo.
4. **Given** o gestor está criando uma regra Google Ads, **When** seleciona a plataforma Google, **Then** o sistema exige a seleção de um tipo de campanha (Search, Display, Shopping, etc.) antes de prosseguir.
5. **Given** o gestor seleciona `performance_max` como tipo de campanha Google, **When** tenta selecionar o nível "Ad Group", **Then** o sistema bloqueia e exibe mensagem informando que apenas os níveis Campaign e Ad Account estão disponíveis para Performance Max.

---

### User Story 2 — Definir Filtros de Escopo (Priority: P1)

O gestor configura filtros para delimitar **quais entidades** a regra vai avaliar. Os filtros suportam lógica AND (dentro do mesmo grupo) e OR (entre grupos diferentes). Os filtros podem referenciar campos de hierarquia diferente do nível da regra (cross-level filtering).

**Why this priority**: Filtros definem o escopo de atuação. Sem eles, regras afetariam todas as entidades indiscriminadamente.

**Independent Test**: Pode ser testado construindo combinações de filtros no builder visual e verificando a lista de entidades que seriam afetadas (preview).

**Acceptance Scenarios**:

1. **Given** o gestor está configurando filtros para uma regra de nível "Ad Set", **When** adiciona filtro `campaign.name NOT_CONTAIN "[CBO]"` AND `campaign.effective_status IN ["ACTIVE"]` AND `adset.effective_status EQUAL "ACTIVE"`, **Then** o sistema mostra que serão avaliados apenas ad sets ativos de campanhas ativas que não contêm "[CBO]" no nome.
2. **Given** o gestor quer atingir dois cenários diferentes, **When** cria dois grupos de filtros (Group 1 AND Group 2 conectados por OR), **Then** o sistema avalia entidades que atendem a qualquer um dos grupos.
3. **Given** a regra é de nível "Ad", **When** o gestor adiciona um filtro em `campaign.objective EQUAL "OUTCOME_SALES"`, **Then** o sistema aplica filtragem cross-level, retornando apenas ads que pertencem a campanhas com esse objetivo.
4. **Given** o gestor adiciona filtros com operador REGEX, **When** o padrão regex é inválido, **Then** o sistema exibe erro de validação antes de salvar.

---

### User Story 3 — Configurar Condições (Gatilhos) para Ações (Priority: P1)

O gestor define **quando** uma ação deve ser executada, baseando-se em métricas de performance, comparações entre períodos, rankings, horários e ciclo de vida da entidade. As condições suportam aninhamento com lógica AND/OR.

**Why this priority**: As condições são o cérebro da automação — determinam se uma ação deve ou não ser executada para cada entidade.

**Independent Test**: Pode ser testado configurando condições no builder e verificando com dados simulados se entidades atendem ou não aos critérios.

**Acceptance Scenarios**:

1. **Given** o gestor configura condição `spend last_3d_with_today > 50 AND purchases last_3d_with_today = 0`, **When** uma entidade tem gasto de R$60 e 0 compras nos últimos 3 dias, **Then** a condição é avaliada como verdadeira para essa entidade.
2. **Given** o gestor configura condição de `metric_comparison` (ROAS 3d < 70% do ROAS 7d), **When** o ROAS de 3 dias é 1.2 e o de 7 dias é 2.0 (70% = 1.4), **Then** a condição dispara pois 1.2 < 1.4.
3. **Given** o gestor configura condição de `ranking` (bottom 20% por ROAS), **When** existem 10 entidades, **Then** as 2 com menor ROAS são identificadas (excluindo zeros se configurado).
4. **Given** o gestor configura condição de `time` (entre 08:00 e 22:00), **When** a regra executa às 23:00 no timezone configurado, **Then** a condição não é atendida e a ação não executa.
5. **Given** o gestor configura condição de `lifecycle` (horas_desde_criação > 72), **When** uma entidade foi criada há 48 horas, **Then** a condição não é atendida (protegendo a learning phase).
6. **Given** o gestor cria condições aninhadas (OR contendo dois grupos AND), **When** qualquer um dos grupos AND é verdadeiro, **Then** a condição geral é verdadeira.

---

### User Story 4 — Configurar Ações (Tasks) com Frequency Cap (Priority: P1)

O gestor define **o que** acontece quando as condições são atendidas. As ações disponíveis incluem: pausar, ativar, ajustar budget, ajustar bid, alterar estratégia de bid, duplicar, modificar nomes e notificar. Cada ação pode ter um frequency cap que limita quantas vezes a mesma entidade pode ser afetada.

**Why this priority**: Ações são o resultado final da automação — sem elas, o sistema apenas observa sem agir.

**Independent Test**: Pode ser testado configurando uma ação no builder, verificando que os parâmetros corretos são exigidos para cada tipo de ação, e que o frequency cap é respeitado em execuções simuladas.

**Acceptance Scenarios**:

1. **Given** o gestor configura ação `increase_budget` com `percentage 20%` e `max_budget 500`, **When** uma entidade com budget de R$100 atende às condições, **Then** o budget é aumentado para R$120 (não excedendo R$500).
2. **Given** o gestor configura ação `pause` com frequency_cap `once_in_lifetime`, **When** a entidade já foi pausada por essa regra anteriormente, **Then** a ação não é executada novamente.
3. **Given** o gestor configura ação `set_bid_strategy` para Meta com `cost_cap` e `bid_amount 30`, **When** a campanha atende às condições, **Then** a estratégia de bid é alterada para Cost Cap com valor de R$30.
4. **Given** a regra opera no nível "Ad Set" dentro de uma campanha CBO (Campaign Budget Optimization), **When** o gestor tenta configurar ação de budget, **Then** o sistema impede, informando que budgets devem ser alterados no nível Campaign para CBO.
5. **Given** o gestor configura ação `duplicate` com `preserve_social_proof: true`, **When** um ad atende às condições, **Then** uma cópia é criada mantendo engajamento social (likes, comentários, shares).
6. **Given** o gestor configura múltiplas ações na mesma regra (ex: pausar + adicionar "[STOP LOSS]" ao nome), **When** as condições são atendidas, **Then** ambas as ações são executadas para a mesma entidade.

---

### User Story 5 — Configurar Agendamento de Execução (Priority: P2)

O gestor define **quando** a regra é verificada. Pode escolher entre intervalo fixo (ex: a cada 1 hora) ou horários customizados por dia da semana (dayparting). O schedule respeita o timezone configurado.

**Why this priority**: O agendamento determina a frequência de verificação, mas a regra pode funcionar em modo manual/sob demanda enquanto o scheduler não está pronto.

**Independent Test**: Pode ser testado configurando schedules e verificando que a próxima execução calculada está correta para o timezone escolhido.

**Acceptance Scenarios**:

1. **Given** o gestor configura schedule tipo `frequency` com `check_interval: 1_hour`, **When** salva a regra, **Then** o sistema calcula a próxima execução para daqui a 1 hora no timezone configurado.
2. **Given** o gestor configura schedule tipo `custom` com slots apenas em dias úteis (seg-sex) das 8h às 20h, **When** é sábado, **Then** a regra não executa e a próxima execução é calculada para segunda-feira às 8h.
3. **Given** o gestor configura `date_range` de 01/02/2026 a 28/02/2026, **When** a data atual é 01/03/2026, **Then** a regra não executa mais.
4. **Given** o gestor configura `run_once: true`, **When** a regra é executada pela primeira vez, **Then** o status muda automaticamente para "Pausado" após a execução.
5. **Given** o timezone da regra é "America/Sao_Paulo" e o da conta de anúncios é "UTC", **When** o gestor usa condição de horário, **Then** o sistema exibe aviso sobre possível desalinhamento entre horário de execução e dados de métricas.

---

### User Story 6 — Monitorar Execuções e Logs (Priority: P2)

O gestor visualiza o histórico de execuções de cada regra: quantas entidades foram avaliadas, quantas atenderam aos filtros, quantas atenderam às condições, quantas foram afetadas, e quais erros ocorreram. Pode ver detalhes de cada entidade afetada com snapshot de métricas.

**Why this priority**: Visibilidade sobre o que aconteceu é essencial para confiança no sistema, mas não bloqueia a funcionalidade principal.

**Independent Test**: Pode ser testado após qualquer execução de regra, verificando que logs são registrados com todas as informações esperadas.

**Acceptance Scenarios**:

1. **Given** uma regra foi executada e afetou 5 ad sets, **When** o gestor abre os logs dessa regra, **Then** vê o resumo (entidades avaliadas, matched, afetadas, erros) e a lista detalhada com nomes, IDs e snapshots de métricas.
2. **Given** uma execução falhou parcialmente (3 ações OK, 2 com erro), **When** o gestor vê o log, **Then** o status é `partial` com detalhes dos erros.
3. **Given** uma regra executou mas nenhuma entidade atendeu às condições, **When** o gestor vê o log, **Then** o status é `skipped` com informação de quantas foram avaliadas vs. quantas passaram filtros.
4. **Given** uma entidade foi afetada com ação `increase_budget`, **When** o gestor vê os detalhes no log, **Then** vê o valor anterior e o novo valor do budget.

---

### User Story 7 — Receber Notificações por Email (Priority: P2)

O gestor configura emails para receber notificações quando: ações são executadas, erros ocorrem, ou nenhuma entidade atende aos critérios. O email inclui resumo, detalhes de entidades afetadas, snapshot de métricas e links diretos para a plataforma.

**Why this priority**: Notificações são o principal mecanismo de feedback passivo para o gestor, mas o sistema funciona sem elas.

**Independent Test**: Pode ser testado configurando notificações e verificando que emails são enviados com o template e conteúdo corretos.

**Acceptance Scenarios**:

1. **Given** o gestor configurou `notify_on_action: true` com email "gestor@empresa.com", **When** a regra executa e afeta 3 entidades, **Then** um email é enviado com subject customizado, resumo e detalhes.
2. **Given** o gestor configurou `notify_on_error: true`, **When** a regra falha por rate limit da API, **Then** um email é enviado com informações do erro.
3. **Given** o gestor configurou `notify_on_no_match: false`, **When** a regra executa sem afetar ninguém, **Then** nenhum email é enviado.
4. **Given** o assunto usa placeholders `{rule_name}` e `{entities_count}`, **When** o email é gerado, **Then** os placeholders são substituídos pelos valores reais.

---

### User Story 8 — Criar Métricas Customizadas (Priority: P3)

O gestor cria métricas customizadas combinando métricas nativas da plataforma com fórmulas matemáticas (soma, subtração, multiplicação, divisão, percentual). As métricas customizadas podem ser usadas em condições e filtros da mesma forma que métricas nativas.

**Why this priority**: Métricas customizadas são funcionalidades avançadas para power users. O sistema é completamente funcional sem elas, usando apenas as métricas nativas das plataformas.

**Independent Test**: Pode ser testado criando uma métrica customizada (ex: Hook Rate = Video Views 3s / Impressions * 100) e verificando o cálculo correto nos dados de teste.

**Acceptance Scenarios**:

1. **Given** o gestor cria métrica customizada `Blended ROAS = purchase_value / spend`, **When** usa essa métrica em uma condição, **Then** o cálculo é feito corretamente no momento da avaliação.
2. **Given** o gestor cria métrica `Hook Rate = video_views / impressions * 100` (operação percentage), **When** uma entidade tem 500 video views e 10.000 impressions, **Then** o Hook Rate calculado é 5%.
3. **Given** o gestor cria métrica com operando de valor fixo `Margem = purchase_value - (spend * 1.3)`, **When** usa em condição `Margem > 0`, **Then** identifica entidades lucrativas considerando margem de 30%.
4. **Given** o gestor tenta criar uma métrica com divisão por zero (ex: `spend / conversions` quando conversions = 0), **When** a métrica é calculada, **Then** o sistema retorna 0 e registra aviso no log.
5. **Given** o gestor cria uma métrica que referencia outra custom metric, **When** a segunda depende de métricas nativas válidas, **Then** o cálculo é resolvido em cadeia corretamente.

---

### User Story 9 — Preview de Entidades Afetadas (Priority: P2)

Antes de ativar uma regra, o gestor pode executar um **preview** que mostra quais entidades seriam afetadas, com suas métricas atuais, sem efetivamente executar nenhuma ação. Isso dá confiança para ativar a regra.

**Why this priority**: Preview reduz drasticamente o risco de erros em produção e aumenta a confiança do gestor no sistema.

**Independent Test**: Pode ser testado executando preview em uma regra configurada e verificando que a lista retornada corresponde ao esperado.

**Acceptance Scenarios**:

1. **Given** o gestor criou uma regra de stop loss (gasto > 50 e 0 compras), **When** clica em "Preview", **Then** vê a lista de entidades que seriam pausadas, com métricas de gasto, compras e ROAS.
2. **Given** o preview retorna mais de 2.000 entidades, **When** o resultado é mostrado, **Then** o sistema exibe aviso sobre o limite e sugere adicionar filtros.
3. **Given** o gestor executa preview, **When** nenhuma entidade atende às condições, **Then** exibe mensagem informativa explicando que nenhuma entidade seria afetada.

---

### User Story 10 — Configurar Atribuição de Conversão (Priority: P3)

O gestor configura a janela de atribuição usada para métricas de conversão. Pode usar a configuração de cada entidade (`use_entity_setting: true`) ou forçar uma janela específica.

**Why this priority**: A maioria dos gestores usa a configuração padrão da entidade. Controle fino de atribuição é para cenários avançados.

**Independent Test**: Pode ser testado configurando diferentes janelas de atribuição e verificando que as métricas de conversão refletem a configuração escolhida.

**Acceptance Scenarios**:

1. **Given** o gestor configura `use_entity_setting: true`, **When** a regra avalia métricas de conversão, **Then** cada entidade é avaliada com sua própria janela de atribuição.
2. **Given** o gestor configura `window: "1d_click"` com `use_entity_setting: false`, **When** ad sets da mesma campanha têm janelas diferentes, **Then** todas são avaliadas com janela de 1 dia de clique.
3. **Given** o gestor usa `use_entity_setting: false` em uma regra de nível Campaign, **When** os ad sets têm attribution windows diferentes, **Then** o sistema exibe aviso de que métricas de conversão podem retornar 0.

---

### Edge Cases

- **O que acontece quando uma métrica retorna 0 por falta de dados?** Uma condição como `CPA < 30` dispararia incorretamente (0 < 30 é verdadeiro). O sistema deve alertar o gestor para adicionar condição de `impressions > 0` ou `spend > 0` ao configurar métricas derivadas.

- **O que acontece quando uma regra Meta tenta alterar budget de ad set em campanha CBO?** O sistema deve detectar a incompatibilidade no momento da configuração e bloquear, exibindo mensagem orientando a criar regra no nível Campaign.

- **O que acontece quando a API da plataforma retorna rate limit?** O sistema deve implementar retry com backoff exponencial (maxRetries: 3, baseDelay: 1s, maxDelay: 30s) e, se persistir, marcar a execução como `rate_limited` e notificar o gestor.

- **O que acontece quando `date_range.start` está no passado ao ativar uma regra?** O sistema considera a regra elegível para execução imediata (treat as already started).

- **O que acontece quando um gestor configura mais de 2.000 entidades no escopo?** O sistema exibe aviso e sugere adicionar filtros para reduzir o escopo (ex: `impressions last 30d > 0`).

- **O que acontece com regras que referenciam contas Meta com moedas diferentes?** O sistema deve validar no momento da configuração que todas as contas selecionadas usam a mesma moeda.

- **O que acontece com Google Ads quando campaign types diferentes são misturados na mesma regra?** O sistema deve exigir um único campaign type por regra e validar na criação.

- **O que acontece quando uma entidade é afetada por duas regras conflitantes?** (ex: uma tenta pausar e outra tenta ativar). O sistema deve executar por ordem de prioridade/timestamp e registrar o conflito no log.

- **O que acontece com condições baseadas em horário quando timezone da regra difere do timezone da conta?** O sistema deve exibir aviso claro sobre possível desalinhamento entre horário de execução e dados de métricas.

- **O que acontece quando uma custom metric referencia outra custom metric em cadeia circular?** (ex: A depende de B, B depende de A). O sistema deve detectar dependências circulares na criação e bloquear com mensagem de erro.

---

## Requirements

### Functional Requirements

**CRUD e Gestão de Regras:**
- **FR-001**: O sistema DEVE permitir criar regras de automação com nome, descrição, plataforma (Meta/Google), nível de atuação e status inicial de rascunho.
- **FR-002**: O sistema DEVE permitir editar, ativar, pausar e excluir regras existentes.
- **FR-003**: O sistema DEVE validar que regras Google Ads têm exatamente 1 conta e 1 campaign type selecionado.
- **FR-004**: O sistema DEVE validar que regras Meta Ads aceitam no máximo 5 contas e todas com a mesma moeda.
- **FR-005**: O sistema DEVE validar que o nível selecionado é compatível com a plataforma e campaign type (ex: Performance Max só aceita Campaign ou Ad Account).
- **FR-006**: O sistema DEVE limitar o escopo de entidades por regra a 2.000 e exibir aviso quando excedido.

**Filtros (Scope):**
- **FR-010**: O sistema DEVE suportar filtros com estrutura de array de arrays (AND dentro do grupo, OR entre grupos).
- **FR-011**: O sistema DEVE suportar filtragem cross-level (filtrar por campos de hierarquias diferentes do nível da regra).
- **FR-012**: O sistema DEVE suportar os operadores: EQUAL, NOT_EQUAL, CONTAIN, NOT_CONTAIN, START_WITH, END_WITH, REGEX, IN, NOT_IN, GREATER_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN, LESS_THAN_OR_EQUAL, BETWEEN.
- **FR-013**: O sistema DEVE validar operadores de acordo com o tipo de campo (ex: CONTAIN só para strings, BETWEEN só para números).
- **FR-014**: O sistema DEVE validar padrões REGEX antes de salvar.

**Condições (Gatilhos):**
- **FR-020**: O sistema DEVE suportar 5 tipos de condição: simple, metric_comparison, ranking, time, lifecycle.
- **FR-021**: O sistema DEVE suportar aninhamento de condições com operadores AND/OR em qualquer profundidade.
- **FR-022**: O sistema DEVE suportar todos os períodos de tempo definidos (today, yesterday, last_3d, last_7d, last_30d, lifetime, etc.), incluindo variantes "with_today".
- **FR-023**: O sistema DEVE suportar todas as métricas definidas para cada plataforma (Meta: ~50 métricas, Google: ~30 métricas).
- **FR-024**: Condições de tipo `metric_comparison` DEVEM suportar multiplicador para detectar deterioração/melhoria percentual.
- **FR-025**: Condições de tipo `ranking` DEVEM suportar posição top/bottom por quantidade ou percentual, com opção de incluir/excluir zeros.

**Ações (Tasks):**
- **FR-030**: O sistema DEVE suportar todas as 16 ações definidas: pause, start, extend_end_date, increase_budget, decrease_budget, set_budget, scale_budget_by_target, increase_bid, decrease_bid, set_bid, set_bid_strategy, duplicate, add_to_name, remove_from_name, replace_in_name, notify. Nota: a disponibilidade de cada ação varia por plataforma e nível.
- **FR-031**: Cada ação DEVE ter frequency cap configurável por entidade (no_limit até once_in_lifetime).
- **FR-032**: O sistema DEVE validar que a ação é compatível com o nível e plataforma selecionados (ex: bid não existe para Campaign Meta, extend_end_date só existe para Google).
- **FR-033**: Ações de budget DEVEM respeitar limites min/max configurados pelo gestor.
- **FR-034**: Ação de `duplicate` DEVE suportar preservação de social proof e destino customizado.
- **FR-035**: Cada task (ação) DEVE ter suas próprias condições (ConditionGroup), permitindo múltiplas ações com condições diferentes na mesma regra.

**Schedule:**
- **FR-040**: O sistema DEVE suportar agendamento por frequência fixa (15min a 72h) ou horários customizados por dia da semana.
- **FR-041**: O sistema DEVE respeitar o timezone configurado na regra (formato IANA).
- **FR-042**: O sistema DEVE suportar `date_range` para limitar execuções a um período específico.
- **FR-043**: O sistema DEVE suportar `run_once` para execução única.

**Notificações:**
- **FR-050**: O sistema DEVE enviar notificações por email quando configurado (on_action, on_error, on_no_match).
- **FR-051**: Notificações DEVEM suportar placeholders dinâmicos ({rule_name}, {entities_count}, {platform}, {timestamp}, etc.).
- **FR-052**: Notificações DEVEM incluir resumo, detalhes de entidades e snapshot de métricas quando configurado.

**Métricas Customizadas:**
- **FR-060**: O sistema DEVE permitir criar métricas customizadas com fórmulas (add, subtract, multiply, divide, percentage).
- **FR-061**: Operandos de fórmulas DEVEM suportar: métricas nativas da plataforma, valores fixos numéricos e referência a outras custom metrics.
- **FR-062**: O sistema DEVE detectar e impedir dependências circulares entre custom metrics.
- **FR-063**: O sistema DEVE tratar divisão por zero retornando 0 e registrando aviso no log de execução.

**Logs e Monitoramento:**
- **FR-070**: O sistema DEVE registrar log de cada execução com: entities_evaluated, entities_matched_filters, entities_matched_conditions, entities_affected, entities_skipped_frequency_cap, errors.
- **FR-071**: Cada entidade afetada DEVE ter registro com: ID, nome, ação executada, valor anterior, novo valor e snapshot de métricas.
- **FR-072**: Logs DEVEM ser consultáveis por regra, período e status de execução.

**Preview:**
- **FR-080**: O sistema DEVE permitir preview de execução que mostra entidades que seriam afetadas sem executar ações.
- **FR-081**: O preview DEVE mostrar métricas atuais de cada entidade para o período configurado nas condições.

**Atribuição:**
- **FR-090**: O sistema DEVE suportar configuração de janela de atribuição por regra, com opção de usar a configuração de cada entidade.
- **FR-091**: O sistema DEVE alertar o gestor sobre possíveis problemas quando attribution windows diferentes são usados no mesmo escopo.

### Key Entities

- **AutomationRule**: Regra de automação completa — inclui plataforma, nível, filtros, tasks (ações + condições), schedule, atribuição e configuração de notificações. Tem status (active, paused, draft) e referencia contas de anúncios.

- **Filter**: Define o escopo de entidades avaliadas. Contém campo, operador, valor e período opcional. Agrupados em arrays (AND dentro, OR entre).

- **ConditionGroup**: Grupo de condições com operador AND/OR, suportando aninhamento. Cada condição tem tipo (simple, metric_comparison, ranking, time, lifecycle) e parâmetros específicos.

- **Task**: Ação a ser executada quando condições são atendidas. Contém ação, parâmetros, frequency cap e seu próprio ConditionGroup.

- **Schedule**: Configuração de quando a regra é verificada. Pode ser frequência fixa ou custom slots por dia/hora. Inclui timezone e date_range opcional.

- **ExecutionLog**: Registro de cada execução de regra — resumo agregado, lista de entidades afetadas com antes/depois, erros e notificações enviadas.

- **CustomMetric**: Métrica definida pelo gestor com fórmula combinando métricas nativas da plataforma e valores fixos numéricos. Suporta referência a outras custom metrics (sem dependências circulares).

- **NotificationConfig**: Configuração de emails, tipos de notificação (on_action, on_error, on_no_match), personalização de assunto e conteúdo.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Gestores conseguem criar e configurar uma regra completa (filtros + condições + ações + schedule) em menos de 10 minutos.

- **SC-002**: O sistema executa regras dentro do intervalo configurado com variação máxima de 2 minutos (ex: regra de 1 hora executa entre 58-62 minutos).

- **SC-003**: O preview de entidades retorna resultados em menos de 30 segundos para regras com até 2.000 entidades no escopo.

- **SC-004**: 100% das ações executadas são registradas em logs com snapshot de métricas e valores antes/depois.

- **SC-005**: O sistema consegue processar pelo menos 50 regras ativas simultaneamente sem degradação de performance.

- **SC-006**: O frequency cap é respeitado com 100% de precisão — nenhuma entidade é afetada mais vezes do que o cap permite.

- **SC-007**: Notificações por email são enviadas em menos de 5 minutos após a conclusão da execução da regra.

- **SC-008**: O sistema reduz o tempo médio que gestores gastam em tarefas manuais de otimização em pelo menos 60%. *Nota: baseline a ser medido via pesquisa com usuários antes do lançamento; validação pós-MVP.*

- **SC-009**: O sistema suporta ambas as plataformas (Meta Ads e Google Ads) de forma unificada na mesma interface, sem necessidade de trocar de ferramenta.

- **SC-010**: 95% dos gestores conseguem usar o builder visual de regras sem consultar documentação externa.

---

## Assumptions

- As contas de anúncios Meta e Google já estão conectadas ao sistema AlvoBot (via módulos de connections existentes).
- O gestor tem permissões adequadas nas contas de anúncios para executar as ações configuradas.
- As APIs de Meta Ads e Google Ads mantêm seus endpoints e formatos de resposta estáveis durante o desenvolvimento.
- O timezone padrão para novos gestores brasileiros é "America/Sao_Paulo".
- O sistema reutiliza a infraestrutura de autenticação OAuth já existente para Meta e Google.
- A implementação existente de automação Google Ads (CRUD, condition evaluation, action execution, cooldowns, cron scheduler) será **estendida**, não reescrita.
- O `EmailService` existente (Resend API, já configurado com `RESEND_API_KEY` no `.env`) será estendido para enviar notificações de automação.
- O `ConditionBuilder` existente (frontend) com suporte AND/OR será estendido para suportar novos tipos de condição.
- O padrão de adapter do `ads-unified` (GoogleAdsAdapter / MetaAdsAdapter) será mantido para normalização cross-platform.

---

## Out of Scope

- **Automação para outras plataformas** (TikTok Ads, LinkedIn Ads, Pinterest Ads, etc.) — apenas Meta e Google nesta versão.
- **Criação de campanhas/ad sets/ads** — o sistema apenas gerencia entidades existentes (exceto duplicação).
- **Otimização automática por IA** — o sistema segue regras definidas pelo gestor, não toma decisões autônomas baseadas em ML.
- **Relatórios e analytics avançados** — o sistema gera logs e notificações, não dashboards de BI.
- **Integração com fontes de dados externas** — não há integração com Google Sheets, Salesforce, HubSpot ou CRMs. Métricas customizadas são calculadas exclusivamente a partir de métricas nativas das plataformas.
- **Mobile app** — a interface é web-only.
- **Multi-tenancy avançado** — nesta versão, regras são por workspace, sem conceito de "templates globais" compartilháveis entre workspaces.
- **Undo/rollback automático** — se uma ação foi executada (ex: pausar), o gestor precisa reativar manualmente ou criar outra regra.
