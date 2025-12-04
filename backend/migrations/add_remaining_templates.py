"""
Script to add remaining template categories to ai_templates.json
Run this to complete the 51 templates
"""

import json
import os

# Additional templates for email, seo, landing_page, creative categories
additional_templates = [
    # EMAIL CATEGORY (8 templates)
    {
        "name": "Sequência de E-mail - Boas-vindas (3 E-mails)",
        "description": "Sequência de 3 e-mails de boas-vindas para novos assinantes. Constrói relacionamento, entrega valor e conduz para primeira oferta.",
        "category": "email",
        "icon": "📧",
        "prompt": """Crie sequência de 3 e-mails de boas-vindas para {{subscriber_name}}.

**E-mail 1 (Dia 0) - Boas-vindas**:
- Assunto: {{welcome_subject}}
- Agradeça pela inscrição
- Entregue {{lead_magnet}}
- Apresente {{brand_story}} brevemente
- Estabeleça expectativas de comunicação

**E-mail 2 (Dia 3) - Valor**:
- Assunto: {{value_subject}}
- Entregue {{value_promise}}
- Construa credibilidade sem vender
- CTA soft: explorar conteúdo

**E-mail 3 (Dia 7) - Primeira Oferta**:
- Assunto: {{offer_subject}}
- Apresente {{first_offer}}
- Explique como resolve {{pain_points}}
- CTA claro: {{next_steps}}

Tom: {{tone_of_voice}}
Comprimento: 200-400 palavras por e-mail""",
        "tags": ["email-marketing", "boas-vindas", "sequencia", "nurture"]
    },
    {
        "name": "E-mail Promocional - Escassez + Urgência",
        "description": "E-mails promocionais usando táticas de escassez e urgência para maximizar conversões em ofertas limitadas.",
        "category": "email",
        "icon": "⏰",
        "prompt": """Escreva e-mail promocional para {{offer_name}}.

**Assunto**: Urgência + benefício
Ex: "{{deadline_hours}}h restantes: {{main_benefit}}"

**Pre-header**: Reforce urgência

**Abertura**: Hook com FOMO
"{{scarcity_statement}}"

**Oferta** (100 palavras):
- O que é: {{offer_details}}
- Valor: {{discount_percentage}}
- Por que agora: {{reason_urgency}}

**Social Proof**: {{testimonial}}

**Urgência Visual**:
- Countdown timer
- Estoque limitado: "Apenas {{units_left}} unidades"

**CTA Principal**: {{call_to_action}}
**CTA Secundário**: Aprenda mais

**Footer**: Lembrete de deadline

Tom: Urgente mas não desesperado""",
        "tags": ["email-promo", "urgencia", "escassez", "ofertas"]
    },
    {
        "name": "E-mail de Carrinho Abandonado",
        "description": "Sequência de recuperação de carrinho abandonado. 3 e-mails com timing estratégico para recuperar vendas perdidas.",
        "category": "email",
        "icon": "🛒",
        "prompt": """Crie sequência de recuperação de carrinho para {{product_name}}.

**E-mail 1 (1 hora depois) - Lembrete Amigável**:
Assunto: "Esqueceu algo? {{product_name}} está te esperando"
- Mostre itens do carrinho
- CTA: "Finalizar Compra"
- Sem pressão

**E-mail 2 (24h depois) - Incentivo**:
Assunto: "{{discount}}% OFF no seu carrinho!"
- Ofereça desconto: {{incentive_offer}}
- Depoimento de cliente satisfeito
- Garantia: {{guarantee}}
- CTA urgente

**E-mail 3 (72h depois) - Última Chance**:
Assunto: "Última chance: seu carrinho expira em breve"
- Urgência final
- FAQ sobre objeções comuns
- Suporte disponível: {{support_contact}}
- CTA: Comprar agora

**Elementos**: Imagens dos produtos, preço total, frete grátis se aplicável""",
        "tags": ["carrinho-abandonado", "recuperacao", "ecommerce", "conversao"]
    },
    {
        "name": "Newsletter Semanal - Value-First",
        "description": "Newsletter semanal focada em valor para manter engajamento. 80% conteúdo útil, 20% promocional.",
        "category": "email",
        "icon": "📰",
        "prompt": """Escreva newsletter semanal para {{audience}}.

**Assunto**: Curiosidade + valor
"{{intriguing_headline}}"

**Intro** (50 palavras):
Cumprimento pessoal + contexto da semana

**Seção 1 - Conteúdo Principal** (200 palavras):
{{main_topic}}:
- Insight prático
- Exemplo ou case
- Takeaway acionável

**Seção 2 - Quick Tips**:
3-5 dicas rápidas sobre {{secondary_topic}}

**Seção 3 - Curadoria**:
"Leituras da semana"
- Artigo recomendado: {{article_link}}
- Tool útil: {{tool_recommendation}}
- Stat interessante: {{statistic}}

**Seção 4 - Soft Promo** (20% do conteúdo):
Mencione {{product_service}} naturalmente
CTA suave: {{soft_cta}}

**Footer**: P.S. pessoal ou behind-the-scenes

Tom: Amigável, útil, pessoal""",
        "tags": ["newsletter", "value-first", "engajamento", "conteudo"]
    },
    {
        "name": "E-mail de Re-engajamento (Win-back)",
        "description": "E-mail para reativar assinantes inativos. Reconquista atenção com oferta especial e redescoberta de valor.",
        "category": "email",
        "icon": "💔",
        "prompt": """Crie e-mail de re-engajamento para assinantes inativos há {{inactive_period}}.

**Assunto**: Honesto e direto
"Sentimos sua falta, {{subscriber_name}}"
ou "Ainda quer receber nossos e-mails?"

**Abertura**: Reconhecimento
"Notamos que faz tempo que você não {{desired_action}}"

**Value Reminder** (100 palavras):
Relembre o que eles estão perdendo:
- {{benefit_1}}
- {{benefit_2}}
- {{benefit_3}}

**What's New**: Mostre novidades desde que pararam de engajar
{{new_features}}

**Win-back Offer**:
"Volte com {{special_offer}}"
CTA: {{reactivation_cta}}

**Alternative CTA**:
"Prefere ajustar preferências de e-mail?"
[Gerenciar Preferências]

**Last Resort**:
"Não quer mais receber? [Descadastrar]"
(Seja transparente)

Tom: Humilde, honesto, generoso""",
        "tags": ["re-engajamento", "winback", "reativacao", "inativos"]
    },
    {
        "name": "E-mail de Lançamento de Produto",
        "description": "E-mail anunciando novo produto com storytelling e antecipação. Cria excitement e drive para vendas iniciais.",
        "category": "email",
        "icon": "🚀",
        "prompt": """Escreva e-mail de lançamento para {{new_product}}.

**Assunto**: Mystery + excitement
"{{teaser_subject}}" (não revele tudo)

**Pre-header**: "Você está entre os primeiros a saber..."

**Storytelling Opening** (150 palavras):
Conte história de por que criaram {{new_product}}:
- Problema que identificaram: {{origin_story}}
- Jornada de criação
- Paixão por resolver {{customer_pain_point}}

**The Reveal**:
"Apresentamos: {{new_product}}"
Imagem hero do produto

**Key Features** (3-5 bullet points):
Foco em benefícios, não especificações
✨ {{feature_benefit_1}}
✨ {{feature_benefit_2}}
✨ {{feature_benefit_3}}

**Early Bird Offer**:
"Exclusivo para assinantes: {{launch_offer}}"
Válido até: {{deadline}}

**CTA**: "Seja um dos primeiros"
{{purchase_link}}

**P.S.**: Behind-the-scenes ou easter egg

Tom: Entusiasmado, storytelling, exclusivo""",
        "tags": ["lancamento", "produto-novo", "excitement", "early-access"]
    },
    {
        "name": "E-mail Educacional - Tutorial/How-to",
        "description": "E-mail tutorial ensinando como fazer algo relevante. Estabelece autoridade e gera confiança através de educação.",
        "category": "email",
        "icon": "🎓",
        "prompt": """Crie e-mail tutorial sobre "Como {{tutorial_goal}}".

**Assunto**: Promessa clara
"Como {{achieve_result}} em {{timeframe}}"

**Intro**: Por que isso importa
"Se você {{struggle}}, este guia é para você."

**Tutorial em Passos** (300-400 palavras):

**Passo 1**: {{step_1_title}}
- O que fazer: {{step_1_action}}
- Por quê: {{step_1_reasoning}}
- Exemplo: {{step_1_example}}

**Passo 2**: {{step_2_title}}
[mesma estrutura]

**Passo 3**: {{step_3_title}}
[mesma estrutura]

**Pro Tips**:
💡 {{bonus_tip_1}}
💡 {{bonus_tip_2}}

**Common Mistakes**: O que evitar

**Tools Needed**: {{required_tools}}

**CTA Natural**:
"Quer {{tutorial_goal}} no autopilot? {{product_service}} faz isso por você."
[Soft sell, não agressivo]

**Next Steps**: O que fazer depois

Tom: Educativo, passo-a-passo, empoderador""",
        "tags": ["educacional", "tutorial", "how-to", "autoridade"]
    },
    {
        "name": "E-mail de Feedback/Pesquisa",
        "description": "E-mail pedindo feedback de clientes. Mostra que você se importa e coleta insights valiosos para melhorias.",
        "category": "email",
        "icon": "📋",
        "prompt": """Escreva e-mail de pesquisa de satisfação para {{customer_segment}}.

**Assunto**: Pessoal e direto
"{{subscriber_name}}, sua opinião importa"

**Abertura**: Gratidão
"Obrigado por ser cliente/assinante há {{relationship_duration}}"

**Why We're Asking** (50 palavras):
"Queremos melhorar {{aspect}} e sua opinião é essencial"

**The Ask**:
"Leva apenas {{estimated_time}} minutos"

**Questões principais**:
1. Como avalia {{product_service}}? (1-10)
2. O que você mais gosta?
3. O que podemos melhorar?
4. Recomendaria para um amigo? (NPS)
5. {{custom_question}}

**Incentive** (opcional):
"Como agradecimento: {{reward}}"
(desconto, conteúdo exclusivo, sorteio)

**CTA**: [Responder Pesquisa] - botão grande

**Privacy**: "Suas respostas são confidenciais"

**Alternative CTA**: "Prefere feedback por e-mail? Responda diretamente"

Tom: Genuíno, agradecido, respeitoso do tempo""",
        "tags": ["feedback", "pesquisa", "nps", "customer-success"]
    }
]

# Load existing templates
json_path = os.path.join(os.path.dirname(__file__), 'data', 'ai_templates.json')

with open(json_path, 'r', encoding='utf-8') as f:
    existing_templates = json.load(f)

# Add new templates
existing_templates.extend(additional_templates)

# Save back
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(existing_templates, f, ensure_ascii=False, indent=2)

print(f"✅ Added {len(additional_templates)} email templates")
print(f"📊 Total templates: {len(existing_templates)}")

# Count by category
categories = {}
for t in existing_templates:
    cat = t['category']
    categories[cat] = categories.get(cat, 0) + 1

print("\n📋 Templates by category:")
for cat, count in sorted(categories.items()):
    print(f"  {cat}: {count}")
