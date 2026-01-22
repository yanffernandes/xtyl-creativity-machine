# Feature 028: Agency-Scale Studio Flow + Brush Selection

## Resumo Executivo

Expandir o fluxo de producao em massa para agencias, conectando Kanban (copies) ao Estudio Visual, criando biblioteca de textos reutilizaveis, aplicando contexto visual manual no batch, e adicionando selecao de areas da imagem com pincel (mask) para refinamentos mais precisos.

## Problema

Hoje:
- O Estudio Visual gera imagens a partir de prompt manual e documentos recentes, mas nao conversa com o Kanban (onde ficam as copies).
- O usuario consegue selecionar assets visuais no UI, mas essa selecao nao influencia a geracao no batch.
- Nao existe biblioteca de copy reutilizavel nem fluxo de geracao em lote por campanha/canal.
- Falta versionamento claro de copy e imagem para iteracao em massa.
- Nao existe selecao por pincel para refinar apenas uma parte da imagem (ex: trocar fundo ou elemento).

## Solucao

Criar um fluxo de producao para agencia com:
- Selecao multipla de copies no Kanban e geracao em lote no Estudio Visual.
- Biblioteca de copy (colecoes reutilizaveis) com acao direta para gerar variacoes.
- Contexto visual manual aplicado no batch (assets selecionados + modo de uso).
- Enriquecimento de prompt no batch com brand context (cores, tipografia, voz).
- Pacotes de campanha (copies + imagens + formatos) para producao em massa.
- Metadados e tags para filtro por canal/campanha/objetivo.
- Versionamento simples de copy e imagem.
- Pincel de selecao (mask) para refinar areas especificas de uma imagem.

## Escopo

### Incluido
- Multi-selecao de cards no Kanban com acao "Gerar imagens".
- Biblioteca de copy: colecoes e selecao rapida para uso como prompt.
- Aplicar visual context selecionado no batch (assets + modo).
- Enriquecimento de prompt no batch com brand context.
- Pacotes de campanha (estrutura basica: nome, canal, formatos, copies, imagens).
- Metadados: canal, campanha, objetivo, formato, tags.
- Versionamento basico de copy e imagem (historico + restore).
- Pincel/mask para selecionar area da imagem e refinar apenas aquela regiao.

### Excluido
- Aprovacao de equipe (review/approval).
- Fila de governanca/custos.
- Editor completo de imagem (crop, filtros, etc.).

## User Stories

### US-01: Gerar imagens a partir de copies do Kanban
**Como** usuario de agencia
**Quero** selecionar varias copies no Kanban e gerar imagens em lote
**Para** produzir campanhas em escala

**Criterios de Aceite:**
- [ ] Selecionar multiplos cards no Kanban (maximo 20 copies por batch)
- [ ] Acao "Gerar imagens" envia todas as copies para o Estudio
- [ ] Cada copy gera um batch independente (com status)
- [ ] Resultado vinculado ao documento original

### US-02: Biblioteca de copy reutilizavel
**Como** usuario
**Quero** salvar copies em uma biblioteca
**Para** reutilizar em novos projetos/campanhas

**Criterios de Aceite:**
- [ ] Criar colecao de copies
- [ ] Adicionar/Remover copy da biblioteca
- [ ] Acao "Usar como prompt" no Estudio

### US-03: Contexto visual manual aplicado no batch
**Como** usuario
**Quero** escolher assets visuais e aplicar no batch
**Para** manter consistencia de marca

**Criterios de Aceite:**
- [ ] Selecionar assets com modo (style/compose/base)
- [ ] Envio ao backend na geracao em lote
- [ ] Metadados registram quais assets foram usados

### US-04: Enriquecimento de prompt no batch
**Como** usuario
**Quero** que o batch use brand context
**Para** manter alinhamento visual e textual

**Criterios de Aceite:**
- [ ] Enriquecimento opcional por projeto
- [ ] Registra se brand context foi aplicado

### US-05: Pacotes de campanha
**Como** usuario
**Quero** agrupar copies e imagens por campanha/canal
**Para** organizar producao e export

**Criterios de Aceite:**
- [ ] Criar pacote com nome e canal
- [ ] Vincular copies e imagens ao pacote
- [ ] Filtrar por pacote

### US-06: Metadados e filtros
**Como** usuario
**Quero** tags e filtros
**Para** encontrar rapidamente materiais

**Criterios de Aceite:**
- [ ] Tags por documento (copy/imagem)
- [ ] Filtro por canal/campanha/formato

### US-07: Versionamento basico
**Como** usuario
**Quero** ver historico de versoes
**Para** recuperar iteracoes

**Criterios de Aceite:**
- [ ] Salvar versoes ao editar (maximo 10 versoes por documento)
- [ ] Restaurar versao anterior
- [ ] Versoes mais antigas sao descartadas automaticamente (FIFO)

### US-08: Pincel de selecao para refinamento
**Como** usuario
**Quero** selecionar uma area da imagem
**Para** refinar apenas aquela regiao

**Criterios de Aceite:**
- [ ] Ferramenta de pincel (brush) para desenhar mask
- [ ] Opcao de limpar/refazer a selecao
- [ ] Enviar mask junto do prompt de refinamento
- [ ] Resultado substitui ou cria nova versao ligada a original

## Fluxo de UX (alto nivel)

1. Usuario seleciona copies no Kanban
2. Clica "Gerar imagens" (abre Estudio com lista de copies)
3. Ajusta preset, formato, criatividade, contexto visual e gera em lote
4. Visualiza batches por copy
5. Refina imagem usando brush selection (mask)
6. Salva e associa ao pacote de campanha

## Dados e Modelos (alto nivel)

- CampaignPackage
  - id, name, channel, formats, project_id
- CopyLibraryItem (workspace-level, compartilhada entre projetos)
  - id, title, content, tags, workspace_id, created_by, created_at
- DocumentMetadata
  - channel, campaign_id, format, tags
- ImageMask
  - image_id, mask_url (ou base64), created_at

## API (alto nivel)

- POST /image-generation/generate-batch
  - adicionar: reference_assets[], prompt_enrichment, campaign_id, metadata
- POST /image-generation/refine
  - adicionar: mask (base64 ou url)
- POST /copies/library
- GET /copies/library
- POST /campaigns
- GET /campaigns

## Observabilidade

- Log por batch com count, sucesso/falha, projeto, campanha
- Registro de uso de assets e brand context
- Tempo de geracao por copy (para analise, sem SLA definido - depende do modelo)

## Riscos

- Batch com assets + enrich pode aumentar custo/latencia
- Pincel/mask exige UI performatica e padrao de tamanho

## Fora do Escopo

- Aprovacao de equipe
- Fila de governanca/custos

## Clarifications

### Session 2025-01-14
- Q: Como integrar inpainting/mask do Gemini 3 Pro? → A: OpenRouter primeiro; se mask não funcionar, adicionar API Google depois como fallback
- Q: Biblioteca de Copy é por projeto ou workspace? → A: Workspace-level (compartilhada entre todos os projetos do workspace)
- Q: Quantas versões manter por documento? → A: 10 versões (FIFO, mais antigas descartadas automaticamente)
- Q: Limite máximo de copies por batch? → A: 20 copies (balanceado para campanhas médias)
- Q: Meta de tempo para gerar batch? → A: Sem SLA definido (depende do modelo); registrar métricas para análise

