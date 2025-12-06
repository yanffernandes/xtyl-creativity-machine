# Quickstart: Sistema de Internacionalização (i18n)

**Feature Branch**: `022-i18n`
**Date**: 2025-12-05

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Projeto Next.js 16 com App Router (já configurado)

## Instalação Rápida

```bash
# 1. Instalar dependência
cd frontend
npm install next-intl

# 2. Verificar instalação
npm list next-intl
```

## Configuração Mínima

### 1. Criar arquivo de configuração i18n

```typescript
// frontend/src/i18n/config.ts
export const locales = ['pt-BR', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pt-BR';
```

### 2. Criar arquivo de request config

```typescript
// frontend/src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

### 3. Criar arquivos de tradução

```json
// frontend/src/messages/pt-BR.json
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar"
  }
}
```

```json
// frontend/src/messages/en.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

### 4. Atualizar next.config.ts

```typescript
// frontend/next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // configurações existentes...
};

export default withNextIntl(nextConfig);
```

### 5. Adicionar Provider no layout

```typescript
// frontend/src/app/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="pt-BR">
      <body>
        <NextIntlClientProvider messages={messages}>
          {/* outros providers */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## Uso Básico

### Em Client Components

```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common');

  return (
    <button>{t('save')}</button>
  );
}
```

### Em Server Components

```typescript
import { getTranslations } from 'next-intl/server';

export async function MyServerComponent() {
  const t = await getTranslations('common');

  return (
    <h1>{t('save')}</h1>
  );
}
```

## Teste Rápido

```bash
# Rodar aplicação
npm run dev

# Verificar se textos aparecem traduzidos
# Abrir http://localhost:3000
```

## Próximos Passos

1. Migrar textos hardcoded para arquivos de tradução
2. Implementar LocaleSwitcher component
3. Adicionar persistência em localStorage
4. Configurar formatação de datas e números

## Troubleshooting

### Erro: "Module not found: Can't resolve '../messages/pt-BR.json'"

Certifique-se que o arquivo existe em `frontend/src/messages/pt-BR.json`.

### Erro: "useTranslations() was called outside of an NextIntlClientProvider"

Verifique se o `NextIntlClientProvider` está envolvendo seu componente no layout.

### Traduções não atualizam

Reinicie o servidor de desenvolvimento após modificar arquivos de tradução.
