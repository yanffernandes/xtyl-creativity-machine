# Tasks Review Checklist

**Date**: 2026-02-06 | **Reviewer**: AI

## Structural Quality

- [x] Tasks organizadas em phases com dependências claras
- [x] Cada task com descrição actionable (não vaga)
- [x] Dependências explícitas (Depends on)
- [x] Requirements referenciados (FR-xxx, SC-xxx)
- [x] Marcação `[P]` para tasks paralelizáveis
- [x] Tasks completáveis em 1-4 horas cada
- [x] Sem dependências circulares

## Cobertura de Requirements

| Requirement | Task(s) | Status |
|-------------|---------|--------|
| FR-001 (CRUD) | 1.2, 2.2, 2.3, 5.1, 9.1, 10.1 | ✅ |
| FR-002 (Edit/toggle/delete) | 2.2, 2.3, 10.1, 13.2 | ✅ |
| FR-003 (Google 1 conta) | 2.2, 9.2 | ✅ |
| FR-004 (Meta max 5 contas) | 2.2, 9.2 | ✅ |
| FR-005 (Nível compatível) | 2.2, 9.2 | ✅ |
| FR-006 (Limite 2000) | 3.5, 9.3 | ✅ |
| FR-010 (Array-of-arrays filters) | 3.1, 6.1, 6.2, 9.3 | ✅ |
| FR-011 (Cross-level filtering) | 3.1, 6.2 | ✅ |
| FR-012 (14 operadores) | 3.1, 6.2 | ✅ |
| FR-013 (Validação operador/campo) | 3.1, 6.1 | ✅ |
| FR-014 (Validação REGEX) | 3.1, 6.1 | ✅ |
| FR-020 (5 tipos condição) | 3.2, 7.1, 7.2, 7.3 | ✅ |
| FR-021 (AND/OR aninhamento) | 3.2, 7.1 | ✅ |
| FR-022 (Períodos de tempo) | 3.2, 7.2 | ✅ |
| FR-023 (Métricas por plataforma) | 1.4, 2.4, 2.5, 7.3 | ✅ |
| FR-024 (metric_comparison) | 3.2, 7.2 | ✅ |
| FR-025 (ranking) | 3.2, 7.2 | ✅ |
| FR-030 (17 ações) | 1.4, 3.3, 8.1 | ✅ |
| FR-031 (Frequency cap) | 3.4, 8.1 | ✅ |
| FR-032 (Ação compatível nível/plataforma) | 3.3, 8.1 | ✅ |
| FR-033 (Budget min/max) | 3.3, 8.2 | ✅ |
| FR-034 (Duplicate social proof) | 3.3, 8.2 | ✅ |
| FR-035 (Multi-task com condições) | 9.4 | ✅ |
| FR-040 (Schedule frequency/custom) | 3.6, 9.5 | ✅ |
| FR-041 (Timezone IANA) | 3.6, 9.5 | ✅ |
| FR-042 (date_range) | 3.6, 9.5 | ✅ |
| FR-043 (run_once) | 3.6, 9.5 | ✅ |
| FR-050 (Notificações email) | 4.1, 9.6 | ✅ |
| FR-051 (Placeholders) | 4.1, 9.6 | ✅ |
| FR-052 (Summary + details) | 4.1, 9.6 | ✅ |
| FR-060 (Custom metrics) | 11.1, 11.2, 11.4 | ✅ |
| FR-061 (Operandos) | 11.2, 11.3, 11.4 | ✅ |
| FR-062 (Circular deps) | 11.2 | ✅ |
| FR-063 (Divisão por zero) | 11.3 | ✅ |
| FR-070 (Execution log) | 3.5, 10.3 | ✅ |
| FR-071 (Entity log detail) | 3.5, 10.3 | ✅ |
| FR-072 (Logs consultáveis) | 4.2, 10.3 | ✅ |
| FR-080 (Preview) | 3.8, 10.2 | ✅ |
| FR-081 (Preview métricas) | 3.8, 10.2 | ✅ |
| FR-090 (Attribution config) | 12.1, 12.2 | ✅ |
| FR-091 (Attribution warnings) | 12.1, 12.2 | ✅ |

## Cobertura de User Stories

| US | Covered? | Primary Tasks |
|----|----------|--------------|
| US1 (CRUD) | ✅ | 2.2, 2.3, 9.1-9.6, 10.1 |
| US2 (Filtros) | ✅ | 3.1, 6.1, 6.2, 9.3 |
| US3 (Condições) | ✅ | 3.2, 7.1-7.3, 9.4 |
| US4 (Ações) | ✅ | 3.3, 3.4, 8.1-8.2, 9.4 |
| US5 (Schedule) | ✅ | 3.6, 9.5 |
| US6 (Logs) | ✅ | 3.5, 4.2, 10.3 |
| US7 (Notificações) | ✅ | 4.1, 9.6 |
| US8 (Custom Metrics) | ✅ | 11.1-11.4 |
| US9 (Preview) | ✅ | 3.8, 10.2 |
| US10 (Attribution) | ✅ | 12.1, 12.2 |

## Edge Cases Cobertos

- [x] Métrica zero (13.1)
- [x] CBO/ABO budget conflict (13.1, 8.2)
- [x] Google campaign type misturado (13.1)
- [x] Meta moedas diferentes (13.1, 9.2)
- [x] Escopo > 2000 entidades (13.1, 9.3)
- [x] REGEX inválido (13.1, 6.1)
- [x] Timezone mismatch (13.1)
- [x] Conflito entre regras (13.1)
- [x] Dependência circular custom metrics (11.2)
- [x] Divisão por zero (11.3)
- [x] Rate limiting (3.5, 3.7)

## Dependency Graph (Critical Path)

```
1.1 ──→ 2.2 ──→ 2.3
1.2 ──→ 2.1 ──→ 2.4 ──→ 3.3 ──→ 3.5 ──→ 3.7 ──→ 13.4
              ──→ 2.5 ──↗
1.3 ──→ 5.1 ──→ 9.1 ──→ 9.2-9.6 ──→ 10.1
1.4 ──→ 6.1 ──→ 6.2 ──↗
     ──→ 7.1 ──→ 7.2 ──→ 7.3 ──↗
     ──→ 8.1 ──→ 8.2 ──↗
```

**Critical path**: 1.2 → 2.1 → 2.4/2.5 → 3.3 → 3.5 → 3.7 → 13.4

## Task Count Summary

| Phase | Tasks | Estimativa (horas) |
|-------|-------|-------------------|
| Phase 1: Foundation | 4 | 8-12h |
| Phase 2: Backend CRUD | 5 | 12-16h |
| Phase 3: Backend Engine | 8 | 24-32h |
| Phase 4: Notifications & Logs | 2 | 4-6h |
| Phase 5: Frontend API | 1 | 2-3h |
| Phase 6: FilterBuilder | 2 | 6-8h |
| Phase 7: ConditionBuilder | 3 | 8-10h |
| Phase 8: ActionConfigurator | 2 | 4-6h |
| Phase 9: AutomationWizard | 6 | 14-18h |
| Phase 10: Pages | 3 | 6-8h |
| Phase 11: Custom Metrics (P3) | 4 | 8-12h |
| Phase 12: Attribution (P3) | 2 | 3-4h |
| Phase 13: Integration | 4 | 8-12h |
| **TOTAL** | **46 tasks** | **~107-147h** |

**MVP (P1+P2)**: Phases 1-10 + 13 = 40 tasks, ~91-125h
**Full (com P3)**: Phases 1-13 = 46 tasks, ~107-147h

## Resultado: ✅ APROVADO

100% dos requirements funcionais, user stories e edge cases do spec estão cobertos pelas tasks. Dependências são válidas e não circulares. Critical path identificado.
