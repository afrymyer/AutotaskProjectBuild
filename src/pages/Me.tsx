import { useMockIdentity, usePersonalData, utilizationPct } from '../lib/data';
import { utilizationColor, utilizationCssVar } from '../lib/heatmap';
import { DUMMY_RESOURCES } from '../dev/dummyData';

export function MePage() {
  const { resourceId, setResourceId } = useMockIdentity();
  const { resource, cells, weeks, weeklyTrend } = usePersonalData(resourceId);

  if (!resource) {
    return <p>Resource not found.</p>;
  }

  const cellByWeek = new Map(cells.map((c) => [c.week_start_et, c]));

  const next4Avg =
    cells.slice(0, 4).reduce((s, c) => s + utilizationPct(c), 0) / Math.max(1, cells.slice(0, 4).length);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>My capacity</h1>
          <p className="muted">
            Personal forecast — same data the manager view sees, scoped to a single resource. In
            production this is gated by{' '}
            <code>app_users.linked_resource_id</code> and an RLS policy.
          </p>
        </div>
        <label className="muted">
          Identity (preview only):{' '}
          <select value={resourceId} onChange={(e) => setResourceId(Number(e.target.value))}>
            {DUMMY_RESOURCES.map((r) => (
              <option key={r.autotask_id} value={r.autotask_id}>
                {r.first_name} {r.last_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="kpi-row">
        <div className="kpi kpi-green">
          <div className="kpi-label">Target billable</div>
          <div className="kpi-value">{Math.round(resource.target_billable_pct * 100)}%</div>
        </div>
        <div className={`kpi kpi-${next4Avg <= 0.95 ? 'green' : next4Avg <= 1.1 ? 'orange' : 'red'}`}>
          <div className="kpi-label">Avg next 4 weeks</div>
          <div className="kpi-value">{Math.round(next4Avg * 100)}%</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-label">Blended rate</div>
          <div className="kpi-value">${resource.blended_rate}/hr</div>
        </div>
      </div>

      <h2>Next 12 weeks</h2>
      <div
        className="heatmap"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}
      >
        {weeks.map((w) => {
          const cell = cellByWeek.get(w);
          const util = cell ? utilizationPct(cell) : 0;
          const color = utilizationColor(util);
          return (
            <div
              key={w}
              className="heatmap-cell"
              style={{ background: utilizationCssVar(color) }}
              title={cell ? `${cell.scheduled_hours}h scheduled` : ''}
            >
              {Math.round(util * 100)}%
            </div>
          );
        })}
      </div>

      <h2>Last 90 days</h2>
      <div className="sparkline">
        {weeklyTrend.map((w) => {
          const tone =
            w.util < 0.7 ? 'green' : w.util < 0.9 ? 'yellow' : w.util <= 1.1 ? 'orange' : 'red';
          const h = Math.round((w.util / 1.4) * 100);
          return (
            <div key={w.week} className="sparkline-bar" title={`${w.week}: ${Math.round(w.util * 100)}%`}>
              <div className="sparkline-fill" style={{ height: `${h}%`, background: `var(--util-${tone})` }} />
            </div>
          );
        })}
      </div>

      <h2>Quick actions</h2>
      <div className="quick-actions">
        <button disabled>Request PTO (production: routes to /overrides + approval)</button>
        <button disabled>Flag overload concern (production: notifies manager)</button>
      </div>
    </section>
  );
}
