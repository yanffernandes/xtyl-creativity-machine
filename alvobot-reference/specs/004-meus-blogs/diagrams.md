# Diagrams - Meus Blogs (Projetos)

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ ProjectsPage │  │  CreateWizard│  │ ManageModal  │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └────────┬────────┴─────────────────┘                    │
│                  │                                               │
│         ┌────────▼────────┐                                      │
│         │   API Hooks     │                                      │
│         │  (TanStack)     │                                      │
│         └────────┬────────┘                                      │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐          ┌─────▼─────┐
   │ Supabase│          │  Backend  │
   │  (RLS)  │          │  (NestJS) │
   └────┬────┘          └─────┬─────┘
        │                     │
        │              ┌──────▼──────┐
        │              │  WordPress  │
        │              │   Service   │
        │              └──────┬──────┘
        │                     │
        │              ┌──────▼──────────┐
        │              │ Encryption Util │
        │              └──────┬──────────┘
        │                     │
   ┌────▼─────────────────────▼────┐
   │      Supabase PostgreSQL      │
   │   (projects table + RLS)      │
   └───────────────────────────────┘
                   │
            ┌──────▼──────┐
            │  WordPress  │
            │  REST API   │
            └─────────────┘
```

## 2. Data Flow - Create Project Wizard

```
┌──────────────┐
│    User      │
└──────┬───────┘
       │ 1. Clicks "Adicionar novo Blog"
       ▼
┌──────────────────┐
│  ProjectsPage    │
└──────┬───────────┘
       │ 2. Opens wizard
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    CreateWizard Component                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Step 1: Basic Info                                              │
│  ┌────────────────────────────────┐                              │
│  │ - Name                         │                              │
│  │ - WordPress URL                │                              │
│  └────────────────────────────────┘                              │
│           │ 3. User fills form                                   │
│           ▼                                                       │
│  Step 2: Credentials                                             │
│  ┌────────────────────────────────┐                              │
│  │ - WordPress Username           │                              │
│  │ - Application Password         │                              │
│  └────────────────────────────────┘                              │
│           │ 4. User provides credentials                         │
│           ▼                                                       │
│  Step 3: Test Connection                                         │
│  ┌────────────────────────────────┐                              │
│  │ - Auto-test on mount          │                              │
│  │ - Show loading state          │                              │
│  └────────────────────────────────┘                              │
│           │ 5. Trigger test                                      │
└───────────┼──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────┐
│  useTestWordPressConnection │
│  (Frontend Mutation)        │
└─────────────┬───────────────┘
              │ 6. POST /wordpress/test-connection
              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                               │
├──────────────────────────────────────────────────────────────────┤
│  WordPress Controller                                             │
│  ┌────────────────────────────────┐                              │
│  │ 1. Validate JWT                │                              │
│  │ 2. Extract user_id from token  │                              │
│  └────────────┬───────────────────┘                              │
│               │ 7. Call service                                   │
│               ▼                                                   │
│  WordPress Service                                                │
│  ┌────────────────────────────────┐                              │
│  │ 1. Fetch project from DB       │◄─────┐                       │
│  │ 2. Decrypt credentials         │      │                       │
│  │ 3. Normalize WordPress URL     │      │                       │
│  │ 4. Test auth (/users/me)       │──────┼──┐                    │
│  │ 5. Fetch site info (/)         │      │  │                    │
│  │ 6. Check plugin (/alvobot/v1)  │      │  │                    │
│  │ 7. Update project status       │──────┘  │                    │
│  │ 8. Return result               │         │                    │
│  └────────────┬───────────────────┘         │                    │
└───────────────┼─────────────────────────────┼────────────────────┘
                │                             │
                │ 8. Access database          │ 9. Call WordPress API
                ▼                             ▼
   ┌─────────────────────┐        ┌──────────────────────┐
   │  Supabase (RLS)     │        │  WordPress REST API  │
   │  - projects table   │        │  - /wp-json/...      │
   └──────────┬──────────┘        └──────────┬───────────┘
              │                              │
              │ 10. Return data              │ 11. Return response
              ▼                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend Response                               │
│  {                                                                │
│    success: true,                                                │
│    connectionStatus: 'connected',                                │
│    siteInfo: {                                                   │
│      wpVersion: '6.4',                                           │
│      siteName: 'Meu Blog',                                       │
│      alvobotPluginActive: true                                   │
│    }                                                             │
│  }                                                               │
└─────────────────────────┬────────────────────────────────────────┘
                          │ 12. Response to frontend
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                               │
│                                                                   │
│  Step 3: Connection Result                                       │
│  ┌────────────────────────────────┐                              │
│  │ ✓ Conexão estabelecida!        │                              │
│  │                                │                              │
│  │ Informações do site:           │                              │
│  │ - Nome: Meu Blog               │                              │
│  │ - WordPress: 6.4               │                              │
│  │ - Plugin: Ativo ✓              │                              │
│  │                                │                              │
│  │ [Continuar] ───────────────────┼──┐                           │
│  └────────────────────────────────┘  │                           │
└──────────────────────────────────────┼───────────────────────────┘
                                       │ 13. User clicks continue
                                       ▼
                          ┌────────────────────────┐
                          │  Save project to DB    │
                          │  via Supabase client   │
                          │  (Frontend direct)     │
                          └────────────┬───────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │  Close wizard          │
                          │  Show success message  │
                          │  Redirect to projects  │
                          └────────────────────────┘
```

## 3. Sequence Diagram - Test Connection

```
User          Frontend       Backend        Supabase      WordPress
 │                │             │              │              │
 │ Click Test     │             │              │              │
 │───────────────>│             │              │              │
 │                │             │              │              │
 │                │ POST /test  │              │              │
 │                │────────────>│              │              │
 │                │             │              │              │
 │                │             │ Fetch project│              │
 │                │             │─────────────>│              │
 │                │             │<─────────────│              │
 │                │             │  (encrypted) │              │
 │                │             │              │              │
 │                │             │ Decrypt pass │              │
 │                │             │──────┐       │              │
 │                │             │      │       │              │
 │                │             │<─────┘       │              │
 │                │             │              │              │
 │                │             │  GET /wp-json/wp/v2/users/me│
 │                │             │──────────────────────────────>│
 │                │             │              │           │  │
 │                │             │              │  Auth OK │  │
 │                │             │<──────────────────────────────│
 │                │             │              │              │
 │                │             │  GET /wp-json/alvobot/v1    │
 │                │             │──────────────────────────────>│
 │                │             │              │   Plugin     │
 │                │             │<──────────────────────────────│
 │                │             │              │    status    │
 │                │             │              │              │
 │                │             │ Update status│              │
 │                │             │─────────────>│              │
 │                │             │<─────────────│              │
 │                │             │    Success   │              │
 │                │             │              │              │
 │                │  Response   │              │              │
 │                │<────────────│              │              │
 │                │             │              │              │
 │  Show result   │             │              │              │
 │<───────────────│             │              │              │
 │                │             │              │              │
```

## 4. State Machine - Project Connection Status

```
┌──────────────────────────────────────────────────────────────────┐
│                    Connection Status States                       │
└──────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │ not_configured  │ (Initial state)
                    └────────┬────────┘
                             │
                             │ User starts wizard
                             ▼
                    ┌─────────────────┐
              ┌────>│     testing     │<────┐
              │     └────────┬────────┘     │
              │              │              │
   Retry      │     Success  │  Failed      │  Manual test
              │              │              │
              │     ┌────────▼────────┐     │
              │     │    connected    │     │
              │     └────────┬────────┘     │
              │              │              │
              │              │ Credentials  │
              │              │ revoked or   │
              │              │ plugin       │
              │              │ deactivated  │
              │              │              │
              │     ┌────────▼────────┐     │
              └─────│      error      │─────┘
                    └─────────────────┘

States:
  - not_configured: Projeto criado mas não testado
  - testing: Teste de conexão em andamento
  - connected: Conexão ativa e funcional
  - error: Falha na conexão (credenciais, plugin, etc)

Transitions:
  - not_configured -> testing: Wizard step 3 ou manual test
  - testing -> connected: Auth OK + Plugin OK
  - testing -> error: Auth failed, timeout, plugin inactive
  - connected -> testing: Manual re-test
  - connected -> error: Periodic check fails
  - error -> testing: User retries or updates credentials
```

## 5. Component Tree - Projects Feature

```
ProjectsPage
├── Header
│   ├── TitleSection
│   │   ├── FolderIcon
│   │   └── Title + Subtitle
│   └── HeaderActions
│       ├── BlogCountBadge (3/7)
│       └── AddProjectButton
│
├── Toolbar
│   └── SearchInput
│
├── ErrorAlert (conditional)
│
├── LoadingSpinner (conditional)
│
├── EmptyState (conditional)
│   ├── EmptyIcon
│   ├── EmptyMessage
│   └── CreateButton
│
├── ProjectGrid
│   └── ProjectCard (multiple)
│       ├── CardHeader
│       │   ├── ProjectName
│       │   ├── ConnectionStatusBadge
│       │   └── MenuButton
│       │       └── DropdownMenu
│       │           ├── ManageOption
│       │           ├── TestConnectionOption
│       │           └── DeleteOption
│       ├── InfoSection
│       │   ├── DomainInfo
│       │   └── WordPressVersionInfo
│       └── StatsSection
│           ├── ArticleCount
│           └── LastArticleDate
│
├── ProjectCreateWizard (modal)
│   ├── ModalHeader
│   ├── ProgressIndicator
│   │   ├── Step1Indicator (Info)
│   │   ├── Step2Indicator (Credentials)
│   │   └── Step3Indicator (Test)
│   ├── WizardContent
│   │   ├── BasicInfoStep (conditional)
│   │   │   ├── NameInput
│   │   │   ├── DomainInput
│   │   │   └── NicheSelect
│   │   ├── CredentialsStep (conditional)
│   │   │   ├── UsernameInput
│   │   │   ├── PasswordInput
│   │   │   └── HelpText
│   │   └── ConnectionTestStep (conditional)
│   │       ├── LoadingState
│   │       │   └── Spinner + Message
│   │       ├── SuccessState
│   │       │   ├── SuccessIcon
│   │       │   ├── SiteInfoCard
│   │       │   └── ContinueButton
│   │       └── ErrorState
│   │           ├── ErrorIcon
│   │           ├── ErrorMessage
│   │           ├── RetryButton
│   │           └── BackButton
│   └── ModalFooter
│       ├── BackButton
│       └── NextButton
│
├── ProjectManageModal (modal)
│   ├── ModalHeader
│   ├── TabNavigation
│   │   ├── InfoTab
│   │   ├── ConnectionTab
│   │   └── HistoryTab
│   ├── TabContent
│   │   ├── InfoTabPanel
│   │   │   ├── ProjectForm
│   │   │   └── SaveButton
│   │   ├── ConnectionTabPanel
│   │   │   ├── ConnectionStatusSection
│   │   │   │   ├── StatusBadge
│   │   │   │   ├── LastTestedDate
│   │   │   │   └── ErrorMessage
│   │   │   ├── TestConnectionButton
│   │   │   ├── ConnectionTestResult
│   │   │   └── ReinstallPluginButton
│   │   └── HistoryTabPanel
│   │       └── ConnectionLogsList
│   │           └── LogItem (multiple)
│   │               ├── Timestamp
│   │               ├── StatusIcon
│   │               ├── ResultMessage
│   │               └── ResponseTime
│   └── ModalFooter
│       ├── DeleteButton
│       └── CloseButton
│
└── DeleteConfirmationModal
    ├── ModalHeader
    ├── WarningMessage
    └── ModalFooter
        ├── CancelButton
        └── ConfirmButton
```

## 6. Database ER Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                          projects                             │
├──────────────────────────────────────────────────────────────┤
│ PK  id                    INTEGER                            │
│ FK  user_id               UUID          → auth.users(id)     │
│     name                  TEXT          NOT NULL             │
│     domain                TEXT          (WordPress URL)      │
│     login                 TEXT          (WP username)        │
│     pass                  TEXT          (encrypted)          │
│     status                BOOLEAN       (active/inactive)    │
│     connection_status     ENUM          (NEW)               │
│     last_connection_test  TIMESTAMP     (NEW)               │
│     connection_error_msg  TEXT          (NEW)               │
│     token                 TEXT                               │
│     wp_version            TEXT                               │
│     plugins               JSONB                              │
│     niche_selected        TEXT                               │
│     is_approved_adsense   BOOLEAN                            │
│     adsense_status        TEXT                               │
│     log                   JSONB                              │
│     created_at            TIMESTAMP                          │
│     updated_at            TIMESTAMP                          │
│     is_deleted            BOOLEAN       (soft delete)        │
└──────────────────────────────────────────────────────────────┘
                                │
                                │ 1:N
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                 wordpress_connection_logs                     │
├──────────────────────────────────────────────────────────────┤
│ PK  id                    UUID                               │
│ FK  project_id            INTEGER       → projects(id)       │
│ FK  user_id               UUID          → auth.users(id)     │
│     test_type             TEXT          (manual|auto|wizard) │
│     success               BOOLEAN                            │
│     error_message         TEXT                               │
│     response_time_ms      INTEGER                            │
│     wp_version            TEXT                               │
│     tested_at             TIMESTAMP                          │
│     created_at            TIMESTAMP                          │
└──────────────────────────────────────────────────────────────┘

RLS Policies:
  projects:
    - SELECT: auth.uid() = user_id
    - INSERT: auth.uid() = user_id
    - UPDATE: auth.uid() = user_id
    - DELETE: auth.uid() = user_id

  wordpress_connection_logs:
    - SELECT: auth.uid() = user_id
    - INSERT: auth.uid() = user_id
```

## 7. Security Flow - Credential Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                    Credential Lifecycle                          │
└─────────────────────────────────────────────────────────────────┘

1. USER ENTERS PASSWORD IN WIZARD
   ┌──────────────────────────────┐
   │ Application Password (Plain) │
   │ "abcd efgh ijkl mnop qrst"   │
   └────────────┬─────────────────┘
                │ HTTPS
                ▼
2. SENT TO BACKEND (TLS ENCRYPTED)
   ┌──────────────────────────────┐
   │ Backend receives via POST    │
   │ { applicationPassword: "..." }│
   └────────────┬─────────────────┘
                │
                ▼
3. ENCRYPTION (AES-256-GCM)
   ┌──────────────────────────────┐
   │ EncryptionUtil.encrypt()     │
   │                              │
   │ 1. Generate random IV (16b)  │
   │ 2. Encrypt with key from env │
   │ 3. Get auth tag              │
   │ 4. Combine: iv:tag:encrypted │
   └────────────┬─────────────────┘
                │
                ▼
4. STORED IN DATABASE (ENCRYPTED)
   ┌──────────────────────────────┐
   │ projects.pass                │
   │ "a1b2c3:d4e5f6:g7h8i9..."    │
   └────────────┬─────────────────┘
                │
                │ ONLY when needed
                ▼
5. DECRYPTION (BACKEND ONLY)
   ┌──────────────────────────────┐
   │ EncryptionUtil.decrypt()     │
   │                              │
   │ 1. Split iv:tag:encrypted    │
   │ 2. Decrypt with same key     │
   │ 3. Verify auth tag           │
   │ 4. Return plaintext          │
   └────────────┬─────────────────┘
                │ In memory only
                ▼
6. USED FOR WORDPRESS API CALL
   ┌──────────────────────────────┐
   │ Authorization: Basic <base64>│
   │ username:password            │
   └────────────┬─────────────────┘
                │ HTTPS
                ▼
   ┌──────────────────────────────┐
   │    WordPress REST API        │
   └──────────────────────────────┘

NEVER:
  ❌ Store plaintext password
  ❌ Log decrypted password
  ❌ Return password to frontend
  ❌ Use weak encryption
  ❌ Store encryption key in code
```

## 8. Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Scenarios & Handling                    │
└─────────────────────────────────────────────────────────────────┘

WordPress API Call
       │
       ▼
┌──────────────────┐
│  Make Request    │
└────────┬─────────┘
         │
    ┌────▼─────┐
    │ Success? │
    └────┬─────┘
         │
    ┌────┴─────┐
    │          │
   YES        NO
    │          │
    │     ┌────▼──────────────────────────────────────────┐
    │     │         Error Analysis                        │
    │     └────┬──────────────────────────────────────────┘
    │          │
    │     ┌────┴────┐
    │     │ Type?   │
    │     └────┬────┘
    │          │
    │     ┌────┴──────────────────────────────────┐
    │     │                │               │      │
    │  ┌──▼──┐     ┌──────▼─────┐  ┌─────▼────┐ │
    │  │ 401 │     │ 403        │  │ Network  │...
    │  │ Auth│     │ Forbidden  │  │ Timeout  │
    │  └──┬──┘     └──────┬─────┘  └─────┬────┘
    │     │               │               │
    │  ┌──▼───────────┐ ┌─▼──────────┐ ┌─▼──────────┐
    │  │"Credenciais │ │"Sem        │ │"Timeout ao │
    │  │ inválidas"  │ │ permissões"│ │ conectar"  │
    │  └──┬───────────┘ └─┬──────────┘ └─┬──────────┘
    │     │               │               │
    │     └───────┬───────┴───────┬───────┘
    │             │               │
    │        ┌────▼───────────────▼────┐
    │        │ Update project status:  │
    │        │ - connection_status     │
    │        │ - error_message         │
    │        │ - last_test_timestamp   │
    │        └────┬────────────────────┘
    │             │
    ▼             ▼
┌───────────────────────────────────────┐
│        Return to Frontend             │
│                                       │
│ Success:                              │
│ { success: true,                      │
│   connectionStatus: 'connected',      │
│   siteInfo: {...} }                   │
│                                       │
│ Error:                                │
│ { success: false,                     │
│   connectionStatus: 'error',          │
│   errorMessage: "..." }               │
└───────────────────────────────────────┘
```

## 9. Frontend State Flow (TanStack Query)

```
┌─────────────────────────────────────────────────────────────────┐
│                  TanStack Query State Management                 │
└─────────────────────────────────────────────────────────────────┘

Query Keys Structure:
  projects
    ├── list (filters?)
    │   ├── ['projects', 'list']
    │   └── ['projects', 'list', { search: 'blog' }]
    ├── detail (id)
    │   └── ['projects', 'detail', 123]
    └── stats
        └── ['projects', 'stats']

Mutations:
  ├── createProject
  ├── updateProject
  ├── deleteProject
  ├── testConnection
  └── installPlugin


State Flow:

1. Initial Load
   ┌──────────────────┐
   │ ProjectsPage     │
   │ useProjects()    │
   └────────┬─────────┘
            │
       ┌────▼────┐
       │ Loading │ isPending: true
       └────┬────┘
            │
       ┌────▼────┐
       │ Success │ data: Project[]
       └─────────┘

2. Create Project
   ┌─────────────────────┐
   │ User fills wizard   │
   └────────┬────────────┘
            │
   ┌────────▼────────────┐
   │ useCreateProject()  │
   │ .mutate(data)       │
   └────────┬────────────┘
            │
       ┌────▼────┐
       │ Mutating│ isPending: true
       └────┬────┘
            │
       ┌────▼────┐
       │ Success │
       └────┬────┘
            │ onSuccess callback
       ┌────▼─────────────────────┐
       │ invalidateQueries:       │
       │ - ['projects', 'list']   │
       │ - ['projects', 'stats']  │
       └────┬─────────────────────┘
            │
       ┌────▼────┐
       │ Refetch │ Automatic
       └─────────┘

3. Test Connection
   ┌─────────────────────────┐
   │ User clicks test        │
   └────────┬────────────────┘
            │
   ┌────────▼───────────────────┐
   │ useTestWordPress()         │
   │ .mutate({ projectId })     │
   └────────┬───────────────────┘
            │
       ┌────▼────┐
       │ Mutating│ Show loading in UI
       └────┬────┘
            │
       ┌────▼────┐
       │ Success │
       └────┬────┘
            │ onSuccess callback
       ┌────▼─────────────────────┐
       │ invalidateQueries:       │
       │ - ['projects', 'detail'] │
       │ - ['projects', 'list']   │
       └─────────────────────────┘

Cache Strategy:
  - Projects list: staleTime: 5 minutes
  - Project detail: staleTime: 5 minutes
  - Stats: staleTime: 10 minutes
  - Manual refetch on focus: enabled
  - Retry failed queries: 2 times
```

## 10. Mobile Responsive Breakpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                    Responsive Layout Strategy                    │
└─────────────────────────────────────────────────────────────────┘

Mobile (320px - 767px)
┌──────────────┐
│   Header     │ Stack vertically
│ [Add Button] │
├──────────────┤
│   Search     │
├──────────────┤
│              │
│  [Project 1] │ Full width cards
│              │
├──────────────┤
│              │
│  [Project 2] │
│              │
└──────────────┘

Tablet (768px - 1023px)
┌────────────────────────────────┐
│ Header           [Add Button]  │
├────────────────────────────────┤
│           Search               │
├───────────────┬────────────────┤
│               │                │
│  [Project 1]  │  [Project 2]   │ 2 columns
│               │                │
├───────────────┼────────────────┤
│               │                │
│  [Project 3]  │  [Project 4]   │
│               │                │
└───────────────┴────────────────┘

Desktop (1024px+)
┌──────────────────────────────────────────────────────────────┐
│ Header                                       [Add Button]    │
├──────────────────────────────────────────────────────────────┤
│                          Search                              │
├───────────────┬────────────────┬────────────────┬────────────┤
│               │                │                │            │
│  [Project 1]  │  [Project 2]   │  [Project 3]   │ [Proj 4]   │
│               │                │                │            │ 3-4 cols
└───────────────┴────────────────┴────────────────┴────────────┘

CSS Grid:
  .grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
```
