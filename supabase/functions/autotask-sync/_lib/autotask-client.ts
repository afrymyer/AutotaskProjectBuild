// Thin wrapper around the Autotask PSA REST API.
// Auth: ApiIntegrationCode + Username + Secret headers.
// Docs: https://ww1.autotask.net/help/DeveloperHelp/Content/AdminSetup/2ExtensionsIntegrations/APIs/REST/REST_API_Home.htm
//
// Tier 2: credentials are read from Edge Function env (never client). All
// requests are read-only; this client deliberately exposes no write methods.

export interface AutotaskClientConfig {
  apiUrl: string;
  username: string;
  secret: string;
  integrationCode: string;
}

export interface QueryOptions {
  filter?: Record<string, unknown>;
  pageSize?: number;
}

export class AutotaskClient {
  constructor(private readonly config: AutotaskClientConfig) {}

  private headers(): HeadersInit {
    return {
      'ApiIntegrationcode': this.config.integrationCode,
      'UserName': this.config.username,
      'Secret': this.config.secret,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generic paginated query. Yields pages until Autotask reports no `nextPageUrl`.
   * Implements exponential backoff (max 4 attempts) for transient errors.
   */
  async *query<T>(entity: string, opts: QueryOptions = {}): AsyncGenerator<T[]> {
    let url: string | null =
      `${this.config.apiUrl}/${entity}/query?search=${encodeURIComponent(
        JSON.stringify({ filter: opts.filter ?? [], MaxRecords: opts.pageSize ?? 500 }),
      )}`;

    while (url) {
      const page = await this.fetchWithRetry<{ items: T[]; pageDetails?: { nextPageUrl?: string } }>(url);
      yield page.items;
      url = page.pageDetails?.nextPageUrl ?? null;
    }
  }

  private async fetchWithRetry<T>(url: string, attempt = 1): Promise<T> {
    try {
      const res = await fetch(url, { headers: this.headers() });
      if (!res.ok) {
        if (res.status >= 500 && attempt < 4) {
          await delay(2 ** attempt * 250);
          return this.fetchWithRetry<T>(url, attempt + 1);
        }
        throw new Error(`Autotask ${res.status}: ${await res.text()}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (attempt < 4) {
        await delay(2 ** attempt * 250);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }
      throw err;
    }
  }

  // Typed convenience methods — implement in M2.
  // listResources(): AsyncGenerator<AutotaskResource[]> { return this.query('Resources'); }
  // listProjectsSince(since: Date) { return this.query('Projects', { filter: [...] }); }
  // listTasksSince(since: Date) { return this.query('Tasks', { filter: [...] }); }
  // listScheduleEntriesInWindow(start: Date, end: Date) { return this.query('ResourceTimeOffAdditional', { filter: [...] }); }
  // listTimeEntriesSince(since: Date) { return this.query('TimeEntries', { filter: [...] }); }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
