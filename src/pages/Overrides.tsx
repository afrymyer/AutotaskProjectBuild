import { useState } from 'react';
import { CalendarOff, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useDashboardData } from '../lib/data';
import { PageHero } from '../components/PageHero';

export function OverridesPage() {
  const { resources, weeks, overrides, saveOverride } = useDashboardData();
  const [editing, setEditing] = useState<{
    resource_id: number;
    week_start_et: string;
    pto_hours: number;
    unavailable_hours: number;
    note: string;
  } | null>(null);
  const [m365Status, setM365Status] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [m365Imported, setM365Imported] = useState(0);

  const overrideMap = new Map(
    overrides.map((o) => [`${o.resource_id}|${o.week_start_et}`, o]),
  );
  const pendingCount = overrides.filter((o) => o.approval_status === 'pending').length;

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

  function fakeM365Sync() {
    setM365Status('syncing');
    setM365Imported(0);
    let imported = 0;
    const interval = window.setInterval(() => {
      imported++;
      setM365Imported(imported);
      if (imported >= 4) {
        window.clearInterval(interval);
        setM365Status('done');
        if (resources[1] && resources[2]) {
          saveOverride({
            resource_id: resources[1].autotask_id,
            week_start_et: weeks[3]!,
            pto_hours: 8,
            unavailable_hours: 0,
            note: '[M365 sync] Outlook OOO',
          });
          saveOverride({
            resource_id: resources[2].autotask_id,
            week_start_et: weeks[5]!,
            pto_hours: 16,
            unavailable_hours: 0,
            note: '[M365 sync] Outlook OOO',
          });
        }
      }
    }, 250);
  }

  return (
    <section>
      <PageHero
        icon={<CalendarOff size={20} />}
        title="Overrides — PTO & unavailable hours"
        subtitle="Adjust per-resource per-week capacity. Edits over 40h PTO route to the Approvals tab and don't shift the heatmap until approved."
        actions={
          <div className="header-actions-row">
            <button className="primary" onClick={fakeM365Sync} disabled={m365Status === 'syncing'}>
              {m365Status === 'syncing' ? <RefreshCw size={12} className="spin" /> : <RefreshCw size={12} />}
              {m365Status === 'idle' && 'Sync from Outlook'}
              {m365Status === 'syncing' && `Syncing… (${m365Imported}/4)`}
              {m365Status === 'done' && (
                <>
                  <Check size={12} /> 2 OOO blocks imported
                </>
              )}
            </button>
            {pendingCount > 0 && (
              <span className="pill pill-partial">{pendingCount} pending</span>
            )}
          </div>
        }
      />

      <p className="muted small">
        M365 sync is preview-stubbed. Production wires to <code>integrations.microsoft_graph</code>{' '}
        with delegated user consent.
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
            initials={`${r.first_name[0]}${r.last_name[0]}`}
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
            <p className="muted small">
              Resource {editing.resource_id} · week of {editing.week_start_et}
            </p>
            {editing.pto_hours > 40 && (
              <div className="banner partial" style={{ marginTop: 12 }}>
                <AlertTriangle size={14} />
                <span>Over 40h PTO will route to director approval</span>
              </div>
            )}
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
              <button className="primary" onClick={commit}>Save</button>
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
  initials,
  weeks,
  overrideMap,
  onClick,
}: {
  resourceId: number;
  label: string;
  initials: string;
  weeks: string[];
  overrideMap: Map<string, {
    pto_hours: number;
    unavailable_hours: number;
    approval_status: string;
  }>;
  onClick: (week: string) => void;
}) {
  return (
    <>
      <div className="heatmap-name">
        <div className="heatmap-name-line">
          <span className="avatar-circle">{initials}</span>
          <span>{label}</span>
        </div>
      </div>
      {weeks.map((w) => {
        const o = overrideMap.get(`${resourceId}|${w}`);
        const hasOverride = o && (o.pto_hours > 0 || o.unavailable_hours > 0);
        const pending = o?.approval_status === 'pending';
        return (
          <button
            key={w}
            className={`override-cell ${hasOverride ? 'has-override' : ''} ${pending ? 'pending' : ''}`}
            onClick={() => onClick(w)}
            title={
              hasOverride
                ? `PTO ${o!.pto_hours}h · Unavail ${o!.unavailable_hours}h${pending ? ' · pending approval' : ''}`
                : 'No override'
            }
          >
            {hasOverride ? `${o!.pto_hours + o!.unavailable_hours}h` : '—'}
            {pending && <span className="cell-warn-marker"> ⏳</span>}
          </button>
        );
      })}
    </>
  );
}

function formatWeek(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}
