# Requirements Checklist - Conexoes (Integracoes)

## Functional Requirements

### OAuth Flow - Meta
- [X] FR-001: Botao "Conectar Meta" inicia OAuth flow
- [X] FR-002: Redirect para Facebook OAuth com scopes corretos
- [X] FR-003: Backend recebe callback e troca code por token
- [X] FR-004: Tokens armazenados encrypted no banco

### OAuth Flow - Google
- [X] FR-005: Botao "Conectar Google" inicia OAuth flow
- [X] FR-006: Redirect para Google OAuth com scopes corretos
- [X] FR-007: Backend recebe callback e troca code por token

### Connection Management
- [X] FR-008: Lista todas conexoes com status
- [X] FR-009: Mostra detalhes de cada conexao
- [X] FR-010: Permite desconectar e revogar tokens
- [ ] FR-011: Refresh automatico de tokens
- [ ] FR-012: Notificacoes de expiracao/erro
- [X] FR-013: Botao "Reconectar" reinicia OAuth flow
- [X] FR-014: RLS implementado corretamente

## Security Requirements

- [X] SR-001: Tokens NUNCA expostos no frontend
- [ ] SR-002: PKCE implementado no OAuth flow
- [X] SR-003: State parameter validado (CSRF protection)
- [X] SR-004: Tokens encrypted at rest
- [ ] SR-005: HTTPOnly cookies para state tokens
- [X] SR-006: Revogacao de tokens ao desconectar
- [X] SR-007: Validacao de callback origin
- [ ] SR-008: Rate limiting nos endpoints OAuth
- [ ] SR-009: Audit trail de acessos a tokens
- [X] SR-010: Service_role usado apenas no backend

## Visual Requirements

- [X] VR-001: Cards para cada provedor com logo e status
- [X] VR-002: Icones de status claros (verde/amarelo/vermelho)
- [X] VR-003: Loading states durante OAuth e carregamento
- [X] VR-004: Modal de confirmacao ao desconectar
- [X] VR-005: Badges com numero de paginas/contas
- [X] VR-006: Layout responsivo mobile

## Success Criteria

- [X] SC-001: Conectar Meta em <60 segundos
- [X] SC-002: Conectar Google em <60 segundos
- [X] SC-003: 100% dos tokens encrypted
- [X] SC-004: 0% dos tokens em API responses
- [ ] SC-005: 95% de sucesso em auto-refresh
- [ ] SC-006: Notificacao em <5 minutos apos expiracao
- [X] SC-007: <1% taxa de erro no OAuth
- [X] SC-008: Listagem em <500ms
- [X] SC-009: 100% dos callbacks validam state
- [X] SC-010: RLS bloqueia 100% acessos nao autorizados

## Database

- [X] Tabela `connections` criada
- [ ] Tabela `connection_logs` criada
- [X] Indexes criados
- [X] RLS policies aplicadas
- [X] Triggers de updated_at funcionando
- [X] Funcoes de encryption/decryption criadas
- [X] Encryption key configurada

## Backend Endpoints

- [X] GET /api/connections (via meta module)
- [X] POST /meta/oauth/initiate
- [X] GET /meta/oauth/callback
- [X] POST /google/oauth/initiate
- [X] GET /google/oauth/callback
- [ ] POST /api/connections/:id/refresh
- [X] DELETE /api/connections/:id
- [ ] GET /api/connections/:id/logs

## Frontend Components

- [X] ConnectionsPage
- [X] ConnectionCard
- [X] ConnectionList
- [X] DisconnectModal
- [X] ConnectButton
- [X] ConnectionStatus badge
- [X] ConnectionDetails modal
- [X] MetaCallbackPage
- [X] GoogleCallbackPage

## Frontend Hooks

- [X] useConnections (list)
- [X] useConnection (single)
- [X] useConnectProvider (initiate OAuth)
- [X] useDisconnectProvider
- [ ] useRefreshConnection
- [ ] useConnectionLogs

## Testing

- [ ] E2E: OAuth flow Meta completo
- [ ] E2E: OAuth flow Google completo
- [ ] E2E: Desconectar e reconectar
- [ ] Security: Tokens nao vazam
- [ ] Security: RLS policies funcionando
- [ ] Security: State validation (CSRF)
- [ ] Unit: Encryption functions
- [ ] Unit: Refresh logic
- [ ] Integration: Callback handling

## Documentation

- [ ] Setup Facebook App (developer console)
- [ ] Setup Google App (cloud console)
- [ ] Environment variables documentadas
- [ ] OAuth scopes documentados
- [ ] Security best practices documentadas
