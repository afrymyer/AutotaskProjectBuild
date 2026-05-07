import { Download } from 'lucide-react';
import { useDashboardData, utilizationPct } from '../lib/data';
import { PageHero } from '../components/PageHero';

export function ExportPage() {
  const { resources, cells } = useDashboardData();

  function downloadCsv() {
    const resourceById = new Map(resources.map((r) => [r.autotask_id, r]));
    const rows = [
      [
        'resource_name',
        'week_start_et',
        'scheduled_hours',
        'pto_hours',
        'unavailable_hours',
        'weekly_capacity_hours',
        'utilization_pct',
      ],
      ...cells.map((c) => {
        const r = resourceById.get(c.resource_id);
        return [
          r ? `${r.first_name} ${r.last_name}` : `Resource ${c.resource_id}`,
          c.week_start_et,
          String(c.scheduled_hours),
          String(c.pto_hours),
          String(c.unavailable_hours),
          String(c.weekly_capacity_hours),
          (utilizationPct(c) * 100).toFixed(1),
        ];
      }),
    ];

    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imix-projects-utilization-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <PageHero
        icon={<Download size={20} />}
        title="Export"
        subtitle="Download the next 12 weeks of utilization as CSV for the Director of Ops + vCIO."
        actions={
          <button className="primary" onClick={downloadCsv}>
            <Download size={12} /> Download CSV
          </button>
        }
      />

      <div className="info-card">
        <h3>Columns</h3>
        <ul className="muted">
          <li><code>resource_name</code></li>
          <li><code>week_start_et</code> (Monday in America/New_York)</li>
          <li><code>scheduled_hours</code></li>
          <li><code>pto_hours</code></li>
          <li><code>unavailable_hours</code></li>
          <li><code>weekly_capacity_hours</code></li>
          <li><code>utilization_pct</code></li>
        </ul>
      </div>
    </section>
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
