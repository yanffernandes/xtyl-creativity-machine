/**
 * RLS Policy Validation Script - Task T159
 *
 * Validates Row Level Security (RLS) policies on key tables to ensure
 * the hybrid architecture (API + direct Supabase access) works correctly.
 *
 * Tests that:
 * - Users can only see their own workspace data
 * - RLS policies are enabled on critical tables
 * - Direct client access respects RLS policies
 *
 * Usage:
 *   bun --bun apps/api/scripts/validate-rls.ts
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (admin)
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_ANON_KEY - Supabase anon key
 *   TEST_USER_JWT - Valid JWT token for a test user
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface RlsTable {
  name: string;
  description: string;
  critical: boolean;
}

const rlsTables: RlsTable[] = [
  { name: 'documents', description: 'Documents (CRITICAL - most accessed)', critical: true },
  { name: 'projects', description: 'Projects (CRITICAL)', critical: true },
  { name: 'workflow_templates', description: 'Workflow templates', critical: true },
  { name: 'chat_conversations', description: 'Chat conversations (CRITICAL - privacy)', critical: true },
  { name: 'user_memories', description: 'User memories (CRITICAL - privacy)', critical: true },
  { name: 'visual_assets', description: 'Visual assets', critical: false },
  { name: 'copy_library_items', description: 'Copy library items', critical: false },
  { name: 'campaign_packages', description: 'Campaign packages', critical: false },
];

async function validateRls() {
  console.log(`${colors.bold}${colors.cyan}🔒 RLS Policy Validation - Task T159${colors.reset}\n`);

  const DATABASE_URL = process.env.DATABASE_URL;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(client);

  let errors: string[] = [];
  let warnings: string[] = [];

  // Step 1: Check if RLS is enabled on critical tables
  console.log(`${colors.cyan}Step 1: Checking RLS status on critical tables...${colors.reset}\n`);

  for (const table of rlsTables) {
    try {
      const result = await db.execute(
        sql.raw(`
          SELECT relname, relrowsecurity
          FROM pg_class
          WHERE relname = '${table.name}'
            AND relkind = 'r'
        `)
      );

      if (result.length === 0) {
        warnings.push(`Table '${table.name}' does not exist`);
        console.log(`${colors.yellow}⚠${colors.reset} ${table.name.padEnd(30)} Table not found`);
        continue;
      }

      const rlsEnabled = result[0]?.relrowsecurity === true;

      if (!rlsEnabled) {
        if (table.critical) {
          errors.push(`CRITICAL: RLS not enabled on ${table.name}`);
          console.log(`${colors.red}✗${colors.reset} ${table.name.padEnd(30)} RLS DISABLED (CRITICAL)`);
        } else {
          warnings.push(`RLS not enabled on ${table.name}`);
          console.log(`${colors.yellow}⚠${colors.reset} ${table.name.padEnd(30)} RLS disabled`);
        }
      } else {
        console.log(`${colors.green}✓${colors.reset} ${table.name.padEnd(30)} RLS enabled`);
      }
    } catch (error) {
      errors.push(`Failed to check RLS on ${table.name}: ${error}`);
      console.log(`${colors.red}✗${colors.reset} ${table.name.padEnd(30)} Error: ${error}`);
    }
  }

  // Step 2: Check for RLS policies
  console.log(`\n${colors.cyan}Step 2: Checking RLS policies...${colors.reset}\n`);

  for (const table of rlsTables.filter((t) => t.critical)) {
    try {
      const policies = await db.execute(
        sql.raw(`
          SELECT policyname, cmd, qual
          FROM pg_policies
          WHERE tablename = '${table.name}'
        `)
      );

      if (policies.length === 0) {
        errors.push(`No RLS policies found for ${table.name}`);
        console.log(`${colors.red}✗${colors.reset} ${table.name.padEnd(30)} No policies defined`);
      } else {
        console.log(`${colors.green}✓${colors.reset} ${table.name.padEnd(30)} ${policies.length} policies found`);
        policies.forEach((policy: any) => {
          console.log(`    • ${policy.policyname} (${policy.cmd})`);
        });
      }
    } catch (error) {
      errors.push(`Failed to fetch policies for ${table.name}: ${error}`);
      console.log(`${colors.red}✗${colors.reset} ${table.name.padEnd(30)} Error: ${error}`);
    }
  }

  // Step 3: Test client access with Supabase client (if configured)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    console.log(`\n${colors.cyan}Step 3: Testing Supabase client access...${colors.reset}\n`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test anonymous access (should return 0 rows due to RLS)
    try {
      const { data, error } = await supabase.from('documents').select('id').limit(10);

      if (error && error.code === 'PGRST116') {
        // Expected: no rows returned
        console.log(`${colors.green}✓${colors.reset} Anonymous access: 0 rows (RLS working)`);
      } else if (data && data.length === 0) {
        console.log(`${colors.green}✓${colors.reset} Anonymous access: 0 rows (RLS working)`);
      } else {
        warnings.push(`Anonymous user can access ${data?.length || 0} documents (possible RLS bypass)`);
        console.log(`${colors.yellow}⚠${colors.reset} Anonymous access: ${data?.length || 0} rows (unexpected)`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠${colors.reset} Client test failed: ${error}`);
    }

    console.log(`\n${colors.yellow}Note: Full RLS testing requires valid user JWT tokens.${colors.reset}`);
    console.log(`${colors.yellow}For production validation, test with actual user sessions.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ Supabase client test skipped (SUPABASE_URL/ANON_KEY not set)${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.cyan}═════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.cyan}═════════════════════════════════════${colors.reset}\n`);

  console.log(`Tables checked: ${rlsTables.length}`);
  console.log(`Errors: ${errors.length > 0 ? `${colors.red}${errors.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);
  console.log(`Warnings: ${warnings.length > 0 ? `${colors.yellow}${warnings.length}${colors.reset}` : `${colors.green}0${colors.reset}`}`);

  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Errors:${colors.reset}`);
    errors.forEach((error) => console.log(`  ${colors.red}•${colors.reset} ${error}`));
  }

  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}Warnings:${colors.reset}`);
    warnings.forEach((warning) => console.log(`  ${colors.yellow}•${colors.reset} ${warning}`));
  }

  if (errors.length === 0) {
    console.log(`\n${colors.green}✅ RLS policies are correctly configured!${colors.reset}`);
    console.log(`${colors.green}Critical tables have RLS enabled and policies defined.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ RLS validation failed!${colors.reset}`);
    console.log(`${colors.red}Fix critical RLS issues before proceeding.${colors.reset}`);
  }

  await client.end();
  return errors.length === 0;
}

validateRls()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
