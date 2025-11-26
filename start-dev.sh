#!/bin/bash

# Script para iniciar todo o ambiente de desenvolvimento
# Backend (Docker) + Frontend (npm run dev)

echo "🚀 XTYL Creativity Machine - Ambiente de Desenvolvimento"
echo "=========================================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Iniciar backend com Docker (sem frontend Docker para development)
echo -e "${BLUE}📦 Iniciando serviços backend (Docker)...${NC}"
docker compose up -d db redis minio backend celery-worker

echo ""
echo -e "${GREEN}✅ Aguardando serviços ficarem prontos...${NC}"
sleep 5

# 2. Verificar status dos containers
echo ""
echo -e "${BLUE}🔍 Status dos containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep xtyl

# 3. Verificar se precisa aplicar migrações
echo ""
echo -e "${BLUE}🗄️  Verificando migrações do banco de dados...${NC}"
if docker exec xtyl-creativity-machine-db-1 psql -U xtyl -d xtyl_db -c "\d node_outputs" &>/dev/null; then
    echo -e "${GREEN}✅ Migrações já aplicadas${NC}"
else
    echo -e "${YELLOW}⚠️  Aplicando migração 009...${NC}"
    docker cp backend/migrations/009_enhance_workflow_tables.sql xtyl-creativity-machine-db-1:/tmp/009.sql
    docker exec xtyl-creativity-machine-db-1 psql -U xtyl -d xtyl_db -f /tmp/009.sql
    echo -e "${GREEN}✅ Migração aplicada${NC}"
fi

# 4. Iniciar frontend
echo ""
echo -e "${BLUE}🌐 Iniciando frontend...${NC}"
echo ""
echo -e "${GREEN}URLs disponíveis:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}⚡ Iniciando servidor de desenvolvimento do frontend...${NC}"
echo ""

cd frontend && npm run dev
