"""
Script to create 18 workflow templates for marketing agencies
Run after AI templates are seeded
"""

import json
import os
import uuid

def generate_workflow_uuid(name: str, category: str) -> str:
    """Generate deterministic UUID v5 from workflow name + category"""
    combined = f"{name}:{category}"
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
    return str(uuid.uuid5(namespace, combined))

# All 18 workflow templates
workflow_templates = [
    # PAID ADS CATEGORY (5 workflows)
    {
        "name": "Campanha Completa Meta Ads",
        "description": "Gera campanha completa para Meta (Facebook/Instagram): 15 headlines, 5 descrições, 3 imagens de anúncio e copy da landing page.",
        "category": "paid_ads",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["product_service", "target_audience", "main_benefit", "campaign_goal", "brand_guidelines"]
                }
            },
            {
                "id": "headlines_node",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "Gerar Headlines",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Gere 15 headlines para anúncios Meta sobre {{input.product_service}} direcionados a {{input.target_audience}}. Use framework AIDA. Cada headline: 25-40 caracteres, enfatizar {{input.main_benefit}}. Siga {{input.brand_guidelines}} para tom.",
                    "temperature": 0.8,
                    "max_tokens": 1000
                }
            },
            {
                "id": "descriptions_node",
                "type": "text_generation",
                "position": {"x": 100, "y": 400},
                "data": {
                    "label": "Gerar Descrições",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Gere 5 descrições de anúncio Meta para {{input.product_service}} complementando: {{headlines_node.content}}. Cada descrição: 100-125 caracteres, CTA clara, enfatizar {{input.main_benefit}}.",
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            },
            {
                "id": "images_node",
                "type": "image_generation",
                "position": {"x": 400, "y": 250},
                "data": {
                    "label": "Criar Imagens de Anúncio",
                    "model": "openai/dall-e-3",
                    "prompt": "Crie imagem de anúncio profissional para {{input.product_service}} direcionada a {{input.target_audience}}. Estilo: moderno, limpo, visualmente atraente. Mostrar {{input.main_benefit}} visualmente. Seguir {{input.brand_guidelines}} para cores.",
                    "count": 3,
                    "size": "1024x1024"
                }
            },
            {
                "id": "landing_page_node",
                "type": "text_generation",
                "position": {"x": 250, "y": 550},
                "data": {
                    "label": "Copy Landing Page",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Escreva copy completo para landing page que suporta campanha: Headlines: {{headlines_node.content}}, Descrições: {{descriptions_node.content}}. Incluir: Hero section (headline + subheadline + CTA), benefícios, social proof, CTA secundário. Produto: {{input.product_service}}, Objetivo: {{input.campaign_goal}}.",
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 250, "y": 700},
                "data": {
                    "label": "Campanha Completa",
                    "summary": "Campanha Meta Ads completa: 15 headlines, 5 descrições, 3 imagens, copy landing page"
                }
            }
        ],
        "edges_json": [
            {"id": "edge1", "source": "start_node", "target": "headlines_node"},
            {"id": "edge2", "source": "headlines_node", "target": "descriptions_node"},
            {"id": "edge3", "source": "start_node", "target": "images_node"},
            {"id": "edge4", "source": "descriptions_node", "target": "landing_page_node"},
            {"id": "edge5", "source": "images_node", "target": "landing_page_node"},
            {"id": "edge6", "source": "landing_page_node", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7, "max_tokens": 1500},
        "is_recommended": True
    },

    {
        "name": "Teste A/B - Google Search Ads",
        "description": "Cria 3 variações completas de anúncios Google para teste A/B. Cada variação usa framework diferente (AIDA, PAS, FAB) para comparar performance.",
        "category": "paid_ads",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["keyword_target", "service_offering", "unique_selling_point", "target_location"]
                }
            },
            {
                "id": "variant_a_aida",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "Variação A (AIDA)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie anúncio Google Search para {{input.keyword_target}} usando framework AIDA. Serviço: {{input.service_offering}}, USP: {{input.unique_selling_point}}, Localização: {{input.target_location}}. 3 headlines (30 chars), 2 descriptions (90 chars), extensões de local/chamada.",
                    "temperature": 0.7
                }
            },
            {
                "id": "variant_b_pas",
                "type": "text_generation",
                "position": {"x": 300, "y": 250},
                "data": {
                    "label": "Variação B (PAS)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie anúncio Google Search para {{input.keyword_target}} usando framework PAS (Problema-Agitação-Solução). Serviço: {{input.service_offering}}, USP: {{input.unique_selling_point}}, Localização: {{input.target_location}}. 3 headlines, 2 descriptions.",
                    "temperature": 0.7
                }
            },
            {
                "id": "variant_c_fab",
                "type": "text_generation",
                "position": {"x": 500, "y": 250},
                "data": {
                    "label": "Variação C (FAB)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie anúncio Google Search para {{input.keyword_target}} usando framework FAB (Features-Advantages-Benefits). Serviço: {{input.service_offering}}, USP: {{input.unique_selling_point}}, Localização: {{input.target_location}}. 3 headlines, 2 descriptions.",
                    "temperature": 0.7
                }
            },
            {
                "id": "testing_guide",
                "type": "text_generation",
                "position": {"x": 300, "y": 400},
                "data": {
                    "label": "Guia de Teste",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Baseado nas 3 variações criadas (AIDA: {{variant_a_aida.content}}, PAS: {{variant_b_pas.content}}, FAB: {{variant_c_fab.content}}), crie guia de teste A/B: hipóteses, KPIs a monitorar, tamanho de amostra recomendado, duração mínima do teste, critérios de decisão.",
                    "temperature": 0.6
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 300, "y": 550},
                "data": {
                    "label": "Teste A/B Completo",
                    "summary": "3 variações de anúncio Google (AIDA, PAS, FAB) + guia de teste"
                }
            }
        ],
        "edges_json": [
            {"id": "edge1", "source": "start_node", "target": "variant_a_aida"},
            {"id": "edge2", "source": "start_node", "target": "variant_b_pas"},
            {"id": "edge3", "source": "start_node", "target": "variant_c_fab"},
            {"id": "edge4", "source": "variant_a_aida", "target": "testing_guide"},
            {"id": "edge5", "source": "variant_b_pas", "target": "testing_guide"},
            {"id": "edge6", "source": "variant_c_fab", "target": "testing_guide"},
            {"id": "edge7", "source": "testing_guide", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7},
        "is_recommended": True
    },

    {
        "name": "Campanha LinkedIn Ads B2B Completa",
        "description": "Gera campanha completa para LinkedIn Ads focada em B2B: copy de anúncios, landing page para geração de leads, sequência de follow-up.",
        "category": "paid_ads",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["solution_type", "target_industry", "job_titles", "lead_magnet_offer", "company_credibility"]
                }
            },
            {
                "id": "ad_copy_node",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "Copy Anúncio LinkedIn",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 5 anúncios LinkedIn para {{input.solution_type}} direcionados a {{input.job_titles}} na indústria {{input.target_industry}}. Tom: profissional, B2B, value-driven. Headline (150 chars), texto (600 chars), CTA para baixar {{input.lead_magnet_offer}}. Credibilidade: {{input.company_credibility}}.",
                    "temperature": 0.7,
                    "max_tokens": 1200
                }
            },
            {
                "id": "landing_page_node",
                "type": "text_generation",
                "position": {"x": 100, "y": 400},
                "data": {
                    "label": "Landing Page Lead Gen",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Escreva landing page B2B para capturar leads de {{input.job_titles}} interessados em {{input.lead_magnet_offer}}. Incluir: headline focada em ROI, bullet points de benefícios, formulário (nome, email, empresa, cargo), social proof ({{input.company_credibility}}), garantia de privacidade.",
                    "temperature": 0.7,
                    "max_tokens": 1500
                }
            },
            {
                "id": "followup_sequence",
                "type": "text_generation",
                "position": {"x": 100, "y": 550},
                "data": {
                    "label": "Sequência de Follow-up",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie sequência de 3 e-mails de follow-up para leads que baixaram {{input.lead_magnet_offer}}: E-mail 1 (imediato): entregar recurso + introdução. E-mail 2 (3 dias): case study relevante. E-mail 3 (7 dias): agendar demo/consulta sobre {{input.solution_type}}. Tom B2B profissional.",
                    "temperature": 0.7,
                    "max_tokens": 1500
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 700},
                "data": {
                    "label": "Campanha B2B Completa",
                    "summary": "Campanha LinkedIn B2B: 5 anúncios + landing page + 3 e-mails follow-up"
                }
            }
        ],
        "edges_json": [
            {"id": "edge1", "source": "start_node", "target": "ad_copy_node"},
            {"id": "edge2", "source": "ad_copy_node", "target": "landing_page_node"},
            {"id": "edge3", "source": "landing_page_node", "target": "followup_sequence"},
            {"id": "edge4", "source": "followup_sequence", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7, "max_tokens": 1500},
        "is_recommended": True
    },

    {
        "name": "Retargeting Campaign - Multi-Stage",
        "description": "Cria jornada de retargeting em 3 estágios baseada no comportamento: visitantes (awareness), abandonou carrinho (consideração), quase-comprador (conversão).",
        "category": "paid_ads",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["product_catalog", "average_order_value", "conversion_barriers", "brand_positioning"]
                }
            },
            {
                "id": "stage1_awareness",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "Estágio 1: Awareness",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 3 anúncios de retargeting para visitantes do site (awareness stage) sobre {{input.product_catalog}}. Objetivo: relembrar valor, não vender diretamente. Tom: educativo, útil. CTA: explorar produtos, ler reviews. Posicionamento: {{input.brand_positioning}}.",
                    "temperature": 0.7
                }
            },
            {
                "id": "stage2_consideration",
                "type": "text_generation",
                "position": {"x": 100, "y": 400},
                "data": {
                    "label": "Estágio 2: Consideração",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 3 anúncios para quem abandonou carrinho (consideration stage). Produto: {{input.product_catalog}}, Barreiras: {{input.conversion_barriers}}. Incluir: oferta especial (5-10% desconto), urgência suave, social proof, garantia. CTA: finalizar compra.",
                    "temperature": 0.7
                }
            },
            {
                "id": "stage3_conversion",
                "type": "text_generation",
                "position": {"x": 100, "y": 550},
                "data": {
                    "label": "Estágio 3: Conversão",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 3 anúncios finais para quase-compradores (visitaram checkout mas não finalizaram). Oferta agressiva: desconto maior ou frete grátis se AOV {{input.average_order_value}} justificar. Urgência: prazo de 24-48h. Remover objeções finais. CTA urgente.",
                    "temperature": 0.7
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 700},
                "data": {
                    "label": "Jornada Retargeting Completa",
                    "summary": "9 anúncios de retargeting em 3 estágios (awareness, consideração, conversão)"
                }
            }
        ],
        "edges_json": [
            {"id": "edge1", "source": "start_node", "target": "stage1_awareness"},
            {"id": "edge2", "source": "stage1_awareness", "target": "stage2_consideration"},
            {"id": "edge3", "source": "stage2_consideration", "target": "stage3_conversion"},
            {"id": "edge4", "source": "stage3_conversion", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7},
        "is_recommended": False
    },

    {
        "name": "Seasonal Campaign Generator",
        "description": "Gera campanha sazonal completa (Black Friday, Natal, etc.): anúncios, e-mails promocionais, posts sociais, countdown copy.",
        "category": "paid_ads",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["seasonal_event", "product_selection", "discount_offer", "campaign_duration", "brand_voice"]
                }
            },
            {
                "id": "ads_node",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "Anúncios Sazonais",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 6 anúncios para {{input.seasonal_event}} sobre {{input.product_selection}} com oferta {{input.discount_offer}}. Tom: {{input.brand_voice}} + urgência festiva. Mix de formatos: 3 Meta Ads + 3 Google Ads. Enfatizar prazo limitado: {{input.campaign_duration}}.",
                    "temperature": 0.8,
                    "max_tokens": 1500
                }
            },
            {
                "id": "email_promo",
                "type": "text_generation",
                "position": {"x": 100, "y": 400},
                "data": {
                    "label": "E-mail Promocional",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Escreva e-mail promocional para {{input.seasonal_event}}: Assunto urgente com emoji festivo, preview text, hero copy (oferta {{input.discount_offer}}), produtos em destaque ({{input.product_selection}}), countdown timer, CTA principal + secundário. Tom: {{input.brand_voice}}.",
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            },
            {
                "id": "social_posts",
                "type": "text_generation",
                "position": {"x": 100, "y": 550},
                "data": {
                    "label": "Posts Sociais",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 5 posts para redes sociais sobre {{input.seasonal_event}}: 2 posts teaser (pré-campanha), 2 posts durante campanha (urgência), 1 post última chance. Produtos: {{input.product_selection}}, Oferta: {{input.discount_offer}}. Incluir hashtags sazonais, emojis festivos.",
                    "temperature": 0.8,
                    "max_tokens": 1200
                }
            },
            {
                "id": "countdown_copy",
                "type": "text_generation",
                "position": {"x": 100, "y": 700},
                "data": {
                    "label": "Copy de Countdown",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Escreva copy para countdown em website/e-mails durante {{input.seasonal_event}}: Copy para 48h restantes, 24h, 12h, 6h, 1h, últimos minutos. Cada mensagem mais urgente que anterior. Oferta: {{input.discount_offer}}. Tom: urgente mas não desesperado.",
                    "temperature": 0.7
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 850},
                "data": {
                    "label": "Campanha Sazonal Completa",
                    "summary": "Campanha sazonal: 6 anúncios + e-mail promo + 5 posts sociais + copy countdown"
                }
            }
        ],
        "edges_json": [
            {"id": "edge1", "source": "start_node", "target": "ads_node"},
            {"id": "edge2", "source": "ads_node", "target": "email_promo"},
            {"id": "edge3", "source": "email_promo", "target": "social_posts"},
            {"id": "edge4", "source": "social_posts", "target": "countdown_copy"},
            {"id": "edge5", "source": "countdown_copy", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.75, "max_tokens": 1200},
        "is_recommended": False
    },

    # EMAIL MARKETING CATEGORY (4 workflows)
    {
        "name": "Sequência de Nutrição 6 E-mails",
        "description": "Jornada completa de nutrição de leads: boas-vindas → educação → caso de estudo → pitch soft → pitch hard → última chance.",
        "category": "email",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["subscriber_source", "pain_points", "solution_offering", "case_studies", "offer_details", "brand_voice"]
                }
            },
            {
                "id": "email1_welcome",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "E-mail 1: Boas-vindas (Dia 0)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Escreva e-mail de boas-vindas para assinante de {{input.subscriber_source}}. Tom: {{input.brand_voice}}. Incluir: agradecimento caloroso, entregar conteúdo prometido, estabelecer expectativas. 200-300 palavras. Assunto também.",
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            },
            {
                "id": "email2_education",
                "type": "text_generation",
                "position": {"x": 100, "y": 380},
                "data": {
                    "label": "E-mail 2: Educação (Dia 3)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail educativo abordando {{input.pain_points}}. Entregar valor sem vender. Construir credibilidade. Tom: {{input.brand_voice}}. CTA soft: explorar recursos. 250-350 palavras. Assunto também.",
                    "temperature": 0.7,
                    "max_tokens": 900
                }
            },
            {
                "id": "email3_case_study",
                "type": "text_generation",
                "position": {"x": 100, "y": 510},
                "data": {
                    "label": "E-mail 3: Caso de Estudo (Dia 7)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail de caso de estudo baseado em {{input.case_studies}}. Mostrar transformação: antes/depois. Resultados mensuráveis. Introduzir {{input.solution_offering}} sutilmente. 300-400 palavras. Assunto também.",
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            },
            {
                "id": "email4_soft_pitch",
                "type": "text_generation",
                "position": {"x": 100, "y": 640},
                "data": {
                    "label": "E-mail 4: Pitch Soft (Dia 10)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Introduzir {{input.solution_offering}} de forma consultiva. Não vender diretamente. Explicar como funciona, benefícios, quem é ideal. CTA: saber mais ou agendar chamada. 250-350 palavras. Assunto também.",
                    "temperature": 0.7,
                    "max_tokens": 900
                }
            },
            {
                "id": "email5_hard_pitch",
                "type": "text_generation",
                "position": {"x": 100, "y": 770},
                "data": {
                    "label": "E-mail 5: Pitch Hard (Dia 14)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Oferta direta para {{input.solution_offering}} com {{input.offer_details}}. Incluir: benefícios claros, prova social, garantia, urgência suave. CTA: comprar/assinar. 300-400 palavras. Assunto também.",
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            },
            {
                "id": "email6_last_chance",
                "type": "text_generation",
                "position": {"x": 100, "y": 900},
                "data": {
                    "label": "E-mail 6: Última Chance (Dia 17)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail de última chance para {{input.solution_offering}}. Tom: urgência respeitosa. Recapitular valor, enfatizar prazo, remover objeções. CTA: ação imediata. 'Última chance antes de pausar comunicação'. 200-300 palavras. Assunto urgente.",
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 1030},
                "data": {
                    "label": "Sequência Completa",
                    "summary": "6 e-mails de nutrição: boas-vindas, educação, caso, pitch soft, pitch hard, última chance"
                }
            }
        ],
        "edges_json": [
            {"id": "e1", "source": "start_node", "target": "email1_welcome"},
            {"id": "e2", "source": "email1_welcome", "target": "email2_education"},
            {"id": "e3", "source": "email2_education", "target": "email3_case_study"},
            {"id": "e4", "source": "email3_case_study", "target": "email4_soft_pitch"},
            {"id": "e5", "source": "email4_soft_pitch", "target": "email5_hard_pitch"},
            {"id": "e6", "source": "email5_hard_pitch", "target": "email6_last_chance"},
            {"id": "e7", "source": "email6_last_chance", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7, "max_tokens": 1000},
        "is_recommended": True
    },

    {
        "name": "Campanha de Re-engajamento (Winback)",
        "description": "Sequência de 4 e-mails para reativar assinantes inativos: reconhecimento → valor perdido → oferta especial → última chance.",
        "category": "email",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["inactive_period", "value_proposition", "new_features", "winback_incentive"]
                }
            },
            {
                "id": "email1_acknowledge",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "E-mail 1: Reconhecimento",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail para inativos há {{input.inactive_period}}. Assunto honesto: 'Sentimos sua falta'. Reconhecer ausência. Tom: humilde, honesto, sem pressão. Relembrar valor: {{input.value_proposition}}. CTA suave: ver o que há de novo. 150-250 palavras.",
                    "temperature": 0.7
                }
            },
            {
                "id": "email2_value",
                "type": "text_generation",
                "position": {"x": 100, "y": 380},
                "data": {
                    "label": "E-mail 2: Valor Perdido (3 dias depois)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Mostrar o que estão perdendo. Novidades desde que pararam: {{input.new_features}}. Depoimentos de usuários ativos. Benefícios perdidos. Tom: informativo, não acusatório. CTA: explorar novidades. 200-300 palavras.",
                    "temperature": 0.7
                }
            },
            {
                "id": "email3_offer",
                "type": "text_generation",
                "position": {"x": 100, "y": 510},
                "data": {
                    "label": "E-mail 3: Oferta Especial (7 dias depois)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Oferta de retorno: {{input.winback_incentive}}. 'Volte com desconto exclusivo'. Reforçar valor: {{input.value_proposition}}. Prazo de 7 dias para oferta. CTA: reativar/voltar. 200-300 palavras. Assunto: oferta irresistível.",
                    "temperature": 0.7
                }
            },
            {
                "id": "email4_final",
                "type": "text_generation",
                "position": {"x": 100, "y": 640},
                "data": {
                    "label": "E-mail 4: Última Chance ou Adeus (14 dias depois)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail final. Opção 1: Última chance para {{input.winback_incentive}} (prazo final). Opção 2: 'Ainda quer receber e-mails?' com botão descadastrar claro. Tom: respeitoso, transparente. Oferecer ajustar preferências. 150-200 palavras.",
                    "temperature": 0.7
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 770},
                "data": {
                    "label": "Campanha Winback Completa",
                    "summary": "4 e-mails de re-engajamento: reconhecimento, valor, oferta, última chance"
                }
            }
        ],
        "edges_json": [
            {"id": "e1", "source": "start_node", "target": "email1_acknowledge"},
            {"id": "e2", "source": "email1_acknowledge", "target": "email2_value"},
            {"id": "e3", "source": "email2_value", "target": "email3_offer"},
            {"id": "e4", "source": "email3_offer", "target": "email4_final"},
            {"id": "e5", "source": "email4_final", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7},
        "is_recommended": False
    },

    {
        "name": "Newsletter Semanal Automatizada",
        "description": "Gera newsletter semanal completa: conteúdo principal, quick tips, curadoria de links, soft promo, P.S. pessoal.",
        "category": "email",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["main_topic", "secondary_topic", "audience_persona", "product_mention", "personal_touch"]
                }
            },
            {
                "id": "subject_preheader",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "Assunto + Pre-header",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie 5 opções de assunto de e-mail sobre {{input.main_topic}} para {{input.audience_persona}}. Cada assunto: curioso, valor claro, 40-60 caracteres. Também escreva pre-header (100 chars) para cada opção.",
                    "temperature": 0.8
                }
            },
            {
                "id": "main_content",
                "type": "text_generation",
                "position": {"x": 100, "y": 380},
                "data": {
                    "label": "Conteúdo Principal",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Escreva seção principal da newsletter sobre {{input.main_topic}} para {{input.audience_persona}}. Incluir: insight prático, exemplo/case, takeaway acionável. Tom: amigável, útil. 200-300 palavras.",
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            },
            {
                "id": "quick_tips",
                "type": "text_generation",
                "position": {"x": 100, "y": 510},
                "data": {
                    "label": "Quick Tips",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie seção 'Quick Tips' com 5 dicas rápidas sobre {{input.secondary_topic}} para {{input.audience_persona}}. Cada dica: 1 frase, acionável, formatada em bullet points.",
                    "temperature": 0.7
                }
            },
            {
                "id": "curated_links",
                "type": "text_generation",
                "position": {"x": 100, "y": 640},
                "data": {
                    "label": "Curadoria de Links",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie seção 'Leituras da Semana' para {{input.audience_persona}} relacionado a {{input.main_topic}}: 1 artigo recomendado, 1 ferramenta útil, 1 estatística interessante. Para cada item: título, breve descrição (1 frase), por que vale a pena.",
                    "temperature": 0.7
                }
            },
            {
                "id": "soft_promo",
                "type": "text_generation",
                "position": {"x": 100, "y": 770},
                "data": {
                    "label": "Soft Promo + P.S.",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "Crie soft promo (20% do conteúdo) mencionando {{input.product_mention}} de forma natural, não agressiva. CTA suave. Também P.S. pessoal: {{input.personal_touch}} ou behind-the-scenes. Tom: autêntico.",
                    "temperature": 0.7
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 900},
                "data": {
                    "label": "Newsletter Completa",
                    "summary": "Newsletter semanal: assuntos, conteúdo principal, tips, curadoria, promo, P.S."
                }
            }
        ],
        "edges_json": [
            {"id": "e1", "source": "start_node", "target": "subject_preheader"},
            {"id": "e2", "source": "subject_preheader", "target": "main_content"},
            {"id": "e3", "source": "main_content", "target": "quick_tips"},
            {"id": "e4", "source": "quick_tips", "target": "curated_links"},
            {"id": "e5", "source": "curated_links", "target": "soft_promo"},
            {"id": "e6", "source": "soft_promo", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.7},
        "is_recommended": True
    },

    {
        "name": "E-mail de Lançamento de Produto",
        "description": "Sequência de 3 e-mails para lançamento: teaser (criar curiosidade) → revelação (anunciar produto) → early bird (oferta limitada).",
        "category": "email",
        "nodes_json": [
            {
                "id": "start_node",
                "type": "start",
                "position": {"x": 100, "y": 100},
                "data": {
                    "label": "Início",
                    "input_variables": ["new_product_name", "origin_story", "key_features", "launch_offer", "launch_date"]
                }
            },
            {
                "id": "email1_teaser",
                "type": "text_generation",
                "position": {"x": 100, "y": 250},
                "data": {
                    "label": "E-mail 1: Teaser (7 dias antes)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail teaser para lançamento de {{input.new_product_name}} em {{input.launch_date}}. NÃO revelar produto ainda. Criar mistério e expectativa. História de por que criamos: {{input.origin_story}}. Assunto: mystery/curiosidade. CTA: 'estar entre os primeiros a saber'. 150-250 palavras.",
                    "temperature": 0.8
                }
            },
            {
                "id": "email2_reveal",
                "type": "text_generation",
                "position": {"x": 100, "y": 380},
                "data": {
                    "label": "E-mail 2: Revelação (Dia do lançamento)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail de revelação: 'Apresentamos {{input.new_product_name}}'! Storytelling sobre criação ({{input.origin_story}}), features principais ({{input.key_features}}) focando benefícios não specs. Tom: entusiasmado, storytelling. Imagem hero do produto. 250-350 palavras. Assunto: excitement.",
                    "temperature": 0.7,
                    "max_tokens": 900
                }
            },
            {
                "id": "email3_early_bird",
                "type": "text_generation",
                "position": {"x": 100, "y": 510},
                "data": {
                    "label": "E-mail 3: Early Bird (2 dias depois)",
                    "model": "anthropic/claude-3.5-sonnet",
                    "prompt": "E-mail de oferta early bird para {{input.new_product_name}}. Oferta exclusiva assinantes: {{input.launch_offer}}. Urgência: prazo limitado (48-72h). Social proof se disponível. Behind-the-scenes ou easter egg no P.S. CTA: 'Seja dos primeiros'. 200-300 palavras. Assunto: exclusividade + urgência.",
                    "temperature": 0.7
                }
            },
            {
                "id": "finish_node",
                "type": "finish",
                "position": {"x": 100, "y": 640},
                "data": {
                    "label": "Lançamento Completo",
                    "summary": "Sequência de lançamento: teaser, revelação, early bird offer"
                }
            }
        ],
        "edges_json": [
            {"id": "e1", "source": "start_node", "target": "email1_teaser"},
            {"id": "e2", "source": "email1_teaser", "target": "email2_reveal"},
            {"id": "e3", "source": "email2_reveal", "target": "email3_early_bird"},
            {"id": "e4", "source": "email3_early_bird", "target": "finish_node"}
        ],
        "default_params_json": {"model": "anthropic/claude-3.5-sonnet", "temperature": 0.75},
        "is_recommended": False
    }
]

# Continue with remaining workflows in next message due to length...
print(f"✅ Created workflow templates data structure")
print(f"📊 Current count: {len(workflow_templates)} workflows")
print("\n⚠️  Note: This is part 1/2 - need to add remaining workflows")
