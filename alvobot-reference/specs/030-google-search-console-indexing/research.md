# Research: Google Search Console Indexing & Status

## Decision: Usar Search Console URL Inspection API para status de indexação
**Rationale**: É a fonte oficial para verdict/cobertura por URL e permite leitura do estado de indexação com controle de quota por propriedade.
**Alternatives considered**: Scraping manual do GSC (rejeitado por instabilidade e não confiabilidade); uso de sitemaps sem inspeção (não garante indexação).

## Decision: Usar Indexing API apenas para `JobPosting` e `BroadcastEvent`
**Rationale**: É o escopo permitido pela Google Indexing API e evita erros e desperdício de quota.
**Alternatives considered**: Enviar qualquer URL de artigo (rejeitado por violar política e alto risco de erro).

## Decision: Rotina diária e refresh sob demanda com cache 24h
**Rationale**: Balanceia custo de quota com necessidade de atualização, evitando chamadas repetidas e melhorando UX.
**Alternatives considered**: Apenas on-demand (pior UX), apenas diária (pouca flexibilidade).

## Decision: Envio em massa assíncrono via fila no backend
**Rationale**: Mantém UI responsiva, permite controle de quota e retry seguro.
**Alternatives considered**: Envio síncrono no UI (bloqueio/timeout), batch síncrono progressivo (mais complexo no frontend).

## Decision: Rotina automática por conexão (uma por vez)
**Rationale**: Evita concorrência excessiva e simplifica controle de quota por conexão.
**Alternatives considered**: Por workspace ou por projeto (risco de competição entre conexões e quota).

## Decision: Implementar fila e rotina com NestJS Schedule + tabela de fila
**Rationale**: Já há suporte a schedule no backend e não exige nova infraestrutura; persistência em tabela permite reprocesso e auditoria.
**Alternatives considered**: BullMQ/Redis (depende de infraestrutura adicional), Temporal (mais complexo para rotina simples).
