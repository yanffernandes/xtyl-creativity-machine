# Feature Specification: Assistant Image Analysis & Refinement Tools

**Feature Branch**: `023-assistant-image-tools`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "No assistente IA, eu quero que existam tools de visualização de imagem. Então se eu tiver um arquivo aberto que tem imagens anexadas, por exemplo, eu quero que ele possa analisar essas imagens, verificar como elas estão construídas, analisar como elas estão e que eu possa também ter tools de refinar. Ou seja, que se eu falar pro assistente, pegue essas duas imagens, analise, diminua a fonte e faça tal coisa, tal coisa. Então ele possa também fazer um refinamento da imagem, ou seja, da mesma forma que já existe na geração de imagem, eu posso fazer tudo isso através do assistente de IA. O objetivo é deixar o sistema mais inteligente e funcional. Aumente tambem o limite de tarefas encadeadas de 15 para 25."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze Attached Document Images (Priority: P1)

A user has a document open that contains attached images (e.g., marketing creatives, product photos). They want the AI assistant to analyze these images and provide detailed feedback about composition, text legibility, colors, brand alignment, and overall quality.

**Why this priority**: This is the foundational capability that enables all other image-related interactions. Without the ability to analyze existing images, users cannot get AI feedback or proceed to refinements.

**Independent Test**: Can be fully tested by opening a document with attached images, asking "Analise as imagens deste documento" and receiving a detailed analysis of each image. Delivers immediate value for quality review workflows.

**Acceptance Scenarios**:

1. **Given** a document with attached images is open in the editor, **When** user asks the assistant "analise as imagens anexadas", **Then** the assistant uses a tool to retrieve and analyze each attached image, providing descriptions of visual elements, text content, colors, and composition
2. **Given** a document has multiple attached images, **When** user asks "compare essas duas imagens", **Then** the assistant analyzes both images and provides a comparative analysis highlighting differences and similarities
3. **Given** an image contains text (marketing copy, labels), **When** user asks "o que está escrito nessa imagem?", **Then** the assistant extracts and returns the visible text content using vision capabilities

---

### User Story 2 - Image Refinement via Text Instructions (Priority: P2)

A user wants to modify an existing image by providing natural language instructions to the AI assistant. For example: "pegue essa imagem e diminua o tamanho da fonte", "altere a cor de fundo para azul", or "remova o texto e deixe só a imagem".

**Why this priority**: After analyzing images, the natural next step is to refine them. This enables a complete creative workflow within the assistant without switching to external tools.

**Independent Test**: Can be tested by selecting an image and requesting "mude a cor do texto para vermelho", then verifying a new refined image is generated and offered to the user.

**Acceptance Scenarios**:

1. **Given** user references an existing image (by attachment or selection), **When** user says "diminua o tamanho da fonte em 20%", **Then** the assistant generates a refined version of the image with the requested modification and shows it to the user
2. **Given** user wants to modify multiple aspects, **When** user says "mude o fundo para preto e aumente o contraste", **Then** the assistant applies both modifications in a single refined image
3. **Given** a refinement is generated, **When** user reviews the result, **Then** user can accept (replacing the original or adding as new) or request further refinements

---

### User Story 3 - List and Select Document Images (Priority: P2)

A user wants to see all images attached to the current document and select specific ones for analysis or refinement. The assistant provides a tool to list attached images with thumbnails and allows targeting specific images by name or position.

**Why this priority**: Users need a way to identify and reference specific images when a document has multiple attachments, enabling precise instructions.

**Independent Test**: Can be tested by asking "liste as imagens deste documento" and receiving a numbered list with image titles/thumbnails, then referencing "analise a imagem 2".

**Acceptance Scenarios**:

1. **Given** a document has 5 attached images, **When** user asks "quais imagens estão neste documento?", **Then** the assistant lists all images with their titles, positions (1-5), and small descriptions
2. **Given** the list was shown, **When** user says "analise a imagem 3", **Then** the assistant retrieves and analyzes specifically the third image
3. **Given** an image has a descriptive title, **When** user says "analise a imagem 'banner-promocional'", **Then** the assistant finds and analyzes the image by title match

---

### User Story 4 - Increased Task Chain Limit (Priority: P3)

A user performs complex multi-step operations that require more than 15 sequential tool calls. The system now supports up to 25 chained tasks by default, allowing more sophisticated workflows without hitting iteration limits.

**Why this priority**: Supporting longer chains enables complex creative workflows where multiple images need analysis and refinement in sequence.

**Independent Test**: Can be tested by running a conversation that requires 20+ tool executions and verifying it completes without hitting the old 15-task limit.

**Acceptance Scenarios**:

1. **Given** user preferences are at default, **When** user initiates a complex workflow requiring 20 tool calls, **Then** the workflow completes successfully without hitting iteration limits
2. **Given** user has max_iterations preference set to 25, **When** checking the preferences, **Then** the value is persisted and used in subsequent chat sessions
3. **Given** the iteration limit is 25, **When** a workflow attempts 26+ iterations, **Then** user receives a clear message that the limit was reached and can increase it in preferences

---

### Edge Cases

- What happens when user references an image that doesn't exist? Assistant responds with "Não encontrei essa imagem no documento. As imagens disponíveis são: [list]"
- What happens when document has no attached images? Assistant responds with "Este documento não possui imagens anexadas. Você pode gerar uma nova imagem ou fazer upload."
- What happens when image refinement fails (API error)? User sees error message with option to retry; original image remains unchanged
- What happens when user asks to analyze an image that is still being generated? Assistant waits for generation to complete or informs user to wait
- What happens when refinement instruction is ambiguous (e.g., "melhore essa imagem")? Assistant asks clarifying questions about what specific aspects to improve
- What happens when the referenced image URL is expired or inaccessible? Assistant reports the issue and suggests re-uploading the image

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a tool (`list_document_images`) that retrieves all images attached to a specific document, returning their IDs, titles, URLs, and thumbnails
- **FR-002**: System MUST provide a tool (`analyze_image`) that uses vision capabilities to analyze an image and return detailed descriptions of visual elements, text content, colors, and composition
- **FR-003**: System MUST provide a tool (`analyze_document_images`) that analyzes all images attached to the current document in context
- **FR-004**: System MUST provide a tool (`refine_image`) that takes an existing image and a natural language instruction, generating a refined version using image-to-image capabilities
- **FR-005**: System MUST support referencing images by: document attachment position (1st, 2nd, 3rd), image document ID, or partial title match
- **FR-006**: System MUST include the current document's attached images in the AI context when the document is open and RAG mode is enabled
- **FR-007**: System MUST update `max_iterations` value from 15 to 25 for ALL users (migration script + new default)
- **FR-008**: System MUST allow existing users to update their `max_iterations` preference up to 50
- **FR-009**: System MUST display image thumbnails in the assistant's response when listing or analyzing images
- **FR-010**: System MUST save refined images as new document attachments by default, preserving the original image (user can manually delete original if desired)
- **FR-011**: Refined images MUST be stored in the same project as the source image
- **FR-012**: System MUST log vision API calls in the usage tracking system for cost monitoring

### Key Entities

- **DocumentAttachment**: Links images to documents with position ordering and primary flag - already exists
- **ImageAnalysisResult**: Contains analysis output (description, detected_text, colors, composition_notes, suggestions)
- **ImageRefinementRequest**: Contains source_image_id, instructions (natural language), output_preferences (size, format)
- **UserPreferences**: Contains max_iterations setting with default 25 (increased from 15)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can analyze attached images and receive detailed feedback within 10 seconds for standard images
- **SC-002**: Users can list all document images and reference them by position or title in follow-up requests
- **SC-003**: 90% of image refinement requests with clear instructions produce satisfactory results on first attempt
- **SC-004**: Complex workflows requiring 16-25 tool calls complete successfully without user intervention
- **SC-005**: Image analysis correctly identifies and extracts visible text with 95% accuracy for clear, high-contrast text
- **SC-006**: Users can complete an analyze-refine-save workflow in under 60 seconds for single image modifications

## Clarifications

### Session 2025-12-05

- Q: Qual estratégia usar para refinamento de imagem? → A: Usar o mecanismo existente de `base_image_url` que envia a imagem original convertida em base64 junto com o prompt de modificação para o modelo (image-to-image real)
- Q: Destino padrão para imagens refinadas? → A: Criar nova imagem anexada ao documento, mantendo a original (preserva histórico de iterações)
- Q: Migração de max_iterations para usuários existentes? → A: Atualizar automaticamente todos os usuários de 15 para 25 (usuário não tem UI para alterar essa config atualmente)

## Assumptions

- Vision API (OpenRouter with Claude or similar) supports image analysis with sufficient detail for creative feedback
- Image refinement uses the existing `base_image_url` parameter in `generate_image_openrouter()` which sends the original image as base64 along with the modification prompt
- The existing document attachment system (DocumentAttachment table) can support the new tool interactions
- Users have appropriate permissions to view and modify documents they're working with
- Image URLs stored in the system remain accessible for analysis (not expired or deleted)
- The existing thumbnail generation system can be reused for new refined images
