#!/bin/bash
# ============================================
# Master Validation Script - Phase 5 (US6)
# Runs all data validation scripts in sequence
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   Master Validation Script - Phase 5 (US6)           ║${NC}"
echo -e "${BOLD}${CYAN}║   Validates data continuity for migration            ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════╝${NC}\n"

# Check environment
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable not set${NC}"
    echo -e "${YELLOW}Load your .env file:${NC} source .env"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL is set"
echo ""

# Initialize result tracking
ALL_PASSED=true

# ============================================
# Validation 1: Data Counts (T092)
# ============================================
echo -e "${BOLD}${CYAN}[1/3] Running Data Count Validation...${NC}\n"

if bun --bun "$SCRIPT_DIR/validate-data.ts"; then
    echo -e "\n${GREEN}✓ Data count validation passed${NC}\n"
else
    echo -e "\n${RED}✗ Data count validation failed${NC}\n"
    ALL_PASSED=false
fi

sleep 2

# ============================================
# Validation 2: JSONB Fields (T094)
# ============================================
echo -e "${BOLD}${CYAN}[2/3] Running JSONB Field Validation...${NC}\n"

if bun --bun "$SCRIPT_DIR/validate-jsonb.ts"; then
    echo -e "\n${GREEN}✓ JSONB validation passed${NC}\n"
else
    echo -e "\n${RED}✗ JSONB validation failed${NC}\n"
    ALL_PASSED=false
fi

sleep 2

# ============================================
# Validation 3: RLS Policies (T159)
# ============================================
echo -e "${BOLD}${CYAN}[3/3] Running RLS Policy Validation...${NC}\n"

if bun --bun "$SCRIPT_DIR/validate-rls.ts"; then
    echo -e "\n${GREEN}✓ RLS validation passed${NC}\n"
else
    echo -e "\n${RED}✗ RLS validation failed${NC}\n"
    ALL_PASSED=false
fi

sleep 1

# ============================================
# Summary
# ============================================
echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                    Validation Summary                  ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════╝${NC}\n"

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}${BOLD}✅ ALL VALIDATIONS PASSED${NC}"
    echo -e "${GREEN}The new backend is ready for migration cutover.${NC}\n"

    echo -e "${CYAN}Next steps:${NC}"
    echo -e "  1. Review cutover checklist: specs/032-full-stack-migration/cutover-checklist.md"
    echo -e "  2. Schedule maintenance window (2 hours)"
    echo -e "  3. Run validation again during cutover"
    echo -e "  4. Deploy new system"
    echo ""

    exit 0
else
    echo -e "${RED}${BOLD}❌ SOME VALIDATIONS FAILED${NC}"
    echo -e "${RED}Review errors above and fix issues before proceeding.${NC}\n"

    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  • Check DATABASE_URL points to correct database"
    echo -e "  • Verify database schema is up-to-date (run migrations)"
    echo -e "  • Check RLS policies are enabled on critical tables"
    echo -e "  • Review error messages for specific issues"
    echo ""

    exit 1
fi
