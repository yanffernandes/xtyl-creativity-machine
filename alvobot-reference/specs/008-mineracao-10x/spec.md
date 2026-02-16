# Feature Specification: Mineração 10x ✅ FINALIZADO

**Feature Branch**: `008-mineracao-10x`
**Created**: 2025-12-11
**Status**: ✅ **Implementado**
**Input**: User description: "Feature: Mineração 10x - Listagem de minerações de keywords/conteúdo, Botão de atualização de dados (importar do n8n), Modal de nova mineração com configurações"

## Overview

Sistema de mineração de keywords e conteúdo que permite aos usuários criar, gerenciar e visualizar minerações de dados. A feature integra com n8n para execução de workflows de mineração e fornece uma interface completa para configuração, monitoramento e análise dos resultados.

### Contexto

A Mineração 10x é uma funcionalidade que permite amplificar a descoberta de keywords e conteúdo relevante através de processos automatizados. Os usuários podem:
- Criar minerações com configurações personalizadas
- Monitorar o status e progresso das minerações
- Sincronizar dados do n8n para atualização em tempo real
- Visualizar e exportar resultados minerados
- Filtrar e analisar dados coletados

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar Minerações Existentes (Priority: P1)

Usuários podem visualizar uma lista de todas as minerações criadas, com informações de status, data, projeto associado e volume de dados minerados.

**Why this priority**: A visualização das minerações é a funcionalidade base que permite aos usuários entenderem o estado atual de suas operações de mineração. Sem isso, não há contexto para outras ações.

**Independent Test**: Pode ser testado criando algumas minerações de teste no banco de dados e verificando se a listagem exibe corretamente os dados com status, datas e métricas.

**Acceptance Scenarios**:

1. **Given** um usuário logado com minerações existentes, **When** ele acessa a página de minerações, **Then** ele vê uma lista com todas as suas minerações ordenadas por data de criação (mais recentes primeiro)
2. **Given** um usuário visualizando a lista de minerações, **When** ele observa cada item, **Then** cada mineração exibe: nome, projeto associado, status (pendente/em execução/concluída/erro), data de criação, volume de keywords mineradas
3. **Given** um usuário sem minerações criadas, **When** ele acessa a página de minerações, **Then** ele vê um estado vazio com mensagem explicativa e botão para criar nova mineração
4. **Given** uma mineração em execução, **When** o usuário visualiza a lista, **Then** o item exibe um indicador visual de progresso (loading spinner ou barra de progresso)

---

### User Story 2 - Filtrar e Buscar Minerações (Priority: P1)

Usuários podem filtrar minerações por projeto, data de criação e status para encontrar rapidamente as minerações relevantes.

**Why this priority**: Com múltiplas minerações, a capacidade de filtrar é essencial para produtividade. Isso é crítico antes de adicionar funcionalidades mais complexas.

**Independent Test**: Pode ser testado criando minerações com diferentes projetos, datas e status, e verificando se os filtros retornam os resultados corretos.

**Acceptance Scenarios**:

1. **Given** um usuário na página de minerações, **When** ele seleciona um projeto no filtro, **Then** a lista exibe apenas minerações daquele projeto
2. **Given** um usuário na página de minerações, **When** ele seleciona um status (pendente/em execução/concluída/erro), **Then** a lista exibe apenas minerações com aquele status
3. **Given** um usuário na página de minerações, **When** ele seleciona um intervalo de datas, **Then** a lista exibe apenas minerações criadas naquele período
4. **Given** um usuário com filtros aplicados, **When** ele clica em "Limpar filtros", **Then** todos os filtros são removidos e a lista completa é exibida

---

### User Story 3 - Sincronizar Dados com n8n (Priority: P2)

Usuários podem atualizar os dados das minerações importando informações do n8n através de um botão de sincronização.

**Why this priority**: A sincronização garante que os dados exibidos estejam atualizados. É mais importante que criar novas minerações, pois permite monitorar minerações existentes.

**Independent Test**: Pode ser testado criando uma mineração via n8n, clicando no botão de sincronização e verificando se os dados são atualizados na interface.

**Acceptance Scenarios**:

1. **Given** um usuário na página de minerações, **When** ele clica no botão "Atualizar Dados", **Then** o sistema faz uma requisição ao backend para sincronizar com n8n
2. **Given** uma sincronização em andamento, **When** o usuário aguarda, **Then** ele vê um indicador de loading no botão e a interface permanece responsiva
3. **Given** a sincronização concluída com sucesso, **When** os dados são atualizados, **Then** a lista de minerações reflete as mudanças (novos status, volumes atualizados) e uma mensagem de sucesso é exibida
4. **Given** a sincronização falhar, **When** ocorre um erro, **Then** o usuário vê uma mensagem de erro explicativa e a lista mantém os dados anteriores
5. **Given** múltiplas minerações em execução, **When** a sincronização é realizada, **Then** apenas as minerações com alterações são atualizadas na interface

---

### User Story 4 - Criar Nova Mineração (Priority: P2)

Usuários podem criar uma nova mineração através de um modal com campos de configuração: projeto, keywords seed, volume de mineração e parâmetros adicionais.

**Why this priority**: Criar minerações é essencial, mas vem após visualizar e sincronizar pois requer uma interface mais complexa e a capacidade de ver resultados.

**Independent Test**: Pode ser testado preenchendo o formulário de nova mineração, submetendo e verificando se a mineração aparece na listagem com status "pendente".

**Acceptance Scenarios**:

1. **Given** um usuário na página de minerações, **When** ele clica no botão "Nova Mineração", **Then** um modal é aberto com o formulário de configuração
2. **Given** o modal de nova mineração aberto, **When** o usuário preenche: nome da mineração, seleciona um projeto, insere keywords seed (separadas por vírgula ou linha), define volume de mineração (número de keywords a gerar), **Then** todos os campos são validados em tempo real
3. **Given** o usuário preencheu todos os campos obrigatórios, **When** ele clica em "Criar Mineração", **Then** a mineração é criada via backend (que aciona o n8n), o modal fecha e a nova mineração aparece na lista com status "pendente"
4. **Given** o usuário preenche o formulário com dados inválidos, **When** ele tenta submeter, **Then** mensagens de erro são exibidas nos campos específicos (ex: "Selecione um projeto", "Insira ao menos uma keyword", "Volume deve ser entre 10 e 1000")
5. **Given** o usuário está preenchendo o formulário, **When** ele clica em "Cancelar" ou fora do modal, **Then** uma confirmação é solicitada se houver dados preenchidos, caso contrário o modal fecha imediatamente

---

### User Story 5 - Visualizar Resultados da Mineração (Priority: P3)

Usuários podem clicar em uma mineração concluída para visualizar os resultados detalhados, incluindo lista de keywords mineradas com métricas relevantes.

**Why this priority**: Visualizar resultados é importante mas depende de ter minerações concluídas. É uma funcionalidade de consulta que agrega valor após o core estar funcionando.

**Independent Test**: Pode ser testado criando uma mineração concluída com resultados no banco, clicando nela e verificando se o modal/página de detalhes exibe as keywords e métricas corretamente.

**Acceptance Scenarios**:

1. **Given** um usuário visualizando uma mineração com status "concluída", **When** ele clica na linha da mineração, **Then** um modal ou página de detalhes é aberta mostrando os resultados
2. **Given** a visualização de resultados aberta, **When** o usuário analisa os dados, **Then** ele vê: lista de keywords mineradas, volume de busca estimado, dificuldade/competitividade, keywords relacionadas
3. **Given** múltiplas keywords nos resultados, **When** o usuário visualiza a lista, **Then** ele pode ordenar por volume, dificuldade ou relevância
4. **Given** resultados sendo visualizados, **When** o usuário deseja sair, **Then** ele pode fechar o modal ou navegar de volta à lista

---

### User Story 6 - Exportar Dados Minerados (Priority: P3)

Usuários podem exportar os resultados de uma mineração em formato CSV ou JSON para uso em outras ferramentas.

**Why this priority**: Export é uma funcionalidade conveniente mas não essencial para o core da feature. Pode ser adicionada após o sistema básico estar funcionando.

**Independent Test**: Pode ser testado abrindo uma mineração concluída, clicando em "Exportar", selecionando o formato e verificando se o arquivo baixado contém os dados corretos.

**Acceptance Scenarios**:

1. **Given** um usuário visualizando resultados de uma mineração, **When** ele clica no botão "Exportar", **Then** ele vê opções de formato: CSV e JSON
2. **Given** o usuário selecionou um formato, **When** ele confirma a exportação, **Then** um arquivo é baixado com todos os dados minerados naquele formato
3. **Given** uma mineração com muitos resultados (>1000 keywords), **When** o usuário exporta, **Then** todos os dados são incluídos no arquivo sem perda de informação
4. **Given** uma mineração sem resultados, **When** o usuário tenta exportar, **Then** ele recebe uma mensagem informando que não há dados para exportar

---

### Edge Cases

- O que acontece quando uma mineração fica "travada" em status "em execução" por muito tempo? (Sistema deve marcar como "erro" após timeout configurado, ex: 2 horas)
- Como o sistema lida com falhas de comunicação com n8n durante sincronização? (Retry automático com backoff, mensagem de erro clara após 3 tentativas)
- O que acontece se o usuário criar múltiplas minerações com as mesmas keywords seed? (Sistema permite mas alerta sobre duplicação)
- Como o sistema se comporta quando n8n retorna dados parciais ou corrompidos? (Validação de dados antes de persistir, log de erro, notificação ao usuário)
- O que acontece quando um projeto é deletado mas tem minerações associadas? (Minerações mantêm referência ao projeto deletado com nome preserved, ou são marcadas como "sem projeto")
- Como o sistema lida com volume muito alto de keywords retornadas (>10.000)? (Paginação nos resultados, limite configurável, possibilidade de filtrar antes de visualizar)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema MUST exibir lista de minerações com: nome, projeto, status, data de criação, volume de keywords, ordenadas por data (mais recentes primeiro)
- **FR-002**: Sistema MUST permitir filtrar minerações por: projeto (dropdown), status (dropdown com opções: todas/pendente/em execução/concluída/erro), intervalo de datas (date range picker)
- **FR-003**: Sistema MUST exibir estado vazio quando não há minerações, com mensagem explicativa e call-to-action para criar primeira mineração
- **FR-004**: Sistema MUST ter botão "Atualizar Dados" que aciona sincronização com n8n via backend
- **FR-005**: Sistema MUST exibir indicadores visuais de loading durante sincronização e durante execução de minerações
- **FR-006**: Sistema MUST exibir mensagens de sucesso ou erro após sincronização
- **FR-007**: Sistema MUST ter botão "Nova Mineração" que abre modal com formulário de configuração
- **FR-008**: Modal de nova mineração MUST conter campos: nome da mineração (text input, obrigatório), seleção de projeto (dropdown, obrigatório), keywords seed (textarea, obrigatório, aceita múltiplas keywords separadas por vírgula ou linha), volume de mineração (number input, obrigatório, min: 10, max: 1000)
- **FR-009**: Sistema MUST validar todos os campos do formulário de mineração antes de permitir submissão
- **FR-010**: Sistema MUST criar mineração via backend (POST /mineracoes) que aciona workflow n8n
- **FR-011**: Sistema MUST exibir confirmação ao fechar modal com dados preenchidos não salvos
- **FR-012**: Sistema MUST permitir clicar em mineração concluída para visualizar resultados detalhados
- **FR-013**: Visualização de resultados MUST exibir: lista de keywords mineradas, métricas (volume de busca, dificuldade, keywords relacionadas)
- **FR-014**: Sistema MUST permitir ordenar resultados por: volume, dificuldade, relevância
- **FR-015**: Sistema MUST ter botão "Exportar" na visualização de resultados que oferece formatos CSV e JSON
- **FR-016**: Sistema MUST gerar arquivo de exportação com todos os dados minerados no formato selecionado
- **FR-017**: Sistema MUST exibir mensagem de erro quando tentar exportar mineração sem resultados
- **FR-018**: Sistema MUST marcar minerações como "erro" após timeout configurado (2 horas) em status "em execução"
- **FR-019**: Sistema MUST implementar retry com backoff exponencial para falhas de comunicação com n8n (3 tentativas)
- **FR-020**: Sistema MUST validar dados retornados por n8n antes de persistir no banco

### Key Entities

- **Mineração**: Representa uma operação de mineração de keywords. Atributos: id (UUID), nome, user_id (FK), project_id (FK), keywords_seed (array de strings), volume_target (número), status (enum: pendente/em_execucao/concluida/erro), n8n_workflow_id, created_at, updated_at, completed_at
- **Resultado de Mineração**: Keywords e dados minerados de uma mineração. Atributos: id (UUID), mineracao_id (FK), keyword (string), search_volume (número), difficulty (número), related_keywords (array de strings), metrics (JSON com dados adicionais)
- **Projeto**: Entidade existente que organiza minerações. Relacionamento: uma mineração pertence a um projeto
- **User**: Entidade existente. Relacionamento: um usuário pode ter múltiplas minerações

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários podem visualizar todas as suas minerações em uma lista com 100% dos dados corretos (nome, projeto, status, datas, volumes)
- **SC-002**: Filtros por projeto, status e data retornam resultados precisos em menos de 1 segundo
- **SC-003**: Sincronização com n8n completa em menos de 5 segundos para até 50 minerações
- **SC-004**: Usuários podem criar uma nova mineração preenchendo o formulário e submetendo em menos de 2 minutos
- **SC-005**: 100% das minerações criadas são iniciadas com sucesso no n8n (sem falhas de integração)
- **SC-006**: Validação de formulário previne 100% das submissões com dados inválidos
- **SC-007**: Usuários podem visualizar resultados de minerações concluídas com todas as keywords e métricas carregadas em menos de 3 segundos
- **SC-008**: Exportação de dados gera arquivos CSV e JSON válidos com 100% dos dados minerados
- **SC-009**: Sistema lida com falhas de n8n com retry automático e mensagens de erro claras em 100% dos casos
- **SC-010**: Minerações não ficam "travadas" por mais de 2 horas - timeout automático funciona em 100% dos casos
- **SC-011**: Interface permanece responsiva durante sincronizações e carregamentos (sem freeze)
- **SC-012**: Zero perda de dados durante sincronização com n8n ou criação de minerações

## Assumptions

- O backend NestJS já tem infraestrutura para comunicação com n8n (webhooks, API calls)
- Existe um workflow no n8n configurado para receber parâmetros de mineração e executar o processo
- A tabela de minerações e resultados já existe no banco Supabase ou será criada como parte desta feature
- O sistema de projetos já existe e está funcional
- Usuários têm conhecimento básico de keywords e SEO (não precisa de tutoriais extensos)
- O volume de minerações por usuário é gerenciável (não requer paginação infinita na listagem)
- Keywords seed são inseridas em português ou inglês (sem necessidade de i18n adicional)

## Out of Scope

- Análise avançada de keywords (competitividade detalhada, CPC, tendências temporais)
- Agendamento de minerações recorrentes
- Compartilhamento de minerações entre usuários
- Notificações push/email quando mineração completa
- Histórico de alterações em minerações
- Integração com outras ferramentas além do n8n (ex: Google Keyword Planner, Ahrefs)
- Machine learning para sugestão automática de keywords
- Visualizações gráficas de métricas (charts, dashboards)
- Comparação entre múltiplas minerações
- Versionamento de resultados de minerações
