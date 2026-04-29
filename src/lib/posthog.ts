import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export function initPostHog(): void {
  if (!key) {
    if (import.meta.env.DEV) {
      console.warn('VITE_POSTHOG_KEY not set — PostHog disabled in this session');
    }
    return;
  }
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    person_profiles: 'identified_only',
    // Tier 2: do NOT send default `$ip`/`$referrer` person properties beyond what's needed
  });
}

/**
 * Capture a product event. Caller is responsible for ensuring the payload
 * contains NO PII (no names, no emails). Resource IDs are fine.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (!key) return;
  posthog.capture(event, properties);
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!key) return;
  posthog.capture('$exception', {
    $exception_message: error instanceof Error ? error.message : String(error),
    $exception_stack_trace_raw: error instanceof Error ? error.stack : undefined,
    ...context,
  });
}
