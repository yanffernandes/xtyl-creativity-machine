# XTYL Creativity Machine - Guia de Deploy para Produção

Este guia contém instruções detalhadas para fazer deploy da aplicação XTYL Creativity Machine em produção, com foco no Easypanel.

## 📋 Pré-requisitos

- Servidor com Docker e Docker Compose instalados
- Acesso ao Easypanel
- Domínio configurado (ex: `yourdomain.com`)
- Contas nas APIs externas:
  - OpenRouter (https://openrouter.ai/)
  - Brevo (https://www.brevo.com/) para envio de emails
  - Opcional: OpenAI, Anthropic, Tavily

## 🔧 Configuração Inicial

### 1. Clonar o Repositório

```bash
git clone https://github.com/your-repo/xtyl-creativity-machine.git
cd xtyl-creativity-machine
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com valores reais:

```bash
cp .env.production.example .env.production
```

**Edite `.env.production` com seus valores:**

#### 🔑 Geração de SECRET_KEY

```bash
openssl rand -hex 32
```

#### 📧 Configurar Brevo (Email)

1. Acesse https://app.brevo.com/settings/keys/api
2. Crie uma nova API Key
3. Cole a chave em `BREVO_API_KEY`

#### 🤖 Configurar OpenRouter

1. Acesse https://openrouter.ai/keys
2. Crie uma nova API Key
3. Cole em `OPENROUTER_API_KEY`

#### 🗄️ Configurar Credenciais do Banco de Dados

Gere senhas fortes (20+ caracteres):

```bash
# Exemplo de senha forte
openssl rand -base64 32
```

### 3. Revisar `docker-compose.prod.yml`

Certifique-se de que as seguintes configurações estão corretas:

- URLs públicas (`NEXT_PUBLIC_API_URL`, `FRONTEND_URL`)
- Portas expostas
- Resource limits (ajuste conforme seu servidor)

## 🚀 Deploy no Easypanel

### Método 1: Deploy Automático via Git

1. **No Easypanel**, crie um novo projeto
2. Conecte seu repositório Git
3. Configure as variáveis de ambiente (copie de `.env.production`)
4. Selecione o arquivo `docker-compose.prod.yml`
5. Clique em "Deploy"

### Método 2: Deploy Manual

#### Passo 1: Build das Imagens

```bash
# Build frontend
cd frontend
docker build -f Dockerfile.prod -t xtyl-frontend:latest .

# Build backend
cd ../backend
docker build -f Dockerfile.prod -t xtyl-backend:latest .
```

#### Passo 2: Upload para Registry (Opcional)

Se usar um registry privado:

```bash
docker tag xtyl-frontend:latest registry.yourdomain.com/xtyl-frontend:latest
docker tag xtyl-backend:latest registry.yourdomain.com/xtyl-backend:latest

docker push registry.yourdomain.com/xtyl-frontend:latest
docker push registry.yourdomain.com/xtyl-backend:latest
```

#### Passo 3: Iniciar Serviços

```bash
# Certifique-se de que .env.production está configurado
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Verificação Pós-Deploy

### 1. Verificar Status dos Containers

```bash
docker-compose -f docker-compose.prod.yml ps
```

Todos os serviços devem estar com status "Up" e "(healthy)".

### 2. Verificar Logs

```bash
# Frontend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Database
docker-compose -f docker-compose.prod.yml logs -f db
```

### 3. Testar Endpoints

```bash
# Health check do backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000/
```

Resposta esperada do `/health`:

```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "minio": "healthy"
  }
}
```

## 🌐 Configuração de Domínio

### No Easypanel

1. Vá em **Settings > Domains**
2. Adicione seu domínio:
   - Frontend: `yourdomain.com` → porta `3000`
   - API: `api.yourdomain.com` → porta `8000`
   - MinIO Console: `minio.yourdomain.com` → porta `9001`

### Configurar SSL (HTTPS)

O Easypanel geralmente configura SSL automaticamente via Let's Encrypt.

Se precisar configurar manualmente:

```bash
# O Easypanel usa Traefik ou Nginx Proxy Manager
# Certifique-se de que o SSL está habilitado nas configurações do projeto
```

## 📊 Inicialização do Banco de Dados

### Criar Primeiro Usuário

Acesse o container do backend e execute:

```bash
docker-compose -f docker-compose.prod.yml exec backend python -c "
from database import SessionLocal
from models import User
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Criar usuário admin
admin = User(
    email='admin@yourdomain.com',
    name='Admin',
    hashed_password=pwd_context.hash('CHANGE_THIS_PASSWORD'),
    email_verified=True
)
db.add(admin)
db.commit()
print('Admin user created!')
"
```

**⚠️ IMPORTANTE:** Altere a senha imediatamente após o primeiro login!

## 🔄 Atualizações e Manutenção

### Atualizar a Aplicação

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backup do Banco de Dados

```bash
# Backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d).sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T db psql -U ${POSTGRES_USER} ${POSTGRES_DB} < backup_20240101.sql
```

### Backup do MinIO

```bash
# Via MinIO Client (mc)
docker run --rm --network xtyl-network \
  -v $(pwd)/minio-backup:/backup \
  minio/mc \
  mirror xtyl-minio/xtyl-storage /backup
```

## 📈 Monitoramento

### Logs Centralizados

Configure no Easypanel:

1. Acesse **Settings > Logging**
2. Habilite log aggregation
3. Configure retention policy

### Métricas

O endpoint `/health` pode ser usado para:

- Uptime monitoring (UptimeRobot, StatusPage)
- Load balancer health checks
- Prometheus/Grafana (adicione `/metrics` se necessário)

## 🐛 Troubleshooting

### Frontend não carrega

1. Verifique se `NEXT_PUBLIC_API_URL` está correto
2. Verifique CORS no backend
3. Cheque logs: `docker-compose -f docker-compose.prod.yml logs frontend`

### Backend retorna 500

1. Verifique conexão com DB: `docker-compose -f docker-compose.prod.yml logs db`
2. Verifique variáveis de ambiente
3. Teste health endpoint: `curl http://localhost:8000/health`

### Imagens não aparecem

1. Verifique se MinIO está rodando: `docker-compose -f docker-compose.prod.yml ps minio`
2. Acesse MinIO Console: `http://localhost:9001`
3. Verifique se o bucket existe e está acessível

### Emails não estão sendo enviados

1. Verifique `BREVO_API_KEY`
2. Teste a API Brevo: `curl -X GET "https://api.brevo.com/v3/account" -H "api-key: YOUR_KEY"`
3. Verifique logs do backend

## 🔒 Segurança

### Checklist de Segurança

- [ ] SECRET_KEY gerado com `openssl rand -hex 32`
- [ ] Senhas de DB fortes (20+ caracteres)
- [ ] `.env.production` no `.gitignore`
- [ ] SSL/HTTPS habilitado
- [ ] Portas internas (DB, Redis) não expostas publicamente
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Rate limiting habilitado (se disponível)

### Hardening Adicional

1. **Limitar acesso ao MinIO Console**
   - Apenas IPs confiáveis
   - Ou desabilitar completamente (remover porta 9001)

2. **Configurar Network Policies**
   - DB e Redis devem aceitar apenas conexões internas

3. **Monitorar Logs de Acesso**
   - Ataques de brute force
   - Tentativas de SQL injection

## 📞 Suporte

Em caso de problemas:

1. Verifique logs: `docker-compose -f docker-compose.prod.yml logs`
2. Teste health endpoint: `curl http://localhost:8000/health`
3. Consulte documentação do Easypanel
4. Abra uma issue no repositório

## 📝 Checklist de Deploy

Antes de ir para produção:

- [ ] Variáveis de ambiente configuradas
- [ ] SECRET_KEY gerado
- [ ] Credenciais de banco de dados fortes
- [ ] APIs externas configuradas (OpenRouter, Brevo)
- [ ] Domínio apontando para o servidor
- [ ] SSL configurado
- [ ] Backup automático configurado
- [ ] Health checks funcionando
- [ ] Primeiro usuário criado
- [ ] Testado em staging
- [ ] Monitoramento configurado

## 🎉 Pronto!

Sua aplicação XTYL Creativity Machine está rodando em produção!

Acesse:
- Frontend: https://yourdomain.com
- API: https://api.yourdomain.com
- Health: https://api.yourdomain.com/health
