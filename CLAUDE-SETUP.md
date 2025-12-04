# Claude Code GitHub Actions

Use `@claude` em issues e PRs para acionar o assistente de IA.

## Setup

### 1. Gerar Token OAuth

No terminal com Claude Code:

```bash
claude setup-token
```

Copie o token gerado (`sk-ant-oat01-...`).

### 2. Adicionar Secret no GitHub

1. Acesse: **Settings → Secrets and variables → Actions**
2. Clique em **New repository secret**
3. Nome: `CLAUDE_CODE_OAUTH_TOKEN`
4. Valor: token do passo anterior

### 3. Instalar o App Claude

Acesse https://github.com/apps/claude e instale no repositório.

## Como Usar

Mencione `@claude` em qualquer issue ou PR:

```
@claude crie um componente de botão
@claude revise esse código
@claude corrija o bug de login
@claude adicione testes para essa função
```

## Custos

- **Claude Max**: usa sua assinatura (não API paga)
- **GitHub Actions**: 2.000 min/mês grátis

## Renovar Token

O token expira periodicamente. Para renovar:

```bash
claude setup-token
```

Atualize o secret `CLAUDE_CODE_OAUTH_TOKEN` no GitHub.
