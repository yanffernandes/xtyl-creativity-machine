# Sistema Andromeda - Diversidade Criativa

## O Que E

O "Andromeda" e o sistema de diversidade criativa do Alvo Bot. Seu objetivo e garantir que, ao gerar multiplas imagens para uma campanha, cada imagem seja **visualmente distinta** das demais. Isso e crucial para:

- **Testes A/B efetivos**: Criativos diferentes testam hipoteses visuais diferentes
- **Fadiga reduzida**: O publico nao ve o mesmo visual repetido
- **Cobertura de nichos**: Diferentes abordagens visuais atingem diferentes segmentos

---

## Pilares da Diversidade

### 1. Conceitos Criativos
Templates de prompt que definem a **abordagem narrativa** da imagem.

Exemplos:
- `testimonial-social` → Prova social com depoimento
- `question-hook` → Pergunta provocativa para engajamento
- `comparison-before-after` → Comparacao antes/depois
- `simulator-ui` → Interface de app simulada (calculadora, dashboard)
- `lifestyle-aspiration` → Imagem aspiracional de estilo de vida

**Janela de diversidade**: Ultimos 3 conceitos usados sao evitados.

### 2. Backgrounds (Fundos)
Estilos visuais de fundo com **descricao textual** (nao imagens de referencia).

Exemplos:
- `gradient-blue-purple` → Gradiente de azul para roxo
- `solid-warm-beige` → Fundo solido bege quente
- `pattern-geometric` → Pattern geometrico sutil
- `photo-office` → Fundo fotografico de escritorio

**Janela de diversidade**: Ultimos 4 backgrounds usados sao evitados.

### 3. Rotacao de Modelos
Alterna entre providers de IA para estilos visuais distintos.

```
Sessao com 9 imagens:
  Imagem 1: Gemini 3 Pro
  Imagem 2: Nano Banana Pro
  Imagem 3: GPT Image 1.5
  Imagem 4: Gemini 3 Pro
  Imagem 5: Nano Banana Pro
  Imagem 6: GPT Image 1.5
  ...
```

**Selecao**: Modelo com menor uso na sessao e escolhido (round-robin).

### 4. Visual Groups (Agrupamentos Visuais)
Conjuntos de variacoes visuais especificas por nicho. Cada grupo tem multiplas variacoes para evitar repeticao.

Exemplo para nicho financeiro:
- Grupo A: Simulador de emprestimo (variacoes: desktop, mobile, dark mode)
- Grupo B: Dashboard financeiro (variacoes: completo, simplificado, com grafico)
- Grupo C: Cartao de credito (variacoes: premium, standard, digital)

---

## Score de Diversidade

Formula de calculo:

```
diversityScore = (uniqueConcepts / totalGenerated) * 50
               + (uniqueBackgrounds / totalGenerated) * 30
               + (uniqueModels / totalGenerated) * 20
```

| Componente | Peso | Descricao |
|-----------|------|-----------|
| Conceitos unicos | 50% | Quantos conceitos diferentes foram usados |
| Backgrounds unicos | 30% | Quantos fundos diferentes foram usados |
| Modelos unicos | 20% | Quantos providers diferentes foram usados |

**Threshold minimo**: 70% (o sistema alerta quando abaixo disso)

### Exemplo Pratico

Sessao com 6 imagens:
- 4 conceitos unicos / 6 total = 66.7% × 50 = 33.3
- 3 backgrounds unicos / 6 total = 50% × 30 = 15.0
- 3 modelos unicos / 6 total = 50% × 20 = 10.0
- **Score total: 58.3** (abaixo do threshold de 70%)

Sessao com 6 imagens (otimizada):
- 6 conceitos unicos / 6 total = 100% × 50 = 50.0
- 5 backgrounds unicos / 6 total = 83.3% × 30 = 25.0
- 3 modelos unicos / 6 total = 50% × 20 = 10.0
- **Score total: 85.0** (acima do threshold)

---

## Deteccao de Nicho

O `NicheDetectorService` classifica artigos em 5 nichos:

| Nicho | Keywords Primarias | Keywords Secundarias |
|-------|-------------------|---------------------|
| **financial** | emprestimo, credito, dinheiro, bank, loan, credit, simulador | cartao, conta, aprovacao, investimento, fintech |
| **jobs** | emprego, trabalho, vaga, curriculo, job, career, hiring | salario, carreira, profissional, remoto, freelance |
| **health** | saude, medico, hospital, tratamento, health, medical, doctor | bem-estar, fitness, nutricao, clinico, consulta |
| **ecommerce** | loja, comprar, vender, produto, oferta, shop, buy | frete, desconto, promocao, carrinho, checkout |
| **generic** | (nenhum match) | (nenhum match) |

### Fluxo de Deteccao

```
Artigos selecionados
        │
        ▼
1. Tenta deteccao por IA (Gemini 3 Flash)
   - Envia titulo + keyword + excerpt de cada artigo
   - Recebe classificacao + confianca (0-1)
        │
        │ falha?
        ▼
2. Fallback: Deteccao por keywords
   - Normaliza texto (lowercase, remove acentos)
   - Busca keywords primarias (peso 1.0) e secundarias (peso 0.5)
   - Calcula score agregado por nicho
   - Seleciona nicho com maior score
        │
        ▼
3. Determina se aplica template especializado
   - Financial: SEMPRE aplica template especializado
   - Outros: Aplica se confianca >= 0.8 (80%)
   - Generic: Usado quando confianca < 0.5
```

### Niche Templates

Templates especializados por nicho definem:

```typescript
interface NicheTemplate {
  // Palavras proibidas no prompt (compliance)
  prohibitedWords: string[];       // ['imediato', 'hoje', 'agora', 'garantido']

  // Elementos obrigatorios
  requiredElements: string[];      // ['logo', 'disclaimer', 'CTA']

  // Regras de tipografia
  typographyRules: {
    headlineMinPt: number;         // 48pt minimo para mobile
    bodyMinPt: number;             // 28pt minimo
    uiLabelsMinPt: number;         // 22pt minimo
  };

  // Restricoes de conteudo
  contentRules: {
    noGuaranteedPromises: boolean; // true - nao pode prometer resultado
    noCreditApproval: boolean;     // true - nao pode prometer aprovacao
    requireDisclaimer: boolean;    // true - precisa de disclaimer
  };
}
```

---

## Modos de Geracao

### Modo Free (Automatico)

O sistema seleciona conceitos automaticamente:

```
1. Detecta nicho dos artigos
2. Rankeia conceitos por relevancia para o nicho
   - Se IA disponivel: ranking por Gemini 3 Flash
   - Senao: ranking por matching de keywords
3. Seleciona conceitos com janela de diversidade
   - Evita repetir os ultimos 3 conceitos
   - Distribui entre categorias diferentes
4. Seleciona backgrounds com janela de diversidade
   - Evita repetir os ultimos 4 backgrounds
5. Rotaciona modelos de IA (round-robin)
```

### Modo Preset (Manual)

O usuario seleciona conceitos manualmente:

```
1. Frontend exibe ConceptSelector
   - Conceitos agrupados por categoria
   - Busca por nome/descricao
   - Controle de quantidade por conceito
2. Usuario define: "4x testimonial, 3x question-hook, 2x simulator"
3. Backend distribui as selecoes entre os artigos
4. Backgrounds e modelos ainda rotacionam automaticamente
```

---

## Metadata de Diversidade

Cada imagem gerada armazena:

```json
{
  "concept_id": "uuid-do-conceito",
  "background_used": "gradient-blue-purple",
  "visual_group_code": "A",
  "session_id": "uuid-da-sessao",
  "diversity_metadata": {
    "used_concepts": ["testimonial", "question-hook", "simulator"],
    "used_backgrounds": ["gradient-blue", "solid-warm", "pattern-geo"],
    "used_models": ["openrouter/gemini-3-pro", "replicate/nano-banana"],
    "diversity_score": 85.5,
    "generated_at": "2026-01-15T10:30:00Z"
  }
}
```

Essa metadata serve para:
- **Analytics**: Entender quais combinacoes performam melhor
- **Auditoria**: Rastrear como cada imagem foi gerada
- **Otimizacao futura**: Alimentar sistema de aprendizado

---

## Relevancia para o Creativity Machine

### O Que Podemos Importar

1. **Sistema de conceitos criativos** em vez de imagens de referencia
   - Define templates de prompt com slots de variavel
   - Permite criar "receitas" de criativo reutilizaveis

2. **Deteccao automatica de nicho/contexto**
   - Adapta a geracao ao tipo de conteudo
   - Aplica regras de compliance por setor

3. **Score de diversidade**
   - Garante variedade em geracoes batch
   - Evita repeticao de estilos visuais

4. **Rotacao de modelos**
   - Ja temos multiplos providers (fal.ai, OpenRouter)
   - Round-robin e simples de implementar

5. **Janelas de diversidade**
   - Evitar repetir os ultimos N conceitos/backgrounds/estilos
   - Melhora qualidade dos testes A/B
