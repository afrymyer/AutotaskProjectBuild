import { Link } from 'react-router-dom';
import { useDashboardData, utilizationPct } from '../lib/data';
import { utilizationColor, utilizationCssVar } from '../lib/heatmap';

export function HeatmapPage() {
  const { resources, weeks, cells } = useDashboardData();

  const cellLookup = new Map(cells.map((c) => [`${c.resource_id}|${c.week_start_et}`, c]));

  return (
    <section>
      <h1>Capacity heatmap</h1>
      <p className="muted">
        Next 12 weeks of utilization across the PS team. Click any cell to drill into its
        schedule entries.
      </p>

      <Legend />

      <div
        className="heatmap"
        style={{ gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)` }}
      >
        <div className="heatmap-corner">Resource</div>
        {weeks.map((w) => (
          <div key={w} className="heatmap-week-header" title={w}>
            {formatWeek(w)}
          </div>
        ))}

        {resources.map((r) => (
          <Row key={r.autotask_id} resource={r} weeks={weeks} cellLookup={cellLookup} />
        ))}
      </div>
    </section>
  );
}

function Row({
  resource,
  weeks,
  cellLookup,
}: {
  resource: { autotask_id: number; first_name: string; last_name: string };
  weeks: string[];
  cellLookup: Map<string, ReturnType<typeof useDashboardData>['cells'][number]>;
}) {
  return (
    <>
      <div className="heatmap-name">
        {resource.first_name} {resource.last_name}
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
      <span>
        <i style={{ background: 'var(--util-green)' }} /> &lt; 70%
      </span>
      <span>
        <i style={{ background: 'var(--util-yellow)' }} /> 70–90%
      </span>
      <span>
        <i style={{ background: 'var(--util-orange)' }} /> 90–110%
      </span>
      <span>
        <i style={{ background: 'var(--util-red)' }} /> &gt; 110%
      </span>
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
