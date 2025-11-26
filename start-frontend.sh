#!/bin/bash

# Script para iniciar o frontend em modo desenvolvimento
# Autor: Claude Code

echo "🚀 Iniciando frontend em modo desenvolvimento..."
echo ""

# Verifica se está na pasta correta
if [ ! -d "frontend" ]; then
    echo "❌ Erro: Execute este script da pasta raiz do projeto"
    exit 1
fi

# Vai para a pasta frontend
cd frontend

# Verifica se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚠️  Criando .env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
fi

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

echo ""
echo "✅ Ambiente configurado!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000"
echo ""
echo "▶️  Iniciando servidor de desenvolvimento..."
echo ""

# Inicia o servidor de desenvolvimento
npm run dev
