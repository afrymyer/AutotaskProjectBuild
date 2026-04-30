import { useTrendsData } from '../lib/data';
import { DUMMY_RESOURCES } from '../dev/dummyData';

export function TrendsPage() {
  const { weeks, trends, teamWeeklyUtil } = useTrendsData();

  return (
    <section>
      <h1>Trends — last 90 days</h1>
      <p className="muted">
        Backward-looking utilization per engineer and team-wide. In production,{' '}
        <code>utilization_snapshots</code> is populated nightly from{' '}
        <code>autotask_schedule_entries</code> and{' '}
        <code>autotask_time_entries</code>; preview generates 13 weeks of seeded history.
      </p>

      <h2>Team weekly utilization (rolling)</h2>
      <Sparkline weeks={teamWeeklyUtil} />

      <h2>Per-engineer trend</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 200 }}>Resource</th>
            <th style={{ width: 110 }}>Avg util (90d)</th>
            <th style={{ width: 110 }}>Vs target</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((t) => {
            const resource = DUMMY_RESOURCES.find((r) => r.autotask_id === t.resource_id);
            if (!resource) return null;
            const variance = t.avgVarianceVsTarget;
            const tone = Math.abs(variance) <= 0.05 ? 'success' : variance > 0 ? 'partial' : 'failed';
            return (
              <tr key={t.resource_id}>
                <td>{resource.first_name} {resource.last_name}</td>
                <td>{Math.round(t.avgUtil * 100)}%</td>
                <td>
                  <span className={`pill pill-${tone}`}>
                    {variance >= 0 ? '+' : ''}{Math.round(variance * 100)} pts
                  </span>
                  <span className="muted small"> · target {Math.round(resource.target_billable_pct * 100)}%</span>
                </td>
                <td>
                  <Sparkline weeks={t.weeks.map((w) => ({ week: w.week, util: w.util }))} compact />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">
        First and last bars indicate weeks ranging from{' '}
        <code>{weeks[0]}</code> to <code>{weeks[weeks.length - 1]}</code>.
      </p>
    </section>
  );
}

function Sparkline({
  weeks,
  compact = false,
}: {
  weeks: { week: string; util: number }[];
  compact?: boolean;
}) {
  if (weeks.length === 0) return null;
  const max = Math.max(...weeks.map((w) => w.util), 1.2);
  return (
    <div className={`sparkline ${compact ? 'sparkline-compact' : ''}`}>
      {weeks.map((w) => {
        const h = Math.round((w.util / max) * 100);
        const tone =
          w.util < 0.7 ? 'green' : w.util < 0.9 ? 'yellow' : w.util <= 1.1 ? 'orange' : 'red';
        return (
          <div key={w.week} className="sparkline-bar" title={`${w.week}: ${Math.round(w.util * 100)}%`}>
            <div
              className="sparkline-fill"
              style={{
                height: `${h}%`,
                background: `var(--util-${tone})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
