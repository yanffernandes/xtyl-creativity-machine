import { performance } from 'perf_hooks';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TOKEN = process.env.LOAD_TEST_TOKEN || '';
const WORKSPACE_ID = process.env.WORKSPACE_ID || '';
const CONNECTION_ID = process.env.CONNECTION_ID || '';

async function run() {
  if (!TOKEN || !WORKSPACE_ID || !CONNECTION_ID) {
    throw new Error('Set LOAD_TEST_TOKEN, WORKSPACE_ID, CONNECTION_ID env vars');
  }

  const urls = Array.from({ length: 200 }).map((_, i) => `https://example.com/test-${i}`);

  const start = performance.now();
  const response = await fetch(`${BACKEND_URL}/search-console/inspect/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      'x-workspace-id': WORKSPACE_ID,
    },
    body: JSON.stringify({ urls, connectionId: CONNECTION_ID, forceRefresh: false }),
  });

  const duration = performance.now() - start;
  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Duration(ms):', Math.round(duration));
  console.log('Returned:', Object.keys(data.statuses || {}).length);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
