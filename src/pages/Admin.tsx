import { Settings, AlertTriangle } from 'lucide-react';
import { useAdminData } from '../lib/data';
import { PageHero } from '../components/PageHero';
import { StatusDot } from '../components/StatusDot';

export function AdminPage() {
  const { syncRuns, statusMappings, integrations } = useAdminData();
  const recentFailures = syncRuns.slice(0, 3).filter((r) => r.status === 'failed').length;

  return (
    <section>
      <PageHero
        icon={<Settings size={20} />}
        title="Admin"
        subtitle="Status mappings, integrations health, and sync history."
      />

      {recentFailures >= 3 && (
        <div className="banner danger">
          <AlertTriangle size={16} />
          <span>Sync has failed {recentFailures} consecutive runs. Investigate.</span>
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
          {integrations.map((i) => {
            const tone = integrationDot(i.status);
            return (
              <tr key={i.id}>
                <td><code>{i.id}</code></td>
                <td>
                  <span className="row-with-avatar">
                    <StatusDot tone={tone} />
                    <span>{i.status}</span>
                  </span>
                </td>
                <td>{i.last_health_check_at ?? <span className="muted">—</span>}</td>
                <td className="muted small">{integrationDescription(i.id)}</td>
              </tr>
            );
          })}
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
              <td className="num">{r.resources}</td>
              <td className="num">{r.projects}</td>
              <td className="num">{r.tasks}</td>
              <td className="num">{r.schedule_entries}</td>
              <td className="num">{r.time_entries}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Status mappings</h2>
      <p className="muted small">
        Maps Autotask status strings to app buckets used by the utilization view and pipeline.
      </p>
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

function integrationDot(s: string): 'green' | 'yellow' | 'red' | 'muted' {
  if (s === 'configured') return 'green';
  if (s === 'unconfigured') return 'muted';
  if (s === 'error') return 'red';
  return 'yellow';
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
