# Feature Specification: OAuth Token Management System

**Feature Branch**: `20260202-oauth-token-management`
**Created**: 2026-02-02
**Status**: Draft
**Input**: Implementar sistema robusto de gerenciamento de tokens OAuth para Google e Meta

---

## Problem Statement

O sistema atual de gerenciamento de tokens OAuth possui falhas críticas que afetam a experiência do usuário e a confiabilidade das integrações:

1. **Meta**: Tokens de curta duração (1-2h) são armazenados diretamente sem conversão para tokens de longa duração (60 dias), causando desconexões frequentes
2. **Google**: Serviços continuam tentando usar conexões com tokens revogados em loops infinitos, gerando spam de requests e logs
3. **Geral**: Falta de integração entre o flag `needs_reconnect` e os serviços que consomem as conexões, permitindo operações inúteis

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conexão Meta Persistente (Priority: P1)

Como usuário que conecta sua conta Meta (Facebook/Instagram), quero que minha conexão permaneça ativa por pelo menos 60 dias sem precisar reconectar manualmente, para que minhas automações e campanhas continuem funcionando sem interrupção.

**Why this priority**: Atualmente os tokens Meta expiram em 1-2 horas, causando desconexões frequentes e frustrando usuários que dependem de automações contínuas. É o problema mais impactante.

**Independent Test**: Pode ser testado conectando uma conta Meta e verificando que o token armazenado tem validade de ~60 dias, não 1-2 horas.

**Acceptance Scenarios**:

1. **Given** um usuário autoriza uma nova conexão Meta, **When** o sistema recebe o token de autorização, **Then** o sistema converte automaticamente para um token de longa duração antes de armazenar
2. **Given** uma conexão Meta com token de longa duração prestes a expirar (menos de 7 dias), **When** o sistema de manutenção executa, **Then** o sistema renova o token automaticamente sem intervenção do usuário
3. **Given** um token Meta que não pode ser renovado, **When** o sistema detecta a falha, **Then** marca a conexão como `needs_reconnect` e notifica o usuário

---

### User Story 2 - Parada Imediata em Token Inválido Google (Priority: P1)

Como operador do sistema, quero que serviços parem imediatamente de tentar usar conexões com tokens revogados, para evitar loops infinitos de requests falhando e sobrecarga nos logs.

**Why this priority**: O log mostra requests falhando a cada minuto em loop infinito, gerando ruído nos logs e potencialmente violando rate limits da API do Google.

**Independent Test**: Pode ser testado revogando um token Google e verificando que o sistema não tenta usá-lo novamente após a primeira falha permanente.

**Acceptance Scenarios**:

1. **Given** uma conexão Google com flag `needs_reconnect = true`, **When** qualquer serviço tenta usar essa conexão, **Then** o serviço recusa a operação imediatamente sem tentar chamar a API
2. **Given** um token Google retorna erro `invalid_grant`, **When** o serviço detecta esse erro, **Then** marca a conexão como `needs_reconnect` e para de processar imediatamente
3. **Given** uma automação agendada associada a uma conexão com `needs_reconnect = true`, **When** chega o horário de execução, **Then** a automação é pulada com registro de motivo no log

---

### User Story 3 - Circuit Breaker para Conexões (Priority: P2)

Como operador do sistema, quero que conexões com falhas repetidas sejam temporariamente "desligadas" automaticamente, para proteger o sistema de sobrecarga e evitar bloqueios por rate limit.

**Why this priority**: Mesmo que o needs_reconnect seja respeitado, podem haver cenários onde erros transientes se acumulam. O circuit breaker adiciona uma camada extra de proteção.

**Independent Test**: Pode ser testado simulando 5 falhas consecutivas em uma conexão e verificando que ela entra em estado "aberto" por um período.

**Acceptance Scenarios**:

1. **Given** uma conexão que falhou 5 vezes consecutivas em menos de 5 minutos, **When** o sistema detecta esse padrão, **Then** a conexão entra em estado "circuit open" e rejeita requests por 15 minutos
2. **Given** uma conexão em estado "circuit open", **When** o período de cooldown expira, **Then** a conexão entra em estado "half-open" permitindo uma tentativa de teste
3. **Given** uma conexão em estado "half-open" que tem sucesso na tentativa de teste, **When** a request é bem sucedida, **Then** a conexão volta ao estado "closed" (normal)

---

### User Story 4 - Refresh Proativo de Tokens (Priority: P2)

Como usuário do sistema, quero que meus tokens sejam renovados automaticamente antes de expirarem, para que eu nunca experiencie interrupções por expiração de token.

**Why this priority**: Previne problemas antes que ocorram, melhorando a experiência geral do usuário.

**Independent Test**: Pode ser testado verificando que tokens são renovados quando faltam X dias/horas para expirar, não apenas quando expiram.

**Acceptance Scenarios**:

1. **Given** um token Google que expira em menos de 1 hora, **When** o job de manutenção executa, **Then** o token é renovado automaticamente usando o refresh_token
2. **Given** um token Meta que expira em menos de 7 dias, **When** o job de manutenção executa, **Then** o token é renovado automaticamente
3. **Given** um refresh de token que falha com erro transiente, **When** o sistema detecta o erro, **Then** tenta novamente com backoff exponencial (até 3 tentativas)

---

### User Story 5 - Visibilidade de Status das Conexões (Priority: P3)

Como usuário, quero ver claramente o status de saúde das minhas conexões no dashboard, para saber quando preciso tomar alguma ação.

**Why this priority**: Importante para UX mas não bloqueia funcionalidade core.

**Independent Test**: Pode ser testado acessando a página de conexões e verificando que cada conexão mostra seu status atual de forma clara.

**Acceptance Scenarios**:

1. **Given** uma conexão saudável, **When** o usuário acessa a página de conexões, **Then** vê status "Conectado" em verde
2. **Given** uma conexão com `needs_reconnect = true`, **When** o usuário acessa a página de conexões, **Then** vê status "Reconexão necessária" em amarelo com botão de reconectar
3. **Given** uma conexão em circuit breaker "open", **When** o usuário acessa a página de conexões, **Then** vê status "Temporariamente pausado" com tempo restante para retry

---

### Edge Cases

- O que acontece quando o usuário revoga permissões diretamente no Google/Meta sem usar o sistema?
  - Sistema detecta na próxima tentativa de uso e marca `needs_reconnect`
- Como o sistema lida com rate limits das APIs externas?
  - Circuit breaker entra em ação após falhas repetidas; backoff exponencial em retries
- O que acontece se o cron job de manutenção falhar?
  - Tokens não renovados serão detectados na próxima execução ou no uso
- Como tratar tokens que já estão expirados no banco de dados?
  - Job de manutenção identifica e marca como `needs_reconnect` imediatamente
- O que acontece quando múltiplas instâncias do backend tentam renovar o mesmo token?
  - Lock otimista usando timestamp de última atualização previne renovações duplicadas

---

## Requirements *(mandatory)*

### Functional Requirements

#### Meta Token Management

- **FR-001**: Sistema DEVE converter tokens Meta de curta duração para longa duração imediatamente após o OAuth callback
- **FR-002**: Sistema DEVE armazenar a data de expiração real do token de longa duração (~60 dias)
- **FR-003**: Sistema DEVE incluir conexões Meta no job de manutenção de tokens
- **FR-004**: Sistema DEVE renovar tokens Meta quando faltarem menos de 7 dias para expiração
- **FR-005**: Sistema DEVE marcar conexões Meta como `needs_reconnect` quando a renovação falhar permanentemente

#### Google Token Management

- **FR-006**: Sistema DEVE verificar flag `needs_reconnect` antes de qualquer operação com conexão Google
- **FR-007**: Sistema DEVE rejeitar operações em conexões com `needs_reconnect = true` sem chamar APIs externas
- **FR-008**: Sistema DEVE marcar `needs_reconnect = true` imediatamente ao receber erro `invalid_grant`
- **FR-009**: Sistema DEVE pular automações agendadas associadas a conexões com `needs_reconnect = true`
- **FR-010**: Sistema DEVE registrar motivo de pulo de automações no log de execuções

#### Circuit Breaker

- **FR-011**: Sistema DEVE rastrear contagem de falhas consecutivas por conexão
- **FR-012**: Sistema DEVE abrir circuit breaker após 5 falhas consecutivas em janela de 5 minutos
- **FR-013**: Sistema DEVE manter circuit breaker aberto por 15 minutos antes de permitir retry
- **FR-014**: Sistema DEVE testar conexão com uma request quando circuit breaker transiciona para half-open
- **FR-015**: Sistema DEVE fechar circuit breaker após request bem sucedida em estado half-open

#### Manutenção Proativa

- **FR-016**: Sistema DEVE executar job de manutenção de tokens periodicamente (a cada 30 minutos)
- **FR-017**: Sistema DEVE identificar todos os tokens expirando dentro da janela de renovação
- **FR-018**: Sistema DEVE implementar backoff exponencial para retries de renovação (1s, 2s, 4s)
- **FR-019**: Sistema DEVE classificar erros como permanentes ou transientes
- **FR-020**: Sistema DEVE notificar usuário via interface in-app (badge/banner na página de conexões) quando conexão requer reconexão manual

#### Logging e Observabilidade

- **FR-021**: Sistema DEVE registrar todas as tentativas de renovação de token com resultado
- **FR-022**: Sistema DEVE registrar transições de estado do circuit breaker
- **FR-023**: Sistema DEVE registrar operações rejeitadas por `needs_reconnect` ou circuit breaker

---

### Key Entities

- **Connection**: Representa uma conexão OAuth com plataforma externa (Google/Meta). Atributos: status, token_expires_at, needs_reconnect, last_refresh_error, last_refresh_attempt
- **CircuitBreakerState**: Estado do circuit breaker por conexão. Atributos: estado (closed/open/half-open), contagem de falhas, timestamp de abertura, timestamp de próximo retry
- **TokenRefreshLog**: Registro histórico de tentativas de renovação. Atributos: conexão, timestamp, sucesso/falha, tipo de erro, novo tempo de expiração

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Conexões Meta permanecem ativas por pelo menos 55 dias sem intervenção do usuário (vs. 1-2 horas atualmente)
- **SC-002**: Zero requests são feitas a APIs externas para conexões marcadas como `needs_reconnect`
- **SC-003**: Tempo entre detecção de token inválido e marcação de `needs_reconnect` é menor que 1 segundo
- **SC-004**: Número de logs de erro por conexão inválida reduz em 99% (de loops infinitos para uma única ocorrência)
- **SC-005**: 100% das conexões com tokens prestes a expirar são renovadas proativamente antes da expiração
- **SC-006**: Usuários conseguem identificar conexões com problemas em menos de 3 segundos ao acessar página de conexões
- **SC-007**: Circuit breaker previne 100% dos requests durante período de cooldown após falhas consecutivas

---

## Assumptions

1. **Token Exchange Meta**: A API do Meta Graph v21.0 suporta exchange de tokens de curta para longa duração usando o endpoint padrão de OAuth
2. **Refresh Token Google**: Refresh tokens do Google são válidos indefinidamente a menos que revogados pelo usuário ou expirados por inatividade (6+ meses)
3. **Cron Job Existente**: Já existe infraestrutura de cron jobs no backend que pode ser estendida
4. **Notificações**: Sistema de notificações para usuários já existe e pode ser reutilizado
5. **Lock Otimista**: Banco de dados suporta operações de lock otimista usando timestamps

---

## Out of Scope

- Migração retroativa de tokens Meta existentes (usuários precisarão reconectar)
- Interface de administração para gerenciar circuit breakers manualmente
- Métricas detalhadas de performance de APIs externas
- Integração com sistemas de monitoramento externos (Datadog, NewRelic)

---

## Dependencies

- Documentação atualizada da API Meta Graph para exchange de tokens
- Documentação da API Google OAuth para comportamento de refresh tokens
- Acesso ao banco de dados para adicionar/modificar colunas necessárias

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| API Meta muda comportamento de tokens | Alto | Monitorar changelogs da API, implementar fallbacks |
| Circuit breaker muito agressivo causa interrupções | Médio | Configurar thresholds conservadores, permitir ajustes |
| Migração de tokens existentes causa desconexões em massa | Alto | Marcar como out of scope, reconexão gradual |

---

## Clarifications

### Session 2026-02-02

- Q: Como o usuário deve ser notificado quando uma conexão requer reconexão? → A: In-app apenas (badge/banner na página de conexões)
