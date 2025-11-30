# Quickstart: V1 Polish

**Feature**: 016-v1-polish | **Date**: 2025-11-30

## Pré-requisitos

- Ambiente de desenvolvimento configurado (backend + frontend rodando)
- Banco de dados com migrações atualizadas
- Acesso a um projeto com imagens anexadas para teste

## Configuração Inicial

### 1. Aplicar Migração

```bash
# Navegar para backend
cd backend

# Aplicar migração
psql $DATABASE_URL -f migrations/017_v1_polish_refining.sql
```

### 2. Configurar Modelo de Prompt Enrichment (Admin)

1. Acessar painel admin: `/admin/models`
2. Na seção "Model Configuration", verificar que `prompt_enrichment` está configurado
3. Default recomendado: `anthropic/claude-3-haiku` (rápido e econômico)

---

## Testando as Features

### Feature 1: Ações de Imagens Anexadas

**Testar Visualização:**
1. Abrir um documento com imagens anexadas
2. Clicar no ícone de olho (👁) em uma imagem
3. **Esperado**: Modal abre com imagem em tamanho completo + zoom

**Testar Desanexação:**
1. Clicar no ícone de desanexar (🔗) em uma imagem
2. **Esperado**: Imagem removida da lista, ainda disponível em Visual Assets

**Testar Exclusão Permanente:**
1. Clicar no ícone de lixeira (🗑) em uma imagem
2. **Esperado**: Dialog de confirmação aparece
3. Confirmar exclusão
4. **Esperado**: Imagem removida da lista E do Visual Assets

### Feature 2: Nova Criação Instantânea

**Testar:**
1. Na home/kanban do projeto, clicar em "Nova Criação"
2. **Esperado**: Feedback visual imediato (<200ms)
3. **Esperado**: Navegação para página do documento (pode mostrar skeleton)
4. **Esperado**: Documento carrega quando criação completa

**Testar Debounce:**
1. Clicar rapidamente múltiplas vezes em "Nova Criação"
2. **Esperado**: Apenas um documento é criado

### Feature 3: Qualidade do Refining

**Testar:**
1. Gerar uma imagem de alta qualidade
2. Aplicar refinamento: "Add more contrast"
3. Aplicar segundo refinamento: "Make colors warmer"
4. Aplicar terceiro refinamento: "Add subtle vignette"
5. **Esperado**: Qualidade visual mantida em todas as versões
6. **Verificar**: `refinement_history` contém todas as instruções
7. **Verificar**: `original_image_id` aponta para a primeira imagem

### Feature 4: Gerador de Prompts

**Testar via Chat:**
1. No chat do projeto, solicitar: "Crie uma imagem de um banner para redes sociais"
2. **Esperado**: Imagem gerada é de alta qualidade
3. **Verificar** (logs do backend): Prompt foi enriquecido antes da geração

**Testar com Contexto de Marca:**
1. Configurar cores de marca no projeto (ex: #1a365d, #ed8936)
2. Solicitar geração de imagem via chat
3. **Esperado**: Imagem reflete as cores da marca

**Testar sem Contexto de Marca:**
1. Usar projeto sem cores/tipografia configuradas
2. Solicitar geração de imagem
3. **Esperado**: Template padrão aplicado, imagem ainda de qualidade

---

## Verificações de Qualidade

### Performance

| Métrica | Target | Como Medir |
|---------|--------|------------|
| Feedback "Nova Criação" | <200ms | Chrome DevTools → Performance |
| Operações de imagem | <3s | Observação visual |
| Enriquecimento de prompt | <5s | Logs do backend |

### Funcionalidade

- [ ] Visualização de imagem funciona com zoom
- [ ] Desanexação mantém imagem no storage
- [ ] Exclusão remove do storage E do banco
- [ ] Confirmação exibida antes de exclusão
- [ ] Debounce previne múltiplas criações
- [ ] Skeleton exibido durante criação
- [ ] Refinamento usa imagem original
- [ ] Histórico de refinamento persiste
- [ ] Prompt é enriquecido automaticamente
- [ ] Contexto de marca é aplicado quando disponível

---

## Troubleshooting

### "Imagem não encontrada" ao visualizar

**Causa**: Arquivo removido do R2 mas registro ainda existe no banco
**Solução**: Executar cleanup de registros órfãos ou recriar imagem

### Criação de documento lenta

**Causa**: Latência de rede com Supabase
**Solução**: Verificar conexão, usar navegação otimista (deve funcionar mesmo assim)

### Prompt não está sendo enriquecido

**Causa**: Modelo `prompt_enrichment` não configurado ou API key inválida
**Solução**: Verificar configuração em `/admin/models` e logs de erro

### Qualidade de imagem ainda degrada

**Causa**: `original_image_id` não está sendo definido corretamente
**Verificação**: Query no banco: `SELECT id, original_image_id FROM documents WHERE media_type='image'`
**Solução**: Verificar lógica no endpoint `/image-generation/refine`

---

## Endpoints para Debug

```bash
# Verificar configuração de modelos
curl -X GET http://localhost:8000/admin/models/config \
  -H "Authorization: Bearer $TOKEN"

# Testar enriquecimento de prompt manualmente
curl -X POST http://localhost:8000/prompts/enrich \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a banner",
    "project_id": "your-project-id"
  }'

# Verificar histórico de refinamento
curl -X GET http://localhost:8000/documents/{document_id} \
  -H "Authorization: Bearer $TOKEN" | jq '.refinement_history'
```
