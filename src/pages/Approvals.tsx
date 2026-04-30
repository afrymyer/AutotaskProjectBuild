import { useDashboardData } from '../lib/data';
import { DUMMY_RESOURCES } from '../dev/dummyData';

export function ApprovalsPage() {
  const { overrides, approveOverride, rejectOverride } = useDashboardData();

  const pending = overrides.filter((o) => o.approval_status === 'pending');
  const decided = overrides.filter(
    (o) => o.approval_status === 'approved' || o.approval_status === 'rejected',
  );

  return (
    <section>
      <h1>Approvals</h1>
      <p className="muted">
        Override edits above the configured threshold (PTO &gt; 40h) route here for director sign-off
        before they affect the heatmap. Auto-approved edits do not appear.
      </p>

      <h2>Pending</h2>
      {pending.length === 0 ? (
        <p className="muted">No pending requests.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Week</th>
              <th>PTO</th>
              <th>Unavailable</th>
              <th>Reason</th>
              <th>Note</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((o) => {
              const r = DUMMY_RESOURCES.find((x) => x.autotask_id === o.resource_id);
              return (
                <tr key={o.id}>
                  <td>{r ? `${r.first_name} ${r.last_name}` : `Resource ${o.resource_id}`}</td>
                  <td>{o.week_start_et}</td>
                  <td>{o.pto_hours}h</td>
                  <td>{o.unavailable_hours}h</td>
                  <td className="muted small">{o.requires_approval_reason ?? '—'}</td>
                  <td>{o.note ?? '—'}</td>
                  <td>
                    <button className="primary" onClick={() => approveOverride(o.id)}>
                      Approve
                    </button>{' '}
                    <button onClick={() => rejectOverride(o.id)}>Reject</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Recent decisions</h2>
      {decided.length === 0 ? (
        <p className="muted">No decisions yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>Week</th>
              <th>PTO</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {decided.map((o) => {
              const r = DUMMY_RESOURCES.find((x) => x.autotask_id === o.resource_id);
              return (
                <tr key={o.id}>
                  <td>{r ? `${r.first_name} ${r.last_name}` : `Resource ${o.resource_id}`}</td>
                  <td>{o.week_start_et}</td>
                  <td>{o.pto_hours}h</td>
                  <td>
                    <span className={`pill pill-${o.approval_status === 'approved' ? 'success' : 'failed'}`}>
                      {o.approval_status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
