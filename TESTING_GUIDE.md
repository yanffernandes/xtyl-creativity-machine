# 🧪 Guia de Testes - Sistema Migrado

**Branch:** `032-full-stack-migration`  
**Status:** 95% - Pronto para testes

---

## 🚀 Quick Start (5 minutos)

### 1. Prepare o Ambiente

```bash
# Clone/Pull latest
git checkout 032-full-stack-migration
git pull origin 032-full-stack-migration

# Install dependencies (Bun)
bun install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials:
# - DATABASE_URL
# - SUPABASE_URL, SUPABASE_ANON_KEY
# - OPENROUTER_API_KEY
# - FAL_API_KEY
# - CLOUDFLARE_R2 credentials
# - REDIS_URL
```

### 2. Start Services

```bash
# Option 1: Usar Turborepo (recommended)
bun run dev

# Option 2: Individual
# Terminal 1: Redis
docker-compose -f docker-compose.dev.yml up redis

# Terminal 2: API (NestJS + Bun)
cd apps/api && bun --bun nest start --watch

# Terminal 3: Frontend (Vite + React 19)
cd apps/web && bun run dev
```

### 3. Acesse o Sistema

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs (Swagger)
- **Health:** http://localhost:3000/health

---

## ✅ Validações Automáticas

### Rodar Todas as Validações

```bash
# Executar suite completa
./apps/api/scripts/run-all-validations.sh
```

### Validações Individuais

```bash
# 1. Data Validation (T092-T097)
bun run apps/api/scripts/validate-data.ts

# 2. API Smoke Tests (T091)
export TEST_USER_TOKEN="seu-token-aqui"
bun run apps/api/scripts/smoke-test.ts

# 3. RLS Verification (T159)
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="senha"
bun run apps/api/scripts/verify-rls.ts
```

---

## 🧪 Testes Manuais - Fluxos Críticos

### 1. Auth & Setup

- [ ] **Signup:** Criar nova conta
- [ ] **Login:** Email + senha
- [ ] **Logout:** Deslogar
- [ ] **Password Reset:** Solicitar reset

### 2. Workspace & Projects

- [ ] **Create Workspace:** Novo workspace
- [ ] **Create Project:** Novo projeto
- [ ] **Project Settings:** Editar configurações
- [ ] **Invite Member:** Convidar usuário

### 3. Image Studio (NOVO!)

**Route:** `/workspace/$id/project/$projectId/studio`

- [ ] **Text-to-Image:** Gerar imagem com prompt
- [ ] **Concept Selection:** Escolher 1 dos 88 conceitos criativos
- [ ] **Model Selection:** Trocar modelo de IA
- [ ] **Variations:** Gerar 2-4 variações
- [ ] **Edit Mode:** Editar imagem com brush (inpainting)
- [ ] **Adjust Mode:** Remove BG, upscale, enhance
- [ ] **Save Image:** Salvar no projeto
- [ ] **Download:** Baixar imagem

### 4. Workflow Builder

**Routes:** `/workspace/$id/project/$projectId/workflows`

- [ ] **Create Workflow:** Novo workflow
- [ ] **Add Nodes:** Arrastar nodes (8 tipos)
- [ ] **Connect Nodes:** Conectar edges
- [ ] **Configure Node:** Configurar parâmetros
- [ ] **Variables:** Usar `{{nodeId.field}}` syntax
- [ ] **Execute Workflow:** Rodar workflow
- [ ] **SSE Streaming:** Ver progresso real-time
- [ ] **View Results:** Ver outputs

### 5. Chat

- [ ] **New Conversation:** Nova conversa
- [ ] **Send Message:** Enviar mensagem
- [ ] **SSE Streaming:** Ver resposta streaming
- [ ] **Tool Calls:** AI usa ferramentas
- [ ] **Document Context:** Anexar documentos
- [ ] **Memory:** Sistema lembra conversas

### 6. Documents & Files

- [ ] **Upload File:** Fazer upload de arquivo
- [ ] **Create Folder:** Organizar em pastas
- [ ] **Share Document:** Gerar link público (`/shared/$token`)
- [ ] **Document Versions:** Ver histórico de versões
- [ ] **Search:** Buscar documentos

### 7. Campaigns & Copy

- [ ] **Create Campaign:** Nova campanha
- [ ] **Add Copy:** Adicionar copy à biblioteca
- [ ] **Link Assets:** Vincular imagens/documentos
- [ ] **Export:** Exportar campanha

---

## 🔍 O que Verificar

### Performance

- [ ] **Page Load:** < 2 segundos
- [ ] **API Response:** < 200ms (GET)
- [ ] **Image Generation:** Streaming funciona
- [ ] **Workflow Execution:** Progress updates real-time

### Design System

- [ ] **Ethereal Blue:** Cor primária #5B8DEF
- [ ] **Glassmorphism:** Efeitos de vidro nos cards
- [ ] **Animations:** Transições suaves (Framer Motion)
- [ ] **Dark Mode:** Alternar tema funciona
- [ ] **Responsive:** Mobile/tablet/desktop

### Data Integrity

- [ ] **No Data Loss:** Todos dados antigos acessíveis
- [ ] **JSONB Fields:** Workflows/metadata funcionam
- [ ] **R2 Storage:** Imagens carregam
- [ ] **pgvector:** Busca de memórias funciona

---

## 🐛 Reporting Bugs

Se encontrar bugs, reporte com:

```
**Environment:**
- Browser: [Chrome 120]
- OS: [macOS 14]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected:** [what should happen]
**Actual:** [what happened]

**Console Errors:** [paste from DevTools]
**Screenshots:** [if applicable]
```

---

## 📊 Checklist de Aprovação

### Must Pass (Blocker)

- [ ] ✅ All validation scripts pass
- [ ] ✅ Login/signup works
- [ ] ✅ Create project works
- [ ] ✅ Image Studio generates images
- [ ] ✅ Workflows execute
- [ ] ✅ Chat works with SSE
- [ ] ✅ No TypeScript errors
- [ ] ✅ No console errors (critical)

### Should Pass (High Priority)

- [ ] ✅ All CRUD operations work
- [ ] ✅ File uploads work
- [ ] ✅ Shared documents accessible
- [ ] ✅ Performance acceptable
- [ ] ✅ Design system consistent

### Nice to Have (Polish)

- [ ] ✅ All animations smooth
- [ ] ✅ Mobile responsive
- [ ] ✅ Accessibility (WCAG AA)
- [ ] ✅ SEO metadata

---

## 🚀 Ready for Production?

**Yes if:**
- ✅ All "Must Pass" items checked
- ✅ All validation scripts pass
- ✅ No P0/P1 bugs found
- ✅ Performance acceptable
- ✅ Data validation 100%

**Follow cutover checklist:**
`specs/032-full-stack-migration/CUTOVER_CHECKLIST.md`

---

## 📞 Need Help?

- **Validation Scripts:** `apps/api/scripts/README.md`
- **Cutover Guide:** `specs/032-full-stack-migration/CUTOVER_CHECKLIST.md`
- **Phase 6 Completion:** `specs/032-full-stack-migration/PHASE6_COMPLETION.md`
- **Tasks List:** `specs/032-full-stack-migration/tasks.md`

---

**Happy Testing! 🎉**
