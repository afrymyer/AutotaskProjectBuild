# autotask-sync

Hourly read-only pull from Autotask into the Supabase mirror tables.

## Run locally

```bash
supabase functions serve autotask-sync --env-file ./supabase/functions/.env
```

`./supabase/functions/.env` (gitignored) needs:

```
AUTOTASK_API_URL=https://webservices.autotask.net/atservicesrest/v1.0
AUTOTASK_USERNAME=imixservice-project@imixit.com
AUTOTASK_SECRET=...
AUTOTASK_INTEGRATION_CODE=...
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=...
```

## Deploy

```bash
supabase functions deploy autotask-sync
```

Then in the Supabase dashboard set the cron schedule to `0 * * * *`.

## Manual one-shot

```bash
curl -X POST https://<project>.functions.supabase.co/autotask-sync \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## Tier 2 notes

- Credentials live only in this function's env; never bundled to the client.
- Logs MUST contain only resource IDs — never names, emails, or project titles.
- Every run writes a row to `sync_runs` for audit / health monitoring.
