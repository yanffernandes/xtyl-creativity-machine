# Data Model: Sistema de Internacionalização (i18n)

**Feature Branch**: `022-i18n`
**Date**: 2025-12-05

## Entidades

### 1. Locale

Representa um idioma/região suportado pelo sistema.

| Field | Type | Description |
|-------|------|-------------|
| code | `string` | Código do idioma (ex: 'pt-BR', 'en') |
| name | `string` | Nome do idioma no próprio idioma (ex: 'Português', 'English') |
| nativeName | `string` | Nome nativo para exibição |
| direction | `'ltr' \| 'rtl'` | Direção do texto (sempre 'ltr' para PT/EN) |
| isDefault | `boolean` | Se é o idioma padrão do sistema |

**TypeScript Definition**:
```typescript
// frontend/src/i18n/config.ts
export const locales = ['pt-BR', 'en'] as const;
export type Locale = (typeof locales)[number];

export const localeConfig: Record<Locale, {
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
}> = {
  'pt-BR': {
    name: 'Português (Brasil)',
    nativeName: 'Português',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { minimumFractionDigits: 2 }
  },
  'en': {
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: { minimumFractionDigits: 2 }
  }
};

export const defaultLocale: Locale = 'pt-BR';
```

### 2. Translation Bundle

Conjunto de traduções para um idioma específico.

**Structure (JSON)**:
```typescript
interface TranslationBundle {
  common: CommonTranslations;
  auth: AuthTranslations;
  navigation: NavigationTranslations;
  profile: ProfileTranslations;
  workspace: WorkspaceTranslations;
  project: ProjectTranslations;
  document: DocumentTranslations;
  workflow: WorkflowTranslations;
  errors: ErrorTranslations;
  validation: ValidationTranslations;
  // ... outras seções
}
```

**Namespace Details**:

| Namespace | Description | Example Keys |
|-----------|-------------|--------------|
| `common` | Textos genéricos reutilizáveis | save, cancel, delete, loading, confirm |
| `auth` | Autenticação e login | login, logout, register, forgotPassword |
| `navigation` | Menu e navegação | home, projects, settings, profile |
| `profile` | Página de perfil | title, language, changePassword |
| `workspace` | Área de trabalho | createWorkspace, members, settings |
| `project` | Projetos | createProject, documents, visualAssets |
| `document` | Documentos | newDocument, edit, share |
| `workflow` | Workflows | createWorkflow, execute, nodes |
| `errors` | Mensagens de erro | generic, network, validation |
| `validation` | Validação de formulários | required, email, minLength |

### 3. User Locale Preference

Preferência de idioma do usuário armazenada no cliente.

**Storage Location**: `localStorage`
**Key**: `xtyl-locale`
**Type**: `Locale`

```typescript
// Armazenamento
interface LocaleStorage {
  get(): Locale | null;
  set(locale: Locale): void;
  remove(): void;
}

// Implementação
const STORAGE_KEY = 'xtyl-locale';

export const localeStorage: LocaleStorage = {
  get: () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return locales.includes(stored as Locale) ? (stored as Locale) : null;
  },
  set: (locale) => {
    localStorage.setItem(STORAGE_KEY, locale);
  },
  remove: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
```

## Arquivos de Tradução

### Estrutura de Diretórios

```
frontend/src/messages/
├── pt-BR.json      # Traduções em Português (idioma base)
└── en.json         # Traduções em Inglês
```

### Schema de Tradução

```typescript
// types/i18n.ts
export interface Messages {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    loading: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    open: string;
    yes: string;
    no: string;
    ok: string;
    retry: string;
    refresh: string;
    noResults: string;
    selectAll: string;
    deselectAll: string;
  };

  auth: {
    login: string;
    logout: string;
    register: string;
    email: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    resetPassword: string;
    rememberMe: string;
    signIn: string;
    signUp: string;
    signOut: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
  };

  navigation: {
    home: string;
    dashboard: string;
    projects: string;
    templates: string;
    workflows: string;
    settings: string;
    profile: string;
    aiUsage: string;
  };

  profile: {
    title: string;
    subtitle: string;
    personalInfo: string;
    fullName: string;
    email: string;
    newPassword: string;
    keepCurrentPassword: string;
    saveChanges: string;
    language: string;
    selectLanguage: string;
  };

  workspace: {
    title: string;
    create: string;
    settings: string;
    members: string;
    invite: string;
    leave: string;
    delete: string;
    noProjects: string;
  };

  project: {
    title: string;
    create: string;
    settings: string;
    documents: string;
    visualAssets: string;
    workflows: string;
    delete: string;
    archive: string;
  };

  document: {
    title: string;
    create: string;
    edit: string;
    delete: string;
    share: string;
    duplicate: string;
    export: string;
    untitled: string;
  };

  workflow: {
    title: string;
    create: string;
    execute: string;
    stop: string;
    pause: string;
    resume: string;
    templates: string;
    executions: string;
    nodes: string;
    variables: string;
    running: string;
    completed: string;
    failed: string;
  };

  errors: {
    generic: string;
    network: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    timeout: string;
    tryAgain: string;
    contactSupport: string;
  };

  validation: {
    required: string;
    email: string;
    minLength: string;
    maxLength: string;
    passwordMatch: string;
    invalidFormat: string;
  };

  success: {
    saved: string;
    created: string;
    updated: string;
    deleted: string;
    copied: string;
  };
}
```

## Validação

### Regras de Validação de Tradução

1. **Completude**: Todas as chaves em `pt-BR.json` devem existir em `en.json`
2. **Tipo**: Valores devem ser strings (não objetos aninhados além do namespace)
3. **Placeholders**: Placeholders `{variable}` devem ser consistentes entre idiomas
4. **Pluralização**: Usar formato ICU para plurais: `{count, plural, one {# item} other {# items}}`

### Script de Validação

```typescript
// scripts/validate-translations.ts
import ptBR from '../src/messages/pt-BR.json';
import en from '../src/messages/en.json';

function validateTranslations() {
  const errors: string[] = [];

  function checkKeys(obj1: any, obj2: any, path = '') {
    for (const key of Object.keys(obj1)) {
      const newPath = path ? `${path}.${key}` : key;
      if (!(key in obj2)) {
        errors.push(`Missing key in en.json: ${newPath}`);
      } else if (typeof obj1[key] === 'object') {
        checkKeys(obj1[key], obj2[key], newPath);
      }
    }
  }

  checkKeys(ptBR, en);

  if (errors.length > 0) {
    console.error('Translation validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('✓ All translations are valid');
}

validateTranslations();
```

## State Management

### Locale Context

```typescript
// contexts/LocaleContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, defaultLocale, locales } from '@/i18n/config';
import { localeStorage } from '@/i18n/storage';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar preferência salva ou detectar do navegador
    const saved = localeStorage.get();
    if (saved) {
      setLocaleState(saved);
    } else {
      const browserLang = navigator.language;
      const detected = locales.find(l => browserLang.startsWith(l.split('-')[0]));
      setLocaleState(detected || defaultLocale);
    }
    setIsLoading(false);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localeStorage.set(newLocale);
    // Trigger re-render com novo idioma
    document.documentElement.lang = newLocale;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isLoading }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
```

## Relacionamentos

```
┌─────────────────┐
│   LocaleConfig  │
│   (pt-BR, en)   │
└────────┬────────┘
         │
         │ defines
         ▼
┌─────────────────┐     loads     ┌─────────────────┐
│ TranslationBundle│◄────────────│  NextIntl       │
│   (JSON files)   │              │  Provider       │
└─────────────────┘              └────────┬────────┘
                                          │
                                          │ provides
                                          ▼
                                 ┌─────────────────┐
                                 │  Components     │
                                 │  (useTranslations)
                                 └────────┬────────┘
                                          │
                                          │ reads
                                          ▼
                                 ┌─────────────────┐
                                 │  LocaleContext  │
                                 │  (localStorage) │
                                 └─────────────────┘
```
