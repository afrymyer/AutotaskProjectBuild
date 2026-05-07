import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Lightbulb } from 'lucide-react';
import {
  useDashboardData,
  useProjectsData,
  useRebalanceSuggestions,
  utilizationPct,
} from '../lib/data';
import { utilizationColor, utilizationCssVar } from '../lib/heatmap';
import { DUMMY_RESOURCES } from '../dev/dummyData';
import { PageHero } from '../components/PageHero';

export function HeatmapPage() {
  const { resources, weeks, cells } = useDashboardData();
  const { projects } = useProjectsData();
  const suggestions = useRebalanceSuggestions();

  const cellLookup = new Map(cells.map((c) => [`${c.resource_id}|${c.week_start_et}`, c]));
  const exposed = projects.filter((p) => p.exposureFlag);

  const avgUtilByResource = new Map<number, number>();
  for (const r of resources) {
    const own = cells.filter((c) => c.resource_id === r.autotask_id);
    const avg = own.reduce((s, c) => s + utilizationPct(c), 0) / Math.max(1, own.length);
    avgUtilByResource.set(r.autotask_id, avg);
  }

  return (
    <section>
      <PageHero
        icon={<Activity size={20} />}
        title="Capacity heatmap"
        subtitle="Next 12 weeks of utilization across the PS team. Click any cell to drill into its schedule entries."
      />

      {exposed.length > 0 && (
        <div className="banner danger">
          <AlertTriangle size={16} />
          <span>
            <strong>Client exposure:</strong>{' '}
            {exposed.map((p, i) => (
              <span key={p.project.autotask_id}>
                {i > 0 && ' · '}
                {p.project.name} ({p.daysUntilDue}d to commit, assignee &gt;110%)
              </span>
            ))}
          </span>
          <Link to="/dashboard/projects" className="banner-action">
            Review <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <Legend />

      <div
        className="heatmap"
        style={{ gridTemplateColumns: `260px repeat(${weeks.length}, 1fr)` }}
      >
        <div className="heatmap-corner">Resource</div>
        {weeks.map((w) => (
          <div key={w} className="heatmap-week-header" title={w}>
            {formatWeek(w)}
          </div>
        ))}

        {resources.map((r) => {
          const avg = avgUtilByResource.get(r.autotask_id) ?? 0;
          const variance = avg - r.target_billable_pct;
          const tone =
            Math.abs(variance) <= 0.05 ? 'success' : variance > 0 ? 'partial' : 'failed';
          return (
            <Row
              key={r.autotask_id}
              resource={r}
              targetPill={
                <span className={`pill pill-${tone}`} style={{ marginLeft: 8, fontSize: 10 }}>
                  {variance >= 0 ? '+' : ''}{Math.round(variance * 100)}
                </span>
              }
              targetText={`Target ${Math.round(r.target_billable_pct * 100)}%`}
              weeks={weeks}
              cellLookup={cellLookup}
            />
          );
        })}
      </div>

      {suggestions.length > 0 && (
        <>
          <h2><Lightbulb size={12} /> Suggested rebalancing</h2>
          <ul className="suggestion-list">
            {suggestions.map((s, i) => {
              const from = DUMMY_RESOURCES.find((r) => r.autotask_id === s.fromResourceId);
              const to = DUMMY_RESOURCES.find((r) => r.autotask_id === s.toResourceId);
              return (
                <li key={i}>
                  <strong>Move {s.hoursMoved}h</strong> from{' '}
                  {from ? `${from.first_name} ${from.last_name}` : `Resource ${s.fromResourceId}`}{' '}
                  → {to ? `${to.first_name} ${to.last_name}` : `Resource ${s.toResourceId}`}
                  <span className="muted"> · week of {s.weekStart} · {s.reason}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function Row({
  resource,
  targetPill,
  targetText,
  weeks,
  cellLookup,
}: {
  resource: { autotask_id: number; first_name: string; last_name: string };
  targetPill: React.ReactNode;
  targetText: string;
  weeks: string[];
  cellLookup: Map<string, ReturnType<typeof useDashboardData>['cells'][number]>;
}) {
  return (
    <>
      <div className="heatmap-name">
        <div className="heatmap-name-line">
          <span className="avatar-circle">
            {resource.first_name[0]}
            {resource.last_name[0]}
          </span>
          <span>
            {resource.first_name} {resource.last_name}
          </span>
          {targetPill}
        </div>
        <div className="muted small">{targetText}</div>
      </div>
      {weeks.map((w) => {
        const cell = cellLookup.get(`${resource.autotask_id}|${w}`);
        if (!cell) {
          return <div key={w} className="heatmap-cell empty" />;
        }
        const util = utilizationPct(cell);
        const color = utilizationColor(util);
        const pct = Math.round(util * 100);
        return (
          <Link
            key={w}
            to={`/resource/${resource.autotask_id}/week/${w}`}
            className="heatmap-cell"
            style={{ background: utilizationCssVar(color) }}
            title={tooltip(cell, util)}
          >
            {pct}%
          </Link>
        );
      })}
    </>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--util-green)' }} /> &lt; 70%</span>
      <span><i style={{ background: 'var(--util-yellow)' }} /> 70–90%</span>
      <span><i style={{ background: 'var(--util-orange)' }} /> 90–110%</span>
      <span><i style={{ background: 'var(--util-red)' }} /> &gt; 110%</span>
      <span className="muted small">· pill = avg vs personal target</span>
    </div>
  );
}

function formatWeek(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function tooltip(
  cell: ReturnType<typeof useDashboardData>['cells'][number],
  util: number,
): string {
  return [
    `${Math.round(util * 100)}%`,
    `Scheduled: ${cell.scheduled_hours}h`,
    `Capacity: ${cell.weekly_capacity_hours}h`,
    cell.pto_hours > 0 ? `PTO: ${cell.pto_hours}h` : null,
    cell.unavailable_hours > 0 ? `Unavailable: ${cell.unavailable_hours}h` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
