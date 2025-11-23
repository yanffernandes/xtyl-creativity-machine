"""
Seed Marketing & Paid Traffic Templates

Expert-level templates for advertising agency and paid traffic specialists.
Inspired by: David Ogilvy, Gary Vaynerchuk, Seth Godin, Neil Patel, Ryan Deiss.
"""

from database import SessionLocal
from models import Template
import uuid

SYSTEM_TEMPLATES = [
    # === ANÚNCIOS / ADS ===
    {
        "name": "Anúncio Meta Ads - AIDA Framework",
        "description": "Estrutura AIDA (Atenção, Interesse, Desejo, Ação) otimizada para Facebook e Instagram Ads",
        "category": "ads",
        "icon": "🎯",
        "prompt": """Crie um anúncio para Meta Ads (Facebook/Instagram) seguindo o framework AIDA:

**PRODUTO/SERVIÇO:** [Descreva]
**PÚBLICO-ALVO:** [Persona]
**OBJETIVO:** [Vendas/Leads/Tráfego]

Estruture assim:

**ATENÇÃO (Headline):**
- Hook poderoso em 5-8 palavras
- Gatilho emocional ou curiosidade
- Foco no benefício principal

**INTERESSE (Primeiras linhas):**
- Problema/dor que resolve
- Estatística ou fato surpreendente
- Relatable story

**DESEJO (Corpo do texto):**
- 3 benefícios principais (bullets)
- Prova social (depoimento/número)
- Diferencial competitivo

**AÇÃO (CTA):**
- CTA direto e urgente
- Oferta irresistível
- Sense of urgency

**ESPECIFICAÇÕES:**
- Máx 125 caracteres no título principal
- Corpo: 2-3 parágrafos curtos
- Tom: [Profissional/Casual/Urgente]
- Emojis: Sim, estratégicos""",
        "tags": ["meta-ads", "facebook", "instagram", "aida", "performance"],
    },

    {
        "name": "Google Ads - Headline Killer",
        "description": "30 headlines de alto CTR para Google Search Ads com PAS (Problema-Agitação-Solução)",
        "category": "ads",
        "icon": "🔍",
        "prompt": """Crie 30 headlines otimizadas para Google Search Ads usando o framework PAS:

**PRODUTO/SERVIÇO:** [Descreva]
**KEYWORD PRINCIPAL:** [palavra-chave]
**PÚBLICO:** [Persona]

Para cada headline (máx 30 caracteres):

**Estrutura PAS:**
P (Problema): Dor/necessidade clara
A (Agitação): Consequência de não resolver
S (Solução): Benefício do produto

**Variações:**
- 10 headlines focadas em benefício
- 10 headlines focadas em urgência/escassez
- 5 headlines com números/estatísticas
- 5 headlines com pergunta/curiosidade

**Critérios:**
✅ Incluir keyword principal
✅ Gatilhos emocionais (FOMO, exclusividade, transformação)
✅ Números quando possível
✅ CTA implícito
❌ Evitar clichês
❌ Não usar "melhor", "incrível" sem contexto

**Formato:**
Separe por categoria e numere. Destaque as TOP 5.""",
        "tags": ["google-ads", "headlines", "search", "pas", "ctr"],
    },

    {
        "name": "Copy de Anúncio - Storytelling Venda",
        "description": "Narrativa envolvente que vende (estilo Gary Vaynerchuk + Seth Godin)",
        "category": "ads",
        "icon": "📖",
        "prompt": """Crie um copy de anúncio usando STORYTELLING que vende:

**PRODUTO/SERVIÇO:** [Descreva]
**PÚBLICO:** [Avatar]
**TRANSFORMAÇÃO:** [Antes → Depois]

**ESTRUTURA NARRATIVA:**

1. **THE HOOK (Primeira linha):**
   - Situação relatable do público
   - Começar com "Você já..." ou "Imagina se..."

2. **O PROBLEMA (Paragraph 1):**
   - Pintar a dor atual com detalhes sensoriais
   - "Você sente X, faz Y, mas Z continua acontecendo..."

3. **A JORNADA (Paragraph 2):**
   - Mini-story de transformação
   - Cliente real ou persona composta
   - Momento "aha" que mudou tudo

4. **A SOLUÇÃO (Paragraph 3):**
   - Apresentar produto como veículo da transformação
   - Não como produto, mas como "porta de entrada"

5. **THE BRIDGE (Paragraph 4):**
   - Remover objeções principais
   - "Não precisa ser X para Y"
   - Garantias/risk reversal

6. **THE CTA:**
   - Convite, não venda
   - "Seu próximo passo é simples:"

**TOM:** Conversacional, autêntico, sem hype
**TAMANHO:** 200-300 palavras
**EMOJIS:** Moderados, onde fazem sentido""",
        "tags": ["storytelling", "copy", "narrativa", "venda", "gary-vee"],
    },

    # === LANDING PAGES ===
    {
        "name": "Landing Page - Above The Fold",
        "description": "Hero section matador com headline irresistível e USP clara",
        "category": "landing_page",
        "icon": "🚀",
        "prompt": """Crie o ABOVE THE FOLD (primeira tela) de uma landing page de alta conversão:

**OFERTA:** [Produto/Serviço]
**PÚBLICO:** [Avatar detalhado]
**OBJETIVO:** [Venda/Lead/Trial]

**ELEMENTOS:**

**1. HEADLINE PRINCIPAL:**
- Fórmula: [Número] + [Adjetivo] + [Keyword] + [Benefício Específico]
- OU: [Pergunta Provocativa] + [Promessa Clara]
- Máx 12 palavras, super específica

**2. SUBHEADLINE:**
- Expande a promessa
- Remove objeção principal
- 15-20 palavras

**3. BULLETS DE BENEFÍCIO (3-5):**
- Não features, BENEFÍCIOS transformacionais
- Formato: "✓ [Verbo de ação] + [resultado] + [em quanto tempo/com que facilidade]"

**4. CTA BUTTON:**
- Texto do botão: [Ação Específica] (não "Saiba Mais")
- Microcopy abaixo do botão (reassurance)

**5. TRUST ELEMENTS:**
- Prova social (número de clientes/nota)
- OU logos de clientes/mídia
- OU garantia destacada

**6. HERO IMAGE SUGGESTION:**
- O que deve aparecer na imagem/vídeo
- Foco em resultado, não produto

**TOM:** Direto, confiante, sem fluff
**PALAVRAS-CHAVE:** [Se tiver, para SEO]""",
        "tags": ["landing-page", "headline", "cro", "above-fold", "conversão"],
    },

    {
        "name": "Landing Page Completa - VSL Script",
        "description": "Script de Video Sales Letter (VSL) para LP de alto ticket",
        "category": "landing_page",
        "icon": "🎥",
        "prompt": """Crie script completo de VSL (Video Sales Letter) para landing page:

**OFERTA:** [Produto/Serviço - especificar preço e tipo]
**DURAÇÃO TARGET:** [3min / 5min / 10min]
**AVATAR:** [Persona]

**ESTRUTURA RUSSELL BRUNSON:**

**[00:00-00:30] THE HOOK:**
- Abrir com pergunta ou afirmação ousada
- Pattern interrupt
- "Nos próximos X minutos, você vai descobrir..."

**[00:30-01:30] THE STORY:**
- Origem story (relatable)
- "Eu era igual você..."
- Turning point (descoberta)

**[01:30-03:00] THE OFFER:**
- Apresentar solução (não produto ainda)
- Mostrar processo/sistema único
- Dar nome ao método ("Framework X")

**[03:00-05:00] THE STACK:**
- Componentes do que está incluído
- Valor agregado de cada
- Stack de valor ($X + $Y + $Z = $Total)

**[05:00-07:00] PROOF:**
- 2-3 case studies rápidos
- Números específicos
- Testemunhos emocionais

**[07:00-08:30] OFFER DETAILS:**
- Preço reveal com anchoring
- Bônus exclusivos
- Garantia de risco zero

**[08:30-09:30] FAQ VISUAL:**
- Top 3 objeções
- Responder em 1 frase cada

**[09:30-10:00] FINAL CTA:**
- Urgência genuína (timer/escassez)
- "Clique no botão abaixo agora"
- What happens next?

**NOTAS:**
- Escrever para ser FALADO (conversacional)
- Indicar pausas dramáticas [PAUSA]
- Indicar quando mostrar B-roll [VISUAL: ...]""",
        "tags": ["vsl", "video-sales-letter", "script", "high-ticket", "webinar"],
    },

    # === EMAIL MARKETING ===
    {
        "name": "Email Sequence - Welcome Series (5 emails)",
        "description": "Sequência de boas-vindas que converte cold leads em buyers (framework Soap Opera)",
        "category": "email",
        "icon": "📧",
        "prompt": """Crie sequência completa de 5 emails de boas-vindas (Welcome Series):

**MARCA/PRODUTO:** [Nome]
**LEAD MAGNET:** [O que eles baixaram]
**OBJETIVO FINAL:** [Venda de X / Trial de Y]
**AVATAR:** [Persona]

**ESTRUTURA SOAP OPERA SEQUENCE (Russell Brunson):**

---

**EMAIL 1 - "The Setup" (Imediato)**
**Assunto:** [Gancho + entrega promessa]
- Agradecer pelo download
- Entregar lead magnet
- Contar quem você é (micro-story)
- Prometer o que vem: "Nos próximos dias..."
- CTA suave: Consumir conteúdo

---

**EMAIL 2 - "Engagement" (Dia +1)**
**Assunto:** [Curiosidade + valor]
- Dar quick win relacionada
- Compartilhar insight poderoso
- Fazer pergunta provocativa
- CTA: Responder email ou consumir recurso

---

**EMAIL 3 - "The Epiphany" (Dia +2)**
**Assunto:** [Revelação + transformação]
- Apresentar "o pulo do gato"
- Mostrar erro comum que leads cometem
- Introduzir solução (seu produto/serviço)
- CTA: Agendar call / Ver demo / Página de vendas

---

**EMAIL 4 - "Social Proof" (Dia +4)**
**Assunto:** [Resultado específico de cliente]
- Case study detalhado
- Antes e depois dramático
- Como cliente conseguiu (usando seu produto)
- CTA: "Você pode ser o próximo"

---

**EMAIL 5 - "Urgency + Close" (Dia +6)**
**Assunto:** [Escassez + última chance]
- Recapitular jornada (email 1-4)
- Oferta especial por tempo limitado
- Bônus exclusivo para quem agir agora
- FAQ rápido (remover objeções)
- CTA forte: Comprar/Assinar AGORA

---

**SPECS:**
- Assuntos < 50 chars
- Preview text estratégico
- P.S. poderoso em cada email
- Tom: [Formal/Casual/Amigável]""",
        "tags": ["email-marketing", "welcome-series", "sequence", "soap-opera", "automation"],
    },

    {
        "name": "Email de Carrinho Abandonado - Série 3x",
        "description": "Recuperação de carrinhos com psicologia reversa e urgência genuína",
        "category": "email",
        "icon": "🛒",
        "prompt": """Crie série de 3 emails para recuperar carrinhos abandonados:

**E-COMMERCE:** [Produto/Loja]
**ITEM NO CARRINHO:** [O que foi abandonado]
**TEMPO DESDE ABANDONO:** [1h / 24h / 72h]

---

**EMAIL 1 - "Friendly Reminder" (1 hora depois)**
**Assunto:** Ops! Esqueceu algo? 🙈
**Estratégia:** Gentil, helpful, sem pressão

Corpo:
- "Notamos que você estava quase finalizando..."
- Imagem do produto deixado
- 1 benefício chave do produto
- Remover fricção: "Ainda tem dúvidas? Responda este email"
- CTA: Finalizar compra (link direto ao checkout)

---

**EMAIL 2 - "Value Reinforcement" (24 horas depois)**
**Assunto:** [Nome], ainda pensando em [Produto]?
**Estratégia:** Adicionar valor, social proof

Corpo:
- Revisitar benefícios (3 bullets)
- Micro-review de cliente real
- "X pessoas compraram isso nas últimas 24h"
- Garantia destacada
- FAQ rápido (top 2 objeções)
- CTA: Voltar ao carrinho

---

**EMAIL 3 - "Last Chance + Incentive" (72 horas depois)**
**Assunto:** Seu carrinho expira em 6 horas... + [Bônus]
**Estratégia:** Urgência real + incentivo

Corpo:
- Timer visual/contador
- "Última chamada"
- Oferecer incentivo (desconto 10% / frete grátis / brinde)
- Código cupom exclusivo
- Reforçar risco zero (garantia)
- "Depois disso, não consigo segurar o estoque"
- CTA urgente: Finalizar AGORA

**P.S. PODEROSO:** "Ainda não decidiu? Aqui está [link para FAQ/chat]"

---

**SPECS:**
- Mobile-first (70% abrem no celular)
- Imagens do produto
- CTAs botão destacado
- Tom amigável, não desesperado""",
        "tags": ["cart-recovery", "email", "e-commerce", "urgency", "abandoned-cart"],
    },

    # === SOCIAL MEDIA ===
    {
        "name": "Post LinkedIn - Thought Leadership",
        "description": "Post viral no LinkedIn que posiciona como autoridade (estilo Justin Welsh)",
        "category": "social_media",
        "icon": "💼",
        "prompt": """Crie post de thought leadership para LinkedIn que viraliza:

**TEMA:** [Insight/Lição aprendida]
**OBJETIVO:** [Autoridade / Engajamento / Leads]
**NICHO:** [Sua área]

**ESTRUTURA JUSTIN WELSH:**

**1. HOOK (Primeira linha):**
Opções de formato:
- "Perdi $X fazendo Y. Aprendi Z."
- "X pessoas acreditam em Y. Estão erradas."
- "Aqui está o que ninguém te conta sobre X:"
- Lista numerada: "5 coisas que..."

**2. BODY (Parágrafos curtos):**
- Linha 1: Expandir o hook
- [Pular linha]
- Linha 2-4: Context/story pessoal
- [Pular linha]
- Linha 5-8: O insight/framework
- [Pular linha]
- Linha 9-12: Aplicação prática

**3. BULLETS/LISTICLE (se aplicável):**
- 3-7 pontos
- Cada ponto: 1 linha
- Começar com emoji ou número

**4. CONCLUSÃO:**
- Lição principal resumida
- Call to reflection (pergunta)

**5. P.S./CTA:**
- "P.S. Se isso fez sentido, [ação]"
- OU: "P.S. Salvei X anos de trial and error em [lead magnet]"

**SPECS:**
- Máx 1300 caracteres
- Parágrafos de 1-2 linhas (escaneável)
- 3-5 line breaks estratégicos
- Evitar hashtags em excesso (máx 3)
- Emojis: Apenas para separar seções

**TOM:** Conversacional, autêntico, sem jargão corporativo
**ÂNGULO:** Contrarian ou unpopular opinion (se possível)""",
        "tags": ["linkedin", "thought-leadership", "viral", "personal-brand", "b2b"],
    },

    {
        "name": "Carrossel Instagram - Educacional + CTA",
        "description": "10 slides que educam e convertem (framework Alex Hormozi)",
        "category": "social_media",
        "icon": "📱",
        "prompt": """Crie carrossel educacional de 10 slides para Instagram que converte:

**TEMA:** [Assunto/Tutorial]
**PRODUTO/SERVIÇO:** [O que você vende]
**AVATAR:** [Público-alvo]

**ESTRUTURA 10 SLIDES:**

**SLIDE 1 - CAPA:**
- Título curto e impactante (máx 6 palavras)
- Subtítulo: "Swipe para descobrir →"
- Design: Bold, contraste alto

**SLIDES 2-3 - PROBLEMA:**
- Slide 2: A dor/frustração específica
- Slide 3: Por que isso acontece (raiz do problema)

**SLIDES 4-8 - SOLUÇÃO (5 slides):**
Cada slide = 1 passo/dica
- Título: Passo X
- Bullet points (3-4)
- Ícone visual

**SLIDE 9 - RESUMO:**
- Recap dos 5 passos
- "Agora você sabe como..."

**SLIDE 10 - CTA:**
- "Quer ajuda com isso?"
- Oferta: [Lead magnet / Produto / Consultoria]
- CTA: "Link na bio" ou "Comente X"
- Bônus: "Salve este post"

---

**COPY DO POST (Caption):**

**Primeira linha (Hook):**
[Pergunta provocativa ou stat surpreendente]

**Body:**
- Problema resumido
- "Neste carrossel, você vai aprender..."
- Enumerar os 5 passos

**Hashtags:** 10-15 relevantes do nicho

**CTA final:** "👆 Salva este post pra não perder"

---

**SPECS:**
- Paleta de cores consistente
- Fonte legível (sans-serif, bold)
- Máx 30 palavras por slide
- Proporção: 1080x1080px""",
        "tags": ["instagram", "carrossel", "educacional", "reels", "engagement"],
    },

    # === SEO & BLOG ===
    {
        "name": "Artigo de Blog SEO - Pillar Content",
        "description": "Artigo pilar de 2500+ palavras otimizado para ranquear (SEO + leiturabilidade)",
        "category": "seo",
        "icon": "📝",
        "prompt": """Crie artigo de blog SEO-optimized que rankeia:

**KEYWORD PRINCIPAL:** [palavra-chave]
**INTENÇÃO DE BUSCA:** [Informacional/Transacional/Navegacional]
**PÚBLICO:** [Avatar]
**OBJETIVO:** [Ranquear + Converter]

**ESTRUTURA SEO:**

**1. TÍTULO (H1):**
- Incluir keyword principal
- Formato: "Guia Completo: [Keyword] em [Ano]"
- OU: "[Número] [Keyword] Que [Benefício Específico]"
- Máx 60 caracteres

**2. INTRODUÇÃO (150-200 palavras):**
- Abrir com gancho (stat/pergunta)
- Prometer o que o artigo entrega
- Incluir keyword nas primeiras 100 palavras
- Criar sumário navegável (links âncora)

**3. CORPO (2000+ palavras):**

Dividir em 5-7 seções (H2s):

Para cada H2:
- Incluir variação da keyword
- 300-500 palavras
- 2-3 H3s (subtópicos)
- Exemplos práticos
- Imagem/infográfico sugerido
- Box destacado com dica

**Elementos obrigatórios:**
- FAQ section (4-6 perguntas)
- Estatísticas citadas (links para fontes)
- Lista numerada ou bullets em cada seção
- CTA mid-content (lead magnet)

**4. CONCLUSÃO (100-150 palavras):**
- Recap dos pontos principais
- Próximo passo (CTA)
- Call to action para comentar

**5. META DESCRIPTION:**
- 155 caracteres
- Incluir keyword
- Gancho de clique

---

**SPECS SEO:**
- Densidade keyword: 1-2%
- LSI keywords (semânticas): [listar 5-10]
- Links internos: 3-5
- Links externos: 2-3 (fontes authority)
- Alt text para imagens
- Schema markup sugerido

**TOM:** Educacional, authoritative, escaneável
**ESCRITA:** Frases curtas, parágrafos 2-3 linhas""",
        "tags": ["seo", "blog", "content-marketing", "pillar-content", "ranqueamento"],
    },

    # === CRIATIVO / CONCEITUAL ===
    {
        "name": "Naming + Tagline - Brand Identity",
        "description": "Criar nomes de marca memoráveis e taglines que grudam (framework naming)",
        "category": "creative",
        "icon": "✨",
        "prompt": """Crie naming e tagline para marca:

**NEGÓCIO:** [Descrição]
**PÚBLICO:** [Avatar]
**VALORES DA MARCA:** [3-5 valores core]
**DIFERENCIAL:** [O que te torna único]

---

**PARTE 1: NAMING (30 opções)**

**Categorias de nome:**

**A) Descritivos (5):**
- Auto-explicativo sobre o que faz
- Ex: "PayPal", "Instagram"

**B) Abstratos (5):**
- Palavra criada/sem significado prévio
- Ex: "Kodak", "Google"

**C) Metafóricos (5):**
- Evocam conceito relacionado
- Ex: "Amazon" (grande), "Nike" (vitória)

**D) Fundadores (5):**
- Variações de nomes próprios
- Ex: "Tesla", "Ferrari"

**E) Compound (5):**
- Junção de duas palavras
- Ex: "Facebook", "YouTube"

**F) Foreign Words (5):**
- Palavras estrangeiras sonoras
- Ex: "Audi" (latim), "Samsung" (coreano)

Para cada nome:
- Disponibilidade .com (checar)
- Fácil de soletrar? (Sim/Não)
- Fácil de pronunciar? (Sim/Não)
- Evocação emocional (1-10)

---

**PARTE 2: TAGLINES (Top 10 nomes)**

Para cada um dos 10 melhores nomes, criar tagline:

**Tipos de tagline:**
- Descritiva: "O que fazemos"
- Superlativa: "O melhor em X"
- Provocativa: Pergunta/desafio
- Específica: Benefício claro
- Emocional: Sentimento/aspiração

**Critérios:**
- Máx 6 palavras
- Memorável (rimar/aliteração++)
- Diferenciada (não genérica)

**Formato final:**
Nome | Tagline | Por que funciona

---

**PARTE 3: TOP 3 RECOMENDAÇÕES**
Explicar por que cada um é a melhor escolha.""",
        "tags": ["naming", "branding", "tagline", "identidade-visual", "criativo"],
    },
]


def seed_templates():
    """Populate database with system templates."""
    db = SessionLocal()

    try:
        # Check if templates already exist
        existing = db.query(Template).filter(Template.is_system == True).count()

        if existing > 0:
            print(f"✓ {existing} system templates already exist. Skipping seed.")
            return

        print("📝 Seeding system templates...")

        for template_data in SYSTEM_TEMPLATES:
            template = Template(
                id=str(uuid.uuid4()),
                workspace_id=None,  # Global template
                user_id=None,  # System template
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                icon=template_data["icon"],
                prompt=template_data["prompt"],
                tags=template_data["tags"],
                is_system=True,
                is_active=True,
                usage_count=0
            )
            db.add(template)

        db.commit()
        print(f"✅ Successfully seeded {len(SYSTEM_TEMPLATES)} system templates!")

        # Print summary by category
        from collections import Counter
        categories = Counter([t["category"] for t in SYSTEM_TEMPLATES])
        print("\n📊 Templates by category:")
        for cat, count in categories.items():
            print(f"  {cat}: {count}")

    except Exception as e:
        print(f"❌ Error seeding templates: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_templates()
