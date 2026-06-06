import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { spawn, execSync, ChildProcess } from "child_process";
import http from "http";

// Wait utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to query an endpoint without following redirects
async function fetchHeaders(url: string): Promise<{ status: number; location: string | undefined }> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({
        status: res.statusCode || 0,
        location: res.headers.location
      });
    });

    req.on('error', () => {
      resolve({ status: 500, location: undefined });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 504, location: undefined });
    });
  });
}

describe("Admin Route Protection Middleware", () => {
  let serverProcess: ChildProcess | undefined;
  const port = 3002;
  const serverUrl = `http://localhost:${port}`;

  before(async () => {
    console.log(`\n🚀 [Redirects Test] Starting production Next.js server on port ${port}...`);
    serverProcess = spawn(`npx next start -p ${port}`, {
      shell: true,
      stdio: 'pipe'
    });
    serverProcess.on('error', (err: Error) => {
      console.error(`[Next.js Server Process Error]`, err);
    });
    serverProcess.on('exit', (code: number | null, signal: string | null) => {
      console.log(`[Next.js Server Process Exit] code=${code} signal=${signal}`);
    });
    serverProcess.stdout?.on('data', (data: Buffer | string) => {
      console.log(`[Next.js Server] ${data.toString().trim()}`);
    });
    serverProcess.stderr?.on('data', (data: Buffer | string) => {
      console.error(`[Next.js Server ERR] ${data.toString().trim()}`);
    });
    // Wait for server to boot up
    await sleep(5000);
  });

  after(() => {
    console.log(`🛑 [Redirects Test] Stopping server on port ${port}...`);
    if (serverProcess) {
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: 'ignore' });
        } catch {
          // Ignore errors if already terminated
        }
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
  });

  const protectedRoutes = [
    "/admin",
    "/admin/players",
    "/admin/venues",
    "/admin/divisions"
  ];

  protectedRoutes.forEach((route) => {
    test(`should redirect unauthenticated request to ${route} back to /login`, async () => {
      const res = await fetchHeaders(`${serverUrl}${route}`);
      
      // Middleware redirects unauthenticated users to /login
      // This usually returns a 307 or 302 status code
      assert.ok(res.status === 307 || res.status === 302 || res.status === 303, `Expected redirect status, got ${res.status}`);
      
      // Verify redirect target contains /login
      assert.ok(res.location?.includes("/login"), `Expected redirect location to include '/login', got ${res.location}`);
    });
  });
});
