#!/bin/bash

# Repository Cleanup Script
# Removes legacy Python/Next.js code safely

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              XTYL Repository Cleanup Script                    ║"
echo "║         Remove Legacy Python/Next.js Code                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "bunfig.toml" ]; then
    echo -e "${RED}❌ Error: bunfig.toml not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Current Repository Size:${NC}"
du -sh . | awk '{print "   Total: " $1}'
[ -d "backend" ] && du -sh backend/ | awk '{print "   Backend (Python): " $1}'
[ -d "frontend" ] && du -sh frontend/ | awk '{print "   Frontend (Next.js): " $1}'
echo ""

# Confirmation
echo -e "${YELLOW}⚠️  This will DELETE the following:${NC}"
echo "   - backend/ (Python/FastAPI)"
echo "   - frontend/ (Next.js)"
echo "   - requirements.txt"
echo "   - pnpm-workspace.yaml, pnpm-lock.yaml"
echo "   - __pycache__/, .next/, .pytest_cache/"
echo ""
echo -e "${YELLOW}The code will remain in Git history.${NC}"
echo ""

read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting cleanup...${NC}"
echo ""

# Phase 1: Create backup branch
echo -e "${BLUE}📦 Phase 1: Creating backup branch...${NC}"
git add .
git commit -m "chore: pre-cleanup checkpoint" || echo "Nothing to commit"
git checkout -b backup-before-cleanup 2>/dev/null || echo "Branch already exists"
git checkout 032-full-stack-migration
echo -e "${GREEN}✅ Backup branch created: backup-before-cleanup${NC}"
echo ""

# Phase 2: Remove legacy code
echo -e "${BLUE}🗑️  Phase 2: Removing legacy code...${NC}"

# Backend
if [ -d "backend" ]; then
    echo "   Removing backend/ (Python/FastAPI)..."
    rm -rf backend/
    echo -e "${GREEN}   ✅ Removed backend/${NC}"
fi

# Frontend
if [ -d "frontend" ]; then
    echo "   Removing frontend/ (Next.js)..."
    rm -rf frontend/
    echo -e "${GREEN}   ✅ Removed frontend/${NC}"
fi

# Python files
[ -f "requirements.txt" ] && rm -f requirements.txt && echo -e "${GREEN}   ✅ Removed requirements.txt${NC}"
[ -d "__pycache__" ] && rm -rf __pycache__/ && echo -e "${GREEN}   ✅ Removed __pycache__/${NC}"
[ -d ".pytest_cache" ] && rm -rf .pytest_cache/ && echo -e "${GREEN}   ✅ Removed .pytest_cache/${NC}"

# Next.js files
[ -d ".next" ] && rm -rf .next/ && echo -e "${GREEN}   ✅ Removed .next/${NC}"
[ -f "next.config.js" ] && rm -f next.config.js && echo -e "${GREEN}   ✅ Removed next.config.js${NC}"

# pnpm files
[ -f "pnpm-workspace.yaml" ] && rm -f pnpm-workspace.yaml && echo -e "${GREEN}   ✅ Removed pnpm-workspace.yaml${NC}"
[ -f "pnpm-lock.yaml" ] && rm -f pnpm-lock.yaml && echo -e "${GREEN}   ✅ Removed pnpm-lock.yaml${NC}"

echo ""

# Phase 3: Clean dependencies
echo -e "${BLUE}📦 Phase 3: Cleaning dependencies...${NC}"
echo "   Removing old node_modules..."
find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
echo -e "${GREEN}   ✅ Removed all node_modules${NC}"

echo "   Reinstalling with Bun..."
bun install
echo -e "${GREEN}   ✅ Dependencies reinstalled${NC}"
echo ""

# Phase 4: Commit cleanup
echo -e "${BLUE}💾 Phase 4: Committing cleanup...${NC}"
git add .
git commit -m "chore: remove legacy Python/Next.js code

Removed:
- backend/ (Python/FastAPI)
- frontend/ (Next.js)
- Legacy config files (pnpm, next.config, requirements.txt)
- Build caches (__pycache__, .next/, .pytest_cache/)

System now runs 100% on Bun + TypeScript!

New stack:
- Backend: NestJS + Bun
- Frontend: Vite + React 19 + Bun
- Monorepo: Turborepo + Bun workspaces

Backup available at: backup-before-cleanup branch"

echo -e "${GREEN}✅ Changes committed${NC}"
echo ""

# Phase 5: Final stats
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    CLEANUP COMPLETE! 🎉                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}📊 New Repository Size:${NC}"
du -sh . | awk '{print "   Total: " $1}'
echo ""
echo -e "${GREEN}✅ Repository organized and ready for production!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "   1. Review changes: git show"
echo "   2. Run validations: ./apps/api/scripts/run-all-validations.sh"
echo "   3. Test dev server: bun run dev"
echo "   4. If all OK: git push origin 032-full-stack-migration"
echo ""
echo -e "${BLUE}💡 Tip: Old code still available at 'backup-before-cleanup' branch${NC}"
echo ""
