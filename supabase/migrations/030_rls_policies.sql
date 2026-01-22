-- Migration 030: RLS Policies for Direct Frontend Access
-- Feature: Supabase Direct Migration
-- Created: 2025-12-21
--
-- IMPORTANTE: Execute este SQL no Supabase Dashboard > SQL Editor
-- Isso habilita Row Level Security para acesso seguro direto do frontend

-- ============================================================================
-- USER MEMORIES: Usuário só acessa suas próprias memórias
-- ============================================================================

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- Select: usuário pode ler apenas suas memórias
CREATE POLICY user_memories_select ON public.user_memories
  FOR SELECT USING (user_id = auth.uid());

-- Insert: usuário pode criar memórias apenas para si
CREATE POLICY user_memories_insert ON public.user_memories
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update: usuário pode atualizar apenas suas memórias
CREATE POLICY user_memories_update ON public.user_memories
  FOR UPDATE USING (user_id = auth.uid());

-- Delete: usuário pode deletar apenas suas memórias
CREATE POLICY user_memories_delete ON public.user_memories
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- DOCUMENT ATTACHMENTS: Herda acesso via documento pai
-- ============================================================================

ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;

-- Select: pode ver attachments de documentos que tem acesso
CREATE POLICY document_attachments_select ON public.document_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_attachments.document_id
      AND user_has_document_access(d.project_id)
    )
  );

-- Insert: pode criar attachments em documentos que tem acesso
CREATE POLICY document_attachments_insert ON public.document_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_attachments.document_id
      AND user_has_document_access(d.project_id)
    )
  );

-- Update: pode atualizar attachments de documentos que tem acesso
CREATE POLICY document_attachments_update ON public.document_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_attachments.document_id
      AND user_has_document_access(d.project_id)
    )
  );

-- Delete: pode remover attachments de documentos que tem acesso
CREATE POLICY document_attachments_delete ON public.document_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_attachments.document_id
      AND user_has_document_access(d.project_id)
    )
  );

-- ============================================================================
-- ASSISTANT VISUAL SETTINGS: Acesso via projeto
-- ============================================================================

ALTER TABLE public.assistant_visual_settings ENABLE ROW LEVEL SECURITY;

-- Select: membros do workspace podem ver settings
CREATE POLICY visual_settings_select ON public.assistant_visual_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = assistant_visual_settings.project_id
      AND user_is_workspace_member(p.workspace_id)
    )
  );

-- Insert: membros do workspace podem criar settings
CREATE POLICY visual_settings_insert ON public.assistant_visual_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = assistant_visual_settings.project_id
      AND user_is_workspace_member(p.workspace_id)
    )
  );

-- Update: membros do workspace podem atualizar settings
CREATE POLICY visual_settings_update ON public.assistant_visual_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = assistant_visual_settings.project_id
      AND user_is_workspace_member(p.workspace_id)
    )
  );

-- Delete: membros do workspace podem deletar settings
CREATE POLICY visual_settings_delete ON public.assistant_visual_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = assistant_visual_settings.project_id
      AND user_is_workspace_member(p.workspace_id)
    )
  );

-- ============================================================================
-- ASSISTANT ASSET SELECTION: Acesso via settings (que já tem policy)
-- ============================================================================

ALTER TABLE public.assistant_asset_selection ENABLE ROW LEVEL SECURITY;

-- Select: pode ver seleções de settings que tem acesso
CREATE POLICY asset_selection_select ON public.assistant_asset_selection
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assistant_visual_settings avs
      JOIN projects p ON p.id = avs.project_id
      WHERE avs.id = assistant_asset_selection.settings_id
      AND user_is_workspace_member(p.workspace_id)
    )
  );

-- All operations: pode gerenciar seleções de settings que tem acesso
CREATE POLICY asset_selection_all ON public.assistant_asset_selection
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assistant_visual_settings avs
      JOIN projects p ON p.id = avs.project_id
      WHERE avs.id = assistant_asset_selection.settings_id
      AND user_is_workspace_member(p.workspace_id)
    )
  );

-- ============================================================================
-- ASSET USAGE HISTORY: Acesso via documento (que é o asset)
-- ============================================================================

ALTER TABLE public.asset_usage_history ENABLE ROW LEVEL SECURITY;

-- Select: pode ver histórico de assets que tem acesso
CREATE POLICY asset_usage_select ON public.asset_usage_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = asset_usage_history.asset_id
      AND user_has_document_access(d.project_id)
    )
  );

-- Insert: pode registrar uso de assets que tem acesso
CREATE POLICY asset_usage_insert ON public.asset_usage_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = asset_usage_history.asset_id
      AND user_has_document_access(d.project_id)
    )
  );

-- ============================================================================
-- STYLE PRESETS: Leitura pública, escrita apenas admin
-- ============================================================================

ALTER TABLE public.style_presets ENABLE ROW LEVEL SECURITY;

-- Select: todos os usuários autenticados podem ler presets ativos
CREATE POLICY style_presets_select ON public.style_presets
  FOR SELECT USING (true);

-- All write operations: apenas super admins
CREATE POLICY style_presets_admin_write ON public.style_presets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- ============================================================================
-- Verificação: Listar todas as policies criadas
-- ============================================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
