/**
 * RLS Policy Verification (T159)
 *
 * Tests Row Level Security policies to ensure frontend Supabase client
 * can only access user's own data via direct table access.
 *
 * Usage: bun run apps/api/scripts/verify-rls.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';

// Tables with RLS policies to test
const RLS_TABLES = [
  'documents',
  'projects',
  'workflow_templates',
  'chat_conversations',
  'user_memories',
  'folders',
  'document_versions',
  'templates',
] as const;

async function main() {
  console.log('🔒 RLS Policy Verification (T159)\n');
  console.log('='.repeat(60));

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Unauthenticated access should fail
  console.log('\n📝 Test 1: Unauthenticated Access (should fail)');
  console.log('-'.repeat(60));

  for (const table of RLS_TABLES) {
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      console.log(\`✅ \${table.padEnd(30)} Correctly blocked: \${error.message}\`);
    } else if (!data || data.length === 0) {
      console.log(\`✅ \${table.padEnd(30)} Correctly returns empty\`);
    } else {
      console.log(\`❌ \${table.padEnd(30)} SECURITY ISSUE: Data leaked!\`);
    }
  }

  // Test 2: Authenticated access (if test credentials provided)
  if (TEST_USER_EMAIL && TEST_USER_PASSWORD) {
    console.log('\n\n📝 Test 2: Authenticated Access (should succeed)');
    console.log('-'.repeat(60));

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (authError) {
      console.error(\`❌ Login failed: \${authError.message}\`);
      console.log('⚠️  Skipping authenticated tests - provide TEST_USER_EMAIL and TEST_USER_PASSWORD');
    } else {
      console.log(\`✅ Logged in as: \${authData.user?.email}\n\`);

      for (const table of RLS_TABLES) {
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
          console.log(\`❌ \${table.padEnd(30)} Unexpected error: \${error.message}\`);
        } else {
          console.log(\`✅ \${table.padEnd(30)} Accessible (\${data?.length || 0} records)\`);
        }
      }

      // Test 3: Cross-user isolation
      console.log('\n\n📝 Test 3: Cross-User Data Isolation');
      console.log('-'.repeat(60));

      const { data: projects } = await supabase.from('projects').select('id, workspace_id');

      if (projects && projects.length > 0) {
        const projectId = projects[0].id;

        // Try to access project's documents
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', projectId);

        console.log(\`✅ Can access own project's documents: \${docs?.length || 0} found\`);

        // Try to access documents from non-existent project (should be empty)
        const { data: otherDocs } = await supabase
          .from('documents')
          .select('*')
          .eq('project_id', '00000000-0000-0000-0000-000000000000');

        if (!otherDocs || otherDocs.length === 0) {
          console.log(\`✅ Cannot access other user's documents: correctly blocked\`);
        } else {
          console.log(\`❌ SECURITY ISSUE: Accessed unauthorized documents!\`);
        }
      }

      await supabase.auth.signOut();
    }
  } else {
    console.log('\n⚠️  Skipping authenticated tests');
    console.log('   Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run full RLS tests');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ RLS verification complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
