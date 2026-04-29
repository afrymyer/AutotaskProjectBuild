import { useState } from 'react';
import { useDashboardData } from '../lib/data';

export function OverridesPage() {
  const { resources, weeks, overrides, saveOverride } = useDashboardData();
  const [editing, setEditing] = useState<{
    resource_id: number;
    week_start_et: string;
    pto_hours: number;
    unavailable_hours: number;
    note: string;
  } | null>(null);

  const overrideMap = new Map(
    overrides.map((o) => [`${o.resource_id}|${o.week_start_et}`, o]),
  );

  function startEdit(resourceId: number, week: string) {
    const existing = overrideMap.get(`${resourceId}|${week}`);
    setEditing({
      resource_id: resourceId,
      week_start_et: week,
      pto_hours: existing?.pto_hours ?? 0,
      unavailable_hours: existing?.unavailable_hours ?? 0,
      note: existing?.note ?? '',
    });
  }

  function commit() {
    if (!editing) return;
    saveOverride({
      resource_id: editing.resource_id,
      week_start_et: editing.week_start_et,
      pto_hours: editing.pto_hours,
      unavailable_hours: editing.unavailable_hours,
      note: editing.note || undefined,
    });
    setEditing(null);
  }

  return (
    <section>
      <h1>Overrides — PTO &amp; unavailable hours</h1>
      <p className="muted">
        Adjust per-resource per-week capacity. In production, edits write to{' '}
        <code>weekly_overrides</code> through an audit-logged RPC.
      </p>

      <div
        className="overrides-grid"
        style={{ gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)` }}
      >
        <div className="heatmap-corner">Resource</div>
        {weeks.map((w) => (
          <div key={w} className="heatmap-week-header">
            {formatWeek(w)}
          </div>
        ))}

        {resources.map((r) => (
          <Row
            key={r.autotask_id}
            resourceId={r.autotask_id}
            label={`${r.first_name} ${r.last_name}`}
            weeks={weeks}
            overrideMap={overrideMap}
            onClick={(w) => startEdit(r.autotask_id, w)}
          />
        ))}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit override</h2>
            <p className="muted">
              Resource {editing.resource_id} · week of {editing.week_start_et}
            </p>
            <label>
              PTO hours
              <input
                type="number"
                min="0"
                step="0.5"
                value={editing.pto_hours}
                onChange={(e) =>
                  setEditing({ ...editing, pto_hours: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Unavailable hours
              <input
                type="number"
                min="0"
                step="0.5"
                value={editing.unavailable_hours}
                onChange={(e) =>
                  setEditing({ ...editing, unavailable_hours: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Note (optional)
              <input
                type="text"
                value={editing.note}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary" onClick={commit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({
  resourceId,
  label,
  weeks,
  overrideMap,
  onClick,
}: {
  resourceId: number;
  label: string;
  weeks: string[];
  overrideMap: Map<string, { pto_hours: number; unavailable_hours: number }>;
  onClick: (week: string) => void;
}) {
  return (
    <>
      <div className="heatmap-name">{label}</div>
      {weeks.map((w) => {
        const o = overrideMap.get(`${resourceId}|${w}`);
        const hasOverride = o && (o.pto_hours > 0 || o.unavailable_hours > 0);
        return (
          <button
            key={w}
            className={`override-cell ${hasOverride ? 'has-override' : ''}`}
            onClick={() => onClick(w)}
            title={hasOverride ? `PTO ${o!.pto_hours}h · Unavail ${o!.unavailable_hours}h` : 'No override'}
          >
            {hasOverride ? `${o!.pto_hours + o!.unavailable_hours}h` : '—'}
          </button>
        );
      })}
    </>
  );
}

function formatWeek(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}
