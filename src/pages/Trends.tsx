import { LineChart as LineChartIcon } from 'lucide-react';
import { useTrendsData } from '../lib/data';
import { DUMMY_RESOURCES } from '../dev/dummyData';
import { PageHero } from '../components/PageHero';
import { LineChart } from '../components/Sparkline';

export function TrendsPage() {
  const { weeks, trends, teamWeeklyUtil } = useTrendsData();

  return (
    <section>
      <PageHero
        icon={<LineChartIcon size={20} />}
        title="Trends — last 90 days"
        subtitle={
          <>
            Backward-looking utilization, per engineer and team-wide. In production{' '}
            <code>utilization_snapshots</code> is populated nightly from the schedule and
            time-entry tables; preview generates 13 weeks of seeded history.
          </>
        }
      />

      <h2><LineChartIcon size={12} /> Team weekly utilization</h2>
      <div className="chart-card">
        <LineChart
          points={teamWeeklyUtil.map((w) => ({ label: w.week, value: w.util }))}
          targetLine={0.75}
          height={140}
        />
        <p className="muted small chart-caption">
          Dashed line = 75% billable target. Coloured markers indicate week-by-week category.
        </p>
      </div>

      <h2>Per-engineer trend</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 220 }}>Resource</th>
            <th style={{ width: 120 }}>Avg util (90d)</th>
            <th style={{ width: 120 }}>Vs target</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((t) => {
            const resource = DUMMY_RESOURCES.find((r) => r.autotask_id === t.resource_id);
            if (!resource) return null;
            const variance = t.avgVarianceVsTarget;
            const tone =
              Math.abs(variance) <= 0.05 ? 'success' : variance > 0 ? 'partial' : 'failed';
            return (
              <tr key={t.resource_id}>
                <td>
                  <div className="row-with-avatar">
                    <span className="avatar-circle">
                      {resource.first_name[0]}
                      {resource.last_name[0]}
                    </span>
                    <span>{resource.first_name} {resource.last_name}</span>
                  </div>
                </td>
                <td className="num">{Math.round(t.avgUtil * 100)}%</td>
                <td>
                  <span className={`pill pill-${tone}`}>
                    {variance >= 0 ? '+' : ''}
                    {Math.round(variance * 100)} pts
                  </span>{' '}
                  <span className="muted small">target {Math.round(resource.target_billable_pct * 100)}%</span>
                </td>
                <td className="trend-cell">
                  <LineChart
                    points={t.weeks.map((w) => ({ label: w.week, value: w.util }))}
                    targetLine={resource.target_billable_pct}
                    showAxis={false}
                    height={36}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">
        Window: <code>{weeks[0]}</code> → <code>{weeks[weeks.length - 1]}</code>.
      </p>
    </section>
  );
}
