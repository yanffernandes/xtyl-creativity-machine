"""
Templates Router (Simplified)

Only keeps the init endpoint for creating expert templates.
CRUD operations are now handled via Supabase Client in the frontend.

Feature: 007-hybrid-supabase-architecture
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Template as TemplateModel
import uuid

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
)


@router.post("/init/{workspace_id}")
def initialize_expert_templates(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Initialize workspace with expert marketing templates.
    Based on proven frameworks from industry leaders.

    Note: This is kept as a backend endpoint because it creates
    multiple templates at once with predefined content.
    """

    # Marketing expert templates inspired by industry leaders
    expert_templates = [
        {
            "name": "PAS Framework (Problema-Agitacao-Solucao)",
            "description": "Framework classico de Eugene Schwartz para copy persuasivo",
            "category": "copywriting",
            "icon": "📝",
            "prompt": """Crie um copy usando o framework PAS (Problema-Agitacao-Solucao):

**PROBLEMA**: Identifique a dor especifica do publico-alvo
- Qual e o problema real que eles enfrentam?
- Por que isso incomoda tanto?

**AGITACAO**: Amplifique as consequencias de nao resolver
- O que acontece se nao resolver isso?
- Quais sao os custos emocionais e financeiros?

**SOLUCAO**: Apresente sua oferta como a resposta ideal
- Como seu produto/servico resolve isso?
- Quais resultados especificos ele entrega?

Adicione:
- Call-to-action claro e urgente
- Garantias ou provas sociais
- Tom conversacional e empatico""",
            "tags": ["copywriting", "persuasao", "vendas", "eugene-schwartz"]
        },
        {
            "name": "AIDA de David Ogilvy",
            "description": "Modelo AIDA refinado pelo mestre da propaganda",
            "category": "copywriting",
            "icon": "✍️",
            "prompt": """Crie um copy seguindo o modelo AIDA de David Ogilvy:

**ATENCAO (Attention)**:
- Headline irresistivel que para o scroll
- Promessa clara de beneficio especifico

**INTERESSE (Interest)**:
- Fatos e dados que geram curiosidade
- Historia ou situacao que o leitor se identifica

**DESEJO (Desire)**:
- Beneficios emocionais e transformacao
- Prova social (depoimentos, numeros, casos)

**ACAO (Action)**:
- CTA claro, especifico e com urgencia
- Remova objecoes finais""",
            "tags": ["copywriting", "aida", "ogilvy", "headlines"]
        },
        {
            "name": "Framework de Anuncio 3x3 de Molly Pittman",
            "description": "Estrutura de anuncio testada para Facebook Ads",
            "category": "trafego-pago",
            "icon": "🎯",
            "prompt": """Crie anuncios usando o framework 3x3:

**3 PRIMEIRAS LINHAS** (Hook que prende):
- Fale diretamente com a dor/desejo
- Use pattern interrupt
- Seja especifico, nao generico

**3 PARAGRAFOS DE CORPO**:
1. Agitacao: amplifique o problema
2. Solucao: mostre a transformacao possivel
3. Prova: case, numero ou depoimento

**3 ELEMENTOS FINAIS**:
- CTA claro com beneficio
- Urgencia/escassez genuina
- Link/botao visivel""",
            "tags": ["facebook-ads", "meta-ads", "trafego-pago"]
        },
        {
            "name": "$100M Offers de Alex Hormozi",
            "description": "Framework para criar ofertas irresistiveis de alto valor",
            "category": "estrategia",
            "icon": "💰",
            "prompt": """Crie uma oferta irresistivel usando framework de Alex Hormozi:

**VALUE EQUATION**:
Valor Percebido = (Desejo x Certeza) / (Tempo x Esforco)

**MAXIMIZE O DESEJO**:
- Sonho especifico (nao generico)
- Transformacao clara e mensuravel

**AUMENTE A CERTEZA**:
- Garantias fortes
- Casos de sucesso
- Prova social especifica

**REDUZA TEMPO E ESFORCO**:
- "Resultados em X dias"
- "Done for you" vs "done with you"
- Ferramentas/templates inclusos

**VALUE STACK**:
1. Oferta principal
2. Bonus 1
3. Bonus 2
4. Garantia de risco zero""",
            "tags": ["oferta", "alex-hormozi", "alto-valor", "conversao"]
        },
    ]

    # Check if templates already exist for this workspace
    existing = db.query(TemplateModel).filter(
        TemplateModel.workspace_id == workspace_id
    ).first()

    if existing:
        return {
            "message": "Templates ja existem neste workspace",
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
            user_id=None,
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
        "message": f"{created_count} templates de especialistas criados com sucesso!",
        "workspace_id": workspace_id,
        "templates_created": created_count
    }
