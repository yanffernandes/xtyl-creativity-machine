# Feature Specification: OpenRouter Integration for AI Models

**Feature Branch**: `022-openrouter-integration`
**Created**: 2026-01-09
**Status**: Draft
**Input**: User description: "Adicione a openrouter, para que eu possa utilizar qualquer modelo da openrouter tambem nos prompts que sao configurados pelo admin, atualmente ta so openai. No alvoads meta, na opcao de criacao de imagem, que atualmente e so openai, coloque tambem openrouter, para que eu possa escolher outros modelos. Essa funcao nao deve remover a openai, mas deve ser configuravel atraves do admin."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Configures AI Provider for System Prompts (Priority: P1)

As an admin, I want to configure which AI provider (OpenAI or OpenRouter) is used for each system prompt, so that I can leverage different models for different use cases while maintaining the existing OpenAI functionality.

**Why this priority**: This is the foundational feature that enables all other OpenRouter capabilities. Without admin configuration, the system cannot use OpenRouter models.

**Independent Test**: Can be fully tested by an admin creating/editing a system prompt and selecting OpenRouter as the provider with a specific model. The prompt test feature should return results from the selected provider.

**Acceptance Scenarios**:

1. **Given** an admin is on the System Prompts page, **When** they create or edit a prompt, **Then** they see a provider selection dropdown with options "OpenAI" and "OpenRouter"

2. **Given** an admin selects "OpenRouter" as the provider, **When** the provider is selected, **Then** a model dropdown appears showing available OpenRouter models

3. **Given** an admin has configured a prompt with OpenRouter provider and model, **When** they click "Test Prompt", **Then** the system calls OpenRouter API and returns the response with model info and token usage

4. **Given** an existing prompt is configured with OpenAI, **When** the admin views the prompt, **Then** the provider shows "OpenAI" and all existing functionality works unchanged

---

### User Story 2 - Admin Configures Default Image Generation Model (Priority: P2)

As an admin, I want to configure which image generation model (DALL-E-3, Imagen-3, or OpenRouter models) is used platform-wide for AlvoAds Meta image generation, so that all users automatically use the model I've selected without needing to choose themselves.

**Why this priority**: Extends the core provider configuration to image generation. Admin controls the model selection centrally, simplifying the user experience.

**Independent Test**: Can be tested by an admin selecting an OpenRouter image model in admin settings, then verifying that users generating images in AlvoAds Meta automatically use that configured model.

**Acceptance Scenarios**:

1. **Given** an admin is in the admin settings area, **When** they access Image Generation configuration, **Then** they see a dropdown to select the default image model (DALL-E-3, Imagen-3, or OpenRouter models)

2. **Given** an admin selects an OpenRouter image model as default, **When** a user generates images in AlvoAds Meta, **Then** the system uses the admin-configured OpenRouter model automatically

3. **Given** an admin changes the default image model, **When** users generate new images, **Then** the new model is used for all subsequent generations

4. **Given** no default is configured, **When** a user generates images, **Then** the system falls back to DALL-E-3 (current default behavior)

---

### User Story 3 - User Generates Images with Admin-Configured Model (Priority: P3)

As a user creating Meta ad creatives, I want images to be generated using the platform's configured model, so that I get consistent results without needing to understand different AI providers.

**Why this priority**: This is the end-user experience that depends on admin configuration being complete. Users don't choose - they simply generate.

**Independent Test**: Can be tested by a user generating images in AlvoAds Meta and verifying the images are created using the admin-configured model.

**Acceptance Scenarios**:

1. **Given** a user is in the AlvoAds Meta creative wizard, **When** they reach the image generation step, **Then** they see a simple "Generate Images" action without model selection

2. **Given** an admin has configured OpenRouter as the image model, **When** a user generates images successfully, **Then** the image is saved to the creative library with the OpenRouter model name recorded

3. **Given** a user views the creative library, **When** looking at image details, **Then** they can see which model was used to generate each image

---

### Edge Cases

- What happens when OpenRouter API key (OPENROUTER_API_KEY env var) is not configured?
  - OpenRouter provider option is hidden; only OpenAI/Imagen options are available in dropdowns
- What happens when OpenRouter API returns an error during image generation?
  - System should display a user-friendly error message and the admin should be notified to check configuration
- What happens when an admin changes the default image model while users have pending generations?
  - Pending generations continue with the model at time of request; new requests use the new model
- What happens when credits check fails before OpenRouter generation?
  - Same credit validation as existing providers; generation is blocked with clear message
- What happens when the configured OpenRouter model becomes unavailable?
  - System should fall back to DALL-E-3 and notify admin of the issue

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support OpenRouter as an AI provider option alongside OpenAI for text generation in system prompts
- **FR-002**: System MUST use OpenRouter API key from backend environment variable (OPENROUTER_API_KEY), following the same pattern as OPENAI_API_KEY
- **FR-003**: System MUST display a provider selector (OpenAI/OpenRouter) when creating or editing system prompts
- **FR-004**: System MUST dynamically fetch available models from OpenRouter API when that provider is selected (no static configuration)
- **FR-005**: System MUST support testing prompts with OpenRouter models in the admin interface
- **FR-006**: System MUST persist the selected provider and model for each system prompt
- **FR-007**: System MUST allow admin to configure a default image generation model for the platform (DALL-E-3, Imagen-3, or OpenRouter models)
- **FR-008**: System MUST use the admin-configured image model for all AlvoAds Meta image generations (users do not select model)
- **FR-009**: System MUST record which provider and model was used when saving images to creative library
- **FR-010**: System MUST maintain backward compatibility with all existing OpenAI functionality
- **FR-011**: System MUST handle OpenRouter API errors gracefully with user-friendly messages
- **FR-012**: System MUST validate OpenRouter API key before allowing model selection
- **FR-013**: System MUST fall back to DALL-E-3 if the configured image model is unavailable

### Key Entities

- **AI Provider Configuration**: Stores provider settings including API keys, enabled status, default image model, and available models per provider type (text/image)
- **System Prompt (extended)**: Extended to include provider field (openai/openrouter) and provider-specific model identifier
- **Creative Library (extended)**: Extended to include provider information alongside model_used for tracking purposes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can configure and test system prompts with OpenRouter models within the same time as OpenAI (under 2 minutes for configuration)
- **SC-002**: Users can generate images with admin-configured OpenRouter models with success rate comparable to existing providers (>95% successful generations)
- **SC-003**: 100% of existing OpenAI functionality remains unchanged and operational after integration
- **SC-004**: System gracefully handles provider unavailability with automatic fallback to default provider
- **SC-005**: Response times for OpenRouter model selection and listing are under 2 seconds
- **SC-006**: User image generation workflow remains unchanged (no additional steps required from users)

## Assumptions

- OpenRouter API follows standard REST patterns compatible with the existing HTTP client infrastructure
- OpenRouter provides both text completion and image generation capabilities via their API
- Admin users have access to obtain OpenRouter API keys from the OpenRouter platform
- OpenRouter model pricing/credits are handled externally; the system only consumes credits based on existing platform credit system
- The list of available OpenRouter models will be fetched dynamically from their API (automatic updates, no manual configuration required)
- Users do not need to know which model is being used; this is an admin-level configuration decision

## Clarifications

### Session 2026-01-09

- Q: Como obter a lista de modelos OpenRouter? → A: Buscar dinamicamente via API do OpenRouter (atualiza automaticamente)
- Q: Onde armazenar a API key do OpenRouter? → A: Variavel de ambiente no backend (OPENROUTER_API_KEY), igual ao padrao do OPENAI_API_KEY
