# Feature Specification: AlvoADS Meta - Geracao Automatizada de Criativos por IA

**Feature Branch**: `020-alvoads-meta-creative-ai`
**Created**: 2026-01-02
**Status**: ✅ Implementado
**Input**: User description: "Melhoria na geracao de criativos por IA no AlvoADS Meta: geracao automatica de prompts de imagem por IA com prompts configuraveis no banco de dados, grid de aprovacao/rejeicao de imagens geradas, e geracao automatica de textos de anuncio para cada imagem"

## Visao Geral

Esta feature aprimora o fluxo de criacao de anuncios no AlvoADS Meta, automatizando a geracao de criativos (imagens) e textos por IA. O sistema gerara automaticamente prompts para imagens baseados no contexto do artigo, exibira as imagens geradas em um grid para aprovacao/rejeicao, e posteriormente gerara textos de anuncio especificos para cada imagem aprovada.

### Principais Melhorias

1. **Geracao Automatica de Prompts de Imagem** - IA que cria prompts otimizados baseados no artigo, com suporte a multiplos modelos (DALL-E e Gemini)
2. **Prompts Configuraveis** - Prompts armazenados no banco de dados e editaveis pelo admin
3. **Grid de Aprovacao de Imagens** - Interface para visualizar, aprovar, rejeitar e regenerar imagens
4. **Geracao de Textos por Imagem** - Textos de anuncio (titulo, descricao) gerados para cada imagem aprovada
5. **Biblioteca de Criativos** - Imagens aprovadas sao salvas em biblioteca para reutilizacao em futuras campanhas
6. **Variedade de Estilos** - Sistema varia estilos visuais automaticamente para maximizar testes A/B

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar Imagens Automaticamente por IA (Priority: P1)

Como um anunciante que selecionou artigos para criar campanhas, quero que o sistema gere automaticamente imagens profissionais por IA baseadas no conteudo dos artigos, para que eu nao precise criar prompts manualmente nem ter conhecimento de design.

**Why this priority**: Este e o core da feature. Sem a geracao automatica de imagens, o usuario precisa criar prompts manualmente, o que e trabalhoso e requer conhecimento tecnico. A automacao remove essa barreira.

**Independent Test**: Pode ser testado selecionando um artigo sobre "financiamento imobiliario" e verificando se o sistema gera automaticamente imagens relevantes (ex: casa, familia feliz, chaves) sem intervencao manual.

**Clarificacoes**:
- **Quantidade de imagens**: 1 imagem por AdSet (ex: 5 AdSets = 5 imagens)
- **Formato da imagem**: Usuario escolhe antes de gerar (1:1 quadrado, 9:16 vertical, ou 16:9 horizontal)
- **Modelo de IA**: Usuario pode escolher entre DALL-E e Gemini
- **Variedade de estilos**: Sistema varia automaticamente os estilos (fotorrealista, ilustracao, minimalista) para maximizar diversidade nos testes A/B
- **Direcionamentos**: Usuario pode fornecer direcionamentos opcionais (ex: "cores quentes", "sem pessoas", "estilo corporativo")

**Acceptance Scenarios**:

1. **Given** um usuario na etapa de criativos do wizard com artigos selecionados, **When** ele clica em "Gerar Imagens por IA", **Then** o sistema gera 1 imagem por AdSet baseada no contexto do artigo.

2. **Given** configuracao de 5 AdSets, **When** a geracao e iniciada, **Then** o sistema gera exatamente 5 imagens (1 por AdSet).

3. **Given** um artigo com titulo e palavra-chave, **When** o sistema gera o prompt de imagem, **Then** o prompt e otimizado para criar visuais relevantes para anuncios (sem texto na imagem, alta qualidade, formato escolhido pelo usuario).

4. **Given** o processo de geracao em andamento, **When** ocorre, **Then** o usuario ve feedback visual de progresso (barra de progresso, contagem de imagens geradas).

5. **Given** a tela de geracao de imagens, **When** o usuario configura as opcoes, **Then** pode escolher o modelo (DALL-E ou Gemini), formato (1:1, 9:16, 16:9) e adicionar direcionamentos opcionais.

6. **Given** multiplas imagens sendo geradas, **When** o sistema processa, **Then** varia automaticamente os estilos visuais entre as imagens para maximizar diversidade.

---

### User Story 2 - Aprovar e Rejeitar Imagens no Grid (Priority: P1)

Como um anunciante, quero visualizar todas as imagens geradas em um grid e poder aprovar, rejeitar ou solicitar nova geracao para cada uma, para que eu tenha controle sobre quais criativos serao usados nos anuncios.

**Why this priority**: A curadoria humana e essencial para garantir qualidade. Mesmo com IA avancada, o usuario precisa aprovar os criativos antes de gastar dinheiro em anuncios.

**Independent Test**: Pode ser testado gerando 10 imagens, rejeitando 3, e verificando se o sistema permite regenerar apenas as rejeitadas mantendo as aprovadas.

**Clarificacoes**:
- Imagens aprovadas sao automaticamente salvas na Biblioteca de Criativos para uso futuro
- Usuario pode visualizar modelo e estilo usado em cada imagem

**Acceptance Scenarios**:

1. **Given** imagens geradas pela IA, **When** o usuario visualiza o grid, **Then** cada imagem exibe botoes de aprovar (check), rejeitar (X) e regenerar (refresh).

2. **Given** uma imagem no grid, **When** o usuario clica em aprovar, **Then** a imagem e marcada visualmente como aprovada (borda verde, badge de check) e salva na Biblioteca de Criativos.

3. **Given** uma imagem no grid, **When** o usuario clica em rejeitar, **Then** a imagem e marcada visualmente como rejeitada (borda vermelha, opacidade reduzida) e removida da selecao.

4. **Given** uma imagem rejeitada, **When** o usuario clica em regenerar, **Then** o sistema gera uma nova imagem para substitui-la usando o mesmo contexto.

5. **Given** multiplas imagens rejeitadas, **When** o usuario clica em "Regenerar Todas Rejeitadas", **Then** o sistema gera novas imagens apenas para as rejeitadas em batch.

6. **Given** o grid de imagens, **When** todas as imagens necessarias estao aprovadas, **Then** o botao "Avancar" e habilitado.

7. **Given** uma imagem no grid, **When** o usuario visualiza os detalhes, **Then** ve o modelo usado (DALL-E/Gemini) e o estilo aplicado.

---

### User Story 3 - Gerar Textos de Anuncio para Cada Imagem (Priority: P1)

Como um anunciante, quero que o sistema gere automaticamente textos de anuncio (titulo, descricao, texto principal) para cada imagem aprovada, para que eu tenha variacoes de copy otimizadas para cada criativo.

**Why this priority**: Textos sao tao importantes quanto imagens. A geracao automatica de textos por imagem permite testes A/B efetivos e aumenta a variedade de anuncios sem esforco manual.

**Independent Test**: Pode ser testado aprovando 5 imagens e verificando se o sistema gera 5 conjuntos de textos diferentes, cada um adaptado ao contexto do artigo e ao estilo visual sugerido.

**Clarificacoes**:
- **Quantidade de textos**: 1 conjunto de textos (primary_text, headline, description) por imagem aprovada
- Nao gera multiplas variacoes de texto por imagem (simplicidade sobre complexidade)

**Acceptance Scenarios**:

1. **Given** imagens aprovadas na etapa anterior, **When** o usuario avanca para a etapa de textos, **Then** o sistema automaticamente gera 1 conjunto de textos para cada imagem.

2. **Given** uma imagem aprovada, **When** os textos sao gerados, **Then** o conjunto inclui: texto principal (max 125 chars), headline (max 27 chars), descricao (max 27 chars).

3. **Given** textos gerados para uma imagem, **When** o usuario visualiza, **Then** pode editar manualmente qualquer um dos campos.

4. **Given** textos gerados que nao agradam, **When** o usuario clica em "Regenerar Texto", **Then** novos textos sao gerados mantendo a imagem.

5. **Given** todos os conjuntos imagem+texto, **When** o usuario revisa, **Then** ve um preview de como o anuncio ficara no feed.

---

### User Story 4 - Configurar Prompts de IA pelo Admin (Priority: P2)

Como um administrador do sistema, quero editar os prompts de IA usados para geracao de imagens e textos, para que eu possa otimizar a qualidade dos criativos sem alterar codigo.

**Why this priority**: A capacidade de ajustar prompts permite melhorias continuas sem deploy. Isso segue o padrao ja estabelecido no sistema para outros prompts (artigos, keywords, etc.).

**Independent Test**: Pode ser testado alterando o prompt de geracao de imagens no banco de dados e verificando se a proxima geracao usa o novo prompt.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado, **When** acessa a tabela `system_prompts`, **Then** encontra prompts com categoria `meta-ads` incluindo: `meta-ads.image-prompt-generator` e textos existentes.

2. **Given** um prompt de geracao de imagem, **When** o admin edita o template, **Then** as proximas geracoes usam o template atualizado.

3. **Given** variaveis definidas no prompt (ex: {{article_title}}, {{keyword}}), **When** a geracao e executada, **Then** as variaveis sao substituidas pelos valores reais do artigo.

4. **Given** um prompt editado com erro, **When** a geracao falha, **Then** o sistema usa o fallback hardcoded e loga o erro.

---

### User Story 5 - Visualizar Contagem e Custo de Creditos (Priority: P2)

Como um anunciante, quero ver quantos creditos serao consumidos antes de gerar as imagens, para que eu possa controlar meus gastos e decidir quantas imagens gerar.

**Why this priority**: Transparencia de custos e importante para a experiencia do usuario e evita surpresas. Imagens IA consomem creditos significativos.

**Independent Test**: Pode ser testado configurando 10 AdSets com 2 artigos e verificando se o sistema exibe "Serao geradas 20 imagens (100 creditos)".

**Acceptance Scenarios**:

1. **Given** configuracao de AdSets e artigos selecionados, **When** o usuario acessa a etapa de criativos, **Then** ve a contagem total de imagens a serem geradas.

2. **Given** contagem de imagens definida, **When** exibida, **Then** mostra tambem o custo em creditos (ex: 5 creditos por imagem).

3. **Given** saldo de creditos insuficiente, **When** o usuario tenta gerar, **Then** recebe alerta com link para adquirir mais creditos.

4. **Given** regeneracao de imagem rejeitada, **When** executada, **Then** consome creditos adicionais e o contador e atualizado.

---

### User Story 6 - Biblioteca de Criativos (Priority: P2)

Como um anunciante, quero acessar uma biblioteca com todas as imagens aprovadas em campanhas anteriores, para que eu possa reutiliza-las em novas campanhas sem precisar gerar novamente.

**Why this priority**: Reutilizacao de criativos reduz custos (sem gastar creditos) e permite usar imagens que ja provaram funcionar. Complementa o fluxo principal.

**Independent Test**: Pode ser testado aprovando 5 imagens em uma campanha, criando nova campanha, e verificando se as imagens aparecem na biblioteca para selecao.

**Acceptance Scenarios**:

1. **Given** imagens aprovadas em campanhas anteriores, **When** o usuario acessa a etapa de criativos, **Then** pode optar por "Usar da Biblioteca" alem de "Gerar Novas".

2. **Given** a Biblioteca de Criativos, **When** o usuario visualiza, **Then** ve todas as imagens aprovadas com filtros por data, artigo, estilo e modelo usado.

3. **Given** imagens na biblioteca, **When** o usuario seleciona uma, **Then** pode usar na campanha atual sem consumir creditos.

4. **Given** uma imagem da biblioteca selecionada, **When** o usuario confirma, **Then** a imagem e adicionada ao grid de criativos da campanha atual.

---

### Edge Cases

- **O que acontece se a geracao de uma imagem falhar?** O sistema marca a imagem como "falha", exibe mensagem de erro, e permite retry individual sem afetar as demais.
- **Como tratar prompts com caracteres especiais?** O sistema sanitiza os inputs antes de enviar para a IA, removendo caracteres que possam causar problemas.
- **O que acontece se o artigo nao tem descricao/resumo?** O sistema usa apenas titulo e palavra-chave para gerar o prompt, com template alternativo.
- **Como lidar com timeout na geracao de imagem?** Timeout de 60 segundos por imagem, com mensagem clara e opcao de retry.
- **O que acontece se o usuario fecha a pagina durante a geracao?** Estado e salvo no store/localStorage, permitindo retomar de onde parou.
- **Como tratar imagens duplicadas ou muito similares?** O sistema varia estilos automaticamente, mas o usuario pode rejeitar e regenerar.
- **O que acontece se o modelo escolhido (DALL-E/Gemini) falhar?** Sistema tenta com o modelo alternativo automaticamente e notifica o usuario.
- **Como funciona a selecao de formato para multiplos AdSets?** Todos os AdSets usam o mesmo formato escolhido pelo usuario (nao e possivel misturar formatos na mesma campanha).

---

## Requirements *(mandatory)*

### Functional Requirements

**Geracao de Imagens**
- **FR-001**: Sistema DEVE gerar prompts de imagem automaticamente baseados no contexto do artigo (titulo, palavra-chave, resumo)
- **FR-002**: Sistema DEVE armazenar prompt de geracao de imagem na tabela `system_prompts` com key `meta-ads.image-prompt-generator`
- **FR-003**: Sistema DEVE gerar 1 imagem por AdSet (ex: 5 AdSets = 5 imagens)
- **FR-004**: Sistema DEVE permitir escolha do modelo de IA (DALL-E ou Gemini) antes da geracao
- **FR-005**: Sistema DEVE permitir escolha do formato de imagem (1:1, 9:16, 16:9) antes da geracao
- **FR-006**: Sistema DEVE variar automaticamente os estilos visuais entre as imagens geradas (fotorrealista, ilustracao, minimalista, etc.)
- **FR-007**: Sistema DEVE permitir direcionamentos opcionais do usuario (ex: "cores quentes", "sem pessoas")
- **FR-008**: Sistema DEVE exibir progresso durante geracao em batch (X de Y concluidas)
- **FR-009**: Sistema DEVE permitir cancelar geracao em andamento
- **FR-010**: Sistema DEVE fazer fallback para modelo alternativo se o escolhido falhar

**Grid de Aprovacao**
- **FR-011**: Sistema DEVE exibir grid de imagens geradas com opcoes de aprovar, rejeitar e regenerar
- **FR-012**: Sistema DEVE permitir regeneracao individual de imagens rejeitadas
- **FR-013**: Sistema DEVE permitir regeneracao em batch de todas as imagens rejeitadas
- **FR-014**: Sistema DEVE exibir modelo e estilo usado em cada imagem

**Geracao de Textos**
- **FR-015**: Sistema DEVE gerar 1 conjunto de textos (primary_text, headline, description) para cada imagem aprovada
- **FR-016**: Sistema DEVE usar prompts do banco de dados para geracao de textos (ja existentes: `meta-ads.primary-text`, `meta-ads.headline`, `meta-ads.description`)
- **FR-017**: Sistema DEVE permitir edicao manual dos textos gerados
- **FR-018**: Sistema DEVE permitir regeneracao de textos individualmente
- **FR-019**: Sistema DEVE exibir preview do anuncio (imagem + textos) antes de publicar

**Biblioteca de Criativos**
- **FR-020**: Sistema DEVE salvar imagens aprovadas na Biblioteca de Criativos (Supabase Storage)
- **FR-021**: Sistema DEVE permitir reutilizacao de imagens da biblioteca em novas campanhas
- **FR-022**: Sistema DEVE oferecer filtros na biblioteca (data, artigo, estilo, modelo)
- **FR-023**: Sistema DEVE nao consumir creditos ao usar imagens da biblioteca

**Custos e Estado**
- **FR-024**: Sistema DEVE mostrar contagem de imagens a serem geradas antes de iniciar
- **FR-025**: Sistema DEVE mostrar custo em creditos antes da geracao
- **FR-026**: Sistema DEVE validar saldo de creditos antes de permitir geracao
- **FR-027**: Sistema DEVE manter estado do wizard mesmo se o usuario navegar para outra pagina

### Key Entities

- **AiImageGeneration**: Registro de geracao de imagem com prompt usado, resultado, status (pending, completed, failed, approved, rejected), modelo usado, estilo aplicado
- **CreativeLibrary**: Biblioteca de imagens aprovadas com metadados (artigo origem, modelo, estilo, data, formato)
- **MetaCreativeWithCopy**: Combinacao de imagem aprovada com textos gerados (primary_text, headline, description, cta)
- **SystemPrompt (existente)**: Prompt configuravel com key `meta-ads.image-prompt-generator` para gerar descricoes de imagem

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuarios conseguem gerar um conjunto completo de criativos (imagens + textos) em menos de 5 minutos para ate 20 imagens
- **SC-002**: Taxa de aprovacao de imagens geradas na primeira tentativa acima de 60%
- **SC-003**: 90% dos usuarios conseguem completar o fluxo de criativos sem suporte
- **SC-004**: Textos gerados respeitam os limites de caracteres do Meta em 100% dos casos
- **SC-005**: Tempo medio de geracao por imagem abaixo de 30 segundos
- **SC-006**: Reducao de 80% no tempo de criacao de criativos comparado ao modo manual (criar prompts individualmente)
- **SC-007**: Usuarios reportam satisfacao de 4+ (escala 1-5) com a qualidade dos criativos gerados

---

## Assumptions

- A integracao com OpenAI DALL-E ja esta implementada e funcional (ai-creative.service.ts)
- O sistema de creditos ja existe e esta operacional (credits.service.ts)
- A tabela `system_prompts` ja existe com estrutura para armazenar prompts configuraveis
- Os prompts de texto do Meta Ads ja existem no banco de dados (`meta-ads.primary-text`, `meta-ads.headline`, `meta-ads.description`, `meta-ads.complete-copy`)
- O wizard do AlvoADS Meta ja possui as etapas anteriores funcionando (selecao de artigos, contas, paginas, etc.)
- O Supabase Storage esta configurado para armazenamento de imagens
- A integracao com Google Gemini para geracao de imagens precisara ser implementada (novo requisito)

---

## Dependencias

- Spec 019-alvoads-meta: Estrutura base do wizard e fluxo de campanha
- Spec 010-conexoes: Conexoes OAuth com Meta
- Sistema de creditos existente
- Tabela system_prompts existente
