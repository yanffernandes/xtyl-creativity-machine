#!/bin/bash
# ============================================
# Migration script: pnpm → Bun
# Migrates the monorepo from pnpm to Bun
# ============================================

set -e

echo "🚀 Migrating xtyl-creativity-machine from pnpm to Bun..."
echo ""

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✓ Bun version: $(bun --version)"
echo ""

# Step 1: Clean old artifacts
echo "🧹 Cleaning old pnpm artifacts..."
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf .turbo
rm -rf apps/*/.turbo
rm -rf packages/*/.turbo
rm -f pnpm-lock.yaml

# Remove pnpm-workspace.yaml (replaced by bunfig.toml)
if [ -f "pnpm-workspace.yaml" ]; then
    echo "   Removing pnpm-workspace.yaml (replaced by bunfig.toml)"
    rm -f pnpm-workspace.yaml
fi

echo "✓ Cleanup complete"
echo ""

# Step 2: Install with Bun
echo "📦 Installing dependencies with Bun..."
bun install

echo "✓ Dependencies installed"
echo ""

# Step 3: Verify workspaces
echo "🔍 Verifying workspace setup..."
if [ -d "node_modules/@repo" ]; then
    echo "✓ Workspace packages linked correctly"
else
    echo "⚠️  Warning: Workspace packages may not be linked. Check bunfig.toml"
fi
echo ""

# Step 4: Run typecheck
echo "🔎 Running typecheck across all workspaces..."
bun run typecheck

echo "✓ Typecheck passed"
echo ""

# Step 5: Test build
echo "🏗️  Testing build..."
bun run build

echo "✓ Build successful"
echo ""

echo "✅ Migration complete! Your monorepo is now using Bun 🚀"
echo ""
echo "Next steps:"
echo "  1. Start dev servers: bun run dev"
echo "  2. Build for production: bun run build"
echo "  3. Run tests: bun run test"
echo ""
echo "Performance improvements:"
echo "  - Install speed: ~10x faster"
echo "  - Dev server boot: ~3-4x faster"
echo "  - TypeScript execution: native (no compilation)"
echo ""
