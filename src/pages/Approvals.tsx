import { ShieldCheck, Check, X } from 'lucide-react';
import { useDashboardData } from '../lib/data';
import { DUMMY_RESOURCES } from '../dev/dummyData';
import { PageHero } from '../components/PageHero';

export function ApprovalsPage() {
  const { overrides, approveOverride, rejectOverride } = useDashboardData();

  const pending = overrides.filter((o) => o.approval_status === 'pending');
  const decided = overrides.filter(
    (o) => o.approval_status === 'approved' || o.approval_status === 'rejected',
  );

  return (
    <section>
      <PageHero
        icon={<ShieldCheck size={20} />}
        title="Approvals"
        subtitle="Override edits above the configured threshold (PTO > 40h) route here for director sign-off before they affect the heatmap."
        actions={
          pending.length > 0 ? (
            <span className="pill pill-partial">{pending.length} pending</span>
          ) : null
        }
      />

      <h2>Pending</h2>
      {pending.length === 0 ? (
        <div className="empty-state">No pending requests.</div>
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
                  <td>
                    <div className="row-with-avatar">
                      {r && (
                        <span className="avatar-circle">
                          {r.first_name[0]}
                          {r.last_name[0]}
                        </span>
                      )}
                      <span>{r ? `${r.first_name} ${r.last_name}` : `Resource ${o.resource_id}`}</span>
                    </div>
                  </td>
                  <td>{o.week_start_et}</td>
                  <td className="num">{o.pto_hours}h</td>
                  <td className="num">{o.unavailable_hours}h</td>
                  <td className="muted small">{o.requires_approval_reason ?? '—'}</td>
                  <td>{o.note ?? '—'}</td>
                  <td>
                    <button className="primary" onClick={() => approveOverride(o.id)}>
                      <Check size={12} /> Approve
                    </button>{' '}
                    <button onClick={() => rejectOverride(o.id)}>
                      <X size={12} /> Reject
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Recent decisions</h2>
      {decided.length === 0 ? (
        <div className="empty-state">No decisions yet.</div>
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
                  <td className="num">{o.pto_hours}h</td>
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
