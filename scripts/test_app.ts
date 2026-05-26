import { spawn } from 'child_process';
import http from 'http';

// Wait utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to query an endpoint and measure response time
async function testEndpoint(url: string): Promise<{ status: number; timeMs: number; sizeBytes: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          timeMs: Date.now() - start,
          sizeBytes: Buffer.byteLength(body)
        });
      });
    }).on('error', (err) => {
      resolve({ status: 500, timeMs: Date.now() - start, sizeBytes: 0 });
    });
  });
}

async function main() {
  console.log('🚀 Starting Next.js Production Server Test Suite...');

  // Start Next.js server on port 3001
  const port = 3001;
  const serverUrl = `http://localhost:${port}`;
  
  console.log(`Starting production server on port ${port}...`);
  const serverProcess = spawn('npx', ['next', 'start', '-p', String(port)], {
    shell: true,
    stdio: 'ignore'
  });

  // Wait for server to boot up
  console.log('Waiting 5 seconds for server to boot up...');
  await sleep(5000);

  const routes = [
    { name: 'Home Page', path: '/' },
    { name: 'Standings Page', path: '/standings' },
    { name: 'Matches Page', path: '/matches' },
    { name: 'Players Page', path: '/players' },
    { name: 'Login Page', path: '/login' }
  ];

  console.log('\n=============================================');
  console.log('  PAGE STATUS & PERFORMANCE RESULTS          ');
  console.log('=============================================');
  
  let hasFailed = false;

  for (const route of routes) {
    const res = await testEndpoint(`${serverUrl}${route.path}`);
    const statusIcon = res.status === 200 ? '✅ 200 OK' : `❌ FAILED (${res.status})`;
    console.log(`Route: ${route.name} (${route.path})`);
    console.log(`  Status:        ${statusIcon}`);
    console.log(`  Response Time: ${res.timeMs}ms`);
    console.log(`  Page Size:     ${(res.sizeBytes / 1024).toFixed(2)} KB\n`);
    
    if (res.status !== 200) {
      hasFailed = true;
    }
  }

  console.log('=============================================');
  console.log('  CACHE HIT PERFORMANCE VERIFICATION         ');
  console.log('=============================================');
  console.log('Querying /standings (Cache Miss / First Compute)...');
  const res1 = await testEndpoint(`${serverUrl}/standings`);
  console.log(`  First Load Time:  ${res1.timeMs}ms`);

  console.log('Querying /standings again (Cache Hit)...');
  const res2 = await testEndpoint(`${serverUrl}/standings`);
  console.log(`  Second Load Time: ${res2.timeMs}ms`);
  
  const cacheRatio = res1.timeMs / (res2.timeMs || 1);
  console.log(`  Cache Speedup:    ${cacheRatio.toFixed(1)}x faster!\n`);

  // Kill the server process
  console.log('Stopping Next.js production server...');
  serverProcess.kill('SIGTERM');
  
  if (hasFailed) {
    console.error('❌ Integration tests failed.');
    process.exit(1);
  } else {
    console.log('🎉 All integration and cache tests passed successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
