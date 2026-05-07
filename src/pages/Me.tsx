import { UserCircle2, Target, TrendingUp, DollarSign } from 'lucide-react';
import { useMockIdentity, usePersonalData, utilizationPct } from '../lib/data';
import { utilizationColor, utilizationCssVar } from '../lib/heatmap';
import { DUMMY_RESOURCES } from '../dev/dummyData';
import { PageHero } from '../components/PageHero';
import { Kpi } from '../components/Kpi';
import { LineChart } from '../components/Sparkline';

export function MePage() {
  const { resourceId, setResourceId } = useMockIdentity();
  const { resource, cells, weeks, weeklyTrend } = usePersonalData(resourceId);

  if (!resource) {
    return <p>Resource not found.</p>;
  }

  const cellByWeek = new Map(cells.map((c) => [c.week_start_et, c]));
  const next4Avg =
    cells.slice(0, 4).reduce((s, c) => s + utilizationPct(c), 0) /
    Math.max(1, cells.slice(0, 4).length);

  return (
    <section>
      <PageHero
        icon={<UserCircle2 size={20} />}
        title="My capacity"
        subtitle="Personal forecast — same data the manager view sees, scoped to a single resource. In production, gated by app_users.linked_resource_id + RLS."
        actions={
          <label className="toolbar-control">
            <span className="muted small">Identity (preview)</span>
            <select value={resourceId} onChange={(e) => setResourceId(Number(e.target.value))}>
              {DUMMY_RESOURCES.map((r) => (
                <option key={r.autotask_id} value={r.autotask_id}>
                  {r.first_name} {r.last_name}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="kpi-row">
        <Kpi
          icon={<Target size={16} />}
          label="Target billable"
          value={`${Math.round(resource.target_billable_pct * 100)}%`}
          tone="green"
          subtle="Personal billable target"
        />
        <Kpi
          icon={<TrendingUp size={16} />}
          label="Avg next 4 weeks"
          value={`${Math.round(next4Avg * 100)}%`}
          tone={next4Avg <= 0.95 ? 'green' : next4Avg <= 1.1 ? 'orange' : 'red'}
          subtle={
            next4Avg > resource.target_billable_pct
              ? `+${Math.round((next4Avg - resource.target_billable_pct) * 100)} pts vs target`
              : `${Math.round((next4Avg - resource.target_billable_pct) * 100)} pts vs target`
          }
        />
        <Kpi
          icon={<DollarSign size={16} />}
          label="Blended rate"
          value={`$${resource.blended_rate}/hr`}
          tone="neutral"
          subtle={`Role: ${resource.app_role}`}
        />
      </div>

      <h2>Next 12 weeks</h2>
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
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
      <div className="chart-card">
        <LineChart
          points={weeklyTrend.map((w) => ({ label: w.week, value: w.util }))}
          targetLine={resource.target_billable_pct}
          height={120}
        />
      </div>

      <h2>Quick actions</h2>
      <div className="quick-actions">
        <button disabled>Request PTO (production: routes to Overrides + approval)</button>
        <button disabled>Flag overload concern (production: notifies manager)</button>
      </div>
    </section>
  );
}
