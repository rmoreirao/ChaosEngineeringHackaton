export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import metrics only in Node.js runtime (not Edge)
    await import('./lib/metrics');
  }
}
