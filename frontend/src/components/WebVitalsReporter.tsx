'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function reportMetric(body: Record<string, unknown>) {
  if (typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(
      '/api/report-metrics',
      new Blob([JSON.stringify(body)], { type: 'application/json' })
    );
  } else {
    fetch('/api/report-metrics', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  }
}

function observeWebVitals(route: string) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        reportMetric({ type: 'web-vital', name: 'LCP', value: last.startTime / 1000, route });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  // FID
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        reportMetric({ type: 'web-vital', name: 'FID', value: fidEntry.processingStart - fidEntry.startTime, route });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {}

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput && layoutShift.value) {
          clsValue += layoutShift.value;
        }
      }
      reportMetric({ type: 'web-vital', name: 'CLS', value: clsValue, route });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {}

  // TTFB
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const ttfb = navEntries[0].responseStart - navEntries[0].requestStart;
      reportMetric({ type: 'web-vital', name: 'TTFB', value: ttfb / 1000, route });
    }
  } catch {}
}

export default function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    reportMetric({ type: 'page-view', route: pathname });
    observeWebVitals(pathname);
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportMetric({ type: 'error', name: 'js_error', route: pathname });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportMetric({ type: 'error', name: 'unhandled_rejection', route: pathname });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [pathname]);

  return null;
}
