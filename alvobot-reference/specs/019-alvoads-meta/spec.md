# Feature Specification: AlvoADS Meta - Campanhas Facebook/Instagram

**Feature Branch**: `019-alvoads-meta`
**Created**: 2025-12-25
**Status**: ✅ Implementado
**Input**: User description: "Criação de campanhas automatizadas para Facebook e Instagram Ads com suporte a múltiplos modos de criação de imagens (Google Drive ou IA), integração com conexões Meta existentes, e interface semelhante ao AlvoADS Google"

## Visão Geral

O **AlvoADS Meta** permite aos usuários criar campanhas publicitárias para Facebook e Instagram de forma automatizada e em escala. A plataforma utiliza as conexões Meta OAuth já existentes no sistema, eliminando a necessidade do usuário configurar tokens ou apps manualmente.

### Principais Funcionalidades

1. **Criação de Campanhas em Massa** - Criar múltiplas campanhas simultaneamente
2. **Dois Modos de Criativos** - Google Drive (imagens próprias) ou Geração por IA
3. **Segmentação Inteligente** - Configuração de público-alvo (idade, gênero, localização, idioma)
4. **Textos Otimizados** - Geração de copies por IA baseados em artigos
5. **Suporte a Messenger** - Campanhas de conversão com mensagens de boas-vindas

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar Campanha com Imagens do Google Drive (Priority: P1)

Como um anunciante que já possui criativos prontos no Google Drive, quero criar campanhas no Facebook/Instagram usando minhas próprias imagens, para que eu tenha controle total sobre os visuais dos meus anúncios.

**Why this priority**: Este é o fluxo mais comum para anunciantes experientes que já possuem materiais de marketing. Permite uso imediato de assets existentes sem depender de geração por IA.

**Independent Test**: Pode ser testado criando uma campanha com 3 imagens de uma pasta pública do Google Drive. O resultado deve ser uma campanha publicada no Meta Ads com os criativos corretos.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com conexão Meta ativa, **When** ele seleciona "Usar Google Drive" e cola a URL de uma pasta pública, **Then** o sistema lista as imagens disponíveis para seleção.

2. **Given** imagens selecionadas do Google Drive, **When** o usuário avança no wizard, **Then** as imagens são validadas (formato, dimensões) e pré-visualizadas.

3. **Given** uma campanha configurada com imagens do Drive, **When** o usuário publica, **Then** as imagens são enviadas ao Meta Ads e a campanha é criada com sucesso.

4. **Given** uma URL de pasta inválida ou privada, **When** o usuário tenta carregar, **Then** o sistema exibe mensagem de erro clara orientando sobre permissões.

---

### User Story 2 - Criar Campanha com Imagens Geradas por IA (Priority: P1)

Como um anunciante sem recursos visuais, quero gerar imagens profissionais usando IA, para que eu possa criar campanhas atrativas sem precisar de um designer.

**Why this priority**: Remove a barreira de entrada para usuários que não têm equipe de design. A geração por IA democratiza o acesso a criativos de qualidade.

**Independent Test**: Pode ser testado descrevendo "Mulher sorrindo segurando um smartphone em ambiente corporativo" e verificando se a IA gera uma imagem adequada para anúncios.

**Acceptance Scenarios**:

1. **Given** um usuário no modo "Gerar com IA", **When** ele descreve o visual desejado em texto, **Then** o sistema gera uma imagem baseada na descrição.

2. **Given** uma imagem gerada pela IA, **When** o usuário visualiza o exemplo, **Then** ele pode aprovar, rejeitar e pedir nova geração, ou editar o prompt.

3. **Given** múltiplas imagens necessárias, **When** o usuário deseja variações, **Then** o sistema permite gerar múltiplos criativos com diferentes prompts.

4. **Given** o prompt contém texto para incluir na imagem, **When** o sistema processa, **Then** exibe aviso de que a IA não escreve texto nas imagens e sugere usar apenas elementos visuais.

---

### User Story 3 - Configurar Segmentação de Público (Priority: P1)

Como um anunciante, quero definir o público-alvo dos meus anúncios (idade, gênero, localização, idioma), para que meus anúncios alcancem as pessoas certas.

**Why this priority**: Segmentação é fundamental para eficiência de campanhas. Sem ela, o orçamento é desperdiçado com público irrelevante.

**Independent Test**: Pode ser testado configurando uma campanha para "Mulheres, 25-45 anos, Brasil, Português" e verificando se a campanha no Meta Ads reflete essa segmentação.

**Acceptance Scenarios**:

1. **Given** o usuário na etapa de segmentação, **When** ele define idade mínima e máxima, **Then** os valores são validados (18-65, conforme regra do Meta).

2. **Given** opções de gênero disponíveis, **When** o usuário seleciona uma opção, **Then** a campanha é configurada para o gênero escolhido (Todos, Homens, Mulheres).

3. **Given** lista de países disponíveis, **When** o usuário seleciona um país, **Then** o sistema carrega as opções de idioma compatíveis.

4. **Given** segmentação completa, **When** o usuário avança, **Then** o resumo mostra todas as configurações de público de forma clara.

---

### User Story 4 - Selecionar Conta e Página do Facebook (Priority: P1)

Como um anunciante com múltiplas contas e páginas, quero selecionar qual conta de anúncios e página do Facebook usar, para que os anúncios sejam publicados no lugar correto.

**Why this priority**: Usuários frequentemente gerenciam múltiplos negócios. A seleção correta de conta/página é obrigatória para publicação.

**Independent Test**: Pode ser testado com um usuário que possui 2 contas de anúncios e 3 páginas, verificando se todas são listadas e selecionáveis.

**Acceptance Scenarios**:

1. **Given** um usuário com conexão Meta válida, **When** ele acessa o wizard, **Then** o sistema carrega automaticamente suas contas de anúncios disponíveis.

2. **Given** múltiplas contas de anúncios, **When** o usuário seleciona uma ou mais contas, **Then** as páginas associadas são carregadas para seleção.

3. **Given** múltiplas páginas disponíveis, **When** o usuário seleciona páginas, **Then** cada combinação conta+página pode gerar campanhas separadas.

4. **Given** uma conta sem páginas associadas, **When** o usuário a seleciona, **Then** o sistema exibe mensagem orientando a associar uma página.

---

### User Story 5 - Configurar Textos do Anúncio (Priority: P1)

Como um anunciante, quero definir o texto principal, título e descrição do meu anúncio, para que a mensagem seja clara e atrativa para o público.

**Why this priority**: O copy é tão importante quanto o visual. Textos bem escritos aumentam significativamente a taxa de conversão.

**Independent Test**: Pode ser testado criando anúncio com texto principal "Realize o sonho da casa própria", título "Minha Casa Minha Vida 2025" e descrição "Subsídios disponíveis. Saiba mais!".

**Acceptance Scenarios**:

1. **Given** a etapa de textos do anúncio, **When** o usuário preenche o texto principal, **Then** o campo aceita texto longo com formatação livre.

2. **Given** campo de título, **When** o usuário digita, **Then** o sistema valida o limite de caracteres do Meta.

3. **Given** campo de descrição, **When** o usuário digita, **Then** o sistema valida o limite de caracteres do Meta.

4. **Given** um artigo selecionado como fonte, **When** o usuário solicita, **Then** a IA pode gerar sugestões de texto baseadas no conteúdo do artigo.

---

### User Story 6 - Campanhas de Conversão com Messenger (Priority: P2)

Como um anunciante que usa Messenger para vendas, quero criar campanhas que direcionam para conversas, para que eu possa qualificar leads diretamente no chat.

**Why this priority**: Campanhas de Messenger são muito populares no Brasil para vendas consultivas. Permite captura de leads qualificados.

**Independent Test**: Pode ser testado criando uma campanha com objetivo "Conversas no Messenger" e verificando se a mensagem de boas-vindas e botão de resposta rápida funcionam.

**Acceptance Scenarios**:

1. **Given** objetivo selecionado como "Conversas no Messenger", **When** o usuário avança, **Then** campos adicionais para mensagem de boas-vindas são exibidos.

2. **Given** campo de mensagem de boas-vindas, **When** o usuário preenche, **Then** pode usar variáveis como {{user_first_name}}.

3. **Given** botão de resposta rápida configurado, **When** a campanha é publicada, **Then** o usuário do anúncio vê o botão ao iniciar conversa.

4. **Given** campanha de Messenger ativa, **When** um usuário clica no anúncio, **Then** a conversa inicia com a mensagem configurada.

---

### User Story 7 - Configurar Instagram (Priority: P2)

Como um anunciante que também quer anunciar no Instagram, quero incluir minha conta do Instagram na campanha, para alcançar público em ambas as plataformas.

**Why this priority**: Instagram é essencial para alcance, especialmente para públicos mais jovens. A integração aumenta o potencial de resultados.

**Independent Test**: Pode ser testado selecionando "Sim, usar Instagram" e verificando se a conta do Instagram é associada aos anúncios.

**Acceptance Scenarios**:

1. **Given** uma página do Facebook com Instagram conectado, **When** o usuário opta por usar Instagram, **Then** o sistema carrega as contas do Instagram disponíveis.

2. **Given** Instagram selecionado, **When** a campanha é publicada, **Then** os anúncios aparecem tanto no Facebook quanto no Instagram.

3. **Given** a opção de não usar Instagram, **When** selecionada, **Then** a campanha é veiculada apenas no Facebook.

4. **Given** página sem Instagram conectado, **When** usuário tenta usar Instagram, **Then** sistema orienta como conectar a conta.

---

### User Story 8 - Configurar Orçamento e Lances (Priority: P1)

Como um anunciante, quero definir quanto investir por dia e qual o custo máximo por resultado, para controlar meus gastos e otimizar ROI.

**Why this priority**: Controle de orçamento é fundamental para qualquer campanha paga. Sem isso, o usuário não tem previsibilidade de custos.

**Independent Test**: Pode ser testado configurando orçamento diário de R$50 e custo por resultado de R$5, verificando se a campanha respeita esses limites.

**Acceptance Scenarios**:

1. **Given** campo de orçamento diário, **When** o usuário define valor, **Then** o sistema valida mínimo (R$6) e formata como moeda BRL.

2. **Given** campo de custo por resultado, **When** preenchido, **Then** o valor é incluído como parâmetro de otimização da campanha.

3. **Given** múltiplos conjuntos de anúncios, **When** configurados, **Then** o orçamento é distribuído entre eles conforme estratégia do Meta.

4. **Given** campanha configurada, **When** publicada, **Then** o Meta Ads otimiza para o custo por resultado definido.

---

### User Story 9 - Selecionar Objetivo da Campanha (Priority: P1)

Como um anunciante, quero escolher o objetivo da minha campanha (cliques, conversas, conversões, vendas), para que o Meta otimize a entrega para o resultado desejado.

**Why this priority**: O objetivo define como o algoritmo do Meta otimiza a campanha. Escolha errada desperdiça orçamento.

**Independent Test**: Pode ser testado criando campanhas com cada objetivo e verificando se a configuração no Meta Ads reflete a escolha.

**Acceptance Scenarios**:

1. **Given** tela de seleção de objetivo, **When** exibida, **Then** mostra opções: Cliques no Link, Conversas no Messenger, Conversões/Leads, Vendas.

2. **Given** objetivo "Conversões" ou "Vendas" selecionado, **When** o usuário não tem Pixel configurado, **Then** sistema exibe aviso e opções alternativas.

3. **Given** objetivo selecionado, **When** o usuário avança, **Then** as etapas seguintes são adaptadas ao objetivo escolhido.

4. **Given** objetivo "Cliques no Link", **When** configurado, **Then** campo de URL de destino é obrigatório.

---

### User Story 10 - Revisar e Publicar Campanhas (Priority: P1)

Como um anunciante, quero revisar todas as configurações antes de publicar, para garantir que tudo está correto e evitar erros.

**Why this priority**: Erros em campanhas pagas geram custos desnecessários. A revisão final é a última linha de defesa.

**Independent Test**: Pode ser testado verificando se a tela de revisão mostra todas as configurações (conta, página, segmentação, criativos, textos, orçamento) de forma clara.

**Acceptance Scenarios**:

1. **Given** todas as etapas concluídas, **When** o usuário acessa a revisão, **Then** vê resumo completo de todas as configurações.

2. **Given** tela de revisão, **When** o usuário identifica erro, **Then** pode voltar para qualquer etapa anterior para corrigir.

3. **Given** revisão aprovada, **When** usuário clica em "Publicar", **Then** campanhas são enviadas ao Meta Ads com feedback de progresso.

4. **Given** publicação em andamento, **When** ocorre erro, **Then** sistema exibe mensagem clara e opção de retry.

---

### Edge Cases

- **O que acontece quando a conexão Meta expira?** O sistema detecta token inválido e solicita reconexão via OAuth.
- **Como tratar imagens do Drive com formato não suportado?** Validação prévia com mensagem indicando formatos aceitos (JPG, PNG).
- **O que acontece se o Pixel não existe para campanhas de conversão?** Exibe alternativas (escolher outro objetivo) ou orienta criação do Pixel.
- **Como lidar com falha parcial em publicação em massa?** Mostra quais campanhas falharam e permite retry individual.
- **O que acontece se a pasta do Drive tem mais de 100 imagens?** Paginação ou limite com mensagem informativa.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE permitir seleção de conexão Meta existente (OAuth já implementado)
- **FR-002**: Sistema DEVE listar contas de anúncios disponíveis da conexão selecionada
- **FR-003**: Sistema DEVE listar páginas do Facebook associadas às contas
- **FR-004**: Sistema DEVE permitir seleção múltipla de contas e páginas
- **FR-005**: Sistema DEVE suportar dois modos de criativos: Google Drive e Geração por IA
- **FR-006**: Sistema DEVE validar URL do Google Drive e listar imagens da pasta pública
- **FR-007**: Sistema DEVE gerar imagens via IA baseado em descrição textual do usuário
- **FR-008**: Sistema DEVE exibir preview de imagem gerada por IA antes de aprovar
- **FR-009**: Sistema DEVE permitir configuração de segmentação: idade (18-65), gênero, país, idioma
- **FR-010**: Sistema DEVE buscar países e idiomas da API do Meta (dados dinâmicos, não hardcoded)
- **FR-011**: Sistema DEVE permitir seleção de objetivo: Cliques, Conversas, Conversões, Vendas
- **FR-012**: Sistema DEVE validar presença de Pixel para objetivos de Conversão/Vendas
- **FR-013**: Sistema DEVE permitir configuração de textos: mensagem principal, título, descrição
- **FR-014**: Sistema DEVE respeitar limites de caracteres do Meta para cada campo de texto
- **FR-015**: Sistema DEVE permitir configuração de orçamento diário (mínimo R$6)
- **FR-016**: Sistema DEVE permitir definir custo desejado por resultado
- **FR-017**: Sistema DEVE permitir configuração de data/hora de início da campanha
- **FR-018**: Sistema DEVE exibir tela de revisão com todas as configurações antes de publicar
- **FR-019**: Sistema DEVE publicar campanhas no Meta Ads via API oficial
- **FR-020**: Sistema DEVE exibir progresso e status durante publicação
- **FR-021**: Sistema DEVE permitir configuração de Messenger (mensagem boas-vindas, botão resposta)
- **FR-022**: Sistema DEVE detectar contas Instagram conectadas às páginas
- **FR-023**: Sistema DEVE permitir incluir ou excluir Instagram da campanha
- **FR-024**: Sistema DEVE salvar templates de campanha para reutilização
- **FR-025**: Sistema DEVE permitir edição de campanhas salvas antes de publicar

### Key Entities

- **MetaCampaignTemplate**: Template salvo com todas as configurações de campanha (conta, página, segmentação, criativos, textos, orçamento)
- **MetaAdAccount**: Conta de anúncios do usuário com ID, nome, moeda, timezone
- **MetaPage**: Página do Facebook com ID, nome, Instagram associado
- **MetaCreative**: Criativo do anúncio (imagem + textos) com URL ou prompt IA
- **MetaTargeting**: Configurações de público-alvo (idade, gênero, localização, idioma)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem criar e publicar uma campanha completa em menos de 10 minutos
- **SC-002**: Taxa de sucesso de publicação de campanhas acima de 95%
- **SC-003**: 80% dos usuários conseguem completar o wizard na primeira tentativa sem suporte
- **SC-004**: Imagens geradas por IA são aprovadas pelos usuários em 70% das vezes na primeira geração
- **SC-005**: Sistema suporta campanhas com até 100 variações (contas × páginas × criativos)
- **SC-006**: Usuários reportam satisfação de 4+ (escala 1-5) com a facilidade de uso
- **SC-007**: Redução de 60% no tempo de criação de campanhas comparado ao processo manual no Meta Ads Manager

---

## Assumptions

- A conexão Meta OAuth já está implementada e funcional (spec 010-conexoes)
- O backend já possui módulo Meta com endpoints básicos de autenticação
- O sistema de geração de imagens por IA será via OpenAI DALL-E ou similar
- A API do Google Drive permite listar arquivos de pastas públicas
- O Supabase já possui tabela de campaign_templates (do AlvoADS Google)
- O design system do projeto (CSS variables, componentes) será reutilizado
- A estrutura de wizard do AlvoADS Google serve como referência de implementação

---

## Referências Técnicas

### Fluxo do TypeBot (Legado)

O TypeBot original requeria token manual do usuário. A nova implementação usa OAuth, eliminando essa etapa. O fluxo de configuração segue padrão similar:

1. Selecionar Conta de Anúncios
2. Selecionar Página do Facebook
3. Configurar Instagram (opcional)
4. Selecionar Objetivo
5. Definir Segmentação (idade, gênero, país, idioma)
6. Configurar Orçamento e Custo
7. Definir Número de Campanhas/Conjuntos
8. Criar Criativos (Drive ou IA)
9. Escrever Textos do Anúncio
10. Configurar Messenger (se aplicável)
11. Revisar e Publicar

### Referência de UI: bir.ch

- Uso de badges coloridas para categorização
- Animações suaves em transições
- CTAs proeminentes com cores vibrantes
- Layout responsivo com breakpoints bem definidos
- Scroll-triggered animations para feedback visual
