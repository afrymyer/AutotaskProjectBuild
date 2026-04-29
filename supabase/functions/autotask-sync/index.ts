// Supabase Edge Function: autotask-sync
// Hourly read-only pull from Autotask → Postgres mirror tables.
// Scheduled via Supabase dashboard cron `0 * * * *`.
//
// Pull order (architecture.md §3.2):
//   1. resources (full)
//   2. projects (incremental by lastModifiedDate)
//   3. tasks (incremental)
//   4. schedule_entries (window: -7d .. +12w)
//   5. time_entries (window: -30d)
//
// Run accounting: every invocation writes a `sync_runs` row.
// Tier 2: no PII in logs; resource_ids only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { AutotaskClient } from './_lib/autotask-client.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: run } = await supabase
    .from('sync_runs')
    .insert({ status: 'running' })
    .select()
    .single();

  const counts: Record<string, number> = {};
  let status: 'success' | 'partial' | 'failed' = 'success';
  let errorMessage: string | null = null;

  try {
    const autotask = new AutotaskClient({
      apiUrl: Deno.env.get('AUTOTASK_API_URL')!,
      username: Deno.env.get('AUTOTASK_USERNAME')!,
      secret: Deno.env.get('AUTOTASK_SECRET')!,
      integrationCode: Deno.env.get('AUTOTASK_INTEGRATION_CODE')!,
    });

    // TODO(M2): Implement each pull step. Each step should:
    //   - paginate through Autotask cursor responses
    //   - map fields per architecture.md §2.1
    //   - upsert in batches of 500 by autotask_id
    //   - increment counts[entity]
    //
    // Suggested order to unblock M3 (heatmap) early:
    //   resources → projects → tasks → schedule_entries → time_entries

    counts.resources = await syncResources(autotask, supabase);
    counts.projects = await syncProjects(autotask, supabase);
    counts.tasks = await syncTasks(autotask, supabase);
    counts.schedule_entries = await syncScheduleEntries(autotask, supabase);
    counts.time_entries = await syncTimeEntries(autotask, supabase);
  } catch (err) {
    status = 'failed';
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('autotask-sync failed', { error: errorMessage });
  }

  await supabase
    .from('sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      status,
      entities_synced: counts,
      error_message: errorMessage,
    })
    .eq('id', run!.id);

  return new Response(
    JSON.stringify({ run_id: run!.id, status, counts, error: errorMessage }),
    { headers: { 'content-type': 'application/json' } },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Stubs — implement in M2.
// ─────────────────────────────────────────────────────────────────────────────

async function syncResources(_at: AutotaskClient, _db: ReturnType<typeof createClient>): Promise<number> {
  // TODO: full pull, upsert into autotask_resources
  return 0;
}

async function syncProjects(_at: AutotaskClient, _db: ReturnType<typeof createClient>): Promise<number> {
  // TODO: incremental by lastModifiedDate
  return 0;
}

async function syncTasks(_at: AutotaskClient, _db: ReturnType<typeof createClient>): Promise<number> {
  // TODO: incremental by lastModifiedDate
  return 0;
}

async function syncScheduleEntries(_at: AutotaskClient, _db: ReturnType<typeof createClient>): Promise<number> {
  // TODO: window [now() - 7d, now() + 12w]
  return 0;
}

async function syncTimeEntries(_at: AutotaskClient, _db: ReturnType<typeof createClient>): Promise<number> {
  // TODO: window [now() - 30d, now()]
  return 0;
}
