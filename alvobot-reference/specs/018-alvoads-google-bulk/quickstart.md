# Quickstart: AlvoADS Google - Campanhas em Massa

**Feature**: 018-alvoads-google-bulk
**Date**: 2025-12-15

Este guia cobre o setup inicial para desenvolver e testar a integração com Google Ads.

---

## Pré-requisitos

- Node.js 18+
- Conta Google Ads (não existe sandbox, usar conta real com orçamento controlado)
- Google Cloud Project configurado

---

## 1. Setup Google Cloud Project

### 1.1 Criar Projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto: `alvobot-google-ads`
3. Anote o **Project ID**

### 1.2 Habilitar Google Ads API

1. No Console, vá para **APIs & Services** > **Library**
2. Busque por "Google Ads API"
3. Clique **Enable**

### 1.3 Configurar OAuth Consent Screen

1. Vá para **APIs & Services** > **OAuth consent screen**
2. Escolha **External** (para publicação futura)
3. Preencha:
   - **App name**: AlvoBot
   - **User support email**: seu email
   - **Developer contact**: seu email
4. Em **Scopes**, adicione:
   - `https://www.googleapis.com/auth/adwords`
5. Em **Test users**, adicione seu email

### 1.4 Criar OAuth Credentials

1. Vá para **APIs & Services** > **Credentials**
2. Clique **Create Credentials** > **OAuth client ID**
3. Escolha **Web application**
4. Configure:
   - **Name**: AlvoBot Backend
   - **Authorized redirect URIs**:
     - `http://localhost:3001/google/oauth/callback` (dev)
     - `https://api.alvobot.com/google/oauth/callback` (prod)
5. Anote:
   - **Client ID**
   - **Client Secret**

---

## 2. Obter Developer Token

O Developer Token é necessário para chamar a Google Ads API.

### 2.1 Solicitar Token

1. Acesse [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Se não aparecer, entre na conta Google Ads e acesse:
   - **Tools & Settings** > **Setup** > **API Center**
3. Leia e aceite os termos
4. Anote seu **Developer Token** (começa com `XXX-XXX-XXXX`)

### 2.2 Níveis de Acesso

| Nível | Operações/dia | Requisitos |
|-------|---------------|------------|
| Test | 15,000 | Padrão inicial |
| Basic | 10,000 | Aplicação aprovada |
| Standard | 15,000 | Aplicação aprovada + review |

Para desenvolvimento, o nível **Test** é suficiente.

---

## 3. Configurar Environment Variables

### Backend `.env`

```bash
# Google Ads API
GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=XXX-XXX-XXXX
GOOGLE_ADS_CALLBACK_URL=http://localhost:3001/google/oauth/callback

# Redis (para BullMQ - operações em massa)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Existing
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
OPENAI_API_KEY=...
```

### Frontend `.env`

```bash
# Existing
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3001
```

---

## 4. Instalar Dependências

### Backend

```bash
cd backend
npm install google-ads-api xlsx csv-parse chardet bullmq
npm install -D @types/chardet
```

### Frontend

```bash
cd frontend
# Já tem todas as deps necessárias
npm install
```

---

## 5. Executar Migrations

```bash
# Via Supabase CLI
supabase db push

# Ou manualmente no Supabase Dashboard > SQL Editor
# Cole o conteúdo de data-model.md (seção Migration SQL)
```

---

## 6. Testar Conexão OAuth

### 6.1 Iniciar Servidores

```bash
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Redis (se usando BullMQ)
redis-server
```

### 6.2 Testar Fluxo OAuth

1. Acesse `http://localhost:3000/alvoads-google`
2. Clique em "Conectar Google Ads"
3. Complete o fluxo OAuth no Google
4. Verifique se a conexão aparece na lista

### 6.3 Verificar Token

```bash
# Testar se o token funciona
curl -X GET http://localhost:3001/google/connections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 7. Primeiro Teste de Campanha

### 7.1 Criar Template

1. No dashboard, clique "Nova Campanha"
2. Escolha "Campanha Única"
3. Preencha:
   - **Nome**: Teste AlvoBot
   - **Objetivo**: Tráfego
   - **Orçamento**: R$10/dia
   - **Keywords**: teste alvobot, teste campanha
   - **Headlines**: Teste AlvoBot | Campanha Teste | Funciona!
   - **Descriptions**: Esta é uma campanha de teste. | Criada pelo AlvoBot.
   - **URL**: https://alvobot.com
4. Salve como rascunho

### 7.2 Validar (Dry Run)

```bash
# Validar sem publicar
curl -X POST http://localhost:3001/google/campaigns/YOUR_TEMPLATE_ID/publish \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'
```

### 7.3 Publicar (Com Cuidado!)

⚠️ **ATENÇÃO**: Isso criará uma campanha REAL no Google Ads!

1. Certifique-se de que a conta tem orçamento controlado
2. A campanha será criada como **PAUSADA**
3. Você precisará ativar manualmente no Google Ads para gastar

```bash
curl -X POST http://localhost:3001/google/campaigns/YOUR_TEMPLATE_ID/publish \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}'
```

---

## 8. Testar Criação em Massa

### 8.1 Por Localização (Preview)

```bash
curl -X POST http://localhost:3001/google/campaigns/bulk/location/preview \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connection_id": "YOUR_CONNECTION_ID",
    "base_template": {
      "campaign": {
        "name": "Advogado {{cidade}}",
        "goal": "LEADS",
        "budget": 30,
        "budget_type": "daily"
      },
      "ad_group": {
        "name": "Grupo Principal",
        "keywords": [
          {"text": "advogado", "match_type": "BROAD"},
          {"text": "advogado {{cidade}}", "match_type": "PHRASE"}
        ],
        "ads": [{
          "headlines": ["Advogado em {{cidade}}", "Consulta Grátis", "Ligue Agora"],
          "descriptions": ["Advogado especializado em {{cidade}}.", "Atendimento personalizado."],
          "final_url": "https://exemplo.com"
        }]
      }
    },
    "locations": [
      {"code": "1001773", "name": "São Paulo"},
      {"code": "1001774", "name": "Rio de Janeiro"},
      {"code": "1001768", "name": "Belo Horizonte"}
    ],
    "variations": {
      "include_location_in_name": true,
      "include_location_in_keywords": true,
      "include_location_in_ads": true
    }
  }'
```

### 8.2 Por Produto com IA

```bash
curl -X POST http://localhost:3001/google/campaigns/bulk/product/generate-content \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"name": "Camiseta Básica", "description": "Camiseta 100% algodão", "url": "https://loja.com/camiseta", "price": 49.90},
      {"name": "Calça Jeans", "description": "Calça jeans slim fit", "url": "https://loja.com/calca", "price": 129.90}
    ],
    "ai_settings": {
      "generate_keywords": true,
      "generate_headlines": true,
      "generate_descriptions": true,
      "keywords_per_product": 10,
      "headlines_per_product": 8,
      "descriptions_per_product": 4,
      "tone": "casual"
    }
  }'
```

---

## 9. Troubleshooting

### Erro: "Developer token is not approved"

- O token está em modo Test
- Só pode acessar contas listadas como Test Accounts no API Center
- Adicione sua conta como Test Account

### Erro: "User doesn't have permission"

- Verifique se o usuário OAuth tem acesso à conta Google Ads
- No Google Ads, vá para **Tools** > **Access and security** > adicione o usuário

### Erro: "Invalid customer ID"

- Customer ID deve ter 10 dígitos sem traços
- Exemplo: `1234567890` (não `123-456-7890`)

### Erro: "OAuth token expired"

- O access_token expira em 1 hora
- O sistema deve usar refresh_token automaticamente
- Se refresh_token falhar, usuário precisa reconectar

### Rate Limiting

- Se receber erro 429, aguarde e tente novamente
- Implemente exponential backoff
- Não exceda 15,000 operações/dia

---

## 10. Próximos Passos

1. [ ] Implementar GoogleOAuthService
2. [ ] Implementar GoogleAdsApiService
3. [ ] Implementar BulkLocationService
4. [ ] Implementar BulkProductService
5. [ ] Implementar SpreadsheetParserService
6. [ ] Implementar job queue com BullMQ
7. [ ] Implementar SSE para progress tracking
8. [ ] Testes E2E

Ver `tasks.md` para lista completa de tarefas.
