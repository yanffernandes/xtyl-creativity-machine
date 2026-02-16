# File Structure - Meus Blogs (Projetos)

## Complete Directory Structure

```
alvobot-2/
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   └── wordpress/                           # 🆕 NEW MODULE
│   │   │       ├── wordpress.module.ts              # Module definition
│   │   │       ├── wordpress.controller.ts          # HTTP endpoints
│   │   │       ├── wordpress.service.ts             # Business logic
│   │   │       ├── wordpress.controller.spec.ts     # Controller tests
│   │   │       ├── wordpress.service.spec.ts        # Service tests
│   │   │       │
│   │   │       ├── dto/                             # Data Transfer Objects
│   │   │       │   ├── test-connection.dto.ts
│   │   │       │   ├── test-connection-response.dto.ts
│   │   │       │   ├── install-plugin.dto.ts
│   │   │       │   ├── create-project.dto.ts
│   │   │       │   └── update-project.dto.ts
│   │   │       │
│   │   │       ├── interfaces/                      # TypeScript interfaces
│   │   │       │   ├── wordpress-api.interface.ts
│   │   │       │   ├── site-info.interface.ts
│   │   │       │   └── plugin-info.interface.ts
│   │   │       │
│   │   │       └── utils/                           # Utilities
│   │   │           ├── encryption.util.ts           # AES-256-GCM encryption
│   │   │           ├── encryption.util.spec.ts      # Encryption tests
│   │   │           └── wordpress-client.util.ts     # HTTP client wrapper
│   │   │
│   │   └── common/
│   │       └── supabase/
│   │           └── supabase.service.ts              # (existing) service_role client
│   │
│   ├── migrations/                                  # 🆕 Database migrations
│   │   └── 004_wordpress_connection_fields.sql
│   │
│   ├── test/
│   │   └── wordpress.e2e-spec.ts                    # 🆕 E2E tests
│   │
│   ├── .env.example                                 # Updated with WORDPRESS_ENCRYPTION_KEY
│   └── .env                                         # (gitignored) actual values
│
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   └── projects/
│   │   │       ├── api/
│   │   │       │   ├── useProjects.ts               # (existing) List query
│   │   │       │   ├── useProject.ts                # (existing) Single query
│   │   │       │   ├── useProjectStats.ts           # (existing) Stats query
│   │   │       │   ├── mutations.ts                 # (existing) CRUD mutations
│   │   │       │   └── wordpress.ts                 # 🆕 WordPress-specific mutations
│   │   │       │       └── useTestWordPressConnection()
│   │   │       │       └── useInstallWordPressPlugin()
│   │   │       │       └── useConnectionLogs()
│   │   │       │
│   │   │       ├── components/
│   │   │       │   ├── ProjectCard.tsx              # (existing) Updated with status badge
│   │   │       │   ├── ProjectCard.module.css
│   │   │       │   │
│   │   │       │   ├── ProjectForm.tsx              # (existing) Form for editing
│   │   │       │   ├── ProjectForm.module.css
│   │   │       │   │
│   │   │       │   ├── ProjectCreateWizard.tsx      # (existing) Updated with connection test
│   │   │       │   ├── ProjectCreateWizard.module.css
│   │   │       │   │
│   │   │       │   ├── ProjectManageModal.tsx       # 🆕 Modal for managing project
│   │   │       │   ├── ProjectManageModal.module.css
│   │   │       │   │
│   │   │       │   ├── ConnectionStatusBadge.tsx    # 🆕 Status indicator
│   │   │       │   ├── ConnectionStatusBadge.module.css
│   │   │       │   │
│   │   │       │   ├── ConnectionTestResult.tsx     # 🆕 Test result display
│   │   │       │   ├── ConnectionTestResult.module.css
│   │   │       │   │
│   │   │       │   ├── ConnectionHistoryTab.tsx     # 🆕 History tab content
│   │   │       │   ├── ConnectionHistoryTab.module.css
│   │   │       │   │
│   │   │       │   ├── ConnectionLogItem.tsx        # 🆕 Single log entry
│   │   │       │   ├── ConnectionLogItem.module.css
│   │   │       │   │
│   │   │       │   └── wizard-steps/                # 🆕 Wizard step components
│   │   │       │       ├── BasicInfoStep.tsx
│   │   │       │       ├── BasicInfoStep.module.css
│   │   │       │       ├── CredentialsStep.tsx
│   │   │       │       ├── CredentialsStep.module.css
│   │   │       │       ├── ConnectionTestStep.tsx
│   │   │       │       └── ConnectionTestStep.module.css
│   │   │       │
│   │   │       ├── pages/
│   │   │       │   ├── ProjectsPage.tsx             # (existing) Main page
│   │   │       │   └── ProjectsPage.module.css
│   │   │       │
│   │   │       └── types/
│   │   │           └── index.ts                     # (existing) Updated with new types
│   │   │
│   │   └── shared/
│   │       ├── types/
│   │       │   └── entities.ts                      # 🔄 Updated Project interface
│   │       │
│   │       └── utils/
│   │           ├── supabase.ts                      # (existing) Supabase client
│   │           ├── api.ts                           # (existing) HTTP client
│   │           └── queryKeys.ts                     # (existing) TanStack Query keys
│   │
│   └── .env.example                                 # (existing) No changes needed
│
└── specs/
    └── 004-meus-blogs/
        ├── spec.md                                  # ✅ Feature specification
        ├── examples.md                              # ✅ Code examples
        ├── diagrams.md                              # ✅ Architecture diagrams
        ├── implementation-checklist.md              # ✅ Implementation checklist
        └── file-structure.md                        # ✅ This file
```

## Files by Implementation Phase

### Phase 1: Backend WordPress Integration

**New Files:**
- `backend/src/modules/wordpress/wordpress.module.ts`
- `backend/src/modules/wordpress/wordpress.controller.ts`
- `backend/src/modules/wordpress/wordpress.service.ts`
- `backend/src/modules/wordpress/dto/test-connection.dto.ts`
- `backend/src/modules/wordpress/dto/test-connection-response.dto.ts`
- `backend/src/modules/wordpress/interfaces/wordpress-api.interface.ts`
- `backend/src/modules/wordpress/interfaces/site-info.interface.ts`
- `backend/src/modules/wordpress/utils/encryption.util.ts`
- `backend/src/modules/wordpress/utils/wordpress-client.util.ts`

**Updated Files:**
- `backend/.env.example` (add WORDPRESS_ENCRYPTION_KEY)
- `backend/src/app.module.ts` (import WordPressModule)

**Test Files:**
- `backend/src/modules/wordpress/wordpress.controller.spec.ts`
- `backend/src/modules/wordpress/wordpress.service.spec.ts`
- `backend/src/modules/wordpress/utils/encryption.util.spec.ts`

---

### Phase 2: Database Schema & Migration

**New Files:**
- `backend/migrations/004_wordpress_connection_fields.sql`

**Updated Files:**
- `frontend/src/shared/types/entities.ts` (update Project interface)
- `frontend/src/features/projects/types/index.ts` (add new types)

---

### Phase 3: Frontend - Wizard de Criação

**New Files:**
- `frontend/src/features/projects/api/wordpress.ts`
- `frontend/src/features/projects/components/wizard-steps/BasicInfoStep.tsx`
- `frontend/src/features/projects/components/wizard-steps/BasicInfoStep.module.css`
- `frontend/src/features/projects/components/wizard-steps/CredentialsStep.tsx`
- `frontend/src/features/projects/components/wizard-steps/CredentialsStep.module.css`
- `frontend/src/features/projects/components/wizard-steps/ConnectionTestStep.tsx`
- `frontend/src/features/projects/components/wizard-steps/ConnectionTestStep.module.css`

**Updated Files:**
- `frontend/src/features/projects/components/ProjectCreateWizard.tsx`
- `frontend/src/features/projects/components/ProjectCreateWizard.module.css`

---

### Phase 4: Frontend - Gerenciamento de Projetos

**New Files:**
- `frontend/src/features/projects/components/ProjectManageModal.tsx`
- `frontend/src/features/projects/components/ProjectManageModal.module.css`
- `frontend/src/features/projects/components/ConnectionStatusBadge.tsx`
- `frontend/src/features/projects/components/ConnectionStatusBadge.module.css`
- `frontend/src/features/projects/components/ConnectionTestResult.tsx`
- `frontend/src/features/projects/components/ConnectionTestResult.module.css`

**Updated Files:**
- `frontend/src/features/projects/components/ProjectCard.tsx`
- `frontend/src/features/projects/components/ProjectCard.module.css`
- `frontend/src/features/projects/pages/ProjectsPage.tsx`

---

### Phase 5: Backend - Instalação de Plugin

**New Files:**
- `backend/src/modules/wordpress/dto/install-plugin.dto.ts`
- `backend/src/modules/wordpress/interfaces/plugin-info.interface.ts`

**Updated Files:**
- `backend/src/modules/wordpress/wordpress.service.ts` (add installPlugin method)
- `backend/src/modules/wordpress/wordpress.controller.ts` (add POST /install-plugin)

---

### Phase 6: Frontend - Listagem e Filtros

**Updated Files:**
- `frontend/src/features/projects/pages/ProjectsPage.tsx` (add filters)
- `frontend/src/features/projects/pages/ProjectsPage.module.css`
- `frontend/src/features/projects/api/useProjects.ts` (support filter params)

---

### Phase 7: Logs e Histórico

**New Files:**
- `frontend/src/features/projects/components/ConnectionHistoryTab.tsx`
- `frontend/src/features/projects/components/ConnectionHistoryTab.module.css`
- `frontend/src/features/projects/components/ConnectionLogItem.tsx`
- `frontend/src/features/projects/components/ConnectionLogItem.module.css`
- `backend/src/modules/wordpress/dto/connection-log.dto.ts`

**Updated Files:**
- `backend/src/modules/wordpress/wordpress.service.ts` (add saveLog method)
- `backend/src/modules/wordpress/wordpress.controller.ts` (add GET /logs endpoint)
- `frontend/src/features/projects/api/wordpress.ts` (add useConnectionLogs)
- `frontend/src/features/projects/components/ProjectManageModal.tsx` (add History tab)

---

### Phase 8: Polish e Refinamento

**Updated Files:**
- All existing components (refinements)
- CSS modules (animations, accessibility)
- Test files (additional coverage)

---

## File Templates

### Backend Controller Template

```typescript
// backend/src/modules/wordpress/wordpress.controller.ts

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { WordPressService } from './wordpress.service'
import { TestConnectionDto } from './dto/test-connection.dto'

@Controller('wordpress')
@UseGuards(JwtAuthGuard)
export class WordPressController {
  constructor(private readonly wordpressService: WordPressService) {}

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Request() req,
    @Body() dto: TestConnectionDto,
  ) {
    const userId = req.user.sub
    return this.wordpressService.testConnection(userId, dto)
  }

  // Additional endpoints...
}
```

### Frontend Hook Template

```typescript
// frontend/src/features/projects/api/wordpress.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'

interface TestConnectionRequest {
  projectId: number
}

interface TestConnectionResponse {
  success: boolean
  connectionStatus: 'connected' | 'error'
  errorMessage?: string
  siteInfo?: any
  responseTimeMs: number
}

export function useTestWordPressConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TestConnectionRequest) => {
      const response = await api.post<TestConnectionResponse>(
        '/wordpress/test-connection',
        data
      )
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.list()
      })
    },
  })
}
```

### Component Template

```typescript
// frontend/src/features/projects/components/ConnectionStatusBadge.tsx

import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react'
import styles from './ConnectionStatusBadge.module.css'

type ConnectionStatus = 'connected' | 'error' | 'not_configured' | 'testing'

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
  errorMessage?: string
}

export function ConnectionStatusBadge({
  status,
  errorMessage
}: ConnectionStatusBadgeProps) {
  const config = {
    connected: {
      icon: CheckCircle,
      label: 'Conectado',
      variant: 'success' as const,
    },
    // ... other statuses
  }

  const { icon: Icon, label, variant } = config[status]

  return (
    <div className={`${styles.badge} ${styles[variant]}`} title={errorMessage}>
      <Icon size={16} />
      <span>{label}</span>
    </div>
  )
}
```

## Import/Export Patterns

### Barrel Exports

```typescript
// frontend/src/features/projects/components/index.ts

export { ProjectCard } from './ProjectCard'
export { ProjectForm } from './ProjectForm'
export { ProjectCreateWizard } from './ProjectCreateWizard'
export { ProjectManageModal } from './ProjectManageModal'
export { ConnectionStatusBadge } from './ConnectionStatusBadge'
export { ConnectionTestResult } from './ConnectionTestResult'
export { ConnectionHistoryTab } from './ConnectionHistoryTab'
export { ConnectionLogItem } from './ConnectionLogItem'
```

```typescript
// frontend/src/features/projects/api/index.ts

export { useProjects } from './useProjects'
export { useProject } from './useProject'
export { useProjectStats } from './useProjectStats'
export { useCreateProject, useUpdateProject, useDeleteProject } from './mutations'
export {
  useTestWordPressConnection,
  useInstallWordPressPlugin,
  useConnectionLogs
} from './wordpress'
```

## Git Workflow

### Branch Naming
```
004-meus-blogs
├── 004-meus-blogs/backend-wordpress-integration
├── 004-meus-blogs/database-migration
├── 004-meus-blogs/frontend-wizard
├── 004-meus-blogs/frontend-manage-modal
├── 004-meus-blogs/plugin-installation
├── 004-meus-blogs/filters-and-logs
└── 004-meus-blogs/polish
```

### Commit Messages
```
feat(wordpress): add encryption utility for credentials
feat(wordpress): implement test connection endpoint
feat(projects): add connection status badge component
feat(projects): update wizard with connection test step
fix(wordpress): handle timeout errors correctly
test(wordpress): add unit tests for encryption util
docs(wordpress): add API endpoint documentation
```

## Testing File Structure

```
backend/
├── src/
│   └── modules/
│       └── wordpress/
│           ├── wordpress.controller.spec.ts
│           ├── wordpress.service.spec.ts
│           └── utils/
│               └── encryption.util.spec.ts
└── test/
    └── wordpress.e2e-spec.ts

frontend/
└── src/
    └── features/
        └── projects/
            ├── components/
            │   ├── ConnectionStatusBadge.test.tsx
            │   ├── ProjectCard.test.tsx
            │   └── wizard-steps/
            │       └── ConnectionTestStep.test.tsx
            └── api/
                └── wordpress.test.ts
```

## Build Output Structure

```
backend/dist/
└── modules/
    └── wordpress/
        ├── wordpress.module.js
        ├── wordpress.controller.js
        ├── wordpress.service.js
        ├── dto/
        └── utils/

frontend/dist/
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── index.html
```

## Size Estimates

### Backend
- `wordpress.module.ts`: ~50 lines
- `wordpress.controller.ts`: ~80 lines
- `wordpress.service.ts`: ~400 lines
- `encryption.util.ts`: ~100 lines
- DTOs: ~30 lines each
- Tests: ~200 lines each

**Total Backend**: ~1,500 lines

### Frontend
- `ProjectManageModal.tsx`: ~300 lines
- `ProjectCreateWizard.tsx` (updated): ~400 lines
- `ConnectionTestStep.tsx`: ~150 lines
- `ConnectionStatusBadge.tsx`: ~80 lines
- `wordpress.ts` (API hooks): ~200 lines
- Tests: ~150 lines each

**Total Frontend**: ~2,000 lines

### Total Project Addition
**Estimated ~3,500 lines of code**
