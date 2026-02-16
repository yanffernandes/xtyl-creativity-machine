# Feature Specification: Bug Report System

**Feature Branch**: `021-bug-report-system`
**Created**: 2026-01-07
**Status**: Draft
**Input**: Sistema de captura de bugs com botão flutuante, captura automática de screenshot, gravação de tela, captura de erros do console, armazenamento no Supabase e integração com ClickUp

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reportar Bug com Screenshot Automático (Priority: P1)

O usuário encontra um problema no sistema e quer reportá-lo rapidamente. Ele clica no botão de bug no canto inferior direito da tela, o sistema automaticamente captura um screenshot da tela atual, o usuário adiciona uma descrição do problema e envia o report.

**Why this priority**: É a funcionalidade core do sistema. Sem a capacidade básica de reportar bugs com screenshot, o sistema não tem valor. Esta é a jornada mínima viável que já entrega valor imediato.

**Independent Test**: Pode ser testado criando um bug report com screenshot automático, verificando que a imagem foi salva no Supabase Storage e o registro criado no banco de dados.

**Acceptance Scenarios**:

1. **Given** o usuário está logado em qualquer tela do sistema, **When** ele clica no botão de bug flutuante, **Then** um modal abre mostrando o screenshot automático da tela atual
2. **Given** o modal de bug report está aberto, **When** o usuário preenche a descrição e clica em "Enviar", **Then** o report é salvo no Supabase com o screenshot e uma mensagem de sucesso é exibida
3. **Given** o modal de bug report está aberto, **When** o usuário clica em "Cancelar" ou fora do modal, **Then** o modal fecha sem criar nenhum report

---

### User Story 2 - Gravar Vídeo da Tela (Priority: P2)

O usuário quer demonstrar um bug que envolve uma sequência de ações. Ele inicia uma gravação de tela, reproduz o problema, para a gravação e envia o report com o vídeo anexado.

**Why this priority**: Gravação de vídeo é essencial para bugs complexos que não podem ser explicados apenas com um screenshot, mas depende da funcionalidade básica de report estar funcionando primeiro.

**Independent Test**: Pode ser testado iniciando uma gravação, realizando algumas ações, parando a gravação e verificando que o vídeo foi salvo corretamente no Supabase Storage.

**Acceptance Scenarios**:

1. **Given** o modal de bug report está aberto, **When** o usuário clica em "Gravar Tela", **Then** a gravação inicia e um indicador visual mostra que está gravando
2. **Given** a gravação está em andamento, **When** o usuário clica em "Parar Gravação", **Then** a gravação para e o vídeo é anexado ao report como preview
3. **Given** a gravação está em andamento, **When** o usuário navega para outra página, **Then** a gravação continua capturando a navegação
4. **Given** o navegador não suporta gravação de tela, **When** o usuário clica em "Gravar Tela", **Then** uma mensagem informa que o recurso não está disponível neste navegador

---

### User Story 3 - Anexar Arquivos Manualmente (Priority: P2)

O usuário quer anexar arquivos adicionais ao bug report, como logs exportados, arquivos de configuração ou screenshots adicionais tirados por ele.

**Why this priority**: Complementa a funcionalidade de screenshot automático, permitindo contexto adicional quando necessário.

**Independent Test**: Pode ser testado anexando múltiplos arquivos de diferentes tipos e verificando que todos foram salvos corretamente no Supabase Storage.

**Acceptance Scenarios**:

1. **Given** o modal de bug report está aberto, **When** o usuário clica em "Anexar Arquivo" e seleciona um arquivo, **Then** o arquivo aparece na lista de anexos com nome e tamanho
2. **Given** existem arquivos anexados, **When** o usuário clica no botão de remover em um anexo, **Then** o arquivo é removido da lista
3. **Given** o usuário tenta anexar um arquivo maior que 10MB, **When** ele seleciona o arquivo, **Then** uma mensagem de erro informa o limite de tamanho
4. **Given** o usuário tenta anexar mais de 5 arquivos, **When** ele seleciona o arquivo adicional, **Then** uma mensagem informa o limite de arquivos

---

### User Story 4 - Configurar Email do ClickUp (Priority: P3)

O administrador ou usuário quer configurar seu email do ClickUp para que os bug reports sejam automaticamente criados como tarefas no ClickUp.

**Why this priority**: Integração com ClickUp é um valor adicional importante, mas o sistema pode funcionar sem ela (apenas armazenando no Supabase).

**Independent Test**: Pode ser testado configurando o email do ClickUp nas configurações, criando um bug report e verificando que a tarefa foi criada no ClickUp.

**Acceptance Scenarios**:

1. **Given** o usuário está na página de configurações, **When** ele navega para a seção de Bug Report, **Then** ele vê o campo para configurar o email do ClickUp
2. **Given** o usuário configurou o email do ClickUp, **When** ele envia um bug report, **Then** uma tarefa é criada no ClickUp via email e o ID da tarefa é salvo no registro
3. **Given** o usuário não configurou email do ClickUp, **When** ele envia um bug report, **Then** o report é salvo apenas no Supabase sem integração com ClickUp

---

### User Story 5 - Visualizar Histórico de Reports (Priority: P3)

O usuário ou admin quer ver todos os bug reports enviados, filtrar por status e ver detalhes de cada um.

**Why this priority**: Histórico é útil para acompanhamento, mas não é essencial para a funcionalidade core de reportar bugs.

**Independent Test**: Pode ser testado criando alguns bug reports e verificando que aparecem listados corretamente com filtros funcionando.

**Acceptance Scenarios**:

1. **Given** o usuário está na página de Bug Reports, **When** a página carrega, **Then** ele vê uma lista de todos os seus bug reports ordenados por data
2. **Given** existem bug reports com diferentes status, **When** o usuário filtra por status "Aberto", **Then** apenas reports com esse status são exibidos
3. **Given** o usuário clica em um bug report da lista, **When** o modal de detalhes abre, **Then** ele vê todas as informações incluindo screenshot, descrição e anexos

---

### Edge Cases

- O que acontece quando a captura de screenshot falha (ex: páginas com conteúdo protegido)?
  - O sistema permite enviar o report sem screenshot, com uma mensagem informando que a captura não foi possível
- O que acontece quando o usuário perde conexão durante o upload de um arquivo grande?
  - O sistema mostra erro e permite tentar novamente, mantendo os dados do formulário
- O que acontece quando o limite de storage no Supabase é atingido?
  - O sistema mostra erro claro e sugere contatar o suporte
- O que acontece quando o email do ClickUp está configurado incorretamente?
  - O report é salvo no Supabase e uma flag indica falha na integração ClickUp
- O que acontece em browsers que não suportam screen capture API?
  - Screenshot automático é desabilitado, usuário pode anexar screenshots manualmente

## Requirements *(mandatory)*

### Functional Requirements

**Botão Flutuante**
- **FR-001**: Sistema DEVE exibir um botão flutuante de bug report no canto inferior direito de todas as telas (quando usuário está logado)
- **FR-002**: Botão DEVE ter ícone de bug reconhecível e tooltip "Reportar Bug"
- **FR-003**: Botão DEVE ser discreto mas visível, não interferindo com a navegação
- **FR-003a**: Botão DEVE ter opção de retrair/minimizar, permitindo que o usuário o esconda temporariamente
- **FR-003b**: Estado retraído DEVE persistir na sessão do usuário (localStorage)

**Captura de Screenshot**
- **FR-004**: Sistema DEVE capturar screenshot automático da tela quando o modal de report é aberto
- **FR-005**: Screenshot DEVE capturar a área visível da página (viewport)
- **FR-006**: Sistema DEVE permitir que usuário tire novo screenshot se o automático não ficou bom
- **FR-007**: Sistema DEVE funcionar mesmo se screenshot falhar, permitindo report sem imagem

**Gravação de Tela**
- **FR-008**: Sistema DEVE permitir gravação de tela usando MediaDevices API
- **FR-009**: Gravação DEVE ter limite máximo de 2 minutos
- **FR-010**: Sistema DEVE mostrar indicador visual durante gravação
- **FR-011**: Sistema DEVE permitir pausar/continuar gravação

**Captura de Erros do Console**
- **FR-012**: Sistema DEVE capturar automaticamente os últimos 50 erros/warnings do console
- **FR-013**: Erros capturados DEVEM incluir stack trace quando disponível
- **FR-014**: Sistema DEVE capturar informações do navegador e sistema operacional

**Formulário de Report**
- **FR-015**: Formulário DEVE ter campo obrigatório de descrição (mínimo 10 caracteres)
- **FR-016**: Formulário DEVE permitir selecionar severidade (Baixa, Média, Alta, Crítica)
- **FR-017**: Formulário DEVE permitir categorizar o tipo de bug (Visual, Funcional, Performance, Outro)
- **FR-018**: Sistema DEVE anexar automaticamente URL da página atual e user_id

**Anexos**
- **FR-019**: Sistema DEVE permitir anexar até 5 arquivos por report
- **FR-020**: Cada arquivo DEVE ter no máximo 10MB
- **FR-021**: Tipos permitidos: imagens (png, jpg, gif), vídeos (mp4, webm), documentos (pdf, txt, log)
- **FR-022**: Sistema DEVE mostrar preview de imagens anexadas

**Armazenamento**
- **FR-023**: Todos os anexos DEVEM ser salvos no Supabase Storage no bucket "bug-reports"
- **FR-024**: Arquivos DEVEM ser organizados por user_id e data (bug-reports/{user_id}/{yyyy-mm-dd}/{file})
- **FR-025**: Metadados do report DEVEM ser salvos na tabela "bug_reports"
- **FR-025a**: Bug reports e anexos DEVEM ser mantidos indefinidamente (sem deleção automática)

**Integração ClickUp**
- **FR-026**: Sistema DEVE permitir configurar email do ClickUp List nas configurações do usuário
- **FR-027**: Quando configurado, sistema DEVE criar tarefa no ClickUp via email ao enviar report
- **FR-028**: Email enviado DEVE incluir descrição, link para screenshot, informações técnicas
- **FR-029**: Sistema DEVE salvar referência da tarefa ClickUp criada (se disponível)

**Histórico e Gestão**
- **FR-030**: Usuários DEVEM poder ver histórico dos seus próprios bug reports
- **FR-031**: Admins DEVEM poder ver todos os bug reports do workspace
- **FR-032**: Sistema DEVE permitir filtrar por status, severidade, data e tipo
- **FR-033**: Sistema DEVE permitir marcar reports como resolvidos

### Key Entities

- **BugReport**: Representa um report de bug enviado. Contém user_id, workspace_id, título, descrição, severidade, tipo, status, URL da página, informações do browser, console errors, clickup_task_id, timestamps
- **BugReportAttachment**: Representa um anexo do report. Contém bug_report_id, tipo (screenshot, video, file), storage_path, nome original, tamanho, mime_type
- **BugReportSettings**: Configurações de integração por usuário. Contém user_id, clickup_email, notification_preferences
- **ConsoleError**: Erros capturados do console. Contém bug_report_id, tipo (error, warning), mensagem, stack_trace, timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem enviar bug report com screenshot em menos de 30 segundos
- **SC-002**: Sistema captura screenshot automático em 95% das tentativas (considerando limitações de browser)
- **SC-003**: Tempo de upload de anexos menor que 5 segundos para arquivos até 5MB
- **SC-004**: Taxa de sucesso de integração ClickUp maior que 98% (quando configurado corretamente)
- **SC-005**: Sistema não impacta performance da aplicação (botão flutuante carrega em menos de 100ms)
- **SC-006**: Gravação de vídeo funciona em Chrome, Firefox e Edge (últimas 2 versões)
- **SC-007**: Todos os reports são persistidos com sucesso no Supabase
- **SC-008**: Interface de histórico carrega lista de reports em menos de 2 segundos

## Assumptions

- Usuários têm browsers modernos que suportam Canvas API e MediaDevices API
- ClickUp permite criação de tarefas via email (feature padrão do ClickUp)
- Supabase Storage está configurado e disponível
- Usuários já estão autenticados no sistema (botão só aparece para usuários logados)

## Out of Scope

- Integração direta com API do ClickUp (usaremos email por simplicidade)
- Sistema de comentários nos bug reports
- Notificações em tempo real de novos reports
- Dashboard de métricas de bugs
- Integração com outros sistemas além do ClickUp (Jira, Linear, etc)
- OCR ou análise automática de screenshots

## Clarifications

### Session 2026-01-07

- Q: Em quais telas o botão flutuante deve aparecer? → A: Sempre visível em todas as telas, com opção do usuário retrair/esconder o botão
- Q: Escopo da configuração do ClickUp (por usuário ou workspace)? → A: Por usuário (cada usuário configura seu próprio email ClickUp)
- Q: Por quanto tempo manter bug reports e anexos no sistema? → A: Indefinido (nunca deletar automaticamente)
