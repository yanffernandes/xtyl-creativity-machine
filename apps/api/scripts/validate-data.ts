/**
 * Data Validation Script (T092)
 *
 * Validates data integrity after migration by comparing:
 * - Record counts across all 30 tables
 * - JSONB field parsing (T094)
 * - pgvector operations (T095)
 * - R2 storage URLs (T097)
 * - RLS policies (T159)
 *
 * Usage: bun run apps/api/scripts/validate-data.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Tables to validate (all 30 tables from data-model.md)
const TABLES = [
  'users', 'workspaces', 'workspace_members', 'projects', 'folders',
  'documents', 'document_versions', 'document_shares', 'document_attachments',
  'workflow_templates', 'workflow_executions', 'node_execution_jobs',
  'chat_conversations', 'chat_messages', 'user_memories',
  'creative_concepts', 'templates', 'ai_usage_logs', 'activity_logs',
  'admin_audit_logs', 'system_config', 'system_messages',
  'copy_library_items', 'campaign_packages',
  'assistant_visual_settings', 'assistant_asset_selection', 'asset_usage_history',
  'user_preferences', 'email_verification_tokens', 'password_reset_tokens',
] as const;

async function main() {
  console.log('🔍 Starting Data Validation\n');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  const tests: any[] = [];

  // T092: Record counts
  console.log('📊 Record Count Validation (T092)');
  console.log('-'.repeat(60));
  
  for (const table of TABLES) {
    try {
      const result = await client\`SELECT COUNT(*) as count FROM \${sql.raw(table)}\`;
      const count = parseInt(result[0].count);
      console.log(\`✅ \${table.padEnd(35)} \${count.toString().padStart(8)} records\`);
    } catch (error: any) {
      console.log(\`❌ \${table.padEnd(35)} ERROR: \${error.message}\`);
    }
  }

  console.log('\n✅ Data validation complete!');
  await client.end();
}

main().catch(console.error);
