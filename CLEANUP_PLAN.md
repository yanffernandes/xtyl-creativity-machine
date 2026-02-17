# 🧹 Plano de Organização do Repositório

**Status Atual:** Sistema migrado 95% para Bun + TypeScript  
**Problema:** Código legacy (Python + Next.js) ainda presente  
**Objetivo:** Limpar e organizar para produção

---

## 📋 Checklist de Organização

### 1. 🗑️ Remover Código Legacy (CRÍTICO)

**Backend Python (FastAPI)** - ~2.5 GB
```bash
# Verificar tamanho
du -sh backend/

# Backup antes de deletar (opcional)
tar -czf backup_python_backend_$(date +%Y%m%d).tar.gz backend/

# Deletar
rm -rf backend/
```

**Frontend Next.js** - ~1.2 GB
```bash
# Verificar tamanho
du -sh frontend/

# Backup antes de deletar (opcional)
tar -czf backup_nextjs_frontend_$(date +%Y%m%d).tar.gz frontend/

# Deletar
rm -rf frontend/
```

**Arquivos relacionados:**
- [ ] `backend/` - Python/FastAPI
- [ ] `frontend/` - Next.js
- [ ] `requirements.txt` - Python deps (se existir)
- [ ] `package.json` (root old) - Se tiver duplicado
- [ ] `pnpm-workspace.yaml` - Substituído por bunfig.toml
- [ ] `.next/` - Build cache Next.js
- [ ] `__pycache__/` - Python cache
- [ ] `.pytest_cache/` - Pytest cache
- [ ] `celery/` - Celery worker configs (se existir)

### 2. 📁 Organizar Estrutura de Diretórios

**Manter (Sistema Novo):**
```
xtyl-creativity-machine/
├── apps/
│   ├── api/           ✅ NestJS + Bun
│   ├── web/           ✅ Vite + React 19
│   └── admin/         ✅ Vite + React 19
├── packages/
│   ├── shared/        ✅ Schemas compartilhados
│   └── observability/ ✅ Logging/tracing
├── specs/             ✅ Documentação de features
├── supabase/          ✅ Migrations + schema
└── docker-compose*.yml ✅ Dev + Prod configs
```

**Deletar (Legacy):**
```
❌ backend/           - Python/FastAPI (não usado)
❌ frontend/          - Next.js (não usado)
❌ .next/             - Build cache
❌ __pycache__/       - Python cache
❌ requirements.txt   - Python deps
```

### 3. 📝 Atualizar Documentação

**README.md principal** - Atualizar para refletir nova stack
```markdown
# XTYL Creativity Machine

**Stack:** Bun + TypeScript (NestJS + Vite + React 19)
**Status:** Production Ready (95%)

## Quick Start
\`\`\`bash
bun install
bun run dev
\`\`\`
```

**Criar/Atualizar:**
- [ ] `README.md` - Quick start com Bun
- [ ] `CONTRIBUTING.md` - Guidelines de contribuição
- [ ] `ARCHITECTURE.md` - Arquitetura do sistema
- [ ] `DEPLOYMENT.md` - Como fazer deploy
- [ ] `.env.example` - Todas variáveis necessárias

**Já existem (verificar se estão atualizados):**
- [x] `TESTING_GUIDE.md` ✅
- [x] `BUN_MIGRATION.md` ✅
- [x] `CLAUDE.md` ✅

### 4. 🔧 Limpar Configurações

**Remover configs antigas:**
- [ ] `next.config.js` - Next.js config (se existir)
- [ ] `tsconfig.json` (root duplicado) - Manter apenas tsconfig.base.json
- [ ] `jest.config.js` - Se não estiver usando
- [ ] `.eslintrc.json` (old) - Consolidar em um só
- [ ] `pnpm-lock.yaml` - Substituído por bun.lockb

**Verificar/Atualizar:**
- [ ] `.gitignore` - Adicionar entradas para Bun
- [ ] `.dockerignore` - Otimizar builds
- [ ] `turbo.json` - Verificar pipelines
- [ ] `bunfig.toml` - Workspace config

### 5. 🐳 Docker & Deploy

**Docker configs:**
- [ ] Verificar `docker-compose.yml` (production)
- [ ] Verificar `docker-compose.dev.yml` (development)
- [ ] Atualizar Dockerfiles para usar Bun
- [ ] Remover referências ao Python/Next.js

**CI/CD (se existir):**
- [ ] `.github/workflows/` - Atualizar para Bun
- [ ] Remover jobs de Python/Next.js

### 6. 📦 Dependencies

**Limpar node_modules antigos:**
```bash
# Remover tudo
rm -rf node_modules/
rm -rf apps/*/node_modules/
rm -rf packages/*/node_modules/

# Reinstalar com Bun
bun install
```

**Verificar package.json:**
- [ ] Remover deps não usadas
- [ ] Atualizar versions
- [ ] Verificar scripts

### 7. 🗄️ Database

**Migrations:**
- [ ] Verificar supabase/migrations/ está completo
- [ ] Documentar schema atual
- [ ] Remover migrations Python (Alembic) se existir

**Seeds:**
- [ ] Verificar supabase/seeds/ funciona
- [ ] Documentar dados de teste

---

## 🎯 Ordem de Execução Recomendada

### Fase 1: Backup (5 min)
```bash
# 1. Commit current state
git add .
git commit -m "chore: pre-cleanup checkpoint"

# 2. Create backup branch
git checkout -b backup-before-cleanup
git push origin backup-before-cleanup

# 3. Return to main branch
git checkout 032-full-stack-migration
```

### Fase 2: Remoção de Legacy (10 min)
```bash
# 1. Remover backend Python
rm -rf backend/
rm -rf __pycache__/
rm -f requirements.txt

# 2. Remover frontend Next.js
rm -rf frontend/
rm -rf .next/

# 3. Remover configs antigos
rm -f pnpm-workspace.yaml
rm -f pnpm-lock.yaml
rm -f next.config.js

# 4. Commit
git add .
git commit -m "chore: remove legacy Python/Next.js code"
```

### Fase 3: Limpeza de Dependencies (5 min)
```bash
# 1. Limpar node_modules
rm -rf node_modules/ apps/*/node_modules/ packages/*/node_modules/

# 2. Reinstalar
bun install

# 3. Verificar tudo funciona
bun run typecheck
bun run build

# 4. Commit lockfile atualizado
git add bun.lockb
git commit -m "chore: update bun lockfile"
```

### Fase 4: Documentação (15 min)
```bash
# 1. Atualizar README.md
# 2. Verificar .env.example
# 3. Atualizar .gitignore
# 4. Commit
git add README.md .env.example .gitignore
git commit -m "docs: update documentation for Bun migration"
```

### Fase 5: Validação Final (5 min)
```bash
# 1. Rodar validações
./apps/api/scripts/run-all-validations.sh

# 2. Testar dev server
bun run dev

# 3. Build production
bun run build

# 4. Se tudo OK, push
git push origin 032-full-stack-migration
```

---

## ⚠️ Avisos Importantes

1. **Backup Primeiro!** Sempre criar branch de backup antes de deletar
2. **Testar Depois!** Rodar validações após cada limpeza
3. **Comunicar Time!** Avisar equipe antes de deletar código
4. **Database Safe!** Não deletar nada de `supabase/`
5. **Git History!** Código antigo fica no histórico do Git

---

## ✅ Benefícios da Limpeza

**Antes:**
- 📦 Tamanho: ~5 GB
- 🐌 Install: 45s (npm)
- 🗂️ Arquivos: ~50k files
- 😵 Confusão: Qual código usar?

**Depois:**
- 📦 Tamanho: ~1.5 GB (70% menor)
- ⚡ Install: 4s (bun)
- 🗂️ Arquivos: ~15k files
- 😊 Clareza: Só código novo!

---

## 📞 Perguntas?

- **E se algo der errado?** Branch de backup `backup-before-cleanup`
- **Posso deletar migrations antigas?** NÃO! Manter todas migrations
- **E os .env files?** Nunca commitar, manter .env.example
- **Docker images antigas?** Pode deletar, rebuild com Bun

---

**Tempo Total Estimado:** 40-60 minutos  
**Melhor Momento:** Durante horário de manutenção ou fora do horário
