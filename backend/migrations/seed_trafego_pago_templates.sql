-- Migration: Seed Trafego Pago Templates (Feature 019)
-- Date: 2025-12-05
-- Description: Seeds 15 templates de trafego pago com o novo formato
-- Run this in Supabase SQL Editor

-- Function to generate deterministic UUID v5
CREATE OR REPLACE FUNCTION generate_template_uuid(p_name text, p_category text)
RETURNS uuid AS $$
DECLARE
    namespace uuid := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    combined text := p_name || ':' || p_category;
BEGIN
    RETURN uuid_generate_v5(namespace, combined);
END;
$$ LANGUAGE plpgsql;

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert or update templates
INSERT INTO templates (
    id, workspace_id, user_id, name, description, category, icon, prompt,
    variables, initial_message, expert_name, estimated_outputs,
    is_system, is_active, is_featured, tags, usage_count, created_at
) VALUES

-- 1. Anuncio Meta Ads - AIDA Completo
(
    generate_template_uuid('Anuncio Meta Ads - AIDA Completo', 'trafego_pago'),
    NULL, NULL,
    'Anuncio Meta Ads - AIDA Completo',
    'Cria anuncios para Meta Ads usando o framework AIDA (Atencao, Interesse, Desejo, Acao) com headlines, texto primario e descricoes otimizados para conversao.',
    'trafego_pago',
    'target',
    E'Voce e um copywriter especialista em Meta Ads com 10+ anos de experiencia em campanhas de alta conversao.\n\nTAREFA: Criar conjunto completo de anuncios para Meta Ads usando o Framework AIDA.\n\nCONTEXTO DO CLIENTE:\n- Produto/Servico: {{produto}}\n- Dor do publico: {{publico_dor}}\n- Beneficio principal: {{beneficio}}\n- Oferta: {{oferta}}\n{{#if preco}}- Preco: {{preco}}{{/if}}\n\nIMPORTANTE: Use as informacoes do projeto (marca, publico-alvo, tom de voz) que estao no contexto para personalizar os anuncios.\n\nENTREGAVEIS:\n\n## Headlines (5 variacoes, max 40 caracteres)\nFoco em ATENCAO - interromper o scroll com curiosidade ou dor\n\n## Textos Primarios (3 variacoes, 125-250 caracteres)\nEstrutura AIDA completa:\n- A: Hook que captura atencao (1 linha)\n- I: Desenvolve interesse com problema/solucao (2-3 linhas)\n- D: Cria desejo com beneficios e prova (2-3 linhas)\n- A: CTA claro e urgente (1 linha)\n\n## Descricoes (3 variacoes, max 30 caracteres)\nReforco do CTA ou beneficio-chave\n\n## Recomendacoes\n- Melhor combinacao headline + texto\n- Sugestao de publico para segmentacao\n- Dica de criativo (imagem/video)',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Curso de Marketing Digital", "required": true}, {"key": "publico_dor", "label": "Principal dor do publico", "type": "textarea", "placeholder": "Nao conseguem vender online", "required": true}, {"key": "beneficio", "label": "Beneficio principal", "type": "text", "placeholder": "Aumentar vendas em 3x", "required": true}, {"key": "oferta", "label": "Oferta/CTA", "type": "text", "placeholder": "50% OFF so hoje", "required": true}, {"key": "preco", "label": "Preco (opcional)", "type": "text", "placeholder": "R$ 497", "required": false}]'::jsonb,
    'Crie os anuncios Meta Ads para {{produto}}',
    'Framework AIDA',
    '5 headlines + 3 textos + 3 descricoes',
    true, true, true,
    '["meta-ads", "facebook", "instagram", "aida", "conversao"]'::jsonb,
    0, NOW()
),

-- 2. Google Ads - Headlines Killer
(
    generate_template_uuid('Google Ads - Headlines Killer', 'trafego_pago'),
    NULL, NULL,
    'Google Ads - Headlines Killer',
    'Gera 15 headlines (30 chars) e 4 descricoes (90 chars) otimizados para Google Ads responsivos, seguindo as melhores praticas de CTR.',
    'trafego_pago',
    'search',
    E'Voce e um especialista em Google Ads com certificacao Google Partner Premier.\n\nTAREFA: Criar conjunto completo de headlines e descricoes para Anuncios Responsivos de Pesquisa.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Keyword principal: {{keyword}}\n- Diferencial: {{diferencial}}\n- CTA desejado: {{cta}}\n\nREGRAS TECNICAS DO GOOGLE ADS:\n- Headlines: maximo 30 caracteres (incluindo espacos)\n- Descricoes: maximo 90 caracteres (incluindo espacos)\n- Incluir keyword em pelo menos 5 headlines\n- Variar abordagens: beneficio, urgencia, prova social, pergunta, CTA\n\nENTREGAVEIS:\n\n## Headlines (15 variacoes)\nOrganize em grupos:\n- 5x com keyword exata\n- 3x com beneficio principal\n- 3x com prova social/numeros\n- 2x com urgencia/escassez\n- 2x com CTA direto\n\nPara cada headline, mostre: `[XX chars] Headline aqui`\n\n## Descricoes (4 variacoes)\n- 2x focadas em beneficios\n- 1x com prova social\n- 1x com CTA + urgencia\n\nPara cada descricao, mostre: `[XX chars] Descricao aqui`\n\n## Combinacoes Recomendadas\nSugira 3 combinacoes de headlines + descricao para testar\n\n## Dicas de Otimizacao\n- Palavras-chave negativas sugeridas\n- Extensoes recomendadas (sitelinks, callouts)',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Consultoria Financeira", "required": true}, {"key": "keyword", "label": "Palavra-chave principal", "type": "text", "placeholder": "consultoria financeira empresarial", "required": true}, {"key": "diferencial", "label": "Diferencial competitivo", "type": "text", "placeholder": "+500 empresas atendidas", "required": true}, {"key": "cta", "label": "Acao desejada", "type": "select", "options": ["Agendar", "Comprar", "Conhecer", "Baixar", "Testar"], "required": true}]'::jsonb,
    'Crie headlines e descricoes Google Ads para {{produto}}',
    'Google Partner Premier',
    '15 headlines + 4 descricoes',
    true, true, true,
    '["google-ads", "search", "rsa", "ppc", "headlines"]'::jsonb,
    0, NOW()
),

-- 3. Anuncio Carrossel Meta (5 Cards)
(
    generate_template_uuid('Anuncio Carrossel Meta (5 Cards)', 'trafego_pago'),
    NULL, NULL,
    'Anuncio Carrossel Meta (5 Cards)',
    'Cria storytelling sequencial para anuncios em carrossel, guiando o usuario atraves de uma jornada de 5 cards ate a conversao.',
    'trafego_pago',
    'layers',
    E'Voce e um estrategista de conteudo especializado em anuncios de carrossel de alta conversao.\n\nTAREFA: Criar carrossel de 5 cards com storytelling sequencial que leva a conversao.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Problema: {{problema}}\n- Beneficios: {{beneficios}}\n- CTA: {{cta}}\n\nESTRUTURA NARRATIVA (Jornada do Heroi simplificada):\n- Card 1: GANCHO - Identifica a dor (voce vs problema)\n- Card 2: AGITACAO - Mostra consequencias de nao resolver\n- Card 3: SOLUCAO - Apresenta o produto como resposta\n- Card 4: PROVA - Beneficios ou resultados concretos\n- Card 5: CTA - Chamada para acao irresistivel\n\nENTREGAVEIS:\n\n## Card 1: O Gancho\n**Headline**: [max 40 chars]\n**Texto**: [2-3 linhas que identifiquem a dor]\n**Sugestao visual**: [descricao da imagem]\n\n## Card 2: A Agitacao\n**Headline**: [max 40 chars]\n**Texto**: [consequencias de nao agir]\n**Sugestao visual**: [descricao]\n\n## Card 3: A Solucao\n**Headline**: [max 40 chars]\n**Texto**: [apresentacao do produto]\n**Sugestao visual**: [descricao]\n\n## Card 4: A Prova\n**Headline**: [max 40 chars]\n**Texto**: [beneficios tangiveis ou depoimento]\n**Sugestao visual**: [descricao]\n\n## Card 5: O CTA\n**Headline**: [max 40 chars]\n**Texto**: [urgencia + CTA claro]\n**Sugestao visual**: [descricao]',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Software de Gestao", "required": true}, {"key": "problema", "label": "Problema que resolve", "type": "textarea", "placeholder": "Empresas perdem tempo com planilhas", "required": true}, {"key": "beneficios", "label": "5 beneficios (um por linha)", "type": "textarea", "placeholder": "Automatiza processos\nReduz erros\nEconomiza 10h/semana", "required": true}, {"key": "cta", "label": "CTA final", "type": "text", "placeholder": "Teste gratis por 14 dias", "required": true}]'::jsonb,
    'Crie carrossel de 5 cards para {{produto}}',
    'Storytelling Framework',
    '5 cards completos + sugestoes visuais',
    true, true, false,
    '["meta-ads", "carrossel", "storytelling", "facebook", "instagram"]'::jsonb,
    0, NOW()
),

-- 4. Remarketing - Sequencia 3 Niveis
(
    generate_template_uuid('Remarketing - Sequencia 3 Niveis', 'trafego_pago'),
    NULL, NULL,
    'Remarketing - Sequencia 3 Niveis',
    'Cria 3 anuncios de remarketing com intensidade crescente: lembrete suave, beneficios, urgencia/escassez.',
    'trafego_pago',
    'repeat',
    E'Voce e especialista em remarketing e recuperacao de leads abandonados.\n\nTAREFA: Criar sequencia de 3 anuncios de remarketing com intensidade progressiva.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Visitaram: {{pagina_origem}}\n- Objecao provavel: {{objecao}}\n- Incentivo: {{incentivo}}\n\nESTRATEGIA DE REMARKETING:\n- Nivel 1 (1-3 dias): Lembrete gentil, sem pressao\n- Nivel 2 (4-7 dias): Tratamento de objecao + beneficios\n- Nivel 3 (8-14 dias): Urgencia + incentivo exclusivo\n\nENTREGAVEIS:\n\n## Nivel 1: Lembrete Gentil\n**Timing**: 1-3 dias apos visita\n**Tom**: Amigavel, sem pressao\n**Headline**:\n**Texto primario**: [Reconhece interesse, oferece ajuda]\n**CTA**: Suave (Saiba mais, Continue explorando)\n\n## Nivel 2: Tratamento de Objecao\n**Timing**: 4-7 dias apos visita\n**Tom**: Educativo, construcao de valor\n**Headline**:\n**Texto primario**: [Aborda objecao diretamente com contra-argumento]\n**CTA**: Moderado (Veja como funciona, Fale conosco)\n\n## Nivel 3: Urgencia + Incentivo\n**Timing**: 8-14 dias apos visita\n**Tom**: Urgente, exclusivo\n**Headline**:\n**Texto primario**: [Incentivo com deadline]\n**CTA**: Forte (Aproveite agora, Ultima chance)\n\n## Configuracao de Publico Sugerida\n- Publico 1: Visitantes pagina X, excluir compradores\n- Publico 2: Adicionou ao carrinho, nao comprou\n- Publico 3: Engajou com anuncio Nivel 1/2, nao converteu',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Plano Premium", "required": true}, {"key": "pagina_origem", "label": "Pagina que visitaram", "type": "text", "placeholder": "Pagina de precos", "required": true}, {"key": "objecao", "label": "Principal objecao", "type": "text", "placeholder": "Preco alto", "required": true}, {"key": "incentivo", "label": "Incentivo especial", "type": "text", "placeholder": "20% OFF para voltar", "required": true}]'::jsonb,
    'Crie sequencia de remarketing para {{produto}}',
    'Retargeting Strategy',
    '3 anuncios + configuracao de publico',
    true, true, false,
    '["remarketing", "retargeting", "meta-ads", "recuperacao"]'::jsonb,
    0, NOW()
),

-- 5. Meta Ads - Criativo Estatico
(
    generate_template_uuid('Meta Ads - Criativo Estatico (Imagem Unica)', 'trafego_pago'),
    NULL, NULL,
    'Meta Ads - Criativo Estatico (Imagem Unica)',
    'Cria copy otimizado para anuncios de imagem unica no Meta Ads, incluindo sugestao detalhada de criativo visual.',
    'trafego_pago',
    'image',
    E'Voce e um especialista em Meta Ads com forte conhecimento em design de criativos de alta conversao.\n\nTAREFA: Criar copy completo + briefing de criativo visual para anuncio de imagem unica.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Objetivo: {{objetivo}}\n- Angulo: {{angulo}}\n- Formato: {{formato}}\n- Estilo: {{estilo_visual}}\n\nENTREGAVEIS:\n\n## COPY DO ANUNCIO\n\n### Headline (max 40 chars)\n[3 opcoes rankeadas]\n\n### Texto Primario (125-250 chars)\n**Versao Curta** (para mobile):\n[Copy direto, 2-3 linhas]\n\n**Versao Longa** (para quem le mais):\n[Copy expandido, 4-6 linhas com quebras]\n\n### Descricao do Link (max 30 chars)\n[2 opcoes]\n\n### CTA Button Recomendado\n[Saiba mais / Comprar / Cadastre-se / etc]\n\n---\n\n## BRIEFING DO CRIATIVO\n\n### Conceito Visual\n[Descricao em 2-3 frases do que a imagem deve comunicar]\n\n### Elementos Obrigatorios\n- **Texto principal na imagem**: [headline curto, max 5 palavras]\n- **Texto secundario**: [beneficio ou CTA]\n- **Elemento focal**: [produto, pessoa, resultado, etc]\n- **Logo**: [posicao sugerida]\n\n### Composicao Sugerida\n- **Primeiro plano**: [o que aparece em destaque]\n- **Fundo**: [cor, gradiente, foto, etc]\n- **Hierarquia visual**: [o que o olho ve primeiro, segundo, terceiro]\n\n### Cores\n[Usar paleta do projeto ou sugerir baseado no estilo]\n\n### O que EVITAR\n- [erro comum 1]\n- [erro comum 2]\n- [erro comum 3]',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Suplemento Whey Protein", "required": true}, {"key": "objetivo", "label": "Objetivo da campanha", "type": "select", "options": ["Conversao", "Trafego", "Engajamento", "Cadastro"], "required": true}, {"key": "angulo", "label": "Angulo principal", "type": "select", "options": ["Dor/Problema", "Beneficio", "Prova Social", "Oferta", "Curiosidade"], "required": true}, {"key": "formato", "label": "Formato do criativo", "type": "select", "options": ["Feed quadrado (1:1)", "Feed vertical (4:5)", "Stories (9:16)", "Reels (9:16)"], "required": true}, {"key": "estilo_visual", "label": "Estilo visual desejado", "type": "select", "options": ["Minimalista", "Vibrante", "Profissional", "Lifestyle", "UGC-style"], "required": true}]'::jsonb,
    'Crie copy e briefing visual para {{produto}}',
    'Creative Strategy',
    'Copy completo + briefing visual',
    true, true, false,
    '["meta-ads", "criativo", "imagem", "design", "briefing"]'::jsonb,
    0, NOW()
),

-- 6. Meta Ads - Depoimento/Prova Social
(
    generate_template_uuid('Meta Ads - Depoimento/Prova Social', 'trafego_pago'),
    NULL, NULL,
    'Meta Ads - Depoimento/Prova Social',
    'Transforma depoimentos de clientes em anuncios persuasivos, formatando para diferentes estilos (texto, video script, imagem).',
    'trafego_pago',
    'message-circle',
    E'Voce e um copywriter especializado em prova social e social proof advertising.\n\nTAREFA: Transformar depoimento real em anuncios de alta conversao.\n\nDEPOIMENTO ORIGINAL:\n\"{{depoimento}}\"\n\nCONTEXTO:\n- Cliente: {{nome_cliente}} ({{contexto_cliente}})\n- Produto: {{produto}}\n- Resultado: {{resultado}}\n\nREGRAS:\n- Manter autenticidade - nao inventar dados\n- Destacar transformacao (antes -> depois)\n- Humanizar o cliente para gerar identificacao\n- Usar aspas para manter credibilidade\n\nENTREGAVEIS:\n\n## VERSAO 1: Anuncio de Texto (Feed)\n\n### Headline\n[Destaca o resultado]\n\n### Texto Primario\n[Estrutura: Hook com resultado - Contexto do cliente - Trecho do depoimento entre aspas - Transicao para CTA]\n\n### CTA\n[Convite para ter o mesmo resultado]\n\n---\n\n## VERSAO 2: Script para Video de Depoimento (30-60s)\n\n### Cena 1 (0-5s): Hook Visual\n### Cena 2 (5-20s): A Historia\n### Cena 3 (20-40s): A Transformacao\n### Cena 4 (40-50s): O Produto\n### Cena 5 (50-60s): CTA\n\n---\n\n## VERSAO 3: Criativo Estatico com Depoimento\n\n### Layout Sugerido\n### Texto na Imagem\n### Copy do Anuncio\n\n---\n\n## DICAS DE SEGMENTACAO',
    '[{"key": "depoimento", "label": "Depoimento original do cliente", "type": "textarea", "placeholder": "Eu estava cetico no inicio, mas depois de 3 meses usando o produto, perdi 12kg...", "required": true}, {"key": "nome_cliente", "label": "Nome do cliente (pode ser parcial)", "type": "text", "placeholder": "Maria S.", "required": true}, {"key": "contexto_cliente", "label": "Contexto/perfil do cliente", "type": "text", "placeholder": "Mae de 2 filhos, 35 anos", "required": true}, {"key": "produto", "label": "Produto/Servico relacionado", "type": "text", "placeholder": "Programa de Emagrecimento", "required": true}, {"key": "resultado", "label": "Resultado principal alcancado", "type": "text", "placeholder": "Perdeu 12kg em 3 meses", "required": true}]'::jsonb,
    'Transforme este depoimento em anuncios para {{produto}}',
    'Social Proof Strategy',
    '4 versoes de anuncio + dicas segmentacao',
    true, true, false,
    '["meta-ads", "depoimento", "prova-social", "testimonial", "ugc"]'::jsonb,
    0, NOW()
),

-- 7. Meta Ads - Oferta/Promocao Relampago
(
    generate_template_uuid('Meta Ads - Oferta/Promocao Relampago', 'trafego_pago'),
    NULL, NULL,
    'Meta Ads - Oferta/Promocao Relampago',
    'Cria anuncios de urgencia para promocoes com deadline, black friday, flash sales, com foco em escassez e FOMO.',
    'trafego_pago',
    'zap',
    E'Voce e um copywriter especializado em campanhas de urgencia e escassez com alta conversao.\n\nTAREFA: Criar anuncios de oferta com maxima urgencia sem parecer spam.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Desconto: {{desconto}}\n- De: {{preco_de}} Por: {{preco_por}}\n- Deadline: {{deadline}}\n{{#if motivo}}- Motivo: {{motivo}}{{/if}}\n{{#if bonus}}- Bonus: {{bonus}}{{/if}}\n\nPRINCIPIOS DE URGENCIA ETICA:\n- Escassez real (deadline verdadeiro)\n- Valor claro (economia em reais)\n- Razao para a oferta (credibilidade)\n- FOMO sem desespero\n\nENTREGAVEIS:\n\n## ANUNCIO 1: Foco no Desconto\n## ANUNCIO 2: Foco na Economia\n## ANUNCIO 3: Foco no FOMO\n## ANUNCIO 4: Ultimas Horas\n\n## SEQUENCIA DE ANUNCIOS SUGERIDA',
    '[{"key": "produto", "label": "Produto/Servico em promocao", "type": "text", "placeholder": "Curso de Excel Avancado", "required": true}, {"key": "desconto", "label": "Desconto ou condicao especial", "type": "text", "placeholder": "60% OFF", "required": true}, {"key": "preco_de", "label": "Preco original (de)", "type": "text", "placeholder": "R$ 497", "required": true}, {"key": "preco_por", "label": "Preco promocional (por)", "type": "text", "placeholder": "R$ 197", "required": true}, {"key": "deadline", "label": "Prazo da promocao", "type": "text", "placeholder": "So ate domingo as 23:59", "required": true}, {"key": "motivo", "label": "Motivo da promocao (opcional)", "type": "text", "placeholder": "Aniversario da empresa", "required": false}, {"key": "bonus", "label": "Bonus exclusivo (opcional)", "type": "text", "placeholder": "+3 aulas extras gratis", "required": false}]'::jsonb,
    'Crie anuncios de promocao para {{produto}} com {{desconto}}',
    'Urgency & Scarcity',
    '4 anuncios + briefing criativo + sequencia',
    true, true, false,
    '["meta-ads", "promocao", "urgencia", "fomo", "black-friday", "flash-sale"]'::jsonb,
    0, NOW()
),

-- 8. YouTube Ads - Script 30 Segundos
(
    generate_template_uuid('YouTube Ads - Script 30 Segundos', 'trafego_pago'),
    NULL, NULL,
    'YouTube Ads - Script 30 Segundos',
    'Cria script para YouTube Ads com estrutura hook (5s) + problema/solucao (20s) + CTA (5s), otimizado para pular no skip.',
    'trafego_pago',
    'youtube',
    E'Voce e um roteirista de videos publicitarios especializado em YouTube Ads de alta retencao.\n\nTAREFA: Criar script de 30 segundos otimizado para YouTube Ads (pulavel).\n\nCONTEXTO:\n- Produto: {{produto}}\n- Gancho: {{gancho}}\n- Problema: {{problema}}\n- Solucao: {{solucao}}\n- CTA: {{cta}}\n\nESTRUTURA CRITICA:\n- 0-5s: HOOK MATADOR (antes do skip!)\n- 5-15s: PROBLEMA amplificado\n- 15-25s: SOLUCAO + beneficios\n- 25-30s: CTA + urgencia\n\nREGRA DE OURO: Os primeiros 5 segundos determinam TUDO.\n\nENTREGAVEIS:\n\n## SCRIPT COMPLETO\n### [0:00-0:05] HOOK\n### [0:05-0:15] PROBLEMA\n### [0:15-0:25] SOLUCAO\n### [0:25-0:30] CTA\n\n## VERSAO TEXTO CORRIDO\n## VARIACAO: Hook Alternativo\n## DICAS DE PRODUCAO',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "App de Financas", "required": true}, {"key": "gancho", "label": "Gancho inicial (polemico/curioso)", "type": "text", "placeholder": "Voce esta perdendo dinheiro todo dia", "required": true}, {"key": "problema", "label": "Problema do publico", "type": "textarea", "placeholder": "Nao sabe para onde vai o dinheiro", "required": true}, {"key": "solucao", "label": "Como seu produto resolve", "type": "textarea", "placeholder": "App mostra gastos em tempo real", "required": true}, {"key": "cta", "label": "CTA final", "type": "text", "placeholder": "Baixe gratis agora", "required": true}]'::jsonb,
    'Crie script de YouTube Ads 30s para {{produto}}',
    'Video Ad Strategy',
    'Script completo + variacao de hook',
    true, true, false,
    '["youtube-ads", "video", "script", "pre-roll", "skip"]'::jsonb,
    0, NOW()
),

-- 9. LinkedIn Ads B2B - Decision Maker
(
    generate_template_uuid('LinkedIn Ads B2B - Decision Maker', 'trafego_pago'),
    NULL, NULL,
    'LinkedIn Ads B2B - Decision Maker',
    'Anuncios direcionados para tomadores de decisao (C-Level, Gerentes, Diretores) com linguagem profissional e foco em ROI.',
    'trafego_pago',
    'briefcase',
    E'Voce e um copywriter B2B especializado em LinkedIn Ads para alto escalao corporativo.\n\nTAREFA: Criar anuncios LinkedIn que falem a linguagem de {{cargo_alvo}} no setor de {{setor}}.\n\nCONTEXTO:\n- Solucao: {{solucao}}\n- Cargo-alvo: {{cargo_alvo}}\n- Setor: {{setor}}\n- Resultado: {{resultado}}\n- Prova social: {{prova}}\n\nPRINCIPIOS PARA C-LEVEL:\n- Tempo e escasso - va direto ao ponto\n- Fale de resultados, nao features\n- Use numeros e metricas\n- Demonstre credibilidade rapido\n\nENTREGAVEIS:\n\n## Anuncio 1: Foco em Resultado\n## Anuncio 2: Foco em Problema\n## Anuncio 3: Foco em Prova Social\n## Anuncio 4: Formato Pergunta\n## Segmentacao Sugerida\n## InMail Template (Bonus)',
    '[{"key": "solucao", "label": "Sua solucao", "type": "text", "placeholder": "Plataforma de RH", "required": true}, {"key": "cargo_alvo", "label": "Cargo-alvo", "type": "select", "options": ["CEO", "CFO", "CMO", "CTO", "Diretor", "Gerente"], "required": true}, {"key": "setor", "label": "Setor/Industria", "type": "text", "placeholder": "Tecnologia", "required": true}, {"key": "resultado", "label": "Resultado mensuravel", "type": "text", "placeholder": "Reduz turnover em 40%", "required": true}, {"key": "prova", "label": "Prova social", "type": "text", "placeholder": "Usado por 200+ empresas", "required": true}]'::jsonb,
    'Crie anuncios LinkedIn B2B para {{solucao}} direcionados a {{cargo_alvo}}',
    'B2B Marketing Strategy',
    '4 anuncios + InMail template + segmentacao',
    true, true, false,
    '["linkedin-ads", "b2b", "c-level", "decision-maker", "corporate"]'::jsonb,
    0, NOW()
),

-- 10. TikTok/Reels Ads - Nativo
(
    generate_template_uuid('TikTok/Reels Ads - Nativo', 'trafego_pago'),
    NULL, NULL,
    'TikTok/Reels Ads - Nativo',
    'Scripts para anuncios que parecem conteudo organico, com hooks virais e linguagem de plataforma.',
    'trafego_pago',
    'video',
    E'Voce e um creator de conteudo viral especializado em TikTok/Reels Ads que nao parecem ads.\n\nTAREFA: Criar 3 scripts de anuncios nativos (parecem organicos) para {{nicho}}.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Nicho: {{nicho}}\n- Estilo: {{hook_style}}\n- Beneficio: {{beneficio}}\n\nREGRAS DO FORMATO NATIVO:\n- NUNCA comece com \"Oi gente\" ou apresentacao\n- Primeiro frame = hook visual + texto chamativo\n- Fale como creator, nao como marca\n- Use girias e linguagem da comunidade\n- CTA sutil, nao \"link na bio\"\n\nENTREGAVEIS:\n\n## Script 1: {{hook_style}}\n## Script 2: POV/Storytime\n## Script 3: Tutorial Rapido\n## Dicas de Producao\n## Hashtags Recomendadas',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Skincare", "required": true}, {"key": "nicho", "label": "Nicho/Comunidade", "type": "text", "placeholder": "Beleza e autocuidado", "required": true}, {"key": "hook_style", "label": "Estilo do hook", "type": "select", "options": ["Polemico", "POV", "Tutorial", "Storytime", "Trend"], "required": true}, {"key": "beneficio", "label": "Beneficio visual", "type": "text", "placeholder": "Pele lisa em 7 dias", "required": true}]'::jsonb,
    'Crie scripts TikTok/Reels estilo nativo para {{produto}}',
    'Creator-style Ads',
    '3 scripts + hashtags + dicas producao',
    true, true, false,
    '["tiktok-ads", "reels", "ugc", "nativo", "viral", "short-form"]'::jsonb,
    0, NOW()
),

-- 11. Campanha de Lancamento - Estrutura Completa
(
    generate_template_uuid('Campanha de Lancamento - Estrutura Completa', 'trafego_pago'),
    NULL, NULL,
    'Campanha de Lancamento - Estrutura Completa',
    'Estrutura completa de campanha de lancamento: awareness, consideracao e conversao com anuncios para cada etapa.',
    'trafego_pago',
    'rocket',
    E'Voce e um estrategista de lancamentos digitais com experiencia em campanhas de 7 digitos.\n\nTAREFA: Criar estrutura completa de campanha de lancamento para {{produto}}.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Lancamento: {{data_lancamento}}\n- Preco: {{preco}}\n- Bonus: {{bonus}}\n- Escassez: {{escassez}}\n\nESTRUTURA DE FUNIL:\n\n## FASE 1: AWARENESS (Topo)\n### Anuncio 1A: Problema Amplificado\n### Anuncio 1B: Conteudo de Valor\n\n## FASE 2: CONSIDERACAO (Meio)\n### Anuncio 2A: Prova Social\n### Anuncio 2B: Diferencial/Metodo\n### Anuncio 2C: Tratamento de Objecao\n\n## FASE 3: CONVERSAO (Fundo)\n### Anuncio 3A: Abertura de Carrinho\n### Anuncio 3B: Bonus Exclusivos\n### Anuncio 3C: Ultimas Horas\n\n## CRONOGRAMA SUGERIDO\n## RECOMENDACOES',
    '[{"key": "produto", "label": "Produto do lancamento", "type": "text", "placeholder": "Curso de Trafego Pago", "required": true}, {"key": "data_lancamento", "label": "Data do lancamento", "type": "text", "placeholder": "15 de Janeiro", "required": true}, {"key": "preco", "label": "Preco e condicao", "type": "text", "placeholder": "R$ 997 ou 12x R$ 97", "required": true}, {"key": "bonus", "label": "Bonus principais", "type": "textarea", "placeholder": "Mentoria em grupo\nTemplates prontos", "required": true}, {"key": "escassez", "label": "Tipo de escassez", "type": "select", "options": ["Vagas limitadas", "Tempo limitado", "Early bird", "Turma unica"], "required": true}]'::jsonb,
    'Crie estrutura de campanha de lancamento para {{produto}}',
    'Launch Strategy',
    '9 anuncios (3 por fase) + cronograma + budget',
    true, true, false,
    '["lancamento", "funil", "awareness", "consideracao", "conversao", "launch"]'::jsonb,
    0, NOW()
),

-- 12. Teste A/B - Variacoes de Angulo
(
    generate_template_uuid('Teste A/B - Variacoes de Angulo', 'trafego_pago'),
    NULL, NULL,
    'Teste A/B - Variacoes de Angulo',
    'Gera multiplas variacoes do mesmo anuncio com angulos diferentes para teste A/B estruturado.',
    'trafego_pago',
    'git-branch',
    E'Voce e um especialista em CRO e testes A/B para anuncios pagos.\n\nTAREFA: Criar 6 variacoes do mesmo anuncio com ANGULOS completamente diferentes para teste A/B cientifico.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Publico: {{publico}}\n- Resultado: {{resultado}}\n\nPRINCIPIO: Cada variacao testa uma HIPOTESE diferente sobre o que move o publico.\n\nENTREGAVEIS:\n\n## VARIACAO A: Angulo DOR\n## VARIACAO B: Angulo ASPIRACAO\n## VARIACAO C: Angulo PROVA SOCIAL\n## VARIACAO D: Angulo AUTORIDADE\n## VARIACAO E: Angulo CURIOSIDADE\n## VARIACAO F: Angulo MEDO DE PERDER\n\n## FRAMEWORK DE TESTE\n## PLANO DE TESTE',
    '[{"key": "produto", "label": "Produto/Servico", "type": "text", "placeholder": "Mentoria de Vendas", "required": true}, {"key": "publico", "label": "Publico-alvo", "type": "text", "placeholder": "Vendedores B2B", "required": true}, {"key": "resultado", "label": "Resultado prometido", "type": "text", "placeholder": "Dobrar fechamento em 60 dias", "required": true}]'::jsonb,
    'Crie 6 variacoes de angulo para testar {{produto}}',
    'CRO & Testing',
    '6 variacoes + framework de teste',
    true, true, false,
    '["teste-ab", "cro", "otimizacao", "variacoes", "angulos"]'::jsonb,
    0, NOW()
),

-- 13. Copy de Oferta Irresistivel (Hormozi)
(
    generate_template_uuid('Copy de Oferta Irresistivel', 'trafego_pago'),
    NULL, NULL,
    'Copy de Oferta Irresistivel',
    'Estrutura de oferta usando o framework de Alex Hormozi ($100M Offers) - stack de valor, ancoragem de preco, garantia.',
    'trafego_pago',
    'gem',
    E'Voce e um copywriter especializado em construcao de ofertas irresistiveis, estudioso do framework de Alex Hormozi.\n\nTAREFA: Criar estrutura de oferta com stack de valor, ancoragem e garantia.\n\nCONTEXTO:\n- Produto: {{produto}}\n- Preco: {{preco}}\n- Bonus 1: {{bonus1}}\n- Bonus 2: {{bonus2}}\n- Bonus 3: {{bonus3}}\n- Garantia: {{garantia}}\n\nFRAMEWORK $100M OFFERS:\n1. Sonho: resultado ideal que entrega\n2. Obstaculos: o que impede de chegar la\n3. Solucao: como seu produto resolve CADA obstaculo\n4. Veiculo: por que seu metodo e diferente/melhor\n5. Stack: empilhamento de valor absurdo\n6. Ancoragem: preco parece ridiculo perto do valor\n7. Garantia: remocao total de risco\n\nENTREGAVEIS:\n\n## BLOCO 1: O Sonho\n## BLOCO 2: Os Obstaculos\n## BLOCO 3: Stack de Valor\n## BLOCO 4: Ancoragem de Preco\n## BLOCO 5: Garantia Anti-Risco\n## BLOCO 6: Copy Final para Anuncio',
    '[{"key": "produto", "label": "Produto principal", "type": "text", "placeholder": "Curso Completo de Ads", "required": true}, {"key": "preco", "label": "Preco de venda", "type": "text", "placeholder": "R$ 997", "required": true}, {"key": "bonus1", "label": "Bonus 1 (nome + valor)", "type": "text", "placeholder": "Templates de Anuncios - R$ 497", "required": true}, {"key": "bonus2", "label": "Bonus 2 (nome + valor)", "type": "text", "placeholder": "Mentoria em Grupo - R$ 1.997", "required": true}, {"key": "bonus3", "label": "Bonus 3 (nome + valor)", "type": "text", "placeholder": "Suporte por 1 ano - R$ 997", "required": true}, {"key": "garantia", "label": "Tipo de garantia", "type": "text", "placeholder": "30 dias incondicional", "required": true}]'::jsonb,
    'Crie oferta irresistivel para {{produto}} usando framework Hormozi',
    'Alex Hormozi Framework',
    'Oferta completa + copy para anuncio',
    true, true, true,
    '["oferta", "hormozi", "stack", "ancoragem", "garantia", "value-stack"]'::jsonb,
    0, NOW()
),

-- 14. Analise de Concorrente (Swipe File)
(
    generate_template_uuid('Analise de Concorrente (Swipe File)', 'trafego_pago'),
    NULL, NULL,
    'Analise de Concorrente (Swipe File)',
    'Analisa anuncio de concorrente e cria versao melhorada para seu produto, identificando pontos fortes e fracos.',
    'trafego_pago',
    'eye',
    E'Voce e um estrategista de marketing competitivo especializado em analise de swipe files.\n\nTAREFA: Analisar anuncio do concorrente e criar versao superior para {{seu_produto}}.\n\nANUNCIO DO CONCORRENTE:\n{{anuncio_concorrente}}\n\nSEU CONTEXTO:\n- Produto: {{seu_produto}}\n- Diferencial: {{seu_diferencial}}\n\nANALISE A REALIZAR:\n\n## ANALISE DO CONCORRENTE\n### Pontos Fortes (O que funciona)\n### Pontos Fracos (Oportunidades)\n### Tecnicas Identificadas\n\n## SUA VERSAO MELHORADA\n### Versao 1: Mesmo Framework, Melhor Execucao\n### Versao 2: Framework Diferente\n### Versao 3: Ataque Direto ao Diferencial\n\n## ESTRATEGIA RECOMENDADA',
    '[{"key": "anuncio_concorrente", "label": "Cole o texto do anuncio", "type": "textarea", "placeholder": "[Headline]\n[Texto do anuncio do concorrente]", "required": true}, {"key": "seu_produto", "label": "Seu produto equivalente", "type": "text", "placeholder": "Meu curso de marketing", "required": true}, {"key": "seu_diferencial", "label": "Seu diferencial vs concorrente", "type": "text", "placeholder": "Mais pratico e com suporte", "required": true}]'::jsonb,
    'Analise este anuncio de concorrente e crie versoes melhores para {{seu_produto}}',
    'Competitive Analysis',
    'Analise + 3 versoes melhoradas',
    true, true, false,
    '["analise", "concorrente", "swipe-file", "benchmark", "competitivo"]'::jsonb,
    0, NOW()
),

-- 15. Escala de Campanha - Novas Variacoes
(
    generate_template_uuid('Escala de Campanha - Novas Variacoes', 'trafego_pago'),
    NULL, NULL,
    'Escala de Campanha - Novas Variacoes',
    'Dado um anuncio vencedor, cria variacoes para escalar sem saturar: novos angulos, novos formatos, novos publicos.',
    'trafego_pago',
    'trending-up',
    E'Voce e um media buyer senior especializado em escalar campanhas vencedoras.\n\nTAREFA: Criar variacoes para escalar anuncio vencedor sem saturacao.\n\nANUNCIO VENCEDOR ATUAL:\n{{anuncio_vencedor}}\n\nMETRICAS:\n{{metricas}}\n\nOBJETIVO:\n{{objetivo}}\n\nPRINCIPIOS DE ESCALA:\n- Nao mexer no que funciona - criar paralelos\n- Variar elementos isoladamente\n- Testar novos publicos com mesma copy vencedora\n- Testar novos formatos mantendo mensagem\n\nENTREGAVEIS:\n\n## ANALISE DO VENCEDOR\n## VARIACOES DE COPY (mesmo angulo)\n## VARIACOES DE FORMATO\n## NOVOS PUBLICOS PARA TESTAR\n## PLANO DE ESCALA\n## SINAIS DE SATURACAO',
    '[{"key": "anuncio_vencedor", "label": "Anuncio que esta funcionando", "type": "textarea", "placeholder": "[Cole headline e texto do anuncio atual]", "required": true}, {"key": "metricas", "label": "Metricas atuais", "type": "text", "placeholder": "CTR 2.5%, CPA R$35, ROAS 4.2", "required": true}, {"key": "objetivo", "label": "Objetivo de escala", "type": "text", "placeholder": "Triplicar budget mantendo ROAS > 3", "required": true}]'::jsonb,
    'Crie variacoes para escalar este anuncio vencedor',
    'Media Buying Scale',
    'Variacoes de copy + formatos + publicos + plano',
    true, true, false,
    '["escala", "scaling", "variacoes", "media-buying", "otimizacao"]'::jsonb,
    0, NOW()
)

ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    prompt = EXCLUDED.prompt,
    variables = EXCLUDED.variables,
    initial_message = EXCLUDED.initial_message,
    expert_name = EXCLUDED.expert_name,
    estimated_outputs = EXCLUDED.estimated_outputs,
    is_featured = EXCLUDED.is_featured,
    tags = EXCLUDED.tags,
    updated_at = NOW();

-- Verification query
SELECT
    category,
    COUNT(*) as count,
    SUM(CASE WHEN is_featured THEN 1 ELSE 0 END) as featured_count
FROM templates
WHERE is_system = true AND category = 'trafego_pago'
GROUP BY category;

-- Show inserted templates
SELECT name, expert_name, estimated_outputs, jsonb_array_length(COALESCE(variables, '[]'::jsonb)) as var_count
FROM templates
WHERE category = 'trafego_pago' AND is_system = true
ORDER BY name;
