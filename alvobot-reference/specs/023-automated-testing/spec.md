# Feature Specification: Sistema de Testes Automatizados

**Feature Branch**: `023-automated-testing`
**Created**: 2026-01-10
**Status**: Draft
**Input**: User description: "Sistema de testes automatizados para o projeto AlvoBot, incluindo testes unitários (Vitest para frontend React, Jest para backend NestJS), testes de integração, testes E2E com Playwright, e testes de RLS do Supabase. A estrutura deve seguir o padrão de testes co-localizados (junto do código) para unit tests, pasta separada e2e/ na raiz para Playwright, e supabase/tests/ para RLS. Deve incluir mocks do Supabase client, MSW para APIs, helpers e factories de dados de teste, e integração com CI/CD via GitHub Actions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desenvolvedor Executa Testes Unitários do Frontend (Priority: P1)

Como desenvolvedor, quero executar testes unitários dos componentes e hooks do frontend para garantir que a lógica de apresentação e estado funciona corretamente antes de fazer commit do código.

**Why this priority**: Testes unitários do frontend são a base da pirâmide de testes. Eles rodam rapidamente, são baratos de manter, e garantem que os blocos fundamentais da aplicação funcionam. Componentes compartilhados (Button, Input, Modal) são usados em toda a aplicação - bugs aqui afetam tudo.

**Independent Test**: Pode ser testado executando `npm run test` no diretório frontend e verificando que todos os testes passam com cobertura mínima de 70%.

**Acceptance Scenarios**:

1. **Given** um desenvolvedor com o projeto clonado, **When** ele executa `npm run test` no frontend, **Then** os testes unitários rodam e mostram resultados com cobertura de código.
2. **Given** um componente Button renderizado, **When** o usuário clica nele, **Then** o callback onClick é chamado corretamente.
3. **Given** um hook useProjects, **When** a API retorna dados, **Then** o hook atualiza o estado com os projetos retornados.
4. **Given** um componente com props inválidas, **When** renderizado, **Then** o teste falha com mensagem clara do problema.

---

### User Story 2 - Desenvolvedor Executa Testes Unitários do Backend (Priority: P1)

Como desenvolvedor, quero executar testes unitários dos services e controllers do backend para garantir que a lógica de negócio funciona isoladamente.

**Why this priority**: O backend contém a lógica crítica de negócio - integrações com Meta, Google, WordPress, e operações de créditos. Testes unitários garantem que cada service funciona corretamente com dependências mockadas.

**Independent Test**: Pode ser testado executando `npm run test` no diretório backend e verificando que todos os testes passam.

**Acceptance Scenarios**:

1. **Given** um desenvolvedor com o projeto clonado, **When** ele executa `npm run test` no backend, **Then** os testes unitários rodam usando Jest.
2. **Given** um AuthService com JwtService mockado, **When** validateToken é chamado com token válido, **Then** retorna os dados do usuário.
3. **Given** um BaseStructureController, **When** generateNiches é chamado, **Then** o service correspondente é invocado com os parâmetros corretos.
4. **Given** uma chamada a API externa falha, **When** o service processa a resposta, **Then** um erro apropriado é lançado.

---

### User Story 3 - Desenvolvedor Executa Testes de Integração (Priority: P2)

Como desenvolvedor, quero executar testes de integração que validam a comunicação entre módulos do backend e o banco de dados para garantir que o sistema funciona como um todo.

**Why this priority**: Testes de integração validam que os módulos funcionam juntos corretamente. São mais lentos que unitários mas capturam bugs de integração que testes unitários não detectam.

**Independent Test**: Pode ser testado executando `npm run test:e2e` no backend com um banco de dados de teste configurado.

**Acceptance Scenarios**:

1. **Given** um ambiente de teste com banco PostgreSQL, **When** o desenvolvedor executa testes de integração, **Then** os endpoints da API são testados com dados reais.
2. **Given** um usuário autenticado, **When** ele cria um projeto via API, **Then** o projeto é persistido no banco e retornado na resposta.
3. **Given** um token JWT inválido, **When** uma requisição protegida é feita, **Then** a API retorna erro 401.
4. **Given** dados de teste seedados, **When** testes terminam, **Then** os dados são limpos automaticamente.

---

### User Story 4 - Desenvolvedor Executa Testes E2E (Priority: P2)

Como desenvolvedor ou QA, quero executar testes end-to-end que simulam fluxos completos de usuário no navegador para garantir que a aplicação funciona do ponto de vista do usuário final.

**Why this priority**: Testes E2E são o teste final de qualidade - validam que frontend, backend, e banco funcionam juntos. São mais caros de manter mas essenciais para fluxos críticos como login e criação de projetos.

**Independent Test**: Pode ser testado executando `npm run test` no diretório e2e com a aplicação rodando localmente.

**Acceptance Scenarios**:

1. **Given** a aplicação rodando localmente, **When** o desenvolvedor executa testes Playwright, **Then** um navegador automatizado executa os fluxos de teste.
2. **Given** a página de login, **When** o usuário insere credenciais válidas e clica em entrar, **Then** é redirecionado para o dashboard.
3. **Given** um usuário logado na página de projetos, **When** ele cria um novo projeto, **Then** o projeto aparece na lista.
4. **Given** um teste falha, **When** o relatório é gerado, **Then** inclui screenshot e trace do erro.

---

### User Story 5 - Pipeline CI Executa Testes Automaticamente (Priority: P2)

Como desenvolvedor, quero que os testes sejam executados automaticamente em cada pull request para garantir que código com bugs não seja mergeado.

**Why this priority**: CI/CD automatizado é essencial para manter qualidade do código. Sem isso, desenvolvedores podem esquecer de rodar testes localmente e bugs chegam à produção.

**Independent Test**: Pode ser testado criando um PR e verificando que o workflow do GitHub Actions executa e reporta resultados.

**Acceptance Scenarios**:

1. **Given** um desenvolvedor cria um PR, **When** o PR é aberto, **Then** o GitHub Actions inicia os workflows de teste.
2. **Given** todos os testes passam, **When** o workflow completa, **Then** o PR mostra status verde de "checks passed".
3. **Given** um teste falha, **When** o workflow completa, **Then** o PR é bloqueado com status vermelho e log do erro.
4. **Given** testes completam, **When** o relatório de cobertura é gerado, **Then** é publicado como comentário no PR.

---

### User Story 6 - Desenvolvedor Utiliza Mocks e Helpers (Priority: P3)

Como desenvolvedor, quero ter acesso a mocks pré-configurados (Supabase, APIs externas) e helpers de teste para escrever testes novos rapidamente.

**Why this priority**: Mocks e helpers reduzem a barreira para escrever testes. Sem eles, cada desenvolvedor precisa criar seus próprios mocks, levando a inconsistência e duplicação.

**Independent Test**: Pode ser testado importando os mocks em um novo arquivo de teste e verificando que funcionam sem configuração adicional.

**Acceptance Scenarios**:

1. **Given** um desenvolvedor escrevendo um teste de componente, **When** ele importa o mock do Supabase, **Then** as chamadas ao Supabase são interceptadas automaticamente.
2. **Given** um teste que faz chamadas HTTP, **When** MSW é configurado, **Then** as requisições são interceptadas e respondidas com dados mockados.
3. **Given** um teste que precisa de dados de usuário, **When** o desenvolvedor usa a factory de usuário, **Then** um objeto de usuário válido é gerado automaticamente.
4. **Given** um teste E2E, **When** o desenvolvedor usa o helper de autenticação, **Then** um usuário de teste é criado e logado automaticamente.

---

### User Story 7 - Desenvolvedor Testa Políticas RLS do Supabase (Priority: P3)

Como desenvolvedor, quero ter testes que validam as políticas de Row Level Security do Supabase para garantir que usuários só acessam dados que têm permissão.

**Why this priority**: RLS é a última linha de defesa de segurança. Bugs em RLS podem expor dados de usuários. Testes específicos garantem que as políticas funcionam como esperado.

**Independent Test**: Pode ser testado executando scripts SQL de teste contra o banco local do Supabase.

**Acceptance Scenarios**:

1. **Given** um usuário A autenticado, **When** ele consulta projetos, **Then** só vê projetos onde é owner ou membro do workspace.
2. **Given** um usuário A autenticado, **When** ele tenta inserir um projeto com user_id de outro usuário, **Then** a operação falha.
3. **Given** um admin ativo, **When** ele consulta system_prompts, **Then** vê todos os prompts (incluindo inativos).
4. **Given** um usuário comum, **When** ele consulta system_prompts, **Then** só vê prompts ativos.

---

### Edge Cases

- O que acontece quando um teste depende de serviço externo indisponível? (Deve usar mock e não falhar)
- O que acontece quando o banco de teste não está disponível? (Testes de integração devem pular com aviso claro)
- O que acontece quando dois testes E2E tentam usar o mesmo email de usuário? (Cada teste deve criar usuário único)
- O que acontece quando um teste deixa dados sujos no banco? (Cleanup automático deve executar mesmo se teste falha)
- O que acontece quando a cobertura cai abaixo do threshold? (CI deve falhar com mensagem indicando arquivos sem cobertura)

## Requirements *(mandatory)*

### Functional Requirements

**Infraestrutura Frontend (Vitest)**
- **FR-001**: Sistema DEVE permitir execução de testes unitários no frontend via comando npm
- **FR-002**: Sistema DEVE gerar relatório de cobertura de código após execução dos testes
- **FR-003**: Sistema DEVE suportar testes de componentes React com simulação de eventos de usuário
- **FR-004**: Sistema DEVE suportar testes de hooks customizados incluindo hooks que usam TanStack Query
- **FR-005**: Sistema DEVE fornecer mock pré-configurado do cliente Supabase

**Infraestrutura Backend (Jest)**
- **FR-006**: Sistema DEVE permitir execução de testes unitários no backend via comando npm
- **FR-007**: Sistema DEVE suportar testes de NestJS services com injeção de dependências mockadas
- **FR-008**: Sistema DEVE suportar testes de NestJS controllers com guards mockados
- **FR-009**: Sistema DEVE fornecer mocks para APIs externas (OpenAI, Meta, Google, WordPress)

**Testes de Integração**
- **FR-010**: Sistema DEVE permitir execução de testes de integração contra banco PostgreSQL
- **FR-011**: Sistema DEVE aplicar migrations antes dos testes de integração
- **FR-012**: Sistema DEVE limpar dados de teste após cada suite de testes

**Testes E2E (Playwright)**
- **FR-013**: Sistema DEVE permitir execução de testes E2E via Playwright
- **FR-014**: Sistema DEVE suportar testes em múltiplos navegadores (Chrome, Firefox)
- **FR-015**: Sistema DEVE gerar screenshots e traces em caso de falha
- **FR-016**: Sistema DEVE fornecer Page Objects para páginas principais
- **FR-017**: Sistema DEVE gerenciar ciclo de vida de usuários de teste (criar, autenticar, limpar)

**Testes de RLS**
- **FR-018**: Sistema DEVE permitir validação de políticas RLS via scripts SQL
- **FR-019**: Sistema DEVE testar cenários de acesso permitido e negado para cada tabela crítica

**CI/CD**
- **FR-020**: Sistema DEVE executar todos os testes automaticamente em cada pull request
- **FR-021**: Sistema DEVE bloquear merge de PRs com testes falhando
- **FR-022**: Sistema DEVE publicar relatório de cobertura em cada PR
- **FR-023**: Sistema DEVE executar testes em paralelo quando possível para reduzir tempo total

**Mocks e Helpers**
- **FR-024**: Sistema DEVE fornecer factories para geração de dados de teste
- **FR-025**: Sistema DEVE fornecer MSW handlers para interceptação de requisições HTTP
- **FR-026**: Sistema DEVE fornecer helpers para setup e teardown de dados no Supabase

### Key Entities

- **Test Suite**: Conjunto de testes relacionados a uma funcionalidade, contém múltiplos test cases
- **Test Case**: Teste individual com given/when/then, pode passar ou falhar
- **Mock**: Simulação de dependência externa (Supabase, API, serviço)
- **Factory**: Função que gera dados de teste válidos para uma entidade
- **Fixture**: Configuração reutilizável de estado para testes (usuário logado, projeto criado)
- **Page Object**: Abstração de página para testes E2E, encapsula seletores e ações
- **Coverage Report**: Relatório mostrando percentual de código executado pelos testes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desenvolvedores conseguem executar testes unitários do frontend em menos de 30 segundos
- **SC-002**: Desenvolvedores conseguem executar testes unitários do backend em menos de 30 segundos
- **SC-003**: Cobertura de código do frontend atinge mínimo de 70% em statements, branches, functions e lines
- **SC-004**: Cobertura de código do backend atinge mínimo de 70% em statements, branches, functions e lines
- **SC-005**: Pipeline de CI completa todos os testes em menos de 10 minutos
- **SC-006**: Testes E2E dos fluxos críticos (login, criar projeto) passam em 100% das execuções em ambiente limpo
- **SC-007**: 100% das tabelas com RLS têm pelo menos um teste de política
- **SC-008**: Desenvolvedores conseguem escrever um novo teste unitário em menos de 5 minutos usando mocks e factories existentes
- **SC-009**: Taxa de testes flaky (que falham intermitentemente) é menor que 2%
- **SC-010**: Nenhum PR é mergeado com testes falhando (100% de enforcement)

## Assumptions

- O projeto já possui estrutura de pastas frontend/ e backend/ estabelecida
- Jest já está configurado no backend (apenas sem testes escritos)
- O time de desenvolvimento tem familiaridade básica com conceitos de teste
- Supabase CLI está disponível para testes locais
- GitHub Actions é a plataforma de CI/CD utilizada
- O banco de dados de teste será um projeto Supabase separado ou Supabase local via Docker
