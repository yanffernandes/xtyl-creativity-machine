from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import User, Template as TemplateModel
from schemas import Template, TemplateCreate, TemplateUpdate
from auth import get_current_user
import uuid

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
)


@router.get("/", response_model=List[Template])
def list_templates(
    workspace_id: Optional[str] = None,
    category: Optional[str] = None,
    include_system: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List templates available to the user.

    - System templates (global)
    - Workspace templates (if workspace_id provided)
    - User's own templates
    """
    query = db.query(TemplateModel).filter(TemplateModel.is_active == True)

    # Build filter for accessible templates
    filters = []

    if include_system:
        filters.append(TemplateModel.is_system == True)

    if workspace_id:
        filters.append(TemplateModel.workspace_id == workspace_id)

    # User's own templates
    filters.append(TemplateModel.user_id == current_user.id)

    # Combine with OR
    from sqlalchemy import or_
    query = query.filter(or_(*filters))

    # Filter by category if provided
    if category:
        query = query.filter(TemplateModel.category == category)

    # Order by usage count (most popular first), then by created_at
    query = query.order_by(
        TemplateModel.is_system.desc(),  # System templates first
        TemplateModel.usage_count.desc(),
        TemplateModel.created_at.desc()
    )

    return query.all()


@router.get("/{template_id}", response_model=Template)
def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template by ID."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check access
    if not template.is_system and template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return template


@router.post("/", response_model=Template)
def create_template(
    template: TemplateCreate,
    workspace_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user template.
    Templates are scoped to workspace if workspace_id is provided.
    """
    new_template = TemplateModel(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        user_id=current_user.id,
        name=template.name,
        description=template.description,
        category=template.category,
        icon=template.icon,
        prompt=template.prompt,
        tags=template.tags,
        is_system=False,
        is_active=True,
        usage_count=0
    )

    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return new_template


@router.put("/{template_id}", response_model=Template)
def update_template(
    template_id: str,
    template_update: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a user template (cannot update system templates)."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Only template owner can update
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot update this template")

    # Cannot update system templates
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot update system templates")

    # Update fields
    for field, value in template_update.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)

    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user template (soft delete by setting is_active=False)."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Only template owner can delete
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete this template")

    # Cannot delete system templates
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system templates")

    template.is_active = False
    db.commit()

    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/use")
def increment_usage(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Increment usage count when template is used."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.usage_count += 1
    db.commit()

    return {"message": "Usage count updated"}


@router.get("/categories/list")
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all template categories with counts."""
    from sqlalchemy import func, distinct

    # Get categories with counts
    categories = db.query(
        TemplateModel.category,
        func.count(TemplateModel.id).label('count')
    ).filter(
        TemplateModel.is_active == True
    ).group_by(TemplateModel.category).all()

    return [
        {"category": cat, "count": count}
        for cat, count in categories
    ]


@router.post("/init/{workspace_id}")
def initialize_expert_templates(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Initialize workspace with expert marketing templates.
    Based on proven frameworks from industry leaders.
    """

    # Marketing expert templates inspired by industry leaders
    expert_templates = [
        # === COPYWRITING - Eugene Schwartz, David Ogilvy ===
        {
            "name": "PAS Framework (Problema-Agitação-Solução)",
            "description": "Framework clássico de Eugene Schwartz para copy persuasivo",
            "category": "copywriting",
            "icon": "📝",
            "prompt": """Crie um copy usando o framework PAS (Problema-Agitação-Solução):

**PROBLEMA**: Identifique a dor específica do público-alvo
- Qual é o problema real que eles enfrentam?
- Por que isso incomoda tanto?

**AGITAÇÃO**: Amplifique as consequências de não resolver
- O que acontece se não resolver isso?
- Quais são os custos emocionais e financeiros?

**SOLUÇÃO**: Apresente sua oferta como a resposta ideal
- Como seu produto/serviço resolve isso?
- Quais resultados específicos ele entrega?

Adicione:
- Call-to-action claro e urgente
- Garantias ou provas sociais
- Tom conversacional e empático""",
            "tags": ["copywriting", "persuasão", "vendas", "eugene-schwartz"]
        },
        {
            "name": "AIDA de David Ogilvy",
            "description": "Modelo AIDA refinado pelo mestre da propaganda",
            "category": "copywriting",
            "icon": "✍️",
            "prompt": """Crie um copy seguindo o modelo AIDA de David Ogilvy:

**ATENÇÃO (Attention)**:
- Headline irresistível que para o scroll
- Promessa clara de benefício específico

**INTERESSE (Interest)**:
- Fatos e dados que geram curiosidade
- História ou situação que o leitor se identifica

**DESEJO (Desire)**:
- Benefícios emocionais e transformação
- Prova social (depoimentos, números, casos)

**AÇÃO (Action)**:
- CTA claro, específico e com urgência
- Remova objeções finais

Princípios Ogilvy:
- "Não escreva copy que você não mostraria para sua família"
- Fatos vendem, não adjetivos vazios
- Teste tudo, meça tudo""",
            "tags": ["copywriting", "aida", "ogilvy", "headlines"]
        },

        # === TRÁFEGO PAGO - Molly Pittman, Nicholas Kusmich ===
        {
            "name": "Framework de Anúncio 3x3 de Molly Pittman",
            "description": "Estrutura de anúncio testada por uma das maiores especialistas em Facebook Ads",
            "category": "trafego-pago",
            "icon": "🎯",
            "prompt": """Crie anúncios usando o framework 3x3 de Molly Pittman:

**3 PRIMEIRAS LINHAS** (Hook que prende):
- Fale diretamente com a dor/desejo
- Use pattern interrupt
- Seja específico, não genérico

**3 PARÁGRAFOS DE CORPO**:
1. Agitação: amplifique o problema
2. Solução: mostre a transformação possível
3. Prova: case, número ou depoimento

**3 ELEMENTOS FINAIS**:
- CTA claro com benefício
- Urgência/escassez genuína
- Link/botão visível

CRIATIVO VISUAL:
- Thumb-stopping (para o scroll)
- Texto mínimo na imagem
- Foco no benefício/resultado

Teste A/B:
- 3 variações de hook
- 2 criativos diferentes""",
            "tags": ["facebook-ads", "meta-ads", "tráfego-pago", "molly-pittman"]
        },
        {
            "name": "Perfect Webinar de Russell Brunson",
            "description": "Framework de apresentação de vendas do criador do ClickFunnels",
            "category": "trafego-pago",
            "icon": "🎬",
            "prompt": """Estruture uma campanha de webinar usando o Perfect Webinar:

**ORIGEM (The Big Domino)**:
- Qual é a crença limitante que impede a compra?
- Derrube essa crença primeiro

**3 SECRETS (Value Stack)**:
1. Secret #1: Quebre crença sobre o veículo
2. Secret #2: Quebre crença sobre estratégia interna
3. Secret #3: Quebre crença sobre implementação

**STACK & CLOSE**:
- Empilhe valor (bônus após bônus)
- Preço âncora vs preço real
- Garantia forte (reversal de risco)
- Urgência real (oferta limitada)

**FUNIL COMPLETO**:
- Anúncio de isca (registro grátis)
- Página de obrigado + indoctrination
- Emails de aquecimento (3-5 dias)
- Webinar ao vivo ou evergreen
- Follow-up pós-webinar""",
            "tags": ["webinar", "funil", "russell-brunson", "alto-ticket"]
        },

        # === SEO - Brian Dean, Neil Patel ===
        {
            "name": "Skyscraper Technique de Brian Dean",
            "description": "Técnica comprovada de SEO para criar conteúdo que ranqueia",
            "category": "seo",
            "icon": "🏗️",
            "prompt": """Aplique a Skyscraper Technique de Brian Dean:

**PASSO 1 - ENCONTRE CONTEÚDO LINKÁVEL**:
- Busque por [palavra-chave] no Google
- Identifique os top 3 artigos
- Use Ahrefs/SEMrush para ver backlinks

**PASSO 2 - CRIE ALGO MELHOR**:
- 10x mais completo e atualizado
- Adicione dados originais/pesquisas
- Melhor formatação (visual, escanabilidade)
- Infográficos, vídeos, ferramentas

**PASSO 3 - PROMOVA PARA QUEM LINKARIA**:
- Liste sites que linkaram para o conteúdo original
- Email pitch personalizado
- Mostre por que seu conteúdo é superior

**ELEMENTOS-CHAVE**:
- Título com número + palavra poderosa
- Introdução com gap de informação
- Subtítulos otimizados (H2, H3)
- Internal links estratégicos
- CTA para conversão""",
            "tags": ["seo", "link-building", "brian-dean", "conteúdo"]
        },
        {
            "name": "Content Multiplier de Neil Patel",
            "description": "Sistema de multiplicação de conteúdo para dominar SERPs",
            "category": "seo",
            "icon": "🚀",
            "prompt": """Use o Content Multiplier de Neil Patel:

**PILAR CENTRAL (Pillar Content)**:
- Guia definitivo 5000+ palavras
- Cobre TODO o tópico em profundidade
- Otimizado para palavra-chave principal

**CLUSTER CONTENT (8-12 artigos)**:
- Cada um foca em subtópico específico
- 1500-2500 palavras cada
- Todos linkam para o pilar central

**INTERNAL LINKING**:
- Pilar → Clusters (links contextuais)
- Clusters → Pilar (anchor text otimizado)
- Clusters ↔️ Clusters (tópicos relacionados)

**DISTRIBUIÇÃO MULTI-CANAL**:
1. Blog post otimizado
2. LinkedIn article (versão resumida)
3. Thread no Twitter/X (insights principais)
4. Vídeo YouTube (explicação visual)
5. Email newsletter (notificar audiência)

**ATUALIZAÇÃO CONTÍNUA**:
- Revisar a cada 6 meses
- Adicionar novos dados/exemplos
- Melhorar baseado em analytics""",
            "tags": ["seo", "content-marketing", "neil-patel", "clusters"]
        },

        # === ESTRATÉGIA - Gary Vaynerchuk, Alex Hormozi ===
        {
            "name": "Jab Jab Jab Right Hook de Gary Vee",
            "description": "Estratégia de conteúdo que gera valor antes de vender",
            "category": "estrategia",
            "icon": "🥊",
            "prompt": """Aplique a estratégia Jab Jab Jab Right Hook:

**JAB 1, 2, 3** (Entregar Valor):
1. Conteúdo educacional (ensine algo útil)
2. Conteúdo de entretenimento (inspire/divirta)
3. Conteúdo de conexão (história pessoal/behind scenes)

**RIGHT HOOK** (Pedido de Venda):
- Depois de 3 jabs, faça 1 oferta
- A oferta deve ser natural, não forçada
- CTA direto com benefício claro

**CONTEXTO DE PLATAFORMA**:
- Instagram: Visual + Stories + Reels
- LinkedIn: Profissional + Case studies
- TikTok: Entretenimento + Educação rápida
- Twitter/X: Opinião + Threads de valor

**CALENDÁRIO SUGERIDO**:
- Segunda: Jab (educação)
- Quarta: Jab (história/conexão)
- Sexta: Jab (entretenimento)
- Sábado: Right Hook (oferta)

**MÉTRICAS QUE IMPORTAM**:
- Engajamento (não só alcance)
- DMs e comentários profundos
- Conversões reais""",
            "tags": ["conteúdo", "gary-vee", "social-media", "estratégia"]
        },
        {
            "name": "$100M Offers de Alex Hormozi",
            "description": "Framework para criar ofertas irresistíveis de alto valor",
            "category": "estrategia",
            "icon": "💰",
            "prompt": """Crie uma oferta irresistível usando framework de Alex Hormozi:

**VALUE EQUATION**:
Valor Percebido = (Desejo × Certeza) / (Tempo × Esforço)

**MAXIMIZE O DESEJO**:
- Sonho específico (não genérico)
- Transformação clara e mensurável

**AUMENTE A CERTEZA**:
- Garantias fortes
- Casos de sucesso
- Prova social específica

**REDUZA TEMPO**:
- "Resultados em X dias"
- Atalhos e aceleradores

**REDUZA ESFORÇO**:
- "Done for you" vs "done with you"
- Ferramentas/templates inclusos

**VALUE STACK (Empilhamento)**:
1. Oferta principal ($X valor)
2. Bônus 1 ($Y valor)
3. Bônus 2 ($Z valor)
4. Garantia de risco zero
TOTAL: $X+Y+Z valor
Investimento: $Preço real

**SCARCITY REAL**:
- Limitação genuína (vagas, tempo)
- Consequência clara de não agir""",
            "tags": ["oferta", "alex-hormozi", "alto-valor", "conversão"]
        },

        # === EMAIL MARKETING - Andre Chaperon, Ben Settle ===
        {
            "name": "Soap Opera Sequence de Andre Chaperon",
            "description": "Sequência de emails narrativa que vicia e vende",
            "category": "email-marketing",
            "icon": "📧",
            "prompt": """Crie sequência Soap Opera Sequence:

**EMAIL 1 - SET THE STAGE**:
- Defina o cenário/contexto
- Apresente o personagem (você ou cliente)
- Open loop (pergunta sem resposta)

**EMAIL 2 - HIGH EMOTION**:
- Momento de transformação
- Conflito ou desafio enfrentado
- Mais open loops

**EMAIL 3 - EPIFANIA**:
- Descoberta que mudou tudo
- "Aha moment" específico
- Introduza sua solução sutilmente

**EMAIL 4 - RESOLUÇÃO URGENTE**:
- Mostre como aplicou a descoberta
- Resultados específicos
- CTA para sua oferta

**ELEMENTOS CRÍTICOS**:
- Subject lines curiosos (não clickbait)
- Um email = uma ideia
- Open loops em cada email
- História > pitch direto

**TIMING**:
- Email 1: Dia 1 (após opt-in)
- Email 2: Dia 2
- Email 3: Dia 3
- Email 4: Dia 4-5""",
            "tags": ["email", "sequencia", "storytelling", "andre-chaperon"]
        },
        {
            "name": "Daily Email Method de Ben Settle",
            "description": "Sistema de email diário que mantém audiência engajada",
            "category": "email-marketing",
            "icon": "📬",
            "prompt": """Aplique o Daily Email Method:

**ESTRUTURA DIÁRIA**:

**LINHA 1 - HOOK**:
- Fato curioso, história, observação
- Algo que gera curiosidade imediata

**CORPO - ENTRETENIMENTO + LIÇÃO**:
- Conte história ou faça observação
- Extraia lição ou princípio
- Seja controverso quando apropriado

**PIVOT NATURAL**:
- Conecte a lição ao seu produto/serviço
- Não force, seja natural

**CTA SIMPLES**:
- Um link, uma ação
- Sem explicação excessiva

**PRINCÍPIOS BEN SETTLE**:
- Email todo dia (consistência > perfeição)
- Entretenha primeiro, venda depois
- Seja você mesmo (personalidade forte)
- Nunca eduque gratuitamente (sempre conecte à oferta)

**SUBJECTS QUE FUNCIONAM**:
- Curiosos: "O erro de R$ 10 mil"
- Controversos: "Por que SEO é overrated"
- Pessoais: "Minha esposa odiou isso..."

**RECOMPENSA CURIOSIDADE**:
- Subject promete algo
- Email entrega (com twist)""",
            "tags": ["email-diário", "ben-settle", "relacionamento", "infoproduto"]
        },

        # === LANÇAMENTO - Jeff Walker, Erico Rocha ===
        {
            "name": "Product Launch Formula de Jeff Walker",
            "description": "Fórmula de lançamento que gerou bilhões em vendas",
            "category": "lancamento",
            "icon": "🚀",
            "prompt": """Execute um lançamento usando PLF:

**PRÉ-PRÉ-LANÇAMENTO** (7-14 dias antes):
- Crie antecipação
- Teaser do que vem
- Construa lista (lead magnet)

**PRÉ-LANÇAMENTO** (Conteúdo com venda embutida):

**PLC #1 - OPORTUNIDADE**:
- Mostre a transformação possível
- Prova que funciona (cases)
- Não venda ainda

**PLC #2 - TRANSFORMAÇÃO**:
- Como funciona (visão geral)
- Quebre objeções principais
- Mais prova social

**PLC #3 - POSSE ANTECIPADA**:
- Faça sentirem como donos
- Visualização clara do resultado
- Preparação para abertura

**LANÇAMENTO** (Carrinho aberto 7 dias):
- Dia 1-2: Abertura (empolgação)
- Dia 3-4: Meio (casos, FAQs)
- Dia 5-6: Último aviso
- Dia 7: FECHAMENTO (urgência real)

**ELEMENTOS ESSENCIAIS**:
- Comunidade (grupo/chat)
- Escassez real (fechar carrinho)
- Bônus estratégicos
- Live sessions (Q&A)""",
            "tags": ["lançamento", "jeff-walker", "plf", "infoproduto"]
        },
        {
            "name": "Fórmula de Lançamento Brasileiro",
            "description": "Adaptação para mercado BR com elementos culturais",
            "category": "lancamento",
            "icon": "🇧🇷",
            "prompt": """Lançamento adaptado para audiência brasileira:

**AQUECIMENTO** (10-14 dias):
- Conteúdo de valor (lives, posts)
- Construção de comunidade (WhatsApp/Telegram)
- Identificação de "superfãs"

**EVENTO DE ABERTURA**:
- Live de lançamento (noturno, 20-21h)
- Apresentação completa da oferta
- Bônus exclusivos para primeiras 24h

**CARRINHO ABERTO** (5-7 dias):
- Dia 1: Abertura explosiva + bônus limitado
- Dia 2-3: Cases e depoimentos
- Dia 4: FAQ ao vivo (derruba objeções)
- Dia 5: Último dia (urgência máxima)

**PARTICULARIDADES BR**:
- Parcelamento agressivo (até 12x)
- Garantia estendida (30-60 dias)
- Comunidade pós-venda (grupo VIP)
- Certificado/reconhecimento

**GATILHOS MENTAIS**:
- Prova social brasileira (não gringo)
- Parcelamento destacado
- "Investimento" não "preço"
- Comunidade forte

**PÓS-LANÇAMENTO**:
- Reabertura surpresa (1-2 dias)
- Lista de espera para próximo
- Upsell para quem comprou""",
            "tags": ["lançamento", "brasil", "comunidade", "digital"]
        }
    ]

    # Check if templates already exist for this workspace
    existing = db.query(TemplateModel).filter(
        TemplateModel.workspace_id == workspace_id
    ).first()

    if existing:
        return {
            "message": "Templates já existem neste workspace",
            "count": db.query(TemplateModel).filter(
                TemplateModel.workspace_id == workspace_id
            ).count()
        }

    # Create all templates
    created_count = 0
    for template_data in expert_templates:
        template = TemplateModel(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            user_id=None,  # Workspace template, not user-specific
            name=template_data["name"],
            description=template_data["description"],
            category=template_data["category"],
            icon=template_data["icon"],
            prompt=template_data["prompt"],
            tags=template_data["tags"],
            is_system=False,
            is_active=True,
            usage_count=0
        )
        db.add(template)
        created_count += 1

    db.commit()

    return {
        "message": f"✅ {created_count} templates de especialistas criados com sucesso!",
        "workspace_id": workspace_id,
        "templates_created": created_count,
        "categories": {
            "copywriting": 2,
            "trafego-pago": 2,
            "seo": 2,
            "estrategia": 2,
            "email-marketing": 2,
            "lancamento": 2
        }
    }
