# Configuracao do Meta App para OAuth

Este documento descreve como configurar o aplicativo Meta (Facebook) para funcionar com o fluxo de OAuth do AlvoBot.

## Pre-requisitos

1. Conta de desenvolvedor Meta: https://developers.facebook.com/
2. Um aplicativo Meta criado no Meta for Developers

## Passos para Configuracao

### 1. Criar/Acessar o Aplicativo Meta

1. Acesse https://developers.facebook.com/apps/
2. Crie um novo aplicativo ou selecione um existente
3. Escolha o tipo "Business" ou "Consumer" conforme sua necessidade

### 2. Configurar o Produto "Facebook Login"

1. No painel do aplicativo, va em "Add Product"
2. Encontre "Facebook Login" e clique em "Set Up"
3. Escolha "Web" como plataforma

### 3. Configurar URLs de OAuth

Em **Facebook Login > Settings**, configure:

**Valid OAuth Redirect URIs:**
```
https://seu-dominio.com/callback/meta
http://localhost:5173/callback/meta (para desenvolvimento)
```

**Importante:** O callback DEVE bater exatamente com o que o backend redireciona. O padrao e:
- Desenvolvimento: `http://localhost:5173/callback/meta`
- Producao: `https://seu-dominio.com/callback/meta`

### 4. Obter Credenciais

Em **Settings > Basic**, copie:
- **App ID** - O identificador publico do app
- **App Secret** - A chave secreta (NUNCA exponha no frontend!)

### 5. Configurar Permissoes

Em **App Review > Permissions and Features**, solicite as permissoes necessarias:

**Para Mensagens (Messenger):**
- `pages_show_list` - Listar paginas
- `pages_messaging` - Enviar mensagens
- `pages_read_engagement` - Ler engajamento
- `pages_manage_metadata` - Gerenciar metadados
- `pages_read_user_content` - Ler conteudo
- `public_profile` - Perfil publico

**Para Anuncios (Ads):**
- `pages_show_list` - Listar paginas
- `ads_management` - Gerenciar anuncios
- `ads_read` - Ler anuncios
- `business_management` - Gerenciar negocios
- `public_profile` - Perfil publico

### 6. Configurar Webhook (Opcional)

Para receber eventos em tempo real:

1. Em **Webhooks**, adicione um novo webhook
2. Configure a URL do seu servidor:
   ```
   https://seu-dominio.com/api/webhooks/meta
   ```
3. Insira o token de verificacao
4. Selecione os eventos que deseja receber

## Configuracao no AlvoBot

### 1. Tabela `meta_app_credentials`

Insira as credenciais do app no Supabase:

```sql
INSERT INTO meta_app_credentials (
  app_name,
  app_id,
  app_secret,
  webhook_url,
  webhook_verify_token,
  environment,
  is_active,
  default_for
) VALUES (
  'AlvoBot Messenger',
  'SEU_APP_ID',
  'SEU_APP_SECRET',
  'https://seu-dominio.com/api/webhooks/meta',
  'SEU_VERIFY_TOKEN',
  'production',
  true,
  ARRAY['messenger']
);
```

### 2. Definir App Default

Para definir qual app sera usado por padrao para cada funcionalidade:

```sql
-- App default para mensagens
UPDATE meta_app_credentials
SET default_for = ARRAY['messenger']
WHERE app_name = 'AlvoBot Messenger';

-- App default para anuncios
UPDATE meta_app_credentials
SET default_for = ARRAY['ads']
WHERE app_name = 'AlvoBot Ads';

-- App para multiplas funcionalidades
UPDATE meta_app_credentials
SET default_for = ARRAY['messenger', 'ads']
WHERE app_name = 'AlvoBot Full';
```

### 3. Variaveis de Ambiente (Backend)

No arquivo `.env` do backend:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key

# Frontend URL (para callbacks)
FRONTEND_URL=http://localhost:5173  # ou https://seu-dominio.com em producao
```

## Fluxo de Autenticacao

1. **Usuario clica em "Conectar"** no frontend
2. **Frontend chama** `POST /meta/oauth/initiate`
3. **Backend:**
   - Busca o Meta App default para o tipo de conexao
   - Gera URL de autorizacao com scopes apropriados
   - Retorna URL para o frontend
4. **Frontend redireciona** para Facebook
5. **Usuario autoriza** no Facebook
6. **Facebook redireciona** para callback do backend: `GET /meta/oauth/callback`
7. **Backend:**
   - Troca codigo por token de acesso
   - Busca informacoes do usuario
   - Cria registro na tabela `connections`
   - Busca lista de paginas
   - Redireciona para frontend com dados
8. **Frontend mostra** tela de selecao de paginas
9. **Usuario seleciona** paginas a habilitar
10. **Frontend chama** `POST /meta/connections/:id/pages`
11. **Backend salva** paginas na tabela `meta_pages`

## Troubleshooting

### Erro "Invalid OAuth Redirect URI"

- Verifique se a URL de callback esta exatamente igual no Meta e no codigo
- URLs com e sem barra final sao diferentes!

### Erro "This app is in development mode"

- Em producao, o app precisa passar pelo App Review
- Em desenvolvimento, apenas usuarios com papel no app podem usar

### Token Expirado

- Tokens de usuario expiram em ~60 dias
- Implemente refresh de tokens ou solicite reconexao

### Permissoes Negadas

- Verifique se as permissoes estao aprovadas no App Review
- Verifique se o usuario realmente concedeu as permissoes

## Referencias

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
