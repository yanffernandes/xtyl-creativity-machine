"""
Add final template categories: seo, landing_page, creative
This completes the 51 templates
"""

import json
import os

# SEO templates (7)
seo_templates = [
    {
        "name": "Artigo de Blog SEO - Guia Completo",
        "description": "Conteúdo pilar SEO otimizado (2000-3000 palavras) que rankeia para palavras-chave competitivas. Estrutura H1/H2/H3 e featured snippets.",
        "category": "seo",
        "icon": "📝",
        "prompt": """Escreva artigo SEO de {{word_count}} palavras sobre {{main_keyword}} para {{target_audience}}.

**Título H1**: Incluir {{main_keyword}} no início (50-60 caracteres)

**Introdução** (150-200 palavras):
- Hook que prende o leitor
- Promessa clara do que aprenderão
- Incluir {{main_keyword}} naturalmente

**Corpo Principal**:
Cubra estes subtópicos com H2:
{{subtopics}}

Para cada H2:
- Use H3 para sub-pontos
- Inclua exemplos práticos
- Adicione listas/bullet points
- Otimize para featured snippets

**Otimização SEO**:
- Densidade palavra-chave: 1-2% para {{main_keyword}}
- Palavras-chave relacionadas: {{related_keywords}}
- Links internos: {{internal_links}}
- Links externos para fontes autoritativas

**Conclusão** (100-150 palavras):
- Resumir pontos-chave
- CTA: {{call_to_action}}

**Meta Description** (155-160 caracteres)

Tom: Educativo, autoritativo, acessível
Legibilidade: Parágrafos curtos (2-4 linhas)""",
        "tags": ["seo", "blog", "conteudo-pilar", "long-form"]
    },
    {
        "name": "Title Tag SEO - 10 Variações",
        "description": "Gere 10 variações de title tags otimizadas para CTR máximo. Testa diferentes ângulos para mesma keyword.",
        "category": "seo",
        "icon": "📌",
        "prompt": """Crie 10 title tags otimizadas para {{main_keyword}}.

**Keyword target**: {{main_keyword}}
**Intenção de busca**: {{search_intent}} (informacional/comercial/transacional)
**Limite**: 50-60 caracteres cada

**Variações usando diferentes ângulos**:

1. **Número/Lista**: "{{number}} Formas de {{main_keyword}}"
2. **Ano**: "{{main_keyword}}: Guia Completo {{current_year}}"
3. **Como fazer**: "Como {{action_verb}} {{main_keyword}}"
4. **Best/Top**: "Melhores {{main_keyword}} para {{audience}}"
5. **Versus**: "{{option_a}} vs {{option_b}}: {{main_keyword}}"
6. **Guia**: "Guia Definitivo de {{main_keyword}}"
7. **Grátis/Valor**: "{{main_keyword}} Grátis: {{benefit}}"
8. **Rápido**: "{{main_keyword}} em {{timeframe}}"
9. **Problema-Solução**: "{{problem}}? {{main_keyword}} Resolve"
10. **Emocional**: "{{emotional_trigger}} {{main_keyword}}"

Inclua modificadores de CTR quando possível:
- Números
- Ano atual
- Palavras poderosas (definitivo, completo, grátis)
- Parênteses para contexto adicional

Tom: Claro, específico, clickável""",
        "tags": ["seo", "title-tag", "serp", "ctr"]
    },
    {
        "name": "Meta Description - Conversão Máxima",
        "description": "Meta descriptions otimizadas para CTR nos resultados de busca. 155-160 caracteres com call-to-action clara.",
        "category": "seo",
        "icon": "✍️",
        "prompt": """Escreva meta description para página sobre {{page_topic}}.

**Keyword principal**: {{main_keyword}}
**Limite**: 155-160 caracteres (CRÍTICO)
**URL da página**: {{page_url}}

**Estrutura em 3 partes**:

1. **Hook** (40 caracteres): Benefício ou promessa
   Exemplo: "Aprenda {{main_keyword}} em {{timeframe}}"

2. **Valor** (60-70 caracteres): O que encontrarão
   "Descubra {{benefit_1}}, {{benefit_2}} e {{benefit_3}}"

3. **CTA** (30 caracteres): Ação clara
   "Leia o guia completo →" ou "Começar agora"

**Elementos que aumentam CTR**:
✅ Incluir {{main_keyword}} naturalmente
✅ Usar número se relevante
✅ Adicionar ano: {{current_year}}
✅ Criar urgência/curiosidade
✅ Mencionar "grátis" se aplicável

**Evite**:
❌ Ultrapassar 160 caracteres (será cortado)
❌ Keyword stuffing
❌ Promessas vazias
❌ Pontos finais no meio (quebra visualmente)

Escreva 3 variações para teste A/B.

Tom: Persuasivo, específico, acionável""",
        "tags": ["seo", "meta-description", "serp", "snippet"]
    },
    {
        "name": "Post How-To SEO - Featured Snippet",
        "description": "Artigos how-to otimizados para capturar featured snippets. Formato passo-a-passo que Google adora.",
        "category": "seo",
        "icon": "📋",
        "prompt": """Escreva post how-to otimizado para featured snippet sobre "Como {{goal}}".

**Keyword long-tail**: "como {{goal}}"
**Tamanho**: 800-1200 palavras

**Estrutura para Featured Snippet**:

**Resposta Rápida** (40-60 palavras):
Parágrafo conciso respondendo diretamente a pergunta
Coloque logo após o H1, antes de qualquer coisa

**Lista de Passos** (formato numerado):

**1. {{step_1_title}}** (H2 ou H3)
- Explicação: {{step_1_details}} (100-150 palavras)
- Dica extra: {{step_1_tip}}
- Tempo necessário: {{step_1_time}}

**2. {{step_2_title}}**
[mesma estrutura]

**3. {{step_3_title}}**
[mesma estrutura]

Continue até {{total_steps}}

**Seção FAQ** (ajuda featured snippet):
**P: {{related_question_1}}**
R: Resposta direta em 40-50 palavras

**P: {{related_question_2}}**
R: Resposta direta

**Tools/Materiais Necessários**:
Lista em bullet points

**Conclusão com schema markup sugerido**:
Sugira HowTo schema markup para rich results

Tom: Claro, passo-a-passo, didático
Formato: Listas numeradas, headers claros, respostas diretas""",
        "tags": ["seo", "how-to", "featured-snippet", "tutorial"]
    },
    {
        "name": "Listicle SEO - Top Rankings",
        "description": "Artigos em lista otimizados para SEO e engajamento. Formato escaneável que rankeia bem e gera compartilhamentos.",
        "category": "seo",
        "icon": "📃",
        "prompt": """Escreva listicle SEO: "{{number}} {{main_topic}} para {{target_audience}}".

**Keyword**: "melhores {{main_topic}}" ou "top {{main_topic}}"
**Tamanho**: 1500-2500 palavras

**Título H1**: {{number}} Melhores {{main_topic}} [{{current_year}}]

**Introdução** (150 palavras):
- Por que {{main_topic}} importa
- Critérios de seleção
- O que você aprenderá

**Estrutura para cada item da lista**:

**{{item_number}}. {{item_name}}** (H2)

**Resumo** (1 frase): Posicionamento único

**Prós**:
✅ {{pro_1}}
✅ {{pro_2}}
✅ {{pro_3}}

**Contras**:
❌ {{con_1}}
❌ {{con_2}}

**Melhor para**: {{ideal_use_case}}
**Preço**: {{pricing_info}}
**Link**: {{affiliate_link}} (se aplicável)

**Nossa avaliação**: ⭐⭐⭐⭐⭐ (X/5)

[Repita para todos {{number}} itens]

**Comparação em Tabela**:
Crie tabela comparativa com principais features

**FAQ**:
3-5 perguntas comuns sobre {{main_topic}}

**Conclusão**: Recomendação final baseada em diferentes necessidades

Tom: Objetivo, detalhado, útil
Otimize para: Escaneabilidade, featured snippets, compartilhamentos""",
        "tags": ["seo", "listicle", "comparacao", "review"]
    },
    {
        "name": "Post de Comparação - Bottom of Funnel",
        "description": "Conteúdo de comparação para intenção comercial. Captura usuários prontos para comprar comparando opções.",
        "category": "seo",
        "icon": "⚖️",
        "prompt": """Escreva post de comparação: "{{product_a}} vs {{product_b}} [{{current_year}}]".

**Keywords**: "{{product_a}} vs {{product_b}}", "{{product_a}} ou {{product_b}}"
**Intenção**: Comercial - usuário pronto para decisão

**Título H1**: {{product_a}} vs {{product_b}}: Qual Escolher em {{current_year}}?

**Introdução** (100 palavras):
- Reconheça a dúvida comum
- Preview da recomendação final
- Quem deveria ler isto

**Tabela de Comparação Rápida**:
| Feature | {{product_a}} | {{product_b}} |
|---------|---------------|---------------|
| Preço   | $X            | $Y            |
| etc...  |               |               |

**Seção 1: {{product_a}} em Detalhes** (H2)
- O que é
- Principais features
- Prós e contras
- Preço e planos
- Para quem é ideal

**Seção 2: {{product_b}} em Detalhes** (H2)
[mesma estrutura]

**Comparação Direta** (H2):
**Preço**: Análise custo-benefício
**Features**: Qual tem mais/melhor
**Facilidade de uso**: {{comparison}}
**Suporte**: {{comparison}}
**Integrações**: {{comparison}}

**Veredito Final** (H2):
**Escolha {{product_a}} se**: {{scenario_a}}
**Escolha {{product_b}} se**: {{scenario_b}}

**Alternativas**: Mencione {{alternative_product}} se nenhum servir

**FAQ**:
- "Qual é melhor para {{use_case}}?"
- "Qual é mais barato?"
- "Posso usar os dois juntos?"

Tom: Imparcial, analítico, decisivo
CTA: Links afiliados ou calls para ação relevantes""",
        "tags": ["seo", "comparacao", "versus", "bottom-funnel"]
    },
    {
        "name": "SEO Local - Páginas de Localização",
        "description": "Páginas otimizadas para SEO local. Template para negócios multi-localização rankarem em buscas geográficas.",
        "category": "seo",
        "icon": "📍",
        "prompt": """Crie página SEO local para {{service_type}} em {{city}}.

**Keyword principal**: "{{service_type}} em {{city}}"
**Keywords secundárias**: "{{service_type}} {{neighborhood}}", "melhor {{service_type}} {{city}}"

**Título H1**: {{service_type}} em {{city}} - {{unique_selling_point}}

**Introdução** (150 palavras):
- Foco geográfico claro
- Benefício local: "Atendemos {{city}} e região há {{years}}"
- Mencione bairros: {{neighborhoods_list}}

**Seções obrigatórias**:

**H2: Por que Escolher {{business_name}} em {{city}}**:
- Conhecimento local
- Tempo de resposta: "Chegamos em {{city}} em até {{time}}"
- Cases locais

**H2: Áreas Atendidas em {{city}}**:
Lista de bairros (com links internos):
- {{neighborhood_1}}
- {{neighborhood_2}}
- {{neighborhood_3}}

**H2: {{service_type}} Perto de Você**:
Mencione landmarks locais:
"Próximo a {{landmark_1}}, {{landmark_2}}"

**H2: Diferenciais Locais**:
- {{local_advantage_1}}
- {{local_advantage_2}}
- Conhecimento de {{local_regulation}}

**Avaliações Locais**:
Embedded Google reviews
"⭐ 4.9/5 - {{review_count}} avaliações no Google"

**Schema Markup**: LocalBusiness + Service

**Mapa**: Google Maps embed

**CTA Local**:
"Agende {{service_type}} em {{city}}"
Telefone: {{phone}}
WhatsApp: {{whatsapp}}

Tom: Local, confiável, acessível
Densidade geográfica: Mencione {{city}} 5-8x naturalmente""",
        "tags": ["seo-local", "local-business", "geo-targeting", "gmb"]
    }
]

# LANDING PAGE templates (7)
landing_page_templates = [
    {
        "name": "Hero Section - AIDA Framework",
        "description": "Seção hero de landing page usando AIDA. Headline, subheadline, CTA e trust elements para conversão máxima.",
        "category": "landing_page",
        "icon": "🚀",
        "prompt": """Escreva hero section para {{product_service}} usando AIDA.

**Headline Principal** (5-8 palavras):
- Foco em {{main_benefit}}
- Claro, específico, orientado a resultados
- Incluir {{value_proposition}}

**Subheadline** (10-15 palavras):
- Expandir promessa do headline
- Explicar como resolve {{customer_pain_points}}
- Construir interesse

**Texto de Suporte** (2-3 frases):
- Criar desejo mostrando transformação
- Destacar {{unique_selling_proposition}}
- Social proof sutil: "Confiado por {{customer_count}} clientes"

**Botão CTA Principal**:
- Texto: {{primary_cta}} (orientado a ação)
  Exemplos: "Começar Teste Grátis", "Ver Planos", "Agendar Demo"
- Cor: Contrastar com fundo
- Tamanho: Grande, impossível de perder

**CTA Secundário** (opcional):
Ação de baixo comprometimento
"Assistir Demo" ou "Ler Case Study"

**Elementos de Confiança**:
- Badge: {{trust_badge}} ("Garantia 30 dias", "SSL Seguro", "GDPR Compliant")
- Logos de clientes se disponível
- Rating: "⭐ 4.8/5 ({{review_count}} avaliações)"

**Descrição da Imagem Hero**:
{{hero_image_description}}
- Mostre produto em uso ou resultado desejado
- Faces humanas aumentam confiança (+35% conversão)
- Alta qualidade, profissional

Tom: {{brand_voice}}
Mobile-first: Otimize para mobile antes de desktop""",
        "tags": ["landing-page", "hero-section", "aida", "above-fold"]
    },
    {
        "name": "Value Proposition Section - FAB",
        "description": "Seção de proposta de valor usando FAB (Features, Advantages, Benefits). Transforma specs em valor percebido.",
        "category": "landing_page",
        "icon": "💎",
        "prompt": """Crie seção de proposta de valor para {{product_service}} usando FAB.

**Headline da Seção**: "Por que {{product_service}}?"

**Feature → Advantage → Benefit** (3-5 blocos):

**1. {{feature_1_name}}** 🎯
**Feature**: O que é tecnicamente
"{{technical_description}}"

**Advantage**: Como funciona melhor que alternativas
"{{competitive_advantage}}"

**Benefit**: Resultado tangível para cliente
"{{customer_outcome}}"

**2. {{feature_2_name}}** ⚡
[mesma estrutura]

**3. {{feature_3_name}}** 🛡️
[mesma estrutura]

**Formato Visual**:
- Ícone relevante para cada feature
- Layout em 3 colunas (desktop) / 3 cards (mobile)
- Micro-interação ao hover

**Prova Social por Feature**:
Para cada feature, adicione:
"{{company_name}} aumentou {{metric}} em {{percentage}} com {{feature_name}}"

**CTA da Seção**:
"Veja {{product_service}} em ação"
Link para demo/vídeo

Tom: Claro, orientado a resultados, sem jargão
Foco: Sempre responder "E daí? Por que isso importa para MIM?"

Template de card:
```
[Ícone]
**Feature**: Nome curto
"Vantagem em 1 frase"

Benefício: Como isso melhora a vida do cliente em 15-20 palavras.

[Prova social mini]
```""",
        "tags": ["landing-page", "value-prop", "fab", "features"]
    },
    {
        "name": "Social Proof Section",
        "description": "Seção de prova social com depoimentos, logos, stats e case studies. Constrói confiança e credibilidade.",
        "category": "landing_page",
        "icon": "⭐",
        "prompt": """Crie seção de social proof para {{product_service}}.

**Headline**: "Empresas que Confiam em {{product_name}}"
ou "Mais de {{customer_count}} Clientes Satisfeitos"

**1. Logo Cloud** (se B2B):
Logos de {{company_count}} clientes principais
Ordem: Mais conhecidos primeiro
Grayscale para uniformidade

**2. Estatísticas Impressionantes** (3-4 métricas):

**{{metric_1}}**
"{{number}}+ {{metric_name}}"
Subtítulo: "e crescendo"

**{{metric_2}}**
"{{percentage}}% {{achievement}}"
Subtítulo: "desde {{year}}"

**{{metric_3}}**
"{{rating}}/5 estrelas"
Subtítulo: "baseado em {{review_count}} avaliações"

**3. Depoimentos em Destaque** (3 testemunhos):

**Depoimento 1 - Resultado Específico**:
"{{quote}}"
- Nome: {{customer_name}}
- Cargo: {{job_title}} na {{company}}
- Foto: Professional headshot
- Métrica: "Resultado: {{specific_metric}}"

**Depoimento 2 - Transformação**:
Foco em antes/depois
[mesma estrutura]

**Depoimento 3 - Facilidade de Uso**:
Foco em experiência do produto
[mesma estrutura]

**4. Trust Badges**:
- Certificações: {{certifications}}
- Prêmios: {{awards}}
- "Featured in": {{media_mentions}}
- Segurança: "SSL", "GDPR", etc

**5. Case Study Teaser** (opcional):
"Como {{company}} alcançou {{result}} com {{product_name}}"
[Ler Case Study Completo →]

**6. Video Testimonial** (se disponível):
Thumbnail com play button
Duração: "2 min"

Tom: Autêntico, específico, diversificado
Evite: Depoimentos genéricos, fotos stock""",
        "tags": ["landing-page", "social-proof", "testimonials", "trust"]
    },
    {
        "name": "Pricing Section - Objection Handling",
        "description": "Seção de preços otimizada para conversão. Trata objeções, destaca melhor valor e facilita decisão.",
        "category": "landing_page",
        "icon": "💰",
        "prompt": """Crie seção de pricing para {{product_service}}.

**Headline**: "Planos que Cabem no seu Orçamento"
ou "Invista em {{outcome}}, Não em Software"

**Planos** (2-4 opções):

**PLANO 1: {{plan_name_1}}** (ex: Starter)
Preço: {{price_1}}/{{billing_period}}
Best for: {{target_user_1}}

Features incluídas:
✅ {{feature_1}}
✅ {{feature_2}}
✅ {{feature_3}}
❌ {{excluded_feature}} (marca em plano superior)

CTA: "Começar Grátis" ou "Experimentar {{plan_name_1}}"

**PLANO 2: {{plan_name_2}}** (ex: Professional)
⭐ MAIS POPULAR
Preço: ~~{{original_price}}~~ {{discounted_price}}/mês
Economize: "{{savings}} por ano"

Features incluídas:
✅ Tudo do {{plan_name_1}}
✅ {{exclusive_feature_1}}
✅ {{exclusive_feature_2}}
✅ {{exclusive_feature_3}}

Badge: "Melhor Custo-Benefício"
CTA: "Começar Agora" (cor destaque)

**PLANO 3: {{plan_name_3}}** (ex: Enterprise)
Preço: "Personalizado"
Best for: {{target_user_3}}

Features: "Tudo do Professional +"
🎯 {{enterprise_feature_1}}
🎯 {{enterprise_feature_2}}
🎯 Suporte dedicado

CTA: "Falar com Vendas"

**Comparison Table** (abaixo dos cards):
Tabela detalhada com todas features

**Trust Builders**:
💳 "Teste 14 dias grátis - Sem cartão de crédito"
🔒 "Cancele quando quiser"
✅ "Garantia de 30 dias"
🏆 "{{upgrade_stat}}% dos clientes fazem upgrade"

**FAQ de Pricing**:
- "Posso trocar de plano depois?"
- "O que acontece se ultrapassar o limite?"
- "Vocês oferecem desconto para nonprofits/educação?"

**Ancora de Valor**:
"Custa menos que {{comparison}}"
"ROI médio de {{roi_stat}}x em {{timeframe}}"

Tom: Transparente, justo, focado em valor""",
        "tags": ["landing-page", "pricing", "planos", "conversion"]
    },
    {
        "name": "Lead Magnet Landing Page",
        "description": "Landing page focada em captura de leads com lead magnet (ebook, template, trial). Maximiza inscrições.",
        "category": "landing_page",
        "icon": "🎁",
        "prompt": """Crie landing page de lead magnet para {{lead_magnet_name}}.

**Hero Section**:
Headline: "Baixe Grátis: {{lead_magnet_name}}"
Subheadline: "{{value_promise}} em {{format}} de {{pages}} páginas"

Imagem: Mockup do ebook/template (3D, professional)

Form (above fold):
- Nome
- Email
- [Baixar Grátis Agora] - botão grande

**Seção: O que Você Vai Aprender** (Bullet Benefits):
✨ {{benefit_1}}
✨ {{benefit_2}}
✨ {{benefit_3}}
✨ {{benefit_4}}
✨ {{benefit_5}}

**Seção: Para Quem É Este {{lead_magnet_type}}**:
Este guia é perfeito se você:
✅ {{pain_point_1}}
✅ {{pain_point_2}}
✅ {{pain_point_3}}

**Preview de Conteúdo**:
"Aqui está o que está dentro:"

**Capítulo 1**: {{chapter_1}}
**Capítulo 2**: {{chapter_2}}
**Capítulo 3**: {{chapter_3}}
[...]

**Social Proof**:
"{{download_count}}+ downloads"
"⭐ {{rating}}/5 - {{review_count}} avaliações"

Mini-testimonials:
"{{quote_snippet}}" - {{name}}, {{title}}

**Seção: Sobre o Autor** (Credibilidade):
Foto + bio curta
"{{author_name}} é {{credentials}}"
Autoridade: {{expertise_proof}}

**Trust Elements**:
🔒 "Seu email está seguro. Sem spam."
📧 "Cancele a inscrição quando quiser"
✅ "100% gratuito, sempre"

**Exit Intent Popup** (script):
"Espere! Não perca {{lead_magnet_name}}"
Oferta: "Baixe agora + bônus: {{bonus_item}}"

**Thank You Page** (após envio):
"Check seu email!"
"{{lead_magnet_name}} está a caminho"
Next step: "Enquanto espera, {{additional_cta}}"

Tom: Generoso, educacional, sem vendas diretas
Foco: Valor percebido do lead magnet""",
        "tags": ["landing-page", "lead-magnet", "lead-gen", "ebook"]
    },
    {
        "name": "Webinar Registration Page",
        "description": "Landing page para registro em webinars e eventos online. Cria antecipação e maximiza inscrições.",
        "category": "landing_page",
        "icon": "🎓",
        "prompt": """Crie landing page de registro para webinar "{{webinar_title}}".

**Hero Section**:
Badge: "🔴 WEBINAR GRATUITO"
Headline: "{{webinar_title}}"
Subheadline: "Descubra {{value_promise}} em {{duration}} minutos"

Data/Hora: "{{date}} às {{time}} ({{timezone}})"
Countdown: Timer até o evento

Form (Simples):
- Nome
- Email
- [Garantir Vaga Grátis] CTA

**Você Vai Aprender**:
✅ {{learning_outcome_1}}
✅ {{learning_outcome_2}}
✅ {{learning_outcome_3}}
✅ Bônus: {{bonus_content}}
✅ Q&A ao vivo

**Agenda do Webinar** (Timeline):
**00:00 - 05:00**: Introdução e overview
**05:00 - 20:00**: {{topic_1}}
**20:00 - 35:00**: {{topic_2}}
**35:00 - 50:00**: {{topic_3}}
**50:00 - 60:00**: Q&A e próximos passos

**Sobre o Palestrante**:
{{speaker_name}}
{{speaker_title}} na {{company}}

Credenciais:
- {{achievement_1}}
- {{achievement_2}}
- {{featured_in}}

Foto profissional + LinkedIn link

**Social Proof**:
"{{registered_count}}+ pessoas já se registraram"
"Vagas limitadas: {{spots_left}} vagas restantes"

Depoimentos de webinars anteriores:
"{{quote}}" - {{attendee}}

**O Que Você Receberá**:
📧 Email de confirmação imediato
📅 Convite de calendário (Google/Outlook)
📊 Slides do webinar (após evento)
🎁 Bônus exclusivo: {{bonus_resource}}

**FAQ**:
- "Será gravado?" → {{answer}}
- "Preciso aparecer na câmera?" → Não
- "Posso fazer perguntas?" → Sim, Q&A ao vivo
- "E se eu não puder participar ao vivo?" → {{recording_policy}}

**Urgency Tactics**:
"Registre-se até {{deadline}} e ganhe {{early_bird_bonus}}"
"Apenas {{days_left}} dias até o webinar!"

**Repeat Form** (fim da página):
Formulário simplificado novamente
CTA: "Não perca! Registre-se agora"

**Thank You Page**:
"Você está dentro! 🎉"
"Check seu email para detalhes"
"Adicione ao calendário" [botões Google/Outlook]
"Enquanto espera:" Links para conteúdo relacionado

Tom: Educacional, entusiástico, FOMO sutil""",
        "tags": ["landing-page", "webinar", "evento", "registration"]
    },
    {
        "name": "Long-Form Sales Page - 4Ps",
        "description": "Sales page longa usando 4Ps (Promise, Picture, Proof, Push). Para produtos high-ticket que precisam de persuasão extensa.",
        "category": "landing_page",
        "icon": "📜",
        "prompt": """Crie long-form sales page para {{product_name}} ({{price_point}}) usando 4Ps.

**PROMISE (Promessa)**:

Hero Headline: "{{big_promise}}"
Subheadline: "Como {{target_audience}} estão {{achieving_outcome}} usando {{product_name}}"

Video Sales Letter (VSL): {{video_url}}
ou
Lead com história: "Há {{timeframe}} atrás, {{story_hook}}..."

**PICTURE (Imagem do Resultado)**:

"Imagine acordar e..."
Paint vivid picture de {{desired_outcome}}:
- Emocionalmente: Como se sentirão
- Praticamente: O que poderão fazer
- Socialmente: Como outros os verão

"Isso é possível com {{product_name}}"

**Agitate o Problema** (antes da solução):
"Mas você provavelmente está lidando com:"
❌ {{pain_point_1}}
❌ {{pain_point_2}}
❌ {{pain_point_3}}

"E tentou {{failed_solution_1}} e {{failed_solution_2}}, mas não funcionou porque..."

**PROOF (Prova)**:

1. **Origin Story**:
"Por que criamos {{product_name}}"
{{founder_story}}

2. **Como Funciona** (Reveal do Sistema):
Seção detalhada explicando metodologia
{{methodology_name}} em {{number}} passos

3. **Case Studies** (3-5 detalhados):
Cada um com:
- Foto/vídeo do cliente
- Situação antes
- Como usaram produto
- Resultados específicos (números)
- Quote impactante

4. **Comparação**:
Table: {{product_name}} vs {{competitor}} vs DIY

5. **Credentials**:
- {{expert_background}}
- Featured in: {{media_logos}}
- {{certifications}}

**PUSH (Empurrão)**:

**Oferta Irresistível**:
"Normalmente {{original_price}}"
"Hoje: {{discounted_price}}"
"Economize: {{savings}}"

**Stack de Valor**:
{{product_name}} - Valor: {{value_1}}
+ Bônus 1: {{bonus_1}} - Valor: {{value_2}}
+ Bônus 2: {{bonus_2}} - Valor: {{value_3}}
+ Bônus 3: {{bonus_3}} - Valor: {{value_4}}
___________________________________________
Valor Total: {{total_value}}
**Seu Investimento Hoje: {{price}}**

**Garantia Absurda**:
"{{guarantee_period}} dias de garantia incondicional"
"Se não {{specific_result}}, reembolso completo + {{bonus_for_trying}}"

**Scarcity/Urgency**:
"Apenas {{spots_left}} vagas disponíveis"
ou "Oferta termina em:" [Countdown]

**Risk Reversal**:
"Todo o risco é nosso"
Lista tudo que garante

**CTA Principal** (repetido 3-5x na página):
"Sim! Quero {{main_benefit}}"
[botão gigante]

**FAQ Extensa** (20-30 perguntas):
Antecipa TODAS objeções

**Final CTA + Recap**:
Resumo da oferta
Último push
"PS: {{final_persuasion}}"

**Comprimento**: 3000-5000 palavras
Tom: Storytelling, persuasivo, específico, emocional""",
        "tags": ["landing-page", "sales-page", "4ps", "long-form", "high-ticket"]
    }
]

# CREATIVE templates (7)
creative_templates = [
    {
        "name": "História da Marca - StoryBrand",
        "description": "História da marca usando framework StoryBrand de Donald Miller. Cliente como herói, marca como guia.",
        "category": "creative",
        "icon": "✨",
        "prompt": """Escreva história da marca usando StoryBrand para {{brand_name}}.

**1. O Herói (Cliente)**:
Descreva {{customer_hero}}:
- Quem são
- O que desejam alcançar
- Por que isso importa para eles

**2. O Problema** (3 níveis):
{{problem_faced}}

**Externo**: Problema físico, tangível
Ex: "Falta de tempo para criar conteúdo"

**Interno**: Como os faz sentir
Ex: "Frustração, sensação de inadequação"

**Filosófico**: Por que é injusto
Ex: "Criar conteúdo não deveria ser tão difícil"

**3. O Guia (Sua Marca)**:
Posicione {{brand_as_guide}} com:

**Empatia**: "Entendemos exatamente como você se sente"
Conte como você passou pelo mesmo

**Autoridade**: {{credentials}}
- Anos de experiência: {{years}}
- Clientes atendidos: {{customer_count}}
- Resultados comprovados: {{key_results}}

**4. O Plano**:
Apresente {{plan_solution}} em 3 passos simples:

**Passo 1**: {{step_1}} (ação inicial fácil)
**Passo 2**: {{step_2}} (processo/método)
**Passo 3**: {{step_3}} (resultado desejado)

**5. Chamada à Ação**:

**CTA Direto**: {{direct_cta}}
Ex: "Agendar Consulta", "Começar Agora"

**CTA Transitório**: {{transitional_cta}}
Ex: "Baixar Guia Gratuito", "Assistir Demo"

**6. Evitar Falha**:
Pinte o custo de NÃO agir:
"Se você não resolver {{problem_faced}}..."
- Consequência 1: {{negative_outcome_1}}
- Consequência 2: {{negative_outcome_2}}
- Consequência 3: {{negative_outcome_3}}

Enfatize dor de permanecer no status quo

**7. Sucesso**:
Visualize {{success_vision}}:

"Com {{brand_name}}, você vai:"
- {{positive_outcome_1}}
- {{positive_outcome_2}}
- {{positive_outcome_3}}

Pintar imagem vívida e emocional do futuro desejado

Tom: Empático, inspirador, centrado no cliente
Comprimento: 500-800 palavras
Perspectiva: Segunda pessoa ("você")""",
        "tags": ["storybrand", "brand-story", "sobre", "posicionamento"]
    },
    {
        "name": "Product Description - E-commerce FAB",
        "description": "Descrições de produto para e-commerce usando FAB. Transforma specs técnicas em benefícios que vendem.",
        "category": "creative",
        "icon": "🛒",
        "prompt": """Escreva descrição de produto e-commerce para {{product_name}} usando FAB.

**Título do Produto**: {{product_name}} - {{key_benefit}}

**Gancho de Abertura** (1-2 frases):
Benefício emocional imediato
"Imagine {{desired_scenario}}..."

**FEATURES → ADVANTAGES → BENEFITS**:

**Feature 1: {{technical_feature_1}}**
Advantage: {{why_better_1}}
Benefit: "Isso significa que você {{customer_outcome_1}}"

**Feature 2: {{technical_feature_2}}**
Advantage: {{why_better_2}}
Benefit: "Você vai {{customer_outcome_2}}"

**Feature 3: {{technical_feature_3}}**
Advantage: {{why_better_3}}
Benefit: "Permitindo que você {{customer_outcome_3}}"

**Specs Técnicas** (lista em bullet):
- Material: {{material}}
- Dimensões: {{dimensions}}
- Peso: {{weight}}
- Cor: {{color_options}}
- Garantia: {{warranty}}

**O que está incluído**:
📦 {{item_1}}
📦 {{item_2}}
📦 {{item_3}}

**Para quem é este produto**:
✅ Perfeito se você {{use_case_1}}
✅ Ideal para {{target_customer_type}}
✅ Ótimo para {{scenario}}

**Para quem NÃO é**:
❌ Não recomendado se {{wrong_use_case}}

**Social Proof na Descrição**:
"⭐ {{rating}}/5 estrelas ({{review_count}} avaliações)"
"{{best_seller_badge}}"

**Comparação com Alternativas**:
Por que escolher {{product_name}} em vez de {{competitor}}:
- {{differentiator_1}}
- {{differentiator_2}}

**Urgência/Escassez**:
"🔥 {{units_sold}} vendidos esta semana"
"⚡ Apenas {{stock_left}} em estoque"

**Garantia**:
"{{guarantee_period}} de garantia contra defeitos"
"Satisfação garantida ou seu dinheiro de volta"

**FAQ do Produto**:
P: {{common_question_1}}
R: {{answer_1}}

P: {{common_question_2}}
R: {{answer_2}}

**CTA Final**:
"Adicionar ao Carrinho"
"Comprar Agora com {{payment_options}}"

Comprimento: 250-400 palavras
Tom: Descritivo, persuasivo, específico
SEO: Incluir {{target_keywords}} naturalmente""",
        "tags": ["ecommerce", "produto", "fab", "descricao"]
    },
    {
        "name": "Product Description - Storytelling Premium",
        "description": "Descrições de produto premium usando storytelling. Para produtos high-end que vendem estilo de vida.",
        "category": "creative",
        "icon": "👑",
        "prompt": """Escreva descrição premium com storytelling para {{luxury_product}}.

**Não comece com specs. Comece com EMOÇÃO.**

**Opening Story** (100 palavras):
"{{sensory_opening}}"

Paint um cenário:
- Visual: {{visual_description}}
- Tátil: {{touch_description}}
- Emocional: {{emotional_state}}

"Este é o momento que {{luxury_product}} foi criado para proporcionar."

**A Criação** (Craftsmanship):
"Cada {{luxury_product}} começa com {{origin_story}}"

- Materiais: Não diga apenas "couro", diga "couro italiano curtido à mão por {{artisan}} em {{location}}"
- Processo: "{{hours}} horas de trabalho artesanal"
- Detalhes: "{{unique_detail}} que você só encontra em {{luxury_product}}"

**O Que Faz Único**:
Não use bullet points. Use parágrafos narrativos.

"O {{feature_1}} não é apenas {{technical_description}}. É {{emotional_meaning}}. Quando você {{action}}, você sente {{emotion}}."

**Filosofia do Design**:
"{{designer_name}} imaginou {{product_vision}}"
"A inspiração veio de {{inspiration_source}}"

**Lifestyle Integration**:
"Para quem {{luxury_product}} foi feito:"

Não diga "executivos". Pinte um retrato:
"Para aqueles que {{lifestyle_detail_1}}, que valorizam {{value_1}}, que entendem que {{philosophy}}."

**Herança e Tradição** (se aplicável):
"Desde {{year}}, {{brand_heritage}}"

**Edição/Exclusividade**:
"Apenas {{limited_quantity}} peças foram criadas"
ou "Feito sob encomenda em {{production_time}}"

**The Experience**:
Descreva o unboxing, a primeira vez usando, o envelhecimento do produto

**Investimento** (não "preço"):
"Um investimento de {{price}}"
"Heirloom quality que dura gerações"

**Certificate of Authenticity**:
"Cada peça vem com {{certificate_details}}"

**CTA Sofisticado**:
Não "Compre Agora"
Sim: "Reserve o Seu", "Solicite Consultoria", "Agende Visualização Privada"

Comprimento: 400-600 palavras
Tom: Sofisticado, sensorial, aspiracional
Evite: Superlatives exagerados, linguagem comum
Foco: Storytelling > Especificações""",
        "tags": ["luxury", "premium", "storytelling", "high-end"]
    },
    {
        "name": "Brand Manifesto - Inspiracional",
        "description": "Manifesto de marca inspiracional para mission-driven brands. Declare valores, missão e visão de forma emocional.",
        "category": "creative",
        "icon": "🔥",
        "prompt": """Escreva manifesto de marca para {{brand_name}}.

**Formato**: Frases curtas, impactantes, ritmo forte

**Abertura - O Problema/Oportunidade**:
"O mundo precisa de {{change}}."
"Por muito tempo, {{industry}} foi {{problem}}."
"Chega."

**Nossa Crença** (2-3 parágrafos):
"Acreditamos que {{core_belief}}."

"Acreditamos que {{ideal_1}}, não {{opposite_1}}."
"Que {{ideal_2}}, não {{opposite_2}}."
"Que {{ideal_3}}, não {{opposite_3}}."

**Para Quem Somos** (Target Manifesto):
"Somos para os {{target_archetype}}."
"Para aqueles que {{characteristic_1}}."
"Que não aceitam {{what_they_reject}}."
"Que exigem {{what_they_demand}}."

**Nossa Missão**:
"{{brand_name}} existe para {{mission_statement}}."

Não corporativo. Emocional.
"Lutamos por {{cause}}."
"Defendemos {{value}}."
"Criamos {{offering}} que {{transformation}}."

**Como Fazemos** (Differentiators):
"Não fazemos {{conventional_approach}}."
"Fazemos {{our_approach}}."

"Onde outros {{competitor_behavior}}, nós {{our_behavior}}."

**Os Valores** (Declaração forte de cada):

**{{value_1}}**:
"Sem desculpas. Sem atalhos. Apenas {{value_1}}."

**{{value_2}}**:
"{{value_2}} não é opcional. É obrigatório."

**{{value_3}}**:
"Escolhemos {{value_3}} sempre, mesmo quando {{hard_choice}}."

**O Compromisso**:
"Prometemos {{promise_1}}."
"Garantimos {{promise_2}}."
"Nunca {{what_we_wont_do}}."

**Call to Movement** (não call to action):
"Junte-se a nós."
"Porque {{shared_belief}}."
"Porque juntos, {{collective_vision}}."

**Fecho Poderoso**:
"Este é {{brand_name}}."
"E estamos apenas começando."

ou

"{{tagline}}."

**Formatação**:
- Parágrafos curtos (1-3 frases)
- Muito espaço em branco
- Algumas frases sozinhas para impacto
- Repetição intencional para ritmo

Comprimento: 300-500 palavras
Tom: Declarativo, apaixonado, sem medo
Inspiração: Nike, Patagonia, Apple manifestos

Evite:
❌ "Somos líderes de mercado"
❌ Jargão corporativo
❌ Falar sobre você - fale sobre o movimento""",
        "tags": ["manifesto", "brand-values", "mission", "inspiracional"]
    },
    {
        "name": "Company About Page",
        "description": "Página Sobre da empresa com autenticidade e autoridade. Humaniza marca enquanto estabelece credibilidade.",
        "category": "creative",
        "icon": "🏢",
        "prompt": """Escreva página About para {{company_name}}.

**Headline**: Não "Sobre Nós"
Sim: "{{compelling_headline}}"
Ex: "Obsessed by {{mission}}" ou "{{value_proposition}}"

**Opening Hook** (50-100 palavras):
NÃO comece com "Fundada em XXXX"
SIM comece com WHY ou problema que resolve

"A maioria das pessoas {{common_frustration}}. Nós também. Por isso existe {{company_name}}."

ou

"Em {{year}}, percebemos que {{market_gap}}. Decidimos fazer algo sobre isso."

**Origin Story** (200 palavras):
Conte a história humana:

"Começou quando {{founder_name}} {{triggering_event}}."

Inclua:
- O problema específico que enfrentaram
- A tentativa (e falha) de soluções existentes
- O momento "aha!"
- Os primeiros dias (humanizar)
- Primeiros clientes e aprendizados

**A Missão** (100 palavras):
"Hoje, {{company_name}} existe para {{mission}}."

Para quem:
"{{target_customer}}"
Mas não de forma genérica. Específico.

**Como Fazemos Diferente**:

"Não somos como {{typical_competitor}}."

**Eles**: {{competitor_approach}}
**Nós**: {{our_approach}}

List 3-4 differentiators reais (não genéricos como "qualidade")

**Os Valores em Ação** (não apenas liste):
Para cada valor, conte micro-história de como vivem ele

"**{{value_1}}**: Como quando {{real_example_1}}"
"**{{value_2}}**: Por isso que {{real_example_2}}"

**O Time** (se relevante):
Fotos genuínas (não corporativas forçadas)
Mini-bios focadas em personality, não apenas credentials

"{{team_member}} | {{role}}"
"Ama: {{personal_interest}}"
"Especialidade: {{expertise}}"

**Prova Social e Milestones**:
Timeline visual:
- {{year}}: {{milestone_1}}
- {{year}}: {{milestone_2}}
- {{year}}: {{milestone_3}}
- Hoje: {{current_stats}}

Métricas que importam:
"{{customer_count}}+ clientes em {{country_count}} países"
"{{impact_metric}}" (não vanity metrics)

**Featured In / Reconhecimentos**:
Logos de mídia/prêmios

**A Equipe nos Números** (se team é selling point):
"{{team_size}} pessoas espalhadas por {{locations}}"
"{{diversity_stat}}"
"{{experience_stat}}"

**Cultura** (se B2B ou recrutamento é goal):
"Como é trabalhar aqui:"
- {{culture_point_1}}
- {{culture_point_2}}
[Veja Vagas Abertas]

**A Visão** (Future):
"Estamos construindo um futuro onde {{vision}}."

**CTA**:
Primary: "{{main_cta}}" (ex: "Ver Como Funciona", "Começar")
Secondary: "Quer trabalhar conosco? [Careers]"

**Humanização Final**:
Foto do founder ou team
Quote pessoal:
"{{personal_note}}" - {{founder_name}}, {{title}}

Comprimento: 600-1000 palavras
Tom: Autêntico, humano, competente
Layout: Muito visual, quebra-linhas, não wall of text""",
        "tags": ["about-page", "sobre", "company-story", "autenticidade"]
    },
    {
        "name": "Video Script - Brand Documentary",
        "description": "Script para vídeo documentário de marca. Conta história da empresa de forma cinematográfica para YouTube/site.",
        "category": "creative",
        "icon": "🎬",
        "prompt": """Escreva script para brand documentary (3-5 minutos) de {{company_name}}.

**DURAÇÃO**: {{duration}} (ex: 3:30)

**FORMATO**:
[VISUAL] | [AUDIO/NARRAÇÃO]

---

**ACT 1: O MUNDO ANTES (0:00 - 1:00)**

[VISUAL] {{establishing_shot}}
B-roll de {{industry_scene}}

[NARRAÇÃO]
"{{opening_line}}"
(Hook emocional ou estatística impactante)

[VISUAL] {{problem_illustration}}
Mostrar o problema que a empresa resolve

[NARRAÇÃO]
"Para {{customer_type}}, {{pain_point}} era realidade diária."

[SOUND BITE - Customer/Expert]
"{{quote_about_problem}}"
- {{name}}, {{title}}

**ACT 2: O NASCIMENTO (1:00 - 2:00)**

[VISUAL] Founder em {{location}}
Photos de early days

[NARRAÇÃO]
"Em {{year}}, {{founder_name}} decidiu que tinha que haver uma forma melhor."

[SOUND BITE - Founder]
"{{origin_quote}}"
- {{founder_name}}, {{founder_title}}

[VISUAL] Montage de journey:
- Protótipos
- Primeiros testes
- Momentos de breakthrough
- Celebrações de milestones

[MUSIC] Crescendo

**ACT 3: A SOLUÇÃO (2:00 - 3:00)**

[VISUAL] Product/service em ação
Real customers usando

[NARRAÇÃO]
"{{company_name}} funciona assim: {{simple_explanation}}"

[VISUAL] Before/After comparisons
Resultados tangíveis

[MULTIPLE SOUND BITES - Customers]
Quick cuts de testimonials:
"{{result_quote_1}}" - {{customer_1}}
"{{result_quote_2}}" - {{customer_2}}
"{{result_quote_3}}" - {{customer_3}}

**ACT 4: O IMPACTO (3:00 - 3:30)**

[VISUAL] Wide shots de scale:
- Office/facility
- Team working
- Products being shipped/used globally

[NARRAÇÃO]
"Hoje, {{impact_stats}}"

[TEXT OVERLAY]
{{number_1}} {{metric_1}}
{{number_2}} {{metric_2}}
{{number_3}} {{metric_3}}

**ACT 5: O FUTURO (3:30 - 4:00)**

[VISUAL] Return to founder or team
Looking towards horizon/future

[SOUND BITE - Founder/CEO]
"{{vision_quote}}"

[NARRAÇÃO]
"Porque para {{company_name}}, {{mission_restatement}}."

[VISUAL] Logo reveal
CTA text overlay

[TEXT OVERLAY]
{{company_name}}
{{tagline}}
{{website}}

[MUSIC] Resolution, uplifting

---

**PRODUCTION NOTES**:

**Locations needed**:
- {{location_1}}
- {{location_2}}
- {{location_3}}

**Interviewees**:
- {{founder_name}}
- {{customer_1}} ({{customer_type}})
- {{employee}} ({{role}})

**B-roll requirements**:
- {{broll_1}}
- {{broll_2}}
- {{broll_3}}

**Music style**: {{music_description}}
(ex: "Indie folk, builds from intimate to epic")

**Color grade**: {{color_mood}}
(ex: "Warm, authentic, slightly desaturated")

**Tone**: Cinematic mas autêntico, inspiracional sem ser cheese""",
        "tags": ["video", "script", "documentary", "brand-film", "youtube"]
    },
    {
        "name": "Tagline & Slogan Generator",
        "description": "Gerador de taglines e slogans para posicionamento de marca. Múltiplas opções testando diferentes ângulos.",
        "category": "creative",
        "icon": "💬",
        "prompt": """Gere taglines/slogans para {{brand_name}}.

**Brand Info**:
- Produto/Serviço: {{offering}}
- Target audience: {{audience}}
- Key benefit: {{main_benefit}}
- Brand personality: {{personality}}
- Competitors' taglines: {{competitor_examples}}

**Gere 20 opções em diferentes categorias**:

**1. ASPIRATIONAL** (3-5 opções):
Foco em quem o cliente se tornará
- "{{aspirational_1}}"
- "{{aspirational_2}}"
Exemplos: "Just Do It", "Think Different"

**2. DESCRIPTIVE** (3-5 opções):
Explicam o que faz claramente
- "{{descriptive_1}}"
- "{{descriptive_2}}"
Exemplos: "The Ultimate Driving Machine"

**3. PROVOCATIVE** (3 opções):
Desafiam o status quo
- "{{provocative_1}}"
- "{{provocative_2}}"
Exemplos: "Impossible is Nothing"

**4. BENEFIT-FOCUSED** (3 opções):
Resultado tangível
- "{{benefit_1}}"
- "{{benefit_2}}"
Exemplo: "Melts in your mouth, not in your hands"

**5. PLAYFUL/WORDPLAY** (2-3 opções):
Jogos de palavras memoráveis
- "{{wordplay_1}}"
- "{{wordplay_2}}"

**6. EMOTIONAL** (2-3 opções):
Conectam emocionalmente
- "{{emotional_1}}"
- "{{emotional_2}}"
Exemplo: "Belongs to everyone"

**7. MISSION-DRIVEN** (2 opções):
Baseado no propósito maior
- "{{mission_1}}"
- "{{mission_2}}"

**ANÁLISE DE CADA**:

Para top 5 favoritos, analise:

**"{{tagline_option}}"**
✅ Pros: {{pros}}
❌ Cons: {{cons}}
Memorabilidade: {{score}}/10
Diferenciação: {{score}}/10
Adequação: {{score}}/10

**TESTES SUGERIDOS**:

Perguntas para testar tagline:
1. É memorável? (Consegue lembrar 1h depois?)
2. É único? (Poderia ser de competitor?)
3. É relevante? (Conecta com brand promise?)
4. É atemporal? (Funcionará em 10 anos?)
5. É traduzível? (Se global brand)
6. É ownable? (Pode ser registrado?)

**VARIAÇÕES DE COMPRIMENTO**:

Versão Long ({{tagline_long}})
Versão Short ({{tagline_short}})
Versão Social ({{tagline_social}} - para bio)

**APLICAÇÕES**:

Mostre como ficaria em:
- Logo lockup
- Website hero
- Email signature
- Social media bio
- Packaging

Tom: Conciso, memorável, verdadeiro ao brand""",
        "tags": ["tagline", "slogan", "branding", "positioning", "copywriting"]
    }
]

# Combine all
all_new_templates = seo_templates + landing_page_templates + creative_templates

# Load existing
json_path = os.path.join(os.path.dirname(__file__), 'data', 'ai_templates.json')
with open(json_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

# Add new
existing.extend(all_new_templates)

# Save
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(existing, f, ensure_ascii=False, indent=2)

print(f"✅ Added {len(all_new_templates)} templates")
print(f"   - SEO: 7")
print(f"   - Landing Page: 7")
print(f"   - Creative: 7")
print(f"\n📊 Total templates now: {len(existing)}")

# Count by category
categories = {}
for t in existing:
    cat = t['category']
    categories[cat] = categories.get(cat, 0) + 1

print("\n📋 Final count by category:")
for cat, count in sorted(categories.items()):
    print(f"  {cat}: {count}")
