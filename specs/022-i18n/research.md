# Research: Sistema de Internacionalização (i18n)

**Feature Branch**: `022-i18n`
**Date**: 2025-12-05

## Decisões de Pesquisa

### 1. Biblioteca de Internacionalização

**Decision**: next-intl

**Rationale**:
- Padrão da indústria para Next.js 14+ com App Router
- Excelente suporte a TypeScript com type-safety completo
- Suporta tanto Server Components quanto Client Components
- Formatação nativa de datas, números e pluralização via Intl APIs
- Bundle size pequeno (~2.5KB gzipped)
- Manutenção ativa e documentação excelente

**Alternatives Considered**:
- **react-i18next**: Mais popular no ecossistema React geral, mas requer configuração adicional para App Router e RSC
- **next-translate**: Simples, mas menos recursos para formatação
- **lingui**: Excelente para projetos grandes, mas overhead desnecessário para 2 idiomas
- **Built-in Next.js i18n**: Apenas routing, não oferece gerenciamento de traduções

### 2. Estratégia de Routing

**Decision**: Sem locale routing (client-side preference)

**Rationale**:
- Aplicação é predominantemente client-side com autenticação
- URLs estáveis facilitam compartilhamento e bookmarks
- Menor complexidade de implementação
- Preferência salva em localStorage, aplicada via React Context
- Sem necessidade de SEO por idioma (app autenticado)

**Alternatives Considered**:
- **Locale prefix routing** (`/pt-BR/dashboard`, `/en/dashboard`): Melhor para SEO, mas adiciona complexidade desnecessária para app autenticado
- **Domain-based routing** (`pt.app.com`, `en.app.com`): Overkill para 2 idiomas
- **Cookie-based**: Similar ao localStorage, mas com overhead de rede

### 3. Estrutura de Arquivos de Tradução

**Decision**: JSON plano com namespaces por feature/página

**Rationale**:
- Fácil de manter e revisar
- Suporta busca por chave de tradução
- Compatível com ferramentas de tradução externas
- Namespaces evitam conflitos e organizam traduções logicamente

**Structure**:
```json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "loading": "Carregando..."
  },
  "auth": {
    "login": "Entrar",
    "logout": "Sair"
  },
  "profile": {
    "title": "Meu Perfil",
    "language": "Idioma"
  }
}
```

**Alternatives Considered**:
- **Nested by component**: Difícil de reusar traduções comuns
- **ICU MessageFormat files**: Mais poderoso, mas complexo para equipe
- **YAML**: Menos suporte em tooling de tradução

### 4. Persistência de Preferência

**Decision**: localStorage com fallback para navigator.language

**Rationale**:
- Simples e eficaz para preferência de usuário
- Não requer backend/autenticação
- Persistência entre sessões
- Fallback inteligente para idioma do navegador

**Implementation**:
```typescript
// Ordem de prioridade:
// 1. localStorage ('user-locale')
// 2. navigator.language (pt-BR, en-US, etc.)
// 3. Fallback: 'pt-BR'
```

**Alternatives Considered**:
- **Supabase user_preferences**: Requer autenticação, complexidade de sync
- **Cookies**: Overhead de rede, menos controle client-side
- **URL parameter**: Não persiste entre sessões

### 5. Formatação de Datas e Números

**Decision**: Intl APIs nativas via next-intl

**Rationale**:
- Performance nativa do browser
- Suporte completo a locales (pt-BR, en-US)
- Zero dependencies adicionais
- date-fns já instalado pode ser usado para parsing

**Formats**:
```typescript
// Datas
// pt-BR: 05/12/2025
// en: 12/05/2025

// Números
// pt-BR: 1.234,56
// en: 1,234.56

// Moeda
// pt-BR: R$ 1.234,56
// en: $1,234.56
```

### 6. Estratégia de Migração

**Decision**: Migração incremental por área funcional

**Rationale**:
- Minimiza risco de regressões
- Permite validação progressiva
- Equipe pode revisar traduções em batches
- Deploy pode ser feito parcialmente

**Migration Order**:
1. **Core/Common**: Botões, labels, erros genéricos
2. **Auth**: Login, registro, reset de senha
3. **Workspace/Navigation**: Sidebar, breadcrumbs
4. **Profile**: Onde o seletor de idioma estará
5. **Projects/Documents**: Área de trabalho principal
6. **Workflows**: Sistema de automação
7. **Admin**: Painel administrativo (se incluído)

## Configuração Técnica

### Instalação

```bash
npm install next-intl
```

### Arquivos de Configuração

#### `frontend/src/i18n/config.ts`
```typescript
export const locales = ['pt-BR', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt-BR';
```

#### `frontend/src/i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  // Get locale from cookie or default
  const locale = defaultLocale; // Will be dynamic

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

#### `frontend/next.config.ts`
```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl({
  // existing config
});
```

### Provider Setup

```typescript
// layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function RootLayout({ children }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

### Usage Examples

```typescript
// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function SaveButton() {
  const t = useTranslations('common');
  return <button>{t('save')}</button>;
}

// Server Component
import { getTranslations } from 'next-intl/server';

export async function PageTitle() {
  const t = await getTranslations('profile');
  return <h1>{t('title')}</h1>;
}
```

## Referências

- [next-intl Documentation](https://next-intl.dev/)
- [next-intl App Router Guide](https://next-intl.dev/docs/getting-started/app-router)
- [MDN Intl APIs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [Next.js Internationalization](https://nextjs.org/docs/pages/guides/internationalization)
