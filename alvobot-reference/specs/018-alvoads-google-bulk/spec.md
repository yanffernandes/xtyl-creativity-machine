# Feature Specification: AlvoADS Google - Campanhas em Massa

**Feature Branch**: `018-alvoads-google-bulk`
**Created**: 2025-12-15
**Status**: ✅ Implementado
**Input**: User description: "Criação de campanhas automatizadas Google Ads utilizando o AlvoBot em massa - múltiplas campanhas em volume usando uma plataforma centralizada"

## Visão Geral

O **AlvoADS Google** permite aos usuários criar campanhas no Google Ads de forma automatizada e em escala. A plataforma oferece quatro modos de criação em massa:

1. **Por Localização** - Criar variações da mesma campanha para diferentes cidades/estados
2. **Por Produto/Serviço** - Criar campanhas para múltiplos produtos com keywords e anúncios gerados por IA
3. **Importar Planilha** - Importar campanhas em massa via CSV/Excel
4. **Duplicar Campanha** - Duplicar templates existentes com variações

A feature utiliza IA (OpenAI GPT-4o-mini) para gerar keywords, headlines e descriptions automaticamente, seguindo as especificações do Google Ads.

---

## User Scenarios & Testing

### User Story 1 - Criar Campanhas por Localização (Priority: P1)

Como um anunciante que atende múltiplas cidades, quero criar variações da mesma campanha para cada localização, para que eu possa segmentar anúncios geograficamente e mencionar cada cidade nos textos.

**Why this priority**: Esta é a funcionalidade mais solicitada - anunciantes locais (advogados, dentistas, serviços) precisam criar campanhas idênticas para diferentes cidades. Sem automação, isso requer horas de trabalho manual repetitivo.

**Independent Test**: Pode ser testado criando uma campanha base para "Advogado" e gerando variações para 3 cidades (São Paulo, Rio de Janeiro, Belo Horizonte). O resultado deve ser 3 campanhas prontas para publicar, cada uma com keywords e anúncios mencionando a respectiva cidade.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com conexão Google Ads ativa, **When** ele seleciona "Por Localização" e configura uma campanha base com 5 cidades, **Then** o sistema gera 5 campanhas independentes com keywords e anúncios localizados.

2. **Given** um template de campanha configurado, **When** o usuário define variáveis de localização ({{cidade}}, {{estado}}), **Then** essas variáveis são substituídas automaticamente em keywords, headlines e descriptions.

3. **Given** campanhas geradas por localização, **When** o usuário revisa as campanhas, **Then** ele pode editar individualmente cada campanha antes de publicar.

4. **Given** campanhas em massa prontas, **When** o usuário clica em "Publicar Todas", **Then** todas as campanhas são enviadas ao Google Ads e o status de cada uma é exibido em tempo real.

---

### User Story 2 - Criar Campanhas por Produto/Serviço (Priority: P1)

Como um e-commerce ou prestador de múltiplos serviços, quero criar campanhas para cada produto/serviço automaticamente, para que a IA gere keywords e anúncios relevantes para cada um.

**Why this priority**: E-commerces e prestadores de serviços precisam criar dezenas de campanhas para diferentes produtos. A geração de keywords e copy por IA elimina o trabalho manual e garante relevância.

**Independent Test**: Pode ser testado adicionando 3 produtos (Camiseta, Calça, Tênis) com suas URLs e descrições. O resultado deve ser 3 campanhas com keywords específicas (ex: "comprar camiseta online", "tênis masculino barato") e anúncios personalizados.

**Acceptance Scenarios**:

1. **Given** um usuário com lista de produtos, **When** ele adiciona produtos via formulário ou importação, **Then** cada produto gera um grupo de anúncios com keywords e ads específicos.

2. **Given** configurações de IA definidas (10 keywords, 15 headlines, 4 descriptions por produto), **When** o usuário clica em "Gerar com IA", **Then** o sistema cria conteúdo otimizado para Google Ads respeitando limites de caracteres.

3. **Given** campanhas geradas por produto, **When** um produto tem categoria definida, **Then** as keywords incluem termos da categoria (ex: "roupa masculina" para categoria "Moda Masculina").

4. **Given** múltiplos produtos processados, **When** a geração é concluída, **Then** o usuário visualiza um resumo com custo de créditos e quantidade de campanhas/ad groups/keywords gerados.

---

### User Story 3 - Importar Campanhas via Planilha (Priority: P2)

Como um profissional de mídia que já possui dados estruturados, quero importar campanhas de uma planilha CSV/Excel, para aproveitar dados existentes e criar campanhas em escala.

**Why this priority**: Profissionais experientes já possuem planejamentos em planilhas. Importar esses dados economiza retrabalho e permite integração com outras ferramentas.

**Independent Test**: Pode ser testado fazendo upload de um CSV com 5 linhas (5 campanhas) contendo nome, orçamento, keywords e URLs. O resultado deve ser 5 templates de campanha prontos para revisão.

**Acceptance Scenarios**:

1. **Given** um arquivo CSV/Excel válido, **When** o usuário faz upload, **Then** o sistema detecta automaticamente as colunas e sugere mapeamento.

2. **Given** mapeamento de colunas configurado, **When** o usuário confirma, **Then** o sistema valida os dados e mostra erros/avisos por linha.

3. **Given** dados validados sem erros críticos, **When** o usuário clica em "Importar", **Then** as campanhas são criadas como templates editáveis.

4. **Given** importação concluída, **When** há linhas com erros, **Then** o sistema gera um relatório detalhado dos problemas e permite download do arquivo corrigido como template.

---

### User Story 4 - Duplicar Campanhas Existentes (Priority: P2)

Como um anunciante que quer testar variações, quero duplicar campanhas existentes com modificações, para criar testes A/B ou expandir para novos segmentos.

**Why this priority**: Duplicação é essencial para testes A/B e expansão rápida. Permite criar variações mantendo o que funciona.

**Independent Test**: Pode ser testado selecionando uma campanha existente e criando 3 cópias com sufixo " - Teste A/B". O resultado deve ser 3 novos templates com estrutura idêntica.

**Acceptance Scenarios**:

1. **Given** uma campanha template existente, **When** o usuário seleciona "Duplicar", **Then** ele pode definir quantidade de cópias e modificações em lote.

2. **Given** configuração de duplicação com ajuste de orçamento (+20%), **When** as cópias são geradas, **Then** cada cópia tem orçamento 20% maior que o original.

3. **Given** múltiplas cópias criadas, **When** o usuário visualiza a lista, **Then** as cópias são claramente identificadas como variações do original.

---

### User Story 5 - Dashboard de Campanhas em Massa (Priority: P1)

Como um gestor de campanhas, quero visualizar todas as campanhas criadas em massa em um dashboard unificado, para monitorar status, performance e gerenciar em lote.

**Why this priority**: Sem um dashboard centralizado, o usuário perde controle das campanhas criadas. É essencial para gestão e otimização.

**Independent Test**: Pode ser testado criando 10 campanhas em massa e verificando se todas aparecem agrupadas no dashboard com filtros funcionais.

**Acceptance Scenarios**:

1. **Given** campanhas criadas via criação em massa, **When** o usuário acessa o dashboard, **Then** as campanhas são listadas com status (rascunho, publicada, pausada, erro).

2. **Given** múltiplas campanhas listadas, **When** o usuário seleciona várias campanhas, **Then** ele pode executar ações em lote (publicar, pausar, excluir).

3. **Given** campanhas publicadas no Google Ads, **When** o usuário visualiza o dashboard, **Then** métricas básicas são exibidas (impressões, cliques, custo, conversões).

4. **Given** filtros disponíveis, **When** o usuário filtra por "criadas hoje" e "status: rascunho", **Then** apenas campanhas correspondentes são exibidas.

---

### User Story 6 - Conectar Conta Google Ads (Priority: P1)

Como um novo usuário, quero conectar minha conta Google Ads via OAuth, para que o AlvoBot possa criar e gerenciar campanhas em meu nome.

**Why this priority**: Sem conexão OAuth, nenhuma funcionalidade de publicação funciona. É pré-requisito para todo o fluxo.

**Independent Test**: Pode ser testado iniciando o fluxo OAuth, autenticando com Google, e verificando se a conexão é salva com token válido.

**Acceptance Scenarios**:

1. **Given** um usuário sem conexão Google Ads, **When** ele clica em "Conectar Google Ads", **Then** é redirecionado para o fluxo OAuth do Google.

2. **Given** autorização concedida no Google, **When** o callback retorna, **Then** a conexão é salva com access_token e refresh_token.

3. **Given** uma conexão existente, **When** o token expira, **Then** o sistema usa o refresh_token automaticamente.

4. **Given** múltiplas contas Google Ads Manager (MCC), **When** o usuário conecta, **Then** ele pode selecionar qual conta usar para cada workspace.

---

### User Story 7 - Geração de Keywords com IA (Priority: P2)

Como um anunciante sem experiência em SEO/SEM, quero que a IA sugira keywords relevantes para meu negócio, para criar campanhas eficientes sem conhecimento técnico.

**Why this priority**: Keywords são o core do Google Search Ads. IA de qualidade democratiza o acesso a campanhas bem estruturadas.

**Independent Test**: Pode ser testado fornecendo "Advogado trabalhista em São Paulo" e verificando se a IA gera keywords variadas (ampla, frase, exata) com estimativas de volume.

**Acceptance Scenarios**:

1. **Given** nome e descrição de um produto/serviço, **When** o usuário clica em "Gerar Keywords", **Then** a IA gera 10-50 keywords com tipos de correspondência sugeridos.

2. **Given** keywords geradas, **When** o usuário visualiza a lista, **Then** cada keyword mostra: texto, tipo de correspondência, e indicador de relevância.

3. **Given** localização definida na campanha, **When** keywords são geradas, **Then** variações locais são incluídas (ex: "advogado trabalhista sp").

4. **Given** keywords geradas, **When** o usuário edita manualmente, **Then** as alterações são preservadas e não sobrescritas em regeneração.

---

### User Story 8 - Geração de Anúncios com IA (Priority: P2)

Como um anunciante, quero que a IA gere headlines e descriptions otimizados para Google Ads, para maximizar CTR sem contratar copywriter.

**Why this priority**: Copy de qualidade impacta diretamente o Quality Score e CTR. IA gera variações que podem ser testadas.

**Independent Test**: Pode ser testado fornecendo dados de um produto e verificando se a IA gera 15 headlines (max 30 chars) e 4 descriptions (max 90 chars) válidos.

**Acceptance Scenarios**:

1. **Given** informações do produto/serviço, **When** o usuário solicita geração, **Then** a IA gera 15 headlines (≤30 chars) e 4 descriptions (≤90 chars).

2. **Given** headlines/descriptions gerados, **When** o usuário visualiza, **Then** cada texto mostra contador de caracteres e validação visual (verde = ok, vermelho = excede).

3. **Given** geração concluída, **When** textos excedem limite de caracteres, **Then** o sistema sugere versões abreviadas automaticamente.

4. **Given** localização na campanha, **When** anúncios são gerados, **Then** a localização pode ser incluída via variável {{cidade}} nos textos.

---

### Edge Cases

- **Limite de campanhas**: O que acontece quando o usuário tenta criar mais de 100 campanhas de uma vez?
  - Sistema deve limitar a 50 campanhas por lote e sugerir divisão.

- **Falha parcial na publicação**: Como o sistema lida quando 3 de 10 campanhas falham ao publicar?
  - Campanhas bem-sucedidas mantêm status "publicada", falhas mostram erro específico e permitem retry individual.

- **Token expirado durante publicação em massa**: O que acontece se o OAuth token expira no meio do processo?
  - Sistema pausa, tenta refresh automático, e retoma do ponto de parada.

- **Créditos insuficientes**: O que acontece se o usuário não tem créditos para a operação completa?
  - Sistema calcula custo total antes de iniciar e bloqueia se insuficiente.

- **Planilha com dados inválidos**: Como tratar planilhas com encoding errado ou colunas faltantes?
  - Sistema detecta encoding (UTF-8, Latin-1), mostra preview, e permite correção manual de mapeamento.

- **Conta Google Ads sem permissão**: O que acontece se a conta conectada não tem permissão de criação?
  - Sistema verifica permissões no momento da conexão e exibe erro claro com instruções.

---

## Requirements

### Functional Requirements

**Conexão & Autenticação**
- **FR-001**: Sistema DEVE permitir conexão OAuth 2.0 com Google Ads API
- **FR-002**: Sistema DEVE armazenar access_token e refresh_token de forma segura
- **FR-003**: Sistema DEVE renovar tokens automaticamente antes da expiração
- **FR-004**: Sistema DEVE suportar contas MCC (Manager) com seleção de sub-contas

**Criação em Massa - Por Localização**
- **FR-010**: Sistema DEVE permitir criação de campanhas variadas por localização
- **FR-011**: Sistema DEVE suportar variáveis de template: {{cidade}}, {{estado}}, {{regiao}}
- **FR-012**: Sistema DEVE aplicar variáveis em: nome da campanha, keywords, headlines, descriptions
- **FR-013**: Sistema DEVE permitir orçamento customizado por localização
- **FR-014**: Sistema DEVE validar códigos de localização contra API do Google Ads

**Criação em Massa - Por Produto**
- **FR-020**: Sistema DEVE permitir adição de múltiplos produtos via formulário
- **FR-021**: Sistema DEVE gerar keywords por produto usando IA (GPT-4o-mini)
- **FR-022**: Sistema DEVE gerar headlines (max 30 chars) e descriptions (max 90 chars) por produto
- **FR-023**: Sistema DEVE respeitar limites: 15 headlines, 4 descriptions por RSA
- **FR-024**: Sistema DEVE permitir configuração de quantidade de keywords/headlines/descriptions

**Importação de Planilha**
- **FR-030**: Sistema DEVE aceitar arquivos CSV e Excel (.xlsx)
- **FR-031**: Sistema DEVE detectar encoding automaticamente (UTF-8, Latin-1, etc.)
- **FR-032**: Sistema DEVE permitir mapeamento manual de colunas
- **FR-033**: Sistema DEVE validar dados antes de importar (URLs, orçamentos, caracteres)
- **FR-034**: Sistema DEVE gerar relatório de erros com linha e coluna específica
- **FR-035**: Sistema DEVE fornecer template de planilha para download

**Duplicação**
- **FR-040**: Sistema DEVE permitir duplicar qualquer template de campanha
- **FR-041**: Sistema DEVE suportar criação de múltiplas cópias (1-20)
- **FR-042**: Sistema DEVE permitir sufixo customizado para nomes
- **FR-043**: Sistema DEVE permitir ajuste de orçamento em lote (fixo ou percentual)

**Geração com IA**
- **FR-050**: Sistema DEVE usar OpenAI GPT-4o-mini para geração de keywords
- **FR-051**: Sistema DEVE gerar keywords com tipos de correspondência (ampla, frase, exata)
- **FR-052**: Sistema DEVE gerar headlines respeitando limite de 30 caracteres
- **FR-053**: Sistema DEVE gerar descriptions respeitando limite de 90 caracteres
- **FR-054**: Sistema DEVE incluir contexto de localização na geração quando disponível
- **FR-055**: Sistema DEVE consumir créditos por operação de IA

**Dashboard & Gestão**
- **FR-060**: Sistema DEVE listar todas as campanhas com status e métricas
- **FR-061**: Sistema DEVE permitir filtro por: status, data de criação, modo de criação
- **FR-062**: Sistema DEVE permitir ações em lote: publicar, pausar, excluir
- **FR-063**: Sistema DEVE exibir progresso de publicação em tempo real
- **FR-064**: Sistema DEVE sincronizar métricas do Google Ads periodicamente

**Publicação**
- **FR-070**: Sistema DEVE publicar campanhas no Google Ads via API
- **FR-071**: Sistema DEVE suportar modo "dry-run" para validação sem publicar
- **FR-072**: Sistema DEVE criar: Campaign, Ad Group, Keywords, Ads, Extensions
- **FR-073**: Sistema DEVE mapear status de publicação por campanha
- **FR-074**: Sistema DEVE permitir retry de campanhas com falha

**Sistema de Créditos**
- **FR-080**: Sistema DEVE verificar créditos antes de iniciar operação
- **FR-081**: Sistema DEVE exibir custo estimado antes de confirmar
- **FR-082**: Sistema DEVE consumir créditos apenas após sucesso da operação
- **FR-083**: Sistema DEVE registrar transações de créditos com detalhamento

### Key Entities

- **GoogleConnection**: Conexão OAuth com Google Ads (user_id, access_token, refresh_token, customer_id, expires_at)
- **GoogleCampaignTemplate**: Template de campanha (id, user_id, name, status, network_type, campaign_data, ad_groups_data, extensions_data, google_campaign_id)
- **BulkOperationJob**: Job de operação em massa (id, user_id, type, status, total_items, completed_items, failed_items, error_log)
- **CreditTransaction**: Transação de créditos (id, user_id, amount, operation_type, operation_id, created_at)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Usuário consegue criar 10 campanhas por localização em menos de 5 minutos (vs. 2+ horas manualmente)
- **SC-002**: Taxa de sucesso de publicação em massa ≥ 95% (campanhas sem erro)
- **SC-003**: Geração de keywords por IA produz ≥ 80% de keywords relevantes (validado por Quality Score > 5)
- **SC-004**: Headlines e descriptions gerados respeitam 100% dos limites de caracteres do Google Ads
- **SC-005**: Importação de planilha com 50 linhas completa em menos de 30 segundos
- **SC-006**: Dashboard carrega lista de 100 campanhas em menos de 2 segundos
- **SC-007**: Refresh de token OAuth funciona automaticamente em 100% dos casos
- **SC-008**: Usuários conseguem completar conexão OAuth em menos de 2 minutos

---

## Custos de Créditos (Proposta)

| Operação | Custo (créditos) |
|----------|------------------|
| Template de campanha (base) | 1 |
| Grupo de anúncios adicional | 1 |
| Geração de keywords (por lote) | 2 |
| Geração de headlines (por lote) | 2 |
| Geração de descriptions (por lote) | 2 |
| Geração de imagem (Display) | 5 |
| Publicação de campanha | 3 |
| Importação de planilha (por linha) | 1 |
| Duplicação de template | 1 |

**Exemplo**: Criar 5 campanhas por localização com IA
- 5 templates = 5 créditos
- 5x keywords IA = 10 créditos
- 5x headlines IA = 10 créditos
- 5x descriptions IA = 10 créditos
- 5x publicação = 15 créditos
- **Total: 50 créditos**

---

## Integração com Infraestrutura Existente

### Já Implementado (Aproveitar)
- Frontend: Páginas do wizard, componentes, store Zustand, tipos TypeScript
- Backend: Controller, services, DTOs, rotas
- Database: Tabela `google_campaign_templates`

### A Implementar
1. **Google OAuth 2.0**: Fluxo completo de autenticação
2. **Google Ads API Client**: Integração real com API
3. **Bulk Operations Backend**: Lógica de criação em massa
4. **Job Queue**: Processamento assíncrono de lotes grandes
5. **Spreadsheet Parser**: Parse de CSV/Excel
6. **Métricas Sync**: Sincronização de performance do Google Ads

---

## Referências Técnicas

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [google-ads-api npm package](https://www.npmjs.com/package/google-ads-api)
- [Responsive Search Ads specs](https://support.google.com/google-ads/answer/7684791)
- [Google Ads OAuth 2.0](https://developers.google.com/google-ads/api/docs/oauth/overview)
