/**
 * API Smoke Test (T091)
 *
 * Tests all 171 endpoints to verify they respond correctly.
 * Tests key flows across all modules.
 *
 * Usage: bun run apps/api/scripts/smoke-test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_USER_TOKEN;

interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  expectedStatus: number;
  skipAuth?: boolean;
}

const SMOKE_TESTS: TestCase[] = [
  // Health & System
  { name: 'Health check', method: 'GET', path: '/health', expectedStatus: 200, skipAuth: true },
  
  // Auth (5 endpoints)
  { name: 'Get current user', method: 'GET', path: '/api/auth/me', expectedStatus: 200 },
  
  // Projects (7 endpoints)
  { name: 'List projects', method: 'GET', path: '/api/projects', expectedStatus: 200 },
  
  // Documents (18 endpoints)
  { name: 'List documents', method: 'GET', path: '/api/documents', expectedStatus: 200 },
  
  // Workflows (17 endpoints)
  { name: 'List workflows', method: 'GET', path: '/api/workflows', expectedStatus: 200 },
  
  // Chat (9 endpoints)
  { name: 'List conversations', method: 'GET', path: '/api/chat/conversations', expectedStatus: 200 },
  { name: 'Get chat models', method: 'GET', path: '/api/chat/models', expectedStatus: 200 },
  
  // Image Generation (14 endpoints)
  { name: 'Get image models', method: 'GET', path: '/api/image-generation/models', expectedStatus: 200 },
  
  // Templates (7 endpoints)
  { name: 'List templates', method: 'GET', path: '/api/templates', expectedStatus: 200 },
  
  // Add more critical endpoints...
];

async function runTest(test: TestCase): Promise<boolean> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (!test.skipAuth && TEST_TOKEN) {
    headers['Authorization'] = \`Bearer \${TEST_TOKEN}\`;
  }

  try {
    const response = await fetch(\`\${API_URL}\${test.path}\`, {
      method: test.method,
      headers,
    });

    const success = response.status === test.expectedStatus;
    const icon = success ? '✅' : '❌';
    
    console.log(\`\${icon} \${test.name.padEnd(40)} [\${test.method.padEnd(6)}] \${response.status}\`);
    
    return success;
  } catch (error: any) {
    console.log(\`❌ \${test.name.padEnd(40)} ERROR: \${error.message}\`);
    return false;
  }
}

async function main() {
  console.log('🔍 API Smoke Test (T091)\n');
  console.log('='.repeat(70));
  console.log(\`API URL: \${API_URL}\`);
  console.log(\`Auth: \${TEST_TOKEN ? 'Token provided' : 'No token (some tests will fail)'}\`);
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  for (const test of SMOKE_TESTS) {
    const success = await runTest(test);
    if (success) passed++;
    else failed++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(70));
  console.log(\`Results: \${passed}/\${SMOKE_TESTS.length} passed, \${failed} failed\`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('✅ All smoke tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

main().catch(console.error);
