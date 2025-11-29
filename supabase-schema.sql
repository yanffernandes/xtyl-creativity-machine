-- =============================================================================
-- XTYL Creativity Machine - Supabase Database Schema
-- =============================================================================
-- Execute este script no SQL Editor do Supabase
-- =============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- TABELAS PRINCIPAIS
-- =============================================================================

-- Users (sincronizado com auth.users via trigger)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR NOT NULL,
    description TEXT,
    default_text_model VARCHAR,
    default_vision_model VARCHAR,
    attachment_analysis_model VARCHAR,
    available_models JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);

-- Workspace Users (many-to-many)
CREATE TABLE IF NOT EXISTS workspace_users (
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'member',
    PRIMARY KEY (workspace_id, user_id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR NOT NULL,
    description TEXT,
    workspace_id VARCHAR REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);

-- Folders
CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR NOT NULL,
    parent_folder_id VARCHAR REFERENCES folders(id) ON DELETE SET NULL,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    title VARCHAR,
    content TEXT,
    status VARCHAR DEFAULT 'draft',
    project_id VARCHAR REFERENCES projects(id) ON DELETE CASCADE,
    folder_id VARCHAR REFERENCES folders(id) ON DELETE SET NULL,

    -- Media fields
    media_type VARCHAR DEFAULT 'text',
    file_url VARCHAR,
    thumbnail_url VARCHAR,
    generation_metadata JSONB,

    -- Visual asset fields
    is_reference_asset BOOLEAN DEFAULT FALSE,
    asset_type VARCHAR,
    asset_metadata JSONB,

    -- Public sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR UNIQUE,
    share_expires_at TIMESTAMP WITH TIME ZONE,

    -- Context file for RAG (reference material, not a creation)
    is_context BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON documents(share_token);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_is_context ON documents(is_context) WHERE is_context = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_project_context ON documents(project_id, is_context) WHERE is_context = TRUE AND deleted_at IS NULL;

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    actor_type VARCHAR NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);

-- AI Usage Log
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id VARCHAR REFERENCES workspaces(id) ON DELETE SET NULL,
    project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,

    model VARCHAR NOT NULL,
    provider VARCHAR NOT NULL,
    request_type VARCHAR NOT NULL,

    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,

    input_cost NUMERIC(10, 6) DEFAULT 0,
    output_cost NUMERIC(10, 6) DEFAULT 0,
    total_cost NUMERIC(10, 6) DEFAULT 0,

    prompt_preview TEXT,
    response_preview TEXT,
    tool_calls JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace ON ai_usage_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_log(created_at);

-- Templates
CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    workspace_id VARCHAR REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    icon VARCHAR,
    prompt TEXT NOT NULL,

    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    tags JSONB,
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON templates(is_system);

-- =============================================================================
-- WORKFLOW SYSTEM TABLES
-- =============================================================================

-- Workflow Templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    workspace_id VARCHAR REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,

    nodes_json JSONB DEFAULT '[]'::jsonb,
    edges_json JSONB DEFAULT '[]'::jsonb,
    default_params_json JSONB DEFAULT '{}'::jsonb,

    is_system BOOLEAN DEFAULT FALSE,
    is_recommended BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    version VARCHAR DEFAULT '1.0',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_workspace ON workflow_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_project ON workflow_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_system ON workflow_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_recommended ON workflow_templates(is_recommended);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    template_id VARCHAR NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status VARCHAR DEFAULT 'pending',
    config_json JSONB DEFAULT '{}'::jsonb,
    execution_context JSONB DEFAULT '{}'::jsonb,
    progress_percent INTEGER DEFAULT 0,
    current_node_id VARCHAR,
    celery_task_id VARCHAR,

    error_message TEXT,
    total_cost NUMERIC(10, 6) DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    generated_document_ids JSONB DEFAULT '[]'::jsonb,

    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_template ON workflow_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_project ON workflow_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace ON workflow_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_celery ON workflow_executions(celery_task_id);

-- Agent Jobs
CREATE TABLE IF NOT EXISTS agent_jobs (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR NOT NULL,
    job_type VARCHAR NOT NULL,

    status VARCHAR DEFAULT 'pending',
    input_data_json JSONB,
    output_data_json JSONB,
    error_message TEXT,
    tokens_used INTEGER DEFAULT 0,

    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_execution ON agent_jobs(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);

-- Node Outputs
CREATE TABLE IF NOT EXISTS node_outputs (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    execution_id VARCHAR NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,

    node_id VARCHAR NOT NULL,
    node_name VARCHAR NOT NULL,
    node_type VARCHAR NOT NULL,
    outputs JSONB NOT NULL,

    execution_order INTEGER NOT NULL,
    iteration_number INTEGER DEFAULT 0,

    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_outputs_execution ON node_outputs(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_outputs_node ON node_outputs(node_id);

-- =============================================================================
-- USER PREFERENCES & CHAT
-- =============================================================================

-- User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    autonomous_mode BOOLEAN DEFAULT FALSE,
    max_iterations INTEGER DEFAULT 15,
    default_model VARCHAR(100),
    use_rag_by_default BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR REFERENCES projects(id) ON DELETE SET NULL,
    workspace_id VARCHAR NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    title VARCHAR,
    summary TEXT,
    messages_json JSONB DEFAULT '[]'::jsonb,

    model_used VARCHAR,
    document_ids_context JSONB DEFAULT '[]'::jsonb,
    folder_ids_context JSONB DEFAULT '[]'::jsonb,
    created_document_ids JSONB DEFAULT '[]'::jsonb,

    is_archived BOOLEAN DEFAULT FALSE,
    message_count INTEGER DEFAULT 0,

    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_workspace ON chat_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_project ON chat_conversations(project_id);

-- Document Attachments
CREATE TABLE IF NOT EXISTS document_attachments (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    document_id VARCHAR NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    image_id VARCHAR NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    is_primary BOOLEAN DEFAULT FALSE,
    attachment_order INTEGER DEFAULT 0,
    created_by_workflow_id VARCHAR REFERENCES workflow_executions(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_image ON document_attachments(image_id);

-- =============================================================================
-- PGVECTOR TABLE FOR RAG (Langchain)
-- =============================================================================

-- Esta tabela é criada automaticamente pelo LangChain PGVector
-- Mas podemos criar o schema base aqui
CREATE TABLE IF NOT EXISTS langchain_pg_collection (
    name VARCHAR NOT NULL,
    cmetadata JSONB,
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

CREATE TABLE IF NOT EXISTS langchain_pg_embedding (
    collection_id UUID REFERENCES langchain_pg_collection(uuid) ON DELETE CASCADE,
    embedding vector(1536),
    document TEXT,
    cmetadata JSONB,
    custom_id VARCHAR,
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

CREATE INDEX IF NOT EXISTS idx_langchain_embedding_collection ON langchain_pg_embedding(collection_id);

-- =============================================================================
-- TRIGGER: Sincronizar auth.users -> public.users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================
