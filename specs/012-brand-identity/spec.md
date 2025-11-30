# Feature Specification: Brand Identity Settings (Color Palette & Typography)

**Feature Branch**: `012-brand-identity`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "É importante ter nas configurações do projeto a paleta de cores principal, que pode ser de assets e ou pode ser extraido de um ou mais uploads feitos na hora. A paleta deve ficar visivel para o usuario, assim como ele tbm pode ajustar o hex. E tbm quais as fontes (tipo arial, helvetica…) principais do projeto, para que os criativos tenham constância, acho que no mínimo 3 fontes, destacando qual é a primeira, segunda e terceira. E tudo isso deve fazer parte do contexto AI."

## Clarifications

### Session 2025-11-30

- Q: As cores da paleta têm ordem/prioridade ou são equivalentes? → A: Cores ordenadas por prioridade (1ª = primária, 2ª = secundária, etc.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Color Palette Manually (Priority: P1)

O usuário acessa as configurações do projeto e define manualmente as cores da paleta da marca. Ele pode adicionar até 6 cores, inserindo o código HEX diretamente ou usando um color picker visual. A paleta fica visível e pode ser editada a qualquer momento.

**Why this priority**: A paleta de cores é fundamental para a consistência visual dos criativos. Sem isso, a IA não tem referência de cores para usar nas gerações de imagem.

**Independent Test**: Pode ser testado criando um projeto, acessando configurações, adicionando 3 cores manualmente e verificando que aparecem salvas na interface.

**Acceptance Scenarios**:

1. **Given** um projeto sem paleta definida, **When** o usuário acessa as configurações de Brand Identity, **Then** ele vê a seção de cores vazia com opção de adicionar cor
2. **Given** a seção de cores aberta, **When** o usuário clica em "Adicionar Cor" e insere "#5B8DEF", **Then** a cor aparece como um swatch visual com seu código HEX
3. **Given** uma cor já adicionada, **When** o usuário clica no swatch, **Then** ele pode editar o HEX ou remover a cor
4. **Given** 6 cores já adicionadas, **When** o usuário tenta adicionar mais, **Then** o botão de adicionar fica desabilitado com tooltip explicativo

---

### User Story 2 - Extract Colors from Image Upload (Priority: P1)

O usuário faz upload de uma ou mais imagens (logo, assets da marca) e o sistema extrai automaticamente as cores dominantes, sugerindo-as para a paleta. O usuário pode aceitar, rejeitar ou ajustar cada cor sugerida.

**Why this priority**: Muitos usuários não sabem os códigos HEX exatos da marca, mas têm arquivos de logo ou assets. A extração automática facilita muito o setup inicial.

**Independent Test**: Fazer upload de uma imagem com cores conhecidas e verificar se as cores dominantes são extraídas e exibidas como sugestões.

**Acceptance Scenarios**:

1. **Given** a seção de paleta de cores, **When** o usuário clica em "Extrair de Imagem" e faz upload de um logo PNG, **Then** o sistema analisa a imagem e mostra até 6 cores dominantes como sugestões
2. **Given** cores sugeridas após upload, **When** o usuário clica em uma cor, **Then** ela é adicionada à paleta principal
3. **Given** cores sugeridas, **When** o usuário clica em "Adicionar Todas", **Then** todas as cores sugeridas são adicionadas à paleta (respeitando limite de 6)
4. **Given** uma cor sugerida, **When** o usuário não quer usá-la, **Then** ele pode ignorar/descartar a sugestão

---

### User Story 3 - Define Typography (Fonts) (Priority: P2)

O usuário define as 3 fontes principais do projeto: primária (títulos/destaques), secundária (corpo de texto), e terciária (elementos de apoio). Cada fonte pode ser selecionada de uma lista de fontes populares ou digitada manualmente.

**Why this priority**: A tipografia é o segundo pilar da identidade visual, mas é menos urgente que cores pois muitos usuários começam apenas com cores.

**Independent Test**: Acessar configurações, selecionar "Inter" como fonte primária, "Open Sans" como secundária, salvar e verificar que as fontes aparecem na listagem.

**Acceptance Scenarios**:

1. **Given** a seção de tipografia, **When** o usuário visualiza, **Then** ele vê 3 campos para fontes: Primária, Secundária e Terciária
2. **Given** o campo de fonte primária, **When** o usuário clica, **Then** ele vê um dropdown com fontes populares (Arial, Helvetica, Inter, Roboto, etc.) e opção de digitar nome customizado
3. **Given** fonte selecionada, **When** o usuário salva, **Then** a fonte fica visível com preview do nome da fonte estilizado (se possível)
4. **Given** nenhuma fonte configurada, **When** a IA gera conteúdo, **Then** ela usa valores padrão documentados

---

### User Story 4 - Brand Identity in AI Context (Priority: P2)

As cores e fontes definidas são automaticamente incluídas no contexto enviado para a IA ao gerar imagens ou conteúdo criativo, garantindo consistência visual.

**Why this priority**: Este é o objetivo final da feature - sem integração com o contexto da IA, as configurações seriam apenas decorativas.

**Independent Test**: Configurar paleta e fontes, gerar uma imagem via chat, verificar nos logs/prompt que as cores e fontes foram incluídas no contexto.

**Acceptance Scenarios**:

1. **Given** paleta com 3 cores definidas (#FF0000, #00FF00, #0000FF), **When** o usuário solicita geração de imagem, **Then** o prompt enviado à IA inclui essas cores como referência
2. **Given** fontes configuradas (Inter, Open Sans, Roboto), **When** o usuário solicita criação de conteúdo visual, **Then** o contexto da IA menciona essas fontes preferenciais
3. **Given** nenhuma cor ou fonte configurada, **When** o usuário gera conteúdo, **Then** a IA funciona normalmente sem essas referências (graceful degradation)

---

### User Story 5 - Extract Colors from Existing Assets (Priority: P3)

O usuário pode extrair cores de assets visuais já cadastrados no projeto (da biblioteca de assets), sem precisar fazer novo upload.

**Why this priority**: Conveniência adicional para projetos que já têm assets cadastrados. Não é bloqueante para MVP.

**Independent Test**: Ter assets no projeto, clicar em "Extrair de Assets", selecionar um asset, verificar cores extraídas.

**Acceptance Scenarios**:

1. **Given** projeto com assets visuais cadastrados, **When** o usuário clica em "Extrair de Assets Existentes", **Then** ele vê uma galeria dos assets do projeto
2. **Given** galeria de assets aberta, **When** o usuário seleciona um asset, **Then** o sistema extrai e sugere as cores dominantes daquele asset

---

### Edge Cases

- O que acontece se o usuário faz upload de uma imagem toda branca ou preta? Sistema deve detectar e mostrar mensagem de que não encontrou cores significativas.
- O que acontece se o usuário tenta adicionar a mesma cor duas vezes? Sistema deve alertar sobre cor duplicada.
- O que acontece se o usuário remove todas as cores? A seção volta ao estado inicial "vazio" sem erros.
- O que acontece se a extração de cores falha (erro de processamento)? Mostrar mensagem de erro amigável com opção de tentar novamente.
- O que acontece com fontes customizadas que não existem? Aceitar o nome digitado, informar que será usado como referência textual para a IA.

## Requirements *(mandatory)*

### Functional Requirements

**Paleta de Cores:**
- **FR-001**: Sistema DEVE permitir adicionar até 6 cores na paleta do projeto
- **FR-002**: Sistema DEVE aceitar entrada de cor via código HEX (#RRGGBB ou #RGB)
- **FR-003**: Sistema DEVE fornecer color picker visual como alternativa ao HEX
- **FR-004**: Sistema DEVE exibir cada cor como swatch visual com seu código HEX visível
- **FR-005**: Sistema DEVE permitir editar o HEX de qualquer cor já adicionada
- **FR-006**: Sistema DEVE permitir remover qualquer cor da paleta
- **FR-006b**: Sistema DEVE permitir reordenar cores via drag-and-drop (a ordem define prioridade: 1ª = primária, 2ª = secundária, etc.)
- **FR-007**: Sistema DEVE permitir upload de imagem para extração de cores
- **FR-008**: Sistema DEVE extrair até 6 cores dominantes de uma imagem enviada
- **FR-009**: Sistema DEVE mostrar cores extraídas como sugestões antes de adicionar à paleta
- **FR-010**: Sistema DEVE validar formato HEX e mostrar erro para formatos inválidos

**Tipografia:**
- **FR-011**: Sistema DEVE permitir configurar 3 níveis de fonte: Primária, Secundária, Terciária
- **FR-012**: Sistema DEVE oferecer lista de fontes populares para seleção (mínimo 15 opções)
- **FR-013**: Sistema DEVE permitir entrada manual de nome de fonte customizada
- **FR-014**: Sistema DEVE indicar visualmente a hierarquia das fontes (qual é primária, secundária, terciária)
- **FR-015**: Sistema DEVE persistir as configurações de fontes junto com as outras configurações do projeto

**Integração AI:**
- **FR-016**: Sistema DEVE incluir paleta de cores no contexto enviado para geração de imagens
- **FR-017**: Sistema DEVE incluir configuração de fontes no contexto enviado para a IA
- **FR-018**: Sistema DEVE funcionar normalmente mesmo sem cores ou fontes configuradas

**Persistência:**
- **FR-019**: Sistema DEVE salvar todas as configurações de brand identity com as configurações do projeto
- **FR-020**: Sistema DEVE carregar configurações de brand identity ao abrir página de settings

### Key Entities

- **ProjectColorPalette**: Coleção ordenada de até 6 cores associadas a um projeto. Atributos: lista ordenada de códigos HEX onde a posição indica prioridade (índice 0 = cor primária, índice 1 = cor secundária, etc.). O usuário pode reordenar via drag-and-drop.
- **ProjectTypography**: Configuração de fontes do projeto. Atributos: fonte primária, secundária, terciária (nomes de fonte).
- **ColorExtractionResult**: Resultado temporário da análise de imagem. Atributos: lista de cores dominantes com porcentagem de predominância.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem configurar paleta de cores completa (3+ cores) em menos de 2 minutos usando entrada manual
- **SC-002**: Extração de cores de imagem retorna resultados em menos de 5 segundos para imagens de até 5MB
- **SC-003**: 90% dos usuários que fazem upload de logo conseguem extrair pelo menos 2 cores utilizáveis
- **SC-004**: Configuração de fontes completa (3 fontes) leva menos de 1 minuto
- **SC-005**: Criativos gerados com brand identity configurada mostram maior consistência visual (avaliação qualitativa)
- **SC-006**: Zero erros de salvamento/carregamento de configurações de brand identity em uso normal

## Assumptions

- A extração de cores será feita no backend usando algoritmos de clustering de cores (como K-means ou similar)
- As fontes configuradas são usadas como referência textual para a IA, não como fonte renderizada no sistema
- O limite de 6 cores é suficiente para a maioria das paletas de marca (cores primária, secundária, acentos)
- Formatos de imagem suportados para extração: PNG, JPG, WEBP
- A lista de fontes populares incluirá: Arial, Helvetica, Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Playfair Display, Source Sans Pro, Oswald, Raleway, Nunito, Ubuntu, Merriweather

## Location

A funcionalidade será adicionada na página de Project Settings existente (`/workspace/{id}/project/{projectId}/settings`), como uma nova seção "Brand Identity" posicionada entre "Basic Information" e "Advanced Settings".
