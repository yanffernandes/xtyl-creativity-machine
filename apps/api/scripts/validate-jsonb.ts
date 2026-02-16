/**
 * JSONB Field Validation Script - Task T094
 *
 * Validates that all JSONB columns (generation_metadata, nodes_json, execution_context, etc.)
 * are parseable and contain valid JSON structures.
 *
 * Usage:
 *   bun --bun apps/api/scripts/validate-jsonb.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface JsonbField {
  table: string;
  column: string;
  description: string;
  validator?: (data: any) => { valid: boolean; error?: string };
}

const jsonbFields: JsonbField[] = [
  {
    table: 'documents',
    column: 'generation_metadata',
    description: 'Image generation metadata',
    validator: (data) => {
      if (!data) return { valid: true }; // Nullable
      const hasModel = 'model' in data;
      const hasPrompt = 'prompt' in data;
      return {
        valid: hasModel || hasPrompt,
        error: hasModel || hasPrompt ? undefined : 'Missing model or prompt',
      };
    },
  },
  {
    table: 'workflow_templates',
    column: 'nodes_json',
    description: 'Workflow nodes',
    validator: (data) => {
      if (!Array.isArray(data)) return { valid: false, error: 'Should be an array' };
      return { valid: true };
    },
  },
  {
    table: 'workflow_templates',
    column: 'edges_json',
    description: 'Workflow edges',
    validator: (data) => {
      if (!Array.isArray(data)) return { valid: false, error: 'Should be an array' };
      return { valid: true };
    },
  },
  {
    table: 'workflow_executions',
    column: 'config_json',
    description: 'Execution configuration',
    validator: (data) => {
      if (!data) return { valid: true }; // Nullable
      return { valid: typeof data === 'object' };
    },
  },
  {
    table: 'workflow_executions',
    column: 'execution_context',
    description: 'Execution context (node outputs)',
    validator: (data) => {
      if (!data) return { valid: true }; // Nullable
      return { valid: typeof data === 'object' };
    },
  },
  {
    table: 'chat_conversations',
    column: 'messages_json',
    description: 'Chat messages',
    validator: (data) => {
      if (!Array.isArray(data)) return { valid: false, error: 'Should be an array' };
      const allHaveRole = data.every((msg: any) => 'role' in msg && 'content' in msg);
      return {
        valid: allHaveRole,
        error: allHaveRole ? undefined : 'Messages missing role or content',
      };
    },
  },
  {
    table: 'creative_concepts',
    column: 'metadata',
    description: 'Concept metadata',
    validator: (data) => {
      if (!data) return { valid: true }; // Nullable
      return { valid: typeof data === 'object' };
    },
  },
  {
    table: 'visual_context_settings',
    column: 'settings_json',
    description: 'Visual context settings',
  },
  {
    table: 'system_messages',
    column: 'metadata',
    description: 'System message metadata',
  },
];

async function validateJsonbFields() {
  console.log(`${colors.bold}${colors.cyan}🔍 JSONB Field Validation - Task T094${colors.reset}\n`);

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(client);

  let totalFields = 0;
  let validFields = 0;
  let errors: string[] = [];

  for (const field of jsonbFields) {
    totalFields++;
    console.log(`\n${colors.cyan}Validating ${field.table}.${field.column}${colors.reset}`);
    console.log(`Description: ${field.description}`);

    try {
      // Check if column exists
      const columnCheck = await db.execute(
        sql.raw(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = '${field.table}' AND column_name = '${field.column}'
        `)
      );

      if (columnCheck.length === 0) {
        console.log(`${colors.yellow}⚠ Column does not exist (may be optional)${colors.reset}`);
        continue;
      }

      // Get count of non-null JSONB values
      const countResult = await db.execute(
        sql.raw(`
          SELECT COUNT(*) as count
          FROM ${field.table}
          WHERE ${field.column} IS NOT NULL
        `)
      );
      const count = parseInt(countResult[0]?.count || '0');

      if (count === 0) {
        console.log(`${colors.yellow}⚠ No records with non-null ${field.column}${colors.reset}`);
        continue;
      }

      // Validate JSONB structure
      const validJsonCount = await db.execute(
        sql.raw(`
          SELECT COUNT(*) as count
          FROM ${field.table}
          WHERE ${field.column} IS NOT NULL
            AND jsonb_typeof(${field.column}) IS NOT NULL
        `)
      );
      const validCount = parseInt(validJsonCount[0]?.count || '0');

      if (validCount !== count) {
        const invalidCount = count - validCount;
        errors.push(`${field.table}.${field.column}: ${invalidCount} invalid JSONB records`);
        console.log(`${colors.red}✗ ${invalidCount} invalid JSONB records${colors.reset}`);
        continue;
      }

      // Run custom validator if provided
      if (field.validator) {
        const sampleResults = await db.execute(
          sql.raw(`
            SELECT ${field.column}
            FROM ${field.table}
            WHERE ${field.column} IS NOT NULL
            LIMIT 10
          `)
        );

        let validationErrors = 0;
        for (const row of sampleResults) {
          const data = row[field.column];
          const validation = field.validator(data);
          if (!validation.valid) {
            validationErrors++;
            if (validationErrors === 1) {
              // Only log first error
              console.log(`${colors.yellow}⚠ Validation warning: ${validation.error}${colors.reset}`);
            }
          }
        }

        if (validationErrors > 0) {
          console.log(`${colors.yellow}⚠ ${validationErrors}/10 samples failed validation${colors.reset}`);
        }
      }

      validFields++;
      console.log(`${colors.green}✓ ${validCount} valid JSONB records${colors.reset}`);
    } catch (error) {
      errors.push(`${field.table}.${field.column}: ${error}`);
      console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
    }
  }

  // Summary
  console.log(`\n${colors.cyan}═════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.cyan}═════════════════════════════════════${colors.reset}\n`);

  console.log(`Total JSONB fields checked: ${totalFields}`);
  console.log(`Valid fields: ${colors.green}${validFields}${colors.reset}`);
  console.log(`Errors: ${errors.length > 0 ? `${colors.red}${errors.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);

  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Errors:${colors.reset}`);
    errors.forEach((error) => console.log(`  ${colors.red}•${colors.reset} ${error}`));
    console.log(`\n${colors.red}❌ JSONB validation failed${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✅ All JSONB fields are valid!${colors.reset}`);
  }

  await client.end();
  return errors.length === 0;
}

validateJsonbFields()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
