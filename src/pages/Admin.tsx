import { useAdminData } from '../lib/data';

export function AdminPage() {
  const { syncRuns, statusMappings } = useAdminData();
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
      <p className="muted">Maps Autotask status strings to app buckets used by the utilization view.</p>
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
              <td>{m.app_bucket}</td>
              <td>{m.counts_toward_utilization ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
