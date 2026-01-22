# Análise Crítica de UX: Fluxo de Criação de Criativos

**Data:** 2025-12-21
**Objetivo do Sistema:** Auxiliar gestores de tráfego pago a produzirem alto volume de criativos (texto + imagens) sem depender de copywriters ou designers.
**Meta do Usuário:** Ter 10 criativos prontos, cada um com 3-4 opções de imagens já geradas.

---

## 1. O Problema Central

O sistema foi construído com uma arquitetura de **documentos genéricos**, mas o usuário pensa em **criativos como unidade**.

```
MODELO MENTAL DO USUÁRIO:
┌─────────────────────────────────────┐
│  CRIATIVO #1                        │
│  ├── Título: "Promoção Black Friday"│
│  ├── Copy: "Aproveite 50% OFF..."   │
│  ├── Imagem A (minimalista)         │
│  ├── Imagem B (vibrante)            │
│  └── Imagem C (premium)             │
│  Status: Pronto para Arte           │
└─────────────────────────────────────┘

MODELO DO SISTEMA:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Document #1  │  │ Document #2  │  │ Document #3  │  │ Document #4  │
│ type: text   │  │ type: image  │  │ type: image  │  │ type: image  │
│ "Promoção.." │  │ (oculto)     │  │ (oculto)     │  │ (oculto)     │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
       ↑                 ↑                 ↑                 ↑
       │                 └─────────────────┴─────────────────┘
       │                        Anexados manualmente
       └── Aparece no Kanban
```

**Resultado:** O usuário não consegue visualizar "criativos" como unidade. Ele vê documentos de texto no Kanban e precisa caçar as imagens em outro lugar.

---

## 2. Questionamentos Fundamentais

### 2.1. Sobre o Conceito de "Criativo"

| # | Questionamento | Impacto |
|---|----------------|---------|
| Q1 | **Por que não existe uma entidade "Criativo" no sistema?** Um criativo deveria ser texto + N imagens agrupados, não documentos separados. | O usuário não consegue ver o resultado final do seu trabalho como unidade. |
| Q2 | **Por que imagens são "documentos"?** Imagens deveriam ser assets anexados a um criativo, não cidadãos de primeira classe no sistema. | Confusão sobre onde as imagens estão e como gerenciá-las. |
| Q3 | **Por que o Kanban oculta imagens anexadas?** O usuário gera 3 imagens, elas "somem" do Kanban. Ele acha que algo deu errado. | Ilusão de que nada foi criado após a geração. |
| Q4 | **Por que o status do criativo não reflete texto + imagens?** Um criativo só deveria estar "art_ok" quando tiver imagens aprovadas anexadas. | Status não representa a realidade do trabalho. |

### 2.2. Sobre o Fluxo de Geração

| # | Questionamento | Impacto |
|---|----------------|---------|
| Q5 | **Por que preciso anexar imagens manualmente?** Se gerei imagem com um documento aberto, deveria anexar automaticamente. | 4+ cliques desnecessários por criativo. |
| Q6 | **Por que as 3 variações não são agrupadas visualmente?** Após gerar, preciso caçar cada imagem individualmente. | Perda de contexto sobre quais imagens pertencem a qual geração. |
| Q7 | **Por que não posso gerar "criativo completo" com um comando?** Ex: "Gera criativo sobre Black Friday com 3 imagens". | Processo fragmentado em múltiplas etapas manuais. |
| Q8 | **Por que o Estúdio Visual é uma página separada?** Deveria estar integrado no fluxo do documento. | Quebra de contexto ao navegar entre páginas. |

### 2.3. Sobre Volume e Escala

| # | Questionamento | Impacto |
|---|----------------|---------|
| Q9 | **Como produzo 10 criativos rapidamente?** Hoje: 70+ minutos e 70+ cliques. Meta: deveria ser 10-15 minutos. | Sistema não escala para volume. |
| Q10 | **Por que não existe batch generation?** "Gera 10 criativos sobre [tema]" deveria ser possível. | Cada criativo é criado individualmente. |
| Q11 | **Por que não posso mover múltiplos criativos de status de uma vez?** Preciso arrastar um por um no Kanban. | Operações em lote inexistentes. |
| Q12 | **Onde está a visão de "produção do dia"?** Quantos criativos fiz hoje? Quantos faltam? | Falta de métricas de produtividade. |

### 2.4. Sobre a Experiência do Chat

| # | Questionamento | Impacto |
|---|----------------|---------|
| Q13 | **O chat sabe qual documento estou editando?** Se sim, por que não usa essa informação para anexar automaticamente? | Contexto disponível mas não utilizado. |
| Q14 | **Por que as variações de imagem aparecem e depois "somem"?** O ImageVariationGrid mostra durante geração, depois some. | Experiência descontinuada. |
| Q15 | **Por que não posso pedir "refaça a imagem 2 mais vibrante"?** Preciso ir no Estúdio Visual, encontrar a imagem, configurar. | Refinamento não é conversacional. |
| Q16 | **Onde vejo o histórico de gerações de imagem?** As 3 variações que gerei ontem... onde estão? | Histórico de gerações não acessível. |

### 2.5. Sobre Assets Visuais e Marca

| # | Questionamento | Impacto |
|---|----------------|---------|
| Q17 | **O logo do cliente é usado automaticamente nas imagens?** Configurei Visual Context, mas não sei se está funcionando. | Feedback zero sobre uso de assets. |
| Q18 | **Como sei se a imagem gerada respeitou a identidade visual?** Cores da marca, estilo... foi aplicado? | Falta de transparência no enrichment. |
| Q19 | **Por que preciso configurar Visual Context em cada projeto?** Deveria herdar do cliente/workspace. | Setup repetitivo. |

---

## 3. Fluxo Atual vs Fluxo Ideal

### 3.1. Criar UM Criativo Completo

```
FLUXO ATUAL (7 etapas, ~7 minutos):
─────────────────────────────────────
1. Clicar "Nova Criação"
2. Digitar título
3. Escrever copy no editor (ou pedir ao chat)
4. Salvar documento
5. Ir ao chat e pedir "gera 3 imagens para esse criativo"
6. Aguardar geração (2-3 min)
7. Clicar "Anexar Imagens" no documento
8. Procurar as 3 imagens entre TODAS do projeto
9. Selecionar as 3 corretas
10. Confirmar anexação
11. Mover para próximo status no Kanban

FLUXO IDEAL (2 etapas, ~3 minutos):
─────────────────────────────────────
1. Chat: "Cria criativo sobre Black Friday, 3 variações de imagem"
2. Sistema:
   ├── Gera copy automaticamente
   ├── Gera 3 imagens em paralelo
   ├── Cria documento com copy
   ├── Anexa as 3 imagens automaticamente
   └── Adiciona ao Kanban como "draft"
3. Usuário revisa e move para "text_ok"
```

### 3.2. Criar 10 Criativos

```
FLUXO ATUAL (~70 minutos):
─────────────────────────────────────
Repetir 10x o fluxo de 7 etapas acima.
70+ cliques, muita navegação, fácil perder o contexto.

FLUXO IDEAL (~15 minutos):
─────────────────────────────────────
1. Chat: "Cria 10 criativos sobre promoção de verão"
2. Sistema gera 10 em batch (paralelo)
3. Usuário vê 10 cards no Kanban
4. Cada card mostra: título + mini-galeria de 3 imagens
5. Clica em um para revisar/editar
6. Multi-select + "Mover para text_ok" (batch)
```

---

## 4. Problemas de Usabilidade Detalhados

### 4.1. Kanban Esconde o Resultado do Trabalho

**Cenário:**
1. Usuário gera 3 imagens via chat
2. Imagens aparecem no chat como "geradas com sucesso"
3. Usuário vai ao Kanban... não vê nenhuma imagem
4. Pensamento: "Onde estão minhas imagens?"

**Por quê acontece:**
```typescript
// KanbanBoard filtra imagens anexadas
const kanbanDocuments = useMemo(() => {
    return creations.filter(doc => {
        if (doc.media_type === 'image' && attachedImageIds.has(doc.id)) {
            return false; // OCULTA imagens anexadas
        }
        return true;
    });
}, [creations, attachedImageIds]);
```

**Problema:** O filtro faz sentido para evitar duplicação, mas o usuário perde visibilidade.

**Questionamento:** Q20 - Por que não mostrar as imagens DENTRO do card do documento a que estão anexadas?

### 4.2. Anexação é Processo de 5 Passos

**Cenário:**
1. Usuário quer anexar as 3 imagens que acabou de gerar
2. Clica no documento de texto
3. Scroll até seção "Imagens Anexadas"
4. Clica "Anexar Imagens"
5. Modal abre com TODAS as imagens do projeto (pode ter 50+)
6. Precisa identificar quais são as 3 que acabou de gerar
7. Clica nas 3 corretas
8. Clica "Attach"

**Questionamento:** Q21 - Por que não oferecer "Anexar variações recentes" como ação rápida?

### 4.3. Variações Geradas Não São Agrupadas

**Cenário:**
1. Gera 3 variações via chat
2. Sistema cria 3 documentos com `variation_set_id` igual
3. Mas essa informação NÃO é usada na UI
4. Usuário vê 3 imagens soltas, não sabe que são do mesmo "set"

**Código evidência:**
```python
# Backend agrupa com variation_set_id
"variation_set_id": variation_set_id,  # mesmo ID para as 3
"variation_index": idx,  # 0, 1, 2
```

**Questionamento:** Q22 - O variation_set_id existe mas não é usado. Por que não agrupar visualmente?

### 4.4. Estúdio Visual Desconectado

**Cenário:**
1. Usuário está editando documento "Promoção Black Friday"
2. Quer gerar imagens específicas para esse documento
3. Clica em "Estúdio Visual"
4. Navega para página completamente diferente
5. Perde contexto do documento
6. Gera imagens no Estúdio
7. Precisa voltar ao documento e anexar manualmente

**Questionamento:** Q23 - Por que o Estúdio não é um painel lateral ou modal dentro do documento?

---

## 5. Funcionalidades Ausentes Críticas

### 5.1. Para Volume

| Funcionalidade | Descrição | Prioridade |
|----------------|-----------|------------|
| **Batch Generation** | "Gera 10 criativos sobre X" | P0 |
| **Auto-Attach** | Imagem gerada com doc aberto → anexa automaticamente | P0 |
| **Multi-Select Kanban** | Selecionar múltiplos cards + ação em lote | P1 |
| **Creative Templates** | "Criar criativo a partir do template Y" | P1 |
| **Quick Actions** | "Anexar variações recentes" em 1 clique | P1 |

### 5.2. Para Visualização

| Funcionalidade | Descrição | Prioridade |
|----------------|-----------|------------|
| **Card com Galeria** | Kanban card mostra mini-thumbs das imagens | P0 |
| **Variation Sets** | Agrupar variações do mesmo set visualmente | P1 |
| **Generation History** | Ver todas as gerações de imagem do projeto | P2 |
| **Production Dashboard** | "Hoje: 8/10 criativos, 24 imagens geradas" | P2 |

### 5.3. Para Fluxo

| Funcionalidade | Descrição | Prioridade |
|----------------|-----------|------------|
| **Inline Image Studio** | Gerar imagens sem sair do documento | P0 |
| **Conversational Refinement** | "Deixa a imagem 2 mais vibrante" no chat | P1 |
| **Smart Status** | Status considera texto + imagens | P2 |
| **Workflow "Criativo Completo"** | Automatiza criação de texto + N imagens | P1 |

---

## 6. Perguntas para Decisão de Produto

### 6.1. Arquitetura

| # | Pergunta | Opções |
|---|----------|--------|
| D1 | Devemos criar entidade "Criativo" separada de "Documento"? | A) Sim, nova tabela `creatives` / B) Não, usar metadata em documents |
| D2 | Imagens devem continuar sendo "documentos"? | A) Sim, manter / B) Não, criar tabela `images` ou `assets` |
| D3 | O Kanban deve mostrar "Criativos" ou "Documentos"? | A) Criativos (agrupados) / B) Documentos (como hoje) |

### 6.2. Fluxo

| # | Pergunta | Opções |
|---|----------|--------|
| D4 | Auto-attach deve ser padrão ou opt-in? | A) Sempre anexa automaticamente / B) Pergunta antes / C) Configurável |
| D5 | Estúdio Visual deve ser página ou componente inline? | A) Página separada / B) Modal/Painel lateral / C) Ambos |
| D6 | Batch generation (10 criativos) é prioridade? | A) Sim, essencial / B) Não, foco em 1-by-1 primeiro |

### 6.3. UX

| # | Pergunta | Opções |
|---|----------|--------|
| D7 | Kanban card deve mostrar thumbnails das imagens? | A) Sim, sempre / B) Hover only / C) Não |
| D8 | Como agrupar variações visualmente? | A) Cards expansíveis / B) Galeria modal / C) Carrossel inline |
| D9 | Onde mostrar o histórico de gerações? | A) Chat / B) Painel dedicado / C) Dentro do documento |

---

## 7. Cenários de Teste de Usabilidade

Para validar se as melhorias funcionam, testar estes cenários:

### Cenário 1: Criativo Único
```
DADO que sou um gestor de tráfego
QUANDO peço "cria criativo sobre Black Friday com 3 imagens"
ENTÃO devo ver em menos de 3 minutos:
  - 1 card no Kanban com título
  - 3 thumbnails de imagem visíveis no card
  - Texto do criativo acessível com 1 clique
```

### Cenário 2: Lote de 10 Criativos
```
DADO que preciso produzir 10 criativos sobre o mesmo tema
QUANDO peço "gera 10 criativos sobre promoção de verão"
ENTÃO devo ver em menos de 15 minutos:
  - 10 cards no Kanban
  - Cada um com 3+ imagens anexadas
  - Posso revisar e ajustar cada um
```

### Cenário 3: Refinamento de Imagem
```
DADO que tenho um criativo com 3 imagens
E a imagem 2 não ficou boa
QUANDO digo no chat "refaz a imagem 2 mais vibrante"
ENTÃO a nova imagem deve:
  - Substituir a imagem 2 (ou ser adicionada como variação)
  - Manter as outras 2 intactas
```

### Cenário 4: Movimentação em Lote
```
DADO que tenho 5 criativos prontos no status "draft"
QUANDO seleciono os 5 e clico "Mover para text_ok"
ENTÃO todos os 5 devem mudar de coluna simultaneamente
```

---

## 8. Próximos Passos Sugeridos

### Fase 1: Quick Wins (1-2 semanas)
1. **Auto-attach quando doc está selecionado** - Impacto alto, implementação simples
2. **Kanban card com thumbnails** - Melhora visibilidade imediata
3. **Botão "Anexar variações recentes"** - Reduz fricção de anexação

### Fase 2: Estrutural (2-4 semanas)
4. **Inline Image Studio** - Gerar imagens sem sair do documento
5. **Variation Set UI** - Agrupar variações visualmente
6. **Multi-select Kanban** - Operações em lote

### Fase 3: Escala (4-8 semanas)
7. **Batch generation** - "Gera N criativos sobre X"
8. **Creative entity** - Se decisão D1 for "sim"
9. **Production dashboard** - Métricas de produtividade

---

## 9. Conclusão

O sistema tem uma base técnica sólida (geração de variações funciona, SSE funciona, anexação funciona), mas o **fluxo de UX não foi desenhado para volume**.

O usuário-alvo (gestor de tráfego) precisa de:
- **Velocidade**: 10 criativos em 15 minutos, não 70
- **Visibilidade**: Ver criativo como unidade (texto + imagens)
- **Automação**: Menos cliques, mais inteligência do sistema

As melhorias sugeridas focam em **reduzir fricção** e **aumentar visibilidade**, mantendo a arquitetura existente sempre que possível.

---

*Documento gerado para discussão de produto. Aguardando decisões sobre D1-D9 antes de iniciar implementação.*
