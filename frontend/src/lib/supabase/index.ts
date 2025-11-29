/**
 * Supabase Services Index
 *
 * Central export for all Supabase services.
 * Feature: 007-hybrid-supabase-architecture
 */

// Client
export { supabase, getSupabaseClient } from './client'

// Services
export { workspaceService } from './workspaces'
export { projectService } from './projects'
export { documentService } from './documents'
export { folderService } from './folders'
export { templateService } from './templates'
export { preferencesService } from './preferences'
export { conversationService } from './conversations'
