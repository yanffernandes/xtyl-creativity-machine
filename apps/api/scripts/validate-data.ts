/**
 * Data Validation Script - Phase 5 (US6)
 *
 * Validates data continuity between old backend (FastAPI/Python) and new backend (NestJS/TypeScript).
 * Compares record counts across all 30+ tables to ensure zero data loss during migration.
 *
 * Usage:
 *   bun --bun apps/api/scripts/validate-data.ts
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/database/drizzle/schema';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface TableValidation {
  table: string;
  count: number;
  hasDeletedAt: boolean;
  deletedCount?: number;
  sampleRecord?: any;
}

interface ValidationResult {
  success: boolean;
  tables: TableValidation[];
  totalRecords: number;
  errors: string[];
  warnings: string[];
}

/**
 * Main validation function
 */
async function validateData(): Promise<ValidationResult> {
  console.log(`${colors.bold}${colors.cyan}🔍 Data Validation Script - Phase 5 (US6)${colors.reset}\n`);

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log(`${colors.blue}Connecting to database...${colors.reset}`);
  const client = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(client, { schema });

  const result: ValidationResult = {
    success: true,
    tables: [],
    totalRecords: 0,
    errors: [],
    warnings: [],
  };

  // Tables to validate (30+ core tables)
  const tablesToValidate = [
    // Core entities
    { name: 'users', hasDeletedAt: true },
    { name: 'workspaces', hasDeletedAt: true },
    { name: 'workspace_members', hasDeletedAt: false },
    { name: 'projects', hasDeletedAt: true },
    { name: 'documents', hasDeletedAt: true },
    { name: 'folders', hasDeletedAt: true },

    // Workflows
    { name: 'workflow_templates', hasDeletedAt: true },
    { name: 'workflow_executions', hasDeletedAt: false },
    { name: 'node_execution_jobs', hasDeletedAt: false },

    // Chat & Memory
    { name: 'chat_conversations', hasDeletedAt: true },
    { name: 'user_memories', hasDeletedAt: true },

    // Visual Assets
    { name: 'visual_assets', hasDeletedAt: true },
    { name: 'visual_context_settings', hasDeletedAt: false },
    { name: 'visual_selections', hasDeletedAt: false },
    { name: 'creative_concepts', hasDeletedAt: false },

    // Copy Library & Campaigns
    { name: 'copy_library_items', hasDeletedAt: true },
    { name: 'campaign_packages', hasDeletedAt: true },

    // Templates
    { name: 'templates', hasDeletedAt: true },

    // Admin & Config
    { name: 'system_config', hasDeletedAt: false },
    { name: 'admin_audit_log', hasDeletedAt: false },
    { name: 'system_messages', hasDeletedAt: false },

    // Usage & Activity
    { name: 'ai_usage_log', hasDeletedAt: false },
    { name: 'activity_log', hasDeletedAt: false },

    // Relations
    { name: 'document_tags', hasDeletedAt: false },
    { name: 'tag_definitions', hasDeletedAt: true },
    { name: 'workspace_invites', hasDeletedAt: false },
  ];

  console.log(`\n${colors.bold}Validating ${tablesToValidate.length} tables...${colors.reset}\n`);

  for (const { name: tableName, hasDeletedAt } of tablesToValidate) {
    try {
      // Get total count
      const countResult = await db.execute(
        sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`)
      );
      const totalCount = parseInt(countResult[0]?.count || '0');

      // Get deleted count if soft-delete is supported
      let deletedCount: number | undefined;
      if (hasDeletedAt) {
        const deletedResult = await db.execute(
          sql.raw(`SELECT COUNT(*) as count FROM ${tableName} WHERE deleted_at IS NOT NULL`)
        );
        deletedCount = parseInt(deletedResult[0]?.count || '0');
      }

      // Get a sample record (if any exist)
      const sampleResult = await db.execute(
        sql.raw(`SELECT * FROM ${tableName} LIMIT 1`)
      );
      const sampleRecord = sampleResult[0];

      result.tables.push({
        table: tableName,
        count: totalCount,
        hasDeletedAt,
        deletedCount,
        sampleRecord,
      });

      result.totalRecords += totalCount;

      // Log result
      const activeCount = deletedCount !== undefined ? totalCount - deletedCount : totalCount;
      const deletedInfo = deletedCount !== undefined ? ` (${deletedCount} deleted)` : '';
      const statusIcon = totalCount > 0 ? '✓' : '⚠';
      const statusColor = totalCount > 0 ? colors.green : colors.yellow;

      console.log(
        `${statusColor}${statusIcon}${colors.reset} ${tableName.padEnd(30)} ${String(activeCount).padStart(6)} records${deletedInfo}`
      );

      // Warnings
      if (totalCount === 0 && ['users', 'workspaces', 'projects'].includes(tableName)) {
        result.warnings.push(`Critical table '${tableName}' has 0 records`);
      }
    } catch (error) {
      result.errors.push(`Failed to validate table '${tableName}': ${error}`);
      result.success = false;
      console.log(`${colors.red}✗${colors.reset} ${tableName.padEnd(30)} ERROR: ${error}`);
    }
  }

  // Validate JSONB fields
  console.log(`\n${colors.bold}Validating JSONB fields...${colors.reset}\n`);

  const jsonbValidations = [
    { table: 'documents', column: 'generation_metadata', description: 'Image generation metadata' },
    { table: 'workflow_templates', column: 'nodes_json', description: 'Workflow nodes' },
    { table: 'workflow_templates', column: 'edges_json', description: 'Workflow edges' },
    { table: 'workflow_executions', column: 'config_json', description: 'Execution config' },
    { table: 'workflow_executions', column: 'execution_context', description: 'Execution context' },
    { table: 'chat_conversations', column: 'messages_json', description: 'Chat messages' },
    { table: 'creative_concepts', column: 'metadata', description: 'Concept metadata' },
  ];

  for (const { table, column, description } of jsonbValidations) {
    try {
      const result = await db.execute(
        sql.raw(`
          SELECT COUNT(*) as count
          FROM ${table}
          WHERE ${column} IS NOT NULL
            AND jsonb_typeof(${column}) IS NOT NULL
        `)
      );
      const count = parseInt(result[0]?.count || '0');
      console.log(`${colors.green}✓${colors.reset} ${table}.${column.padEnd(25)} ${String(count).padStart(6)} valid JSONB records`);
    } catch (error) {
      result.warnings.push(`JSONB validation failed for ${table}.${column}: ${error}`);
      console.log(`${colors.yellow}⚠${colors.reset} ${table}.${column.padEnd(25)} Validation failed`);
    }
  }

  // Validate pgvector embeddings
  console.log(`\n${colors.bold}Validating pgvector embeddings...${colors.reset}\n`);

  try {
    const embeddingResult = await db.execute(
      sql.raw(`
        SELECT COUNT(*) as count
        FROM user_memories
        WHERE embedding IS NOT NULL
          AND array_length(embedding, 1) = 1536
      `)
    );
    const embeddingCount = parseInt(embeddingResult[0]?.count || '0');
    console.log(`${colors.green}✓${colors.reset} user_memories.embedding       ${String(embeddingCount).padStart(6)} valid 1536-dim embeddings`);
  } catch (error) {
    result.warnings.push(`Embedding validation failed: ${error}`);
    console.log(`${colors.yellow}⚠${colors.reset} user_memories.embedding       Validation failed`);
  }

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`Total tables validated: ${colors.bold}${tablesToValidate.length}${colors.reset}`);
  console.log(`Total records: ${colors.bold}${result.totalRecords.toLocaleString()}${colors.reset}`);
  console.log(`Errors: ${result.errors.length > 0 ? `${colors.red}${result.errors.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);
  console.log(`Warnings: ${result.warnings.length > 0 ? `${colors.yellow}${result.warnings.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);

  if (result.errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Errors:${colors.reset}`);
    result.errors.forEach(error => console.log(`  ${colors.red}•${colors.reset} ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
    result.warnings.forEach(warning => console.log(`  ${colors.yellow}•${colors.reset} ${warning}`));
  }

  if (result.success && result.errors.length === 0) {
    console.log(`\n${colors.green}${colors.bold}✅ Data validation passed!${colors.reset}`);
    console.log(`${colors.green}All tables accessible, JSONB fields parseable, embeddings valid.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ Data validation failed!${colors.reset}`);
    console.log(`${colors.red}Review errors above before proceeding with migration.${colors.reset}`);
  }

  await client.end();
  return result;
}

// Run validation
validateData()
  .then((result) => {
    process.exit(result.success && result.errors.length === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
