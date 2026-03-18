import { chromium, type Page } from '@playwright/test';
import { browseProducts, searchProducts, registerAndLogin, cartAndCheckout, unauthRedirect } from '../helpers/flows';

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name: string, defaultVal: number): number {
  const match = args.find(a => a.startsWith(`--${name}=`));
  return match ? parseInt(match.split('=')[1], 10) : defaultVal;
}

const USERS = getArg('users', 5);
const DURATION_SEC = getArg('duration', 60);
const SCENARIO = args.find(a => a.startsWith('--scenario='))?.split('=')[1] || 'browse';

const scenarios: Record<string, (page: Page) => Promise<void | string>> = {
  browse: browseProducts,
  search: searchProducts,
  register: registerAndLogin,
  checkout: cartAndCheckout,
  unauth: unauthRedirect,
};

interface RunResult {
  user: number;
  iteration: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

async function runUser(userId: number, scenarioFn: (page: Page) => Promise<void | string>, endTime: number): Promise<RunResult[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const results: RunResult[] = [];
  let iteration = 0;

  try {
    while (Date.now() < endTime) {
      iteration++;
      const context = await browser.newContext({ baseURL: process.env.BASE_URL || 'http://localhost:3000' });
      const page = await context.newPage();
      const start = Date.now();

      try {
        await scenarioFn(page);
        results.push({ user: userId, iteration, durationMs: Date.now() - start, success: true });
      } catch (err: any) {
        results.push({ user: userId, iteration, durationMs: Date.now() - start, success: false, error: err.message?.slice(0, 100) });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const scenarioFn = scenarios[SCENARIO];
  if (!scenarioFn) {
    console.error(`Unknown scenario: ${SCENARIO}. Available: ${Object.keys(scenarios).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🚀 Load Test: scenario=${SCENARIO}, users=${USERS}, duration=${DURATION_SEC}s\n`);

  const endTime = Date.now() + DURATION_SEC * 1000;
  const userPromises = Array.from({ length: USERS }, (_, i) => runUser(i + 1, scenarioFn, endTime));
  const allResults = (await Promise.all(userPromises)).flat();

  // --- Report ---
  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);
  const durations = successful.map(r => r.durationMs).sort((a, b) => a - b);

  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

  console.log(`📊 Results`);
  console.log(`   Total iterations:  ${allResults.length}`);
  console.log(`   Successful:        ${successful.length}`);
  console.log(`   Failed:            ${failed.length}`);
  console.log(`   Avg duration:      ${avg}ms`);
  console.log(`   p50:               ${p50}ms`);
  console.log(`   p95:               ${p95}ms`);
  console.log(`   p99:               ${p99}ms`);
  console.log(`   Throughput:        ${(successful.length / DURATION_SEC).toFixed(2)} iter/s`);

  if (failed.length > 0) {
    console.log(`\n❌ Sample errors:`);
    const uniqueErrors = [...new Set(failed.map(r => r.error))].slice(0, 5);
    uniqueErrors.forEach(e => console.log(`   - ${e}`));
  }

  console.log('');
}

main().catch(console.error);
