import { NextRequest, NextResponse } from 'next/server';
import {
  webVitalsHistogram,
  clientErrorsTotal,
  cartOperationsTotal,
  pageViewsTotal,
  ssrRequestsTotal,
  ssrRequestDuration,
} from '@/lib/metrics';

export const dynamic = 'force-dynamic';

interface MetricReport {
  type: 'web-vital' | 'error' | 'cart-operation' | 'page-view' | 'ssr-request';
  name: string;
  value?: number;
  route?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: MetricReport | MetricReport[] = await req.json();
    const reports = Array.isArray(body) ? body : [body];

    for (const report of reports) {
      const route = report.route || '/';

      switch (report.type) {
        case 'web-vital':
          if (report.value !== undefined) {
            webVitalsHistogram.observe({ metric: report.name, route }, report.value);
          }
          break;
        case 'error':
          clientErrorsTotal.inc({ type: report.name || 'unknown' });
          break;
        case 'cart-operation':
          cartOperationsTotal.inc({ operation: report.name });
          break;
        case 'page-view':
          pageViewsTotal.inc({ route });
          ssrRequestsTotal.inc({ route, status: '200' });
          break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
