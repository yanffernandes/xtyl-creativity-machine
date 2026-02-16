# Feature Specification: Google Search Console - Indexação e Acompanhamento

**Feature Branch**: `030-google-search-console-indexing`  
**Created**: 2026-01-25  
**Status**: Draft  
**Input**: User description: "Implementação completa do Search Console, documentar conexão e adicionar acompanhamento de indexação com pedido de indexação individual/em massa, respeitando o limite diário por conexão."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Visualizar status de indexação no datatable de artigos (Priority: P1)

Como usuário do workspace, eu quero ver no datatable de artigos se cada URL está indexada ou não, para priorizar ações de SEO sem sair da ferramenta.

**Why this priority**: Transparência imediata sobre indexação é o valor central e habilita todas as outras ações.

**Independent Test**: Pode ser testado ao carregar a tabela de artigos com URLs válidas e verificar o status exibido por linha.

**Acceptance Scenarios**:

1. **Given** que o usuário possui uma conexão GSC ativa e artigos com URLs, **When** abre a tabela, **Then** cada linha exibe um status de indexação atualizado pela rotina diária ou por refresh sob demanda (com cache de 24h).
2. **Given** que a URL não pertence a nenhuma propriedade verificada, **When** a inspeção é solicitada, **Then** o status retorna "não autorizado" com mensagem clara.

---

### User Story 2 - Solicitar indexação individual e em massa (Priority: P1)

Como usuário, quero solicitar indexação para um artigo específico ou para vários artigos selecionados, respeitando o limite diário da conexão, para acelerar a descoberta de novos conteúdos.

**Why this priority**: É a ação principal desejada pelo usuário e traz impacto direto no tempo de indexação.

**Independent Test**: Pode ser testado ao selecionar 1 e N artigos e verificar o enfileiramento/envio com consumo de quota.

**Acceptance Scenarios**:

1. **Given** um artigo elegível para envio, **When** clico em "Solicitar indexação", **Then** o pedido é registrado e enviado (ou enfileirado) com feedback imediato.
2. **Given** múltiplos artigos selecionados, **When** clico em "Solicitar indexação em massa", **Then** o sistema cria uma fila e processa até o limite diário disponível.

---

### User Story 3 - Automação leve de envio diário (Priority: P2)

Como usuário, quero uma rotina simples que envie automaticamente pedidos de indexação para artigos ainda não indexados, para reduzir trabalho manual.

**Why this priority**: Reduz esforço recorrente e mantém o site atualizado, mas depende das bases acima.

**Independent Test**: Pode ser testado ao marcar artigos como "não indexado" e executar a rotina para confirmar que respeita quota e atualiza status.

**Acceptance Scenarios**:

1. **Given** uma lista de artigos não indexados, **When** a rotina diária roda, **Then** apenas até o limite diário disponível são enviados.
2. **Given** a quota diária já esgotada, **When** a rotina roda, **Then** nenhum envio é feito e o sistema agenda o próximo dia.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- O que acontece quando a conexão expira/revoga permissão?
- Como o sistema lida com quota diária esgotada no meio de um lote?
- Como lidar com URL fora da propriedade selecionada ou propriedade não verificada?
- Como lidar com URLs com canonical apontando para outra página?
- Como lidar quando a API retorna estado "unknown" ou "cannot be indexed"?
- O que acontece quando a URL não é elegível para pedido de indexação via API?
- O que acontece quando o usuário tenta enviar uma URL não elegível? Deve retornar erro e não consumir quota.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: O sistema DEVE registrar e armazenar conexões do Google Search Console por workspace, incluindo propriedades autorizadas e status da conexão.
- **FR-002**: O sistema DEVE obter status de indexação por URL (inspeção) e exibir no datatable de artigos.
- **FR-002a**: O sistema DEVE atualizar status por rotina diária e permitir refresh sob demanda, respeitando cache de 24h.
- **FR-003**: O usuário DEVE poder solicitar indexação individualmente e em massa a partir do datatable.
- **FR-004**: O sistema DEVE respeitar o limite diário de envios por conexão (quota padrão inicial: 200 publish requests/dia por projeto) e não exceder o saldo disponível.
- **FR-005**: O sistema DEVE registrar histórico de inspeções e envios (data, resultado, resposta da API).
- **FR-006**: O sistema DEVE expor controles para ativar/desativar a rotina automática de envio por workspace.
- **FR-006a**: A rotina automática DEVE executar por conexão (uma por vez), respeitando a quota individual.
- **FR-007**: O sistema DEVE priorizar automaticamente URLs não indexadas mais recentes (por data de publicação/atualização) quando rodar a rotina.
- **FR-008**: O sistema DEVE fornecer feedback claro de erro/limitação (quota, falta de permissão, propriedade inválida, erro da API).
- **FR-008a**: O sistema DEVE permitir a ação no UI para todas as URLs, mas bloquear no backend quando a URL não for elegível e retornar erro claro.
- **FR-009**: O sistema NÃO DEVE armazenar chaves/segredos no frontend e DEVE usar o backend para chamadas externas.
- **FR-010**: O sistema DEVE evitar dados hardcoded; propriedades, quotas e status devem ser carregados dinamicamente.
- **FR-011**: O sistema DEVE oferecer documentação interna completa da integração (fluxo OAuth, propriedades, quotas, limites e troubleshooting).
- **FR-012**: O sistema DEVE processar lotes de envio e inspeção de forma assíncrona para não bloquear a UI.
- **FR-012a**: O envio em massa DEVE ocorrer por fila assíncrona com resposta imediata ao usuário.
- **FR-013**: O sistema DEVE respeitar limites de inspeção (URL Inspection quota: 2000/dia por propriedade) e reter fila para próximos dias.
- **FR-014**: O sistema DEVE impedir solicitações duplicadas para a mesma URL no mesmo dia, salvo atualização explícita.
- **FR-015**: O sistema DEVE permitir execução manual da rotina automática (botão "Executar agora").

- **FR-016**: O sistema DEVE solicitar indexação via API apenas para URLs elegíveis segundo as políticas do Google Search Console (somente `JobPosting` ou `BroadcastEvent`). O backend DEVE validar o schema type antes de enviar à API.
- **FR-017**: O sistema DEVE tratar graciosamente erros de conexão expirada, propriedade não verificada, canonical mismatch e estado "cannot be indexed", retornando mensagens claras ao usuário.
- **FR-018**: O sistema DEVE exibir no modal de configuração da conexão: e-mail da conta Google conectada, lista de propriedades autorizadas (sites verificados), e data de expiração do token.

### Non-Functional Requirements

- **NFR-001**: Inspeções sob demanda devem responder em p95 < 2s para até 50 URLs simultâneas.
- **NFR-002**: Processamento de lote de 200 URLs deve concluir em até 10 minutos.
- **NFR-003**: Logs de integração devem registrar sucesso/erro com timestamp e correlation id.

- **NFR-004**: Deve existir validação de desempenho por script de carga para confirmar NFR-001 e NFR-002.

## Clarifications

### Session 2026-01-25

- Q: Quais tipos de conteúdo são elegíveis para a Indexing API no contexto do produto? → A: Somente URLs com `JobPosting` ou `BroadcastEvent`.
- Q: Como deve ser a atualização do status de indexação? → A: Rotina diária + refresh sob demanda (cache 24h).
- Q: A ação de "solicitar indexação" deve aparecer para todas as URLs? → A: Sim, mas o backend bloqueia URLs não elegíveis e retorna erro.
- Q: Como deve ser o envio em massa? → A: Assíncrono por fila, com resposta imediata ao usuário.
- Q: Como deve rodar a rotina automática diária? → A: Por conexão, uma por vez.

### Key Entities *(include if feature involves data)*

- **SearchConsoleConnection**: Representa a conexão OAuth por workspace (token, scopes, propriedades autorizadas, status).
- **SearchConsoleProperty**: Propriedades disponíveis para a conexão (tipo, siteUrl, ownership).
- **ArticleIndexingStatus**: Estado de indexação por URL (verdict, cobertura, data da última inspeção).
- **IndexingRequest**: Pedido de indexação (URL, tipo, status, timestamps, resposta da API).
- **IndexingQuotaUsage**: Uso diário por conexão (total enviado, total disponível, reset diário).

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% das URLs exibidas no datatable possuem status de indexação atualizado nas últimas 24h.
- **SC-002**: 100% dos envios respeitam a quota diária e não geram erro de limite excedido.
- **SC-003**: Usuários conseguem solicitar indexação individual e em massa em menos de 30 segundos por ação.
- **SC-004**: Reduzir em 50% o tempo manual gasto com verificação de indexação após 30 dias.
