# Feature Specification: Google Ads Performance Dashboard & Automation Engine

**Feature Branch**: `025-google-ads-dashboard`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Google Ads Performance Dashboard & Automation Engine - Uma feature completa para monitorar performance de campanhas Google Ads em tempo real, com ações rápidas (pausar, alterar orçamento, duplicar) e um sistema de automações/gatilhos configuráveis pelo usuário."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar Performance de Campanhas (Priority: P1)

Como usuário do AlvoBot, quero visualizar todas as minhas campanhas do Google Ads em um dashboard centralizado com métricas de performance atualizadas, para entender rapidamente quais campanhas estão performando bem e quais precisam de atenção.

**Why this priority**: Esta é a funcionalidade fundamental que habilita todas as outras. Sem visibilidade das métricas, o usuário não pode tomar decisões informadas sobre pausar, ajustar ou automatizar campanhas.

**Independent Test**: Pode ser testado selecionando uma conta Google Ads conectada e verificando se todas as campanhas aparecem com suas métricas corretas (impressões, cliques, CTR, custo, conversões, CPA).

**Acceptance Scenarios**:

1. **Given** usuário tem uma conta Google Ads conectada, **When** acessa o dashboard de campanhas, **Then** vê uma lista de todas as campanhas ativas e pausadas com métricas dos últimos 7 dias
2. **Given** usuário está no dashboard, **When** seleciona um período diferente (hoje, 7 dias, 30 dias, personalizado), **Then** as métricas são atualizadas para refletir o período selecionado
3. **Given** usuário tem múltiplas campanhas, **When** clica em uma coluna de métrica, **Then** a lista é ordenada por aquela métrica (ascendente/descendente)
4. **Given** usuário está visualizando campanhas, **When** uma campanha tem performance abaixo do esperado, **Then** um indicador visual (ícone/cor) alerta o usuário

---

### User Story 2 - Executar Ações Rápidas em Campanhas (Priority: P1)

Como usuário, quero poder pausar, ativar, alterar orçamento e duplicar campanhas diretamente do dashboard, para fazer ajustes rápidos sem precisar acessar a interface do Google Ads.

**Why this priority**: Ações rápidas são essenciais para a proposta de valor do dashboard. Visualizar métricas sem poder agir sobre elas reduz significativamente a utilidade da feature.

**Independent Test**: Pode ser testado pausando uma campanha ativa e verificando se o status muda tanto no dashboard quanto no Google Ads.

**Acceptance Scenarios**:

1. **Given** uma campanha está ativa, **When** usuário clica em "Pausar", **Then** a campanha é pausada no Google Ads e o status atualiza no dashboard
2. **Given** uma campanha está pausada, **When** usuário clica em "Ativar", **Then** a campanha é ativada no Google Ads e o status atualiza no dashboard
3. **Given** usuário seleciona "Alterar Orçamento" em uma campanha, **When** insere um novo valor e confirma, **Then** o orçamento é atualizado no Google Ads
4. **Given** usuário clica em "Duplicar" em uma campanha, **When** confirma a ação, **Then** uma nova campanha é criada com as mesmas configurações (exceto nome, que recebe sufixo)
5. **Given** uma ação falha (ex: erro de API), **When** o sistema detecta o erro, **Then** exibe mensagem clara ao usuário e registra no log de ações

---

### User Story 3 - Criar Automações com Gatilhos Condicionais (Priority: P2)

Como usuário, quero criar regras de automação baseadas em condições de performance das campanhas, para que o sistema tome ações automaticamente sem minha intervenção constante.

**Why this priority**: Automações são um diferencial importante mas dependem do dashboard e ações funcionando primeiro. Representam valor agregado significativo para usuários avançados.

**Independent Test**: Pode ser testado criando uma automação simples (ex: "pausar se custo > R$100 e conversões = 0") e verificando se a ação é executada quando as condições são atendidas.

**Acceptance Scenarios**:

1. **Given** usuário está na tela de automações, **When** clica em "Nova Automação", **Then** vê um formulário para configurar condições e ações
2. **Given** usuário está criando automação, **When** define condição "Se campanha rodou X horas sem impressões", **Then** pode selecionar ação "Aumentar lance em X centavos"
3. **Given** usuário está criando automação, **When** define condição "Se gastou X% do orçamento em Y horas", **Then** pode selecionar ação "Aumentar orçamento em X%" ou "Pausar campanha"
4. **Given** uma automação está ativa, **When** as condições são atendidas, **Then** a ação é executada automaticamente e registrada no histórico
5. **Given** usuário tem automações criadas, **When** acessa a lista, **Then** vê todas as automações com status (ativa/pausada) e última execução

---

### User Story 4 - Visualizar Histórico de Ações e Automações (Priority: P2)

Como usuário, quero ver um histórico completo de todas as ações executadas (manuais e automáticas) nas minhas campanhas, para ter auditoria e entender o que aconteceu.

**Why this priority**: O histórico é importante para auditoria e debugging, mas não bloqueia o uso das funcionalidades principais.

**Independent Test**: Pode ser testado executando uma ação manual e verificando se aparece no histórico com timestamp, tipo de ação e resultado.

**Acceptance Scenarios**:

1. **Given** usuário acessa o histórico, **When** a página carrega, **Then** vê lista cronológica de todas as ações com data/hora, campanha, tipo de ação e resultado
2. **Given** histórico tem muitos registros, **When** usuário filtra por tipo (manual/automático) ou campanha, **Then** apenas registros relevantes são exibidos
3. **Given** uma automação foi executada, **When** usuário vê o registro, **Then** pode identificar qual regra disparou a ação e quais eram os valores das métricas no momento

---

### User Story 5 - Receber Alertas de Performance (Priority: P3)

Como usuário, quero receber alertas visuais quando campanhas têm performance fora do esperado, para identificar rapidamente problemas que precisam de atenção.

**Why this priority**: Alertas são convenientes mas não essenciais para a operação básica. Usuários podem identificar problemas manualmente através das métricas.

**Independent Test**: Pode ser testado configurando um alerta (ex: "CTR < 1%") e verificando se campanhas que atendem a condição são destacadas.

**Acceptance Scenarios**:

1. **Given** uma campanha tem CTR abaixo de 1%, **When** usuário visualiza o dashboard, **Then** a campanha é destacada com indicador visual de alerta
2. **Given** uma campanha gastou 90%+ do orçamento diário antes das 18h, **When** usuário visualiza o dashboard, **Then** vê alerta de "Orçamento quase esgotado"
3. **Given** uma campanha está ativa há 24h sem conversões, **When** usuário visualiza o dashboard, **Then** vê alerta de "Sem conversões"

---

### Edge Cases

- O que acontece quando a API do Google Ads está indisponível? Sistema exibe mensagem de erro e permite retry; usa cache se disponível
- Como o sistema lida com campanhas removidas no Google Ads? Remove da lista na próxima sincronização
- O que acontece se uma automação tenta executar uma ação em campanha já pausada/removida? A ação é ignorada e registrada como "não aplicável" no histórico
- Como o sistema lida com rate limits da API do Google Ads? Implementa backoff exponencial e notifica usuário se sincronização falhar
- O que acontece se usuário cria automações conflitantes? Sistema executa na ordem de criação e registra cada execução separadamente
- Como o sistema lida com múltiplas contas Google Ads? Cada conta é tratada separadamente, usuário seleciona qual visualizar

## Requirements *(mandatory)*

### Functional Requirements

**Dashboard de Campanhas:**
- **FR-001**: Sistema DEVE exibir lista de campanhas com métricas: impressões, cliques, CTR, custo, conversões, taxa de conversão, CPA, ROAS
- **FR-002**: Sistema DEVE permitir filtrar campanhas por período (hoje, 7 dias, 30 dias, período personalizado)
- **FR-003**: Sistema DEVE permitir ordenar campanhas por qualquer coluna de métrica
- **FR-004**: Sistema DEVE exibir status da campanha (ativa, pausada, removida)
- **FR-005**: Sistema DEVE indicar visualmente campanhas com performance abaixo do esperado

**Ações em Campanhas:**
- **FR-006**: Sistema DEVE permitir pausar campanhas ativas
- **FR-007**: Sistema DEVE permitir ativar campanhas pausadas
- **FR-008**: Sistema DEVE permitir alterar orçamento diário de campanhas
- **FR-009**: Sistema DEVE permitir duplicar campanhas existentes
- **FR-010**: Sistema DEVE confirmar ações destrutivas antes de executar
- **FR-011**: Sistema DEVE exibir feedback de sucesso/erro após cada ação

**Automações:**
- **FR-012**: Sistema DEVE permitir criar regras de automação com condições e ações
- **FR-012a**: Sistema DEVE permitir definir escopo da automação: todas as campanhas OU filtro por critérios (nome contém, status, métricas)
- **FR-013**: Sistema DEVE suportar condições baseadas em: tempo de execução, impressões, cliques, custo, conversões, CTR, CPA
- **FR-013a**: Sistema DEVE suportar combinação de condições com AND e OR, incluindo agrupamento (ex: "(A E B) OU C")
- **FR-014**: Sistema DEVE suportar ações: pausar campanha, ativar campanha, aumentar/diminuir lance, aumentar/diminuir orçamento
- **FR-015**: Sistema DEVE permitir ativar/desativar automações individualmente
- **FR-016**: Sistema DEVE permitir configurar frequência de verificação do trigger (intervalo configurável pelo usuário)
- **FR-016a**: Sistema DEVE permitir configurar número máximo de execuções por automação
- **FR-016b**: Sistema DEVE permitir configurar cooldown entre execuções (tempo mínimo antes de executar novamente na mesma campanha)
- **FR-017**: Sistema DEVE permitir definir limites máximos para ações automáticas (ex: não aumentar orçamento além de X)

**Histórico e Auditoria:**
- **FR-018**: Sistema DEVE registrar todas as ações (manuais e automáticas) com timestamp
- **FR-018a**: Sistema DEVE reter histórico de ações indefinidamente (sem limite de tempo)
- **FR-019**: Sistema DEVE permitir filtrar histórico por tipo de ação, campanha e período
- **FR-020**: Sistema DEVE exibir contexto da automação quando ação foi automática (regra, valores das métricas)
- **FR-020a**: Sistema DEVE exibir notificação in-app (badge/alerta) quando automações são executadas

**Dados e Arquitetura:**
- **FR-021**: Sistema DEVE buscar métricas de campanhas diretamente da API do Google Ads em tempo real (não armazenar no banco local)
- **FR-021a**: Sistema DEVE usar o token OAuth da conexão do próprio usuário para todas as chamadas à API do Google Ads
- **FR-022**: Sistema DEVE armazenar apenas dados próprios no banco local: automações, histórico de ações, configurações
- **FR-023**: Sistema DEVE implementar cache de curta duração para métricas (evitar chamadas excessivas à API)

### Key Entities

**Dados da API Google Ads (não persistidos localmente):**
- **CampaignMetrics**: Métricas de campanha buscadas em tempo real (impressões, cliques, custo, conversões, etc.)

**Dados locais (persistidos no Supabase):**
- **AutomationRule**: Regra de automação criada pelo usuário (nome, escopo/filtros, condições, ação, status ativo/inativo, limites, cooldown, frequência)
- **AutomationCondition**: Condição que dispara a automação (métrica, operador, valor, operador lógico AND/OR, agrupamento)
- **AutomationAction**: Ação a ser executada (tipo de ação, valor/percentual, limites máximos)
- **ActionLog**: Registro de ação executada (timestamp, campaign_id do Google, tipo, origem manual/automática, resultado, contexto/snapshot de métricas)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem visualizar métricas de todas as campanhas em menos de 5 segundos após acessar o dashboard
- **SC-002**: Usuários conseguem executar ações (pausar, ativar, alterar orçamento) em menos de 3 cliques
- **SC-003**: 95% das ações executadas refletem no Google Ads em menos de 30 segundos
- **SC-004**: Automações são avaliadas e executadas dentro do intervalo configurado (mínimo 1 hora)
- **SC-005**: 100% das ações (manuais e automáticas) são registradas no histórico
- **SC-006**: Usuários conseguem criar uma automação básica em menos de 2 minutos
- **SC-007**: Dashboard exibe dados em tempo real da API do Google Ads (sujeito ao delay natural de ~3h da plataforma)
- **SC-008**: Sistema mantém funcionamento normal mesmo com contas com até 1.000 campanhas

## Clarifications

### Session 2026-01-13

- Q: Escopo de aplicação das automações (todas campanhas vs específicas)? → A: Automações suportam escopo configurável: aplicar em todas as campanhas OU filtrar por critérios (nome contém X, status, métricas como orçamento > Y)
- Q: Limite de execuções por automação? → A: Usuário configura: número máximo de execuções, cooldown entre execuções (tempo mínimo antes de executar novamente na mesma campanha), e frequência de verificação do trigger
- Q: Notificações de automações executadas? → A: Notificação in-app (badge/alerta) + registro no histórico
- Q: Condições compostas nas automações? → A: Suportar AND e OR com agrupamento (ex: "(CTR < 1% E custo > R$50) OU (impressões = 0 E tempo > 4h)")
- Q: Retenção do histórico de ações? → A: Indefinidamente (sem limite de retenção)
- Q: Armazenamento de métricas de campanhas? → A: Buscar direto da API do Google Ads em tempo real, não salvar no banco local. Apenas automações, histórico e configurações são persistidos localmente.
- Q: Autenticação nas chamadas à API? → A: Sempre usar o token OAuth da conexão do próprio usuário (não token centralizado)

## Assumptions

- Usuário já possui uma conta Google Ads conectada ao AlvoBot (feature existente)
- A API do Google Ads está disponível e o developer token tem as permissões necessárias
- Métricas do Google Ads têm delay natural de ~3 horas (limitação da plataforma)
- Automações serão executadas por um job em background no servidor
- Duplicação de campanha recria estrutura básica (campanha + ad groups), não inclui histórico
- Rate limits da API do Google Ads (15.000 requests/dia) são suficientes para operação normal
