import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'frontend_' });

export const ssrRequestsTotal = new client.Counter({
  name: 'frontend_ssr_requests_total',
  help: 'Total SSR requests',
  labelNames: ['route', 'status'],
  registers: [register],
});

export const ssrRequestDuration = new client.Histogram({
  name: 'frontend_ssr_request_duration_seconds',
  help: 'SSR request duration in seconds',
  labelNames: ['route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const webVitalsGauge = new client.Gauge({
  name: 'frontend_web_vitals',
  help: 'Web Vitals metrics from browser clients',
  labelNames: ['metric', 'route'],
  registers: [register],
});

export const clientErrorsTotal = new client.Counter({
  name: 'frontend_client_errors_total',
  help: 'Total client-side JavaScript errors',
  labelNames: ['type'],
  registers: [register],
});

export const cartOperationsTotal = new client.Counter({
  name: 'frontend_cart_operations_total',
  help: 'Cart operations from the browser',
  labelNames: ['operation'],
  registers: [register],
});

export const pageViewsTotal = new client.Counter({
  name: 'frontend_page_views_total',
  help: 'Page views by route',
  labelNames: ['route'],
  registers: [register],
});

export { register };
