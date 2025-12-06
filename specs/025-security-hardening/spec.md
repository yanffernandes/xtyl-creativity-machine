# Feature 025: Security Hardening

## Overview

Implementação de correções de segurança identificadas em auditoria abrangente do sistema XTYL Creativity Machine. Esta spec aborda 48 vulnerabilidades encontradas, desde exposição de credenciais até falhas de autorização (IDOR).

## Goals

1. **Eliminar vulnerabilidades CRITICAL**: Rotação de credenciais, fix CORS, fix IDOR
2. **Corrigir vulnerabilidades HIGH**: Security headers, rate limiting, Docker hardening
3. **Mitigar vulnerabilidades MEDIUM**: Input validation, pagination, error handling
4. **Estabelecer baseline de segurança**: Padrões para desenvolvimento futuro

## Non-Goals

- Implementação de WAF (Web Application Firewall) - escopo futuro
- Penetration testing completo - após fixes serem implementados
- Compliance específico (SOC2, HIPAA) - requer análise separada
- Multi-factor authentication - feature separada

## Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 6 | Requer ação imediata |
| HIGH | 22 | Alto risco de segurança |
| MEDIUM | 16 | Risco moderado |
| LOW | 4 | Melhorias menores |

## Critical Vulnerabilities

### 1. Credentials Exposed in Git (CRITICAL)

**Problema**: Arquivos `.env`, `frontend/.env.local`, `frontend/.env.test` commitados no repositório com todas as credenciais de produção expostas.

**Credenciais Afetadas**:
- DATABASE_URL (Supabase PostgreSQL)
- SUPABASE_JWT_SECRET
- SUPABASE_ANON_KEY
- R2_ACCESS_KEY / R2_SECRET_KEY (Cloudflare)
- OPENROUTER_API_KEY
- TAVILY_API_KEY
- BREVO_API_KEY
- GROQ_API_KEY

**Remediação**:
1. Rotacionar TODAS as credenciais nos respectivos dashboards
2. Remover arquivos do histórico git com `git filter-branch`
3. Atualizar `.gitignore`

### 2. CORS Wildcard + Credentials (CRITICAL)

**Arquivo**: `backend/main.py`

**Problema**:
```python
allow_origins=["*"],
allow_credentials=True,
```

**Impacto**: Qualquer website pode fazer requests autenticados à API, habilitando CSRF e roubo de dados.

**Remediação**: Whitelist de origens específicas via `ALLOWED_ORIGINS` env var.

### 3. Missing Authorization Checks - IDOR (CRITICAL)

**Arquivos Afetados**:
- `backend/routers/documents.py`
- `backend/routers/executions.py`

**Endpoints Vulneráveis**:
- `GET /projects/{project_id}/documents`
- `GET /documents/{document_id}`
- `PUT /documents/{document_id}`
- `DELETE /documents/{document_id}`
- `POST /{document_id}/attachments`
- `POST /executions/`

**Impacto**: Usuário autenticado pode acessar/modificar/deletar documentos de outros usuários.

**Remediação**: Criar `security_service.py` com funções `verify_project_access()`, `verify_document_access()`, `verify_workflow_access()`.

### 4. Hardcoded Default Credentials (CRITICAL)

**Arquivo**: `backend/database.py`

**Problema**:
```python
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://xtyl:xtylpassword@localhost:5432/xtyl_db")
```

**Remediação**: Falhar se `DATABASE_URL` não estiver definida.

### 5. Stack Traces Exposed to Users (CRITICAL)

**Arquivo**: `backend/main.py`

**Problema**:
```python
content={"detail": str(exc)}  # Expõe detalhes internos
```

**Remediação**: Retornar mensagem genérica, logar detalhes internamente.

### 6. Containers Running as Root (CRITICAL)

**Arquivos**: `frontend/Dockerfile`, `backend/Dockerfile`

**Remediação**: Criar usuários não-root e usar `USER` statement.

## High Vulnerabilities

### 7. Redis Without Authentication
### 8. JWT Token Exposed in URLs (SSE)
### 9. No Input Validation - Path Traversal
### 10. No Pagination - Memory Exhaustion
### 11. N+1 Query Problem
### 12. Sensitive Data in Console.log
### 13. Missing Security Headers
### 14. Admin Endpoints Without Rate Limiting
### 15. Temporary Files With Predictable Names
### 16. Share Links Without Rate Limiting
### 17. File Upload Without Streaming Validation
### 18. Missing Route Protection Middleware (Frontend)
### 19. JSON.parse Without Error Handling
### 20. Race Condition in Authentication
### 21. Celery/Redis Without SSL
### 22. Weak RLS Policies

## Technical Requirements

### Backend Stack
- Python 3.11, FastAPI, SQLAlchemy
- PostgreSQL (Supabase)
- Redis (com autenticação)
- slowapi para rate limiting

### Frontend Stack
- Next.js 14, React 18, TypeScript
- Middleware para proteção de rotas

## Security Service API

```python
# backend/services/security_service.py

def verify_project_access(db: Session, project_id: str, user_id: str) -> Project
def verify_document_access(db: Session, document_id: str, user_id: str) -> Document
def verify_workflow_access(db: Session, template_id: str, user_id: str) -> WorkflowTemplate
def validate_file_path(file_path: str) -> str  # Path traversal prevention
```

## Security Headers

```python
# Middleware para adicionar headers em todas as respostas
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

## Rate Limiting Configuration

| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| /auth/* | 5 | 1 minute |
| /admin/* | 10 | 1 hour |
| /documents/shared/* | 10 | 1 minute |
| /chat/completion* | 60 | 1 minute |
| Default | 1000 | 1 minute |

## User Stories

### US1: Fix IDOR Vulnerabilities (Priority: CRITICAL)
Como desenvolvedor, preciso garantir que usuários só acessem seus próprios recursos.

**Acceptance Criteria**:
- Todos os endpoints de documentos verificam ownership
- Todos os endpoints de workflows verificam ownership
- Retorna 403 para acesso não autorizado

### US2: Security Headers & Rate Limiting (Priority: HIGH)
Como administrador, preciso que a aplicação tenha headers de segurança e rate limiting.

**Acceptance Criteria**:
- Security headers presentes em todas as respostas
- Rate limiting ativo em endpoints sensíveis
- Testes passam no securityheaders.com

### US3: Docker & Infrastructure Security (Priority: HIGH)
Como DevOps, preciso que containers rodem com mínimo privilégio.

**Acceptance Criteria**:
- Containers rodam como non-root
- Redis requer autenticação
- Sem portas desnecessárias expostas

### US4: Frontend Security (Priority: HIGH)
Como desenvolvedor frontend, preciso remover vazamentos de dados e proteger rotas.

**Acceptance Criteria**:
- Zero console.log com dados sensíveis
- Middleware protege rotas autenticadas
- JSON.parse tem error handling

### US5: Credential Rotation (Priority: CRITICAL - MANUAL)
Como administrador, preciso rotacionar todas as credenciais expostas.

**Acceptance Criteria**:
- Todas as 8+ credenciais rotacionadas
- .env removido do histórico git
- Sistema funciona com novas credenciais

## Testing Strategy

1. **Security Tests**: Testar IDOR prevention, CORS, rate limiting
2. **Integration Tests**: Endpoints com authorization
3. **Headers Test**: securityheaders.com scan
4. **Manual Testing**: Penetration testing básico

## Success Metrics

- [ ] Zero vulnerabilidades CRITICAL
- [ ] Zero vulnerabilidades HIGH
- [ ] Nota A+ no securityheaders.com
- [ ] Todas credenciais rotacionadas
- [ ] Git history limpo de secrets

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [CORS Specification](https://fetch.spec.whatwg.org/#http-cors-protocol)
