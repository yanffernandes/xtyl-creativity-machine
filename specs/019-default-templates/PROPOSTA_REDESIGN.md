# Proposta de Redesign: Sistema de Templates

## Problemas do Design Atual

### 1. AI Assistant Templates - Existem mas não são usados
- 14 templates de marketing estão no banco de dados
- **NÃO existe UI para acessá-los**
- Usuário não consegue usar esses prompts no chat
- Prompt completo é enviado como "system message" - usuário não vê/edita

### 2. Workflow Templates - Úteis mas complexos demais
- Workflow = automação multi-step (text + image + loops)
- Curva de aprendizado alta para entender nodes/edges
- Usuário precisa: navegar até templates → lançar → configurar → executar
- Muitos cliques para gerar um simples anúncio

### 3. Experiência Fragmentada
- Templates de copywriting separados de workflows
- Usuário de agência quer: "criar um anúncio rápido", não "configurar um workflow"
- Complexidade exposta desnecessariamente

---

## Proposta: Templates como "Receitas Rápidas"

### Conceito Central
**Template = Receita pronta que o usuário preenche variáveis e gera conteúdo em 1 clique**

Não importa se por baixo é um prompt ou um workflow - o usuário vê:
1. Nome da receita (ex: "Anúncio Meta Ads - AIDA")
2. Campos para preencher (produto, público, benefício...)
3. Botão "Gerar"
4. Resultado pronto

---

## Nova Arquitetura de Templates

### Tipos de Template (interno, invisível ao usuário)

| Tipo | O que faz | Complexidade |
|------|-----------|--------------|
| `prompt` | Envia prompt ao chat, retorna texto | Simples |
| `workflow` | Executa workflow completo | Complexo |

### O que o usuário vê

```
┌─────────────────────────────────────────────────────────┐
│  📝 Anúncio Meta Ads - Fórmula AIDA                     │
│  ─────────────────────────────────────────────────────  │
│  Cria anúncios persuasivos usando Atenção, Interesse,   │
│  Desejo e Ação. Ideal para campanhas de conversão.      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Produto/Serviço: [___________________________] │    │
│  │ Público-alvo:    [___________________________] │    │
│  │ Benefício principal: [_______________________] │    │
│  │ Oferta/CTA:      [___________________________] │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [ Gerar Conteúdo ]                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Estrutura de Dados Proposta

### Template Unificado

```typescript
interface UnifiedTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;

  // Tipo determina como é executado
  type: 'prompt' | 'workflow';

  // Campos que o usuário precisa preencher
  variables: TemplateVariable[];

  // Output esperado
  outputs: OutputType[]; // ['text'] ou ['text', 'image'] ou ['text', 'image', 'image']

  // Metadados
  expert_technique: string;  // "AIDA Framework", "PAS Formula"
  estimated_time: string;    // "~30 segundos", "~2 minutos"
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Dados internos (não expostos)
  prompt_template?: string;     // Se type='prompt'
  workflow_id?: string;         // Se type='workflow'

  // Sistema
  is_system: boolean;
  is_featured: boolean;
  usage_count: number;
}

interface TemplateVariable {
  key: string;           // "product_name"
  label: string;         // "Nome do Produto"
  placeholder: string;   // "Ex: Curso de Marketing Digital"
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  options?: string[];    // Para type='select'
  hint?: string;         // Dica adicional
}
```

---

## Categorias Propostas (Simplificadas)

| Categoria | Ícone | Descrição | Exemplos |
|-----------|-------|-----------|----------|
| `ads` | 🎯 | Anúncios Pagos | Meta Ads, Google Ads, LinkedIn Ads |
| `social` | 📱 | Redes Sociais | Posts, Stories, Carrosséis, Reels |
| `email` | ✉️ | Email Marketing | Sequências, Newsletters, Automações |
| `landing` | 🖥️ | Landing Pages | Headlines, CTAs, Seções |
| `blog` | 📝 | Conteúdo & SEO | Artigos, Meta descriptions |
| `creative` | 🎨 | Criativo & Branding | Naming, Slogans, Conceitos |

---

## Templates Propostos (30 essenciais)

### 🎯 ADS (6 templates)

1. **Anúncio Meta Ads - AIDA**
   - Variáveis: produto, público, benefício, oferta
   - Output: headline + texto primário + descrição
   - Técnica: AIDA Framework

2. **Google Ads - Headlines Matadoras**
   - Variáveis: produto, palavra-chave, diferencial
   - Output: 15 headlines (30 chars) + 4 descrições (90 chars)
   - Técnica: Fórmula de Dan Kennedy

3. **Anúncio Carrossel Meta**
   - Variáveis: produto, 5 benefícios, CTA
   - Output: 5 cards com headline + texto
   - Técnica: Storytelling sequencial

4. **Remarketing - Carrinho Abandonado**
   - Variáveis: produto, objeção principal, urgência
   - Output: 3 variações de anúncio
   - Técnica: Objeção → Solução → Urgência

5. **LinkedIn Ads B2B**
   - Variáveis: solução, cargo-alvo, dor principal, resultado
   - Output: headline + texto + CTA
   - Técnica: Problem-Solution-Result

6. **YouTube Ads - Hook Inicial**
   - Variáveis: produto, gancho, promessa
   - Output: script 5s hook + 25s pitch
   - Técnica: Pattern Interrupt + Curiosity

---

### 📱 SOCIAL (6 templates)

7. **Post Instagram - Storytelling**
   - Variáveis: tema, história, lição, CTA
   - Output: caption completa + hashtags
   - Técnica: Hook → Story → Insight → CTA

8. **Carrossel Educativo (10 slides)**
   - Variáveis: tema, 7 pontos principais, CTA
   - Output: texto para cada slide
   - Técnica: Micro-learning format

9. **Post LinkedIn - Thought Leader**
   - Variáveis: tema, opinião controversa, evidência
   - Output: post formatado + hashtags
   - Técnica: Contrarian hook + credibility

10. **Thread Twitter/X**
    - Variáveis: tema principal, 5 subtópicos
    - Output: 10 tweets encadeados
    - Técnica: Cliff-hanger threading

11. **Reels/TikTok Script**
    - Variáveis: gancho, conteúdo, CTA
    - Output: roteiro com timestamps
    - Técnica: Hook-Retain-Reward

12. **Stories Sequência (5 stories)**
    - Variáveis: tema, progressão, CTA final
    - Output: texto/ideia para cada story
    - Técnica: AIDA em micro-formato

---

### ✉️ EMAIL (5 templates)

13. **Welcome Sequence (3 emails)**
    - Variáveis: empresa, benefício principal, próximo passo
    - Output: 3 emails completos
    - Técnica: Value-first onboarding

14. **Email de Lançamento**
    - Variáveis: produto, preço, bônus, deadline
    - Output: email de vendas completo
    - Técnica: PASTOR framework

15. **Newsletter Semanal**
    - Variáveis: tema da semana, 3 insights, recurso
    - Output: newsletter formatada
    - Técnica: Curated value format

16. **Carrinho Abandonado (3 emails)**
    - Variáveis: produto, objeções, urgência
    - Output: sequência de 3 emails
    - Técnica: Objeção progressiva

17. **Reengajamento**
    - Variáveis: tempo inativo, oferta especial
    - Output: email de win-back
    - Técnica: Loss aversion + exclusivity

---

### 🖥️ LANDING (5 templates)

18. **Headline + Subheadline**
    - Variáveis: produto, benefício, público
    - Output: 5 variações de headline
    - Técnica: 4U Formula (Urgent, Unique, Useful, Ultra-specific)

19. **Seção de Benefícios**
    - Variáveis: 6 benefícios do produto
    - Output: benefícios com ícone + título + descrição
    - Técnica: Feature → Benefit → Outcome

20. **FAQ Persuasivo**
    - Variáveis: objeções comuns (5)
    - Output: FAQ que vende
    - Técnica: Objeção handling

21. **Seção de Prova Social**
    - Variáveis: tipo de cliente, resultados
    - Output: estrutura de case study
    - Técnica: Before-After-Bridge

22. **CTA Final**
    - Variáveis: oferta, garantia, escassez
    - Output: bloco de CTA completo
    - Técnica: Risk reversal + urgency

---

### 📝 BLOG & SEO (4 templates)

23. **Artigo Pilar SEO**
    - Variáveis: keyword principal, subtópicos (5)
    - Output: outline completo + introdução
    - Técnica: Skyscraper + semantic SEO

24. **Meta Title + Description**
    - Variáveis: keyword, página
    - Output: 5 variações de title + description
    - Técnica: CTR optimization

25. **Listicle Viral**
    - Variáveis: tema, número de itens
    - Output: artigo completo formatado
    - Técnica: BuzzFeed formula

26. **Case Study**
    - Variáveis: cliente, problema, solução, resultado
    - Output: case study estruturado
    - Técnica: STAR method

---

### 🎨 CREATIVE (4 templates)

27. **Naming de Produto**
    - Variáveis: categoria, atributos, público
    - Output: 20 opções de nome + justificativa
    - Técnica: Phonetic + semantic analysis

28. **Tagline/Slogan**
    - Variáveis: marca, diferencial, emoção
    - Output: 10 taglines
    - Técnica: Memorable phrase patterns

29. **Brand Voice Guide**
    - Variáveis: marca, personalidade, público
    - Output: guia de tom de voz
    - Técnica: Brand archetype framework

30. **Conceito de Campanha**
    - Variáveis: objetivo, público, mensagem-chave
    - Output: conceito + desdobramentos
    - Técnica: Big idea framework

---

## Workflow Templates (5 automações poderosas)

Estes são diferentes - geram múltiplos outputs de uma vez:

### W1. Campanha Completa Meta Ads
- **Input**: briefing do produto
- **Output**:
  - 3 headlines
  - 3 textos primários
  - 3 imagens geradas por IA
- **Tempo**: ~3 minutos

### W2. Pack de Conteúdo Semanal
- **Input**: tema da semana + empresa
- **Output**:
  - 5 posts Instagram (texto + imagem)
  - 1 artigo de blog
  - 1 newsletter
- **Tempo**: ~5 minutos

### W3. Lançamento Express
- **Input**: produto + oferta + deadline
- **Output**:
  - Sequência de 5 emails
  - 3 anúncios Meta
  - Landing page copy
- **Tempo**: ~4 minutos

### W4. Repurpose de Conteúdo
- **Input**: artigo ou vídeo longo
- **Output**:
  - 10 posts para redes sociais
  - 5 emails da newsletter
  - 15 headlines para ads
- **Tempo**: ~3 minutos

### W5. Branding Starter Kit
- **Input**: briefing da marca
- **Output**:
  - 10 opções de nome
  - 5 taglines
  - Guia de tom de voz
  - Bio para redes sociais
- **Tempo**: ~4 minutos

---

## Nova Experiência do Usuário

### Fluxo Principal

```
1. Dashboard
   ↓
2. "Criar Conteúdo" (botão principal)
   ↓
3. Modal/Page com Templates em Cards
   - Filtro por categoria
   - Busca por nome/descrição
   - Templates em destaque no topo
   ↓
4. Seleciona template → Abre formulário
   - Vê variáveis para preencher
   - Vê preview do que será gerado
   ↓
5. Clica "Gerar"
   ↓
6. Resultado aparece
   - Se prompt: texto gerado inline
   - Se workflow: progresso em tempo real
   ↓
7. Salvar como documento no projeto
```

### Onde os Templates Aparecem

1. **Dashboard** - "Templates em Destaque" (3-5 mais usados)
2. **Sidebar do Projeto** - Botão "Usar Template"
3. **Chat/Assistente** - "Começar com Template" no início
4. **Página dedicada** - `/templates` com todos

---

## Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Descoberta | Navegar até workflows → templates | Botão "Criar" em qualquer lugar |
| Complexidade | Ver nodes, edges, configurar | Preencher formulário simples |
| Tempo até resultado | 5-10 cliques | 3 cliques |
| Entendimento | "O que é um workflow?" | "Preencha e gere" |
| Valor percebido | "Ferramenta complexa" | "Mágica que funciona" |

---

## Implementação Sugerida

### Fase 1: Templates de Prompt (1-2 dias)
1. Criar tabela `quick_templates` ou adaptar `templates`
2. Adicionar campo `variables` (JSON com definição dos campos)
3. Criar 30 templates de prompt
4. UI: modal de seleção + formulário de variáveis
5. Integrar com chat existente

### Fase 2: Workflow Templates Simplificados (2-3 dias)
1. Criar 5 workflow templates robustos
2. UI: mesma experiência dos prompts
3. Execução em background com progresso
4. Resultado salvo automaticamente no projeto

### Fase 3: Integração Total (1 dia)
1. Botão "Criar Conteúdo" no dashboard
2. Templates sugeridos baseado no contexto
3. Histórico de templates usados

---

## Decisões Necessárias

1. **Manter sistema de workflows atual?**
   - Opção A: Sim, como "modo avançado" para power users
   - Opção B: Deprecar em favor de templates simplificados

2. **Onde salvar conteúdo gerado?**
   - Opção A: Sempre em um projeto (requer seleção)
   - Opção B: Área "Rascunhos" temporária
   - Opção C: Documento avulso no workspace

3. **Templates customizáveis?**
   - Opção A: Usuário pode criar templates próprios
   - Opção B: Apenas templates do sistema
   - Opção C: "Favoritos" dos templates do sistema

4. **Modelo de IA nos templates?**
   - Opção A: Modelo fixo por template (otimizado)
   - Opção B: Usuário escolhe modelo
   - Opção C: Usa modelo padrão do sistema (admin configura)

---

## Resumo

O redesign propõe transformar templates de "workflows técnicos" em "receitas de conteúdo" que qualquer profissional de marketing consegue usar em segundos.

A complexidade técnica (prompts, workflows, nodes) fica escondida. O usuário só vê:
- **O que vai criar** (nome + descrição)
- **O que precisa informar** (campos simples)
- **O que vai receber** (preview do output)

Isso reduz a barreira de entrada e aumenta drasticamente o valor percebido da plataforma.
