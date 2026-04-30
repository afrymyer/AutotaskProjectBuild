import { useAdminData } from '../lib/data';

export function AdminPage() {
  const { syncRuns, statusMappings, integrations } = useAdminData();
  const recentFailures = syncRuns.slice(0, 3).filter((r) => r.status === 'failed').length;
  const banner = recentFailures >= 3 ? 'red' : null;

  return (
    <section>
      <h1>Admin</h1>

      {banner && (
        <div className="banner danger">
          ⚠ Sync has failed {recentFailures} consecutive runs. Investigate.
        </div>
      )}

      <h2>Integrations</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Integration</th>
            <th>Status</th>
            <th>Last health check</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {integrations.map((i) => (
            <tr key={i.id}>
              <td><code>{i.id}</code></td>
              <td><span className={`pill pill-${integrationTone(i.status)}`}>{i.status}</span></td>
              <td>{i.last_health_check_at ?? <span className="muted">—</span>}</td>
              <td className="muted small">
                {integrationDescription(i.id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Sync history</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Started</th>
            <th>Status</th>
            <th>Resources</th>
            <th>Projects</th>
            <th>Tasks</th>
            <th>Schedule entries</th>
            <th>Time entries</th>
          </tr>
        </thead>
        <tbody>
          {syncRuns.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.started_at).toLocaleString()}</td>
              <td>
                <span className={`pill pill-${r.status}`}>{r.status}</span>
              </td>
              <td>{r.resources}</td>
              <td>{r.projects}</td>
              <td>{r.tasks}</td>
              <td>{r.schedule_entries}</td>
              <td>{r.time_entries}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Status mappings</h2>
      <p className="muted">Maps Autotask status strings to app buckets used by the utilization view and pipeline.</p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Autotask status</th>
            <th>App bucket</th>
            <th>Counts toward utilization</th>
          </tr>
        </thead>
        <tbody>
          {statusMappings.map((m, i) => (
            <tr key={i}>
              <td>{m.entity_type}</td>
              <td>{m.autotask_status}</td>
              <td><span className="pill pill-running">{m.app_bucket}</span></td>
              <td>{m.counts_toward_utilization ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function integrationTone(s: string): 'success' | 'partial' | 'failed' | 'running' {
  if (s === 'configured') return 'success';
  if (s === 'unconfigured') return 'partial';
  if (s === 'error') return 'failed';
  return 'running';
}

function integrationDescription(id: string): string {
  switch (id) {
    case 'microsoft_graph':
      return 'Outlook OOO / PTO sync into weekly_overrides. Delegated user consent required.';
    case 'resend':
      return 'Outbound email for weekly digest and approval notifications.';
    case 'anthropic':
      return 'Powers the /assistant page with tool-calling over the Postgres schema.';
    default:
      return '';
  }
}
