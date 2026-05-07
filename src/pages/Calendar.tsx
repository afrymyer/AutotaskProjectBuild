import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  useCalendarData,
  dayCellColor,
  dayLoadBucket,
  type DayCell,
} from '../lib/data';
import type { Resource } from '../lib/types';
import { PageHero } from '../components/PageHero';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const { monthLabel, weeks, resources } = useCalendarData(monthOffset);
  const [selected, setSelected] = useState<DayCell | null>(null);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <section>
      <PageHero
        icon={<CalendarDays size={20} />}
        title="Team availability calendar"
        subtitle={
          <>
            Engineers count as <strong>free</strong> on a day with under 4h scheduled.
            Click any day for a per-person breakdown.
          </>
        }
        actions={
          <div className="month-nav">
            <button onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month">
              <ChevronLeft size={14} />
            </button>
            <div className="month-label">{monthLabel}</div>
            <button onClick={() => setMonthOffset((m) => m + 1)} aria-label="Next month">
              <ChevronRight size={14} />
            </button>
            {monthOffset !== 0 && (
              <button onClick={() => setMonthOffset(0)}>Today</button>
            )}
          </div>
        }
      />

      <Legend />

      <div className="calendar-grid">
        {DOW.map((d) => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {weeks.flat().map((cell) => (
          <DayButton
            key={cell.date}
            cell={cell}
            isToday={cell.date === todayIso}
            inMonth={isSameMonthAs(cell.date, monthOffset)}
            onClick={() => setSelected(cell)}
          />
        ))}
      </div>

      {selected && (
        <DayDetail
          cell={selected}
          resources={resources}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function DayButton({
  cell,
  isToday,
  inMonth,
  onClick,
}: {
  cell: DayCell;
  isToday: boolean;
  inMonth: boolean;
  onClick: () => void;
}) {
  const color = dayCellColor(cell);
  const day = Number(cell.date.slice(8, 10));
  return (
    <button
      className={`cal-day ${inMonth ? '' : 'cal-day-other'} ${isToday ? 'cal-day-today' : ''}`}
      style={{ borderTop: `3px solid var(--util-${color})` }}
      onClick={onClick}
    >
      <div className="cal-day-number">{day}</div>
      <div className="cal-day-stat">
        <strong>{cell.freeCount}</strong>
        <span>of {cell.totalCount} free</span>
      </div>
    </button>
  );
}

function DayDetail({
  cell,
  resources,
  onClose,
}: {
  cell: DayCell;
  resources: Resource[];
  onClose: () => void;
}) {
  const groups: Record<string, { resource: Resource; hours: number }[]> = {
    available: [],
    light: [],
    booked: [],
    overbooked: [],
  };

  for (const r of resources) {
    const hours = cell.perResourceHours.get(r.autotask_id) ?? 0;
    const bucket = dayLoadBucket(hours);
    groups[bucket]!.push({ resource: r, hours });
  }

  const dateLabel = new Date(cell.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="side-panel-backdrop" onClick={onClose}>
      <aside className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <div>
            <h2>{dateLabel}</h2>
            <p className="muted">
              {cell.freeCount} of {cell.totalCount} free
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="icon-button">
            <X size={14} />
          </button>
        </div>
        <Group title="Available (<4h scheduled)" rows={groups.available!} accent="green" />
        <Group title="Light (4–6h)" rows={groups.light!} accent="yellow" />
        <Group title="Booked (6–8h)" rows={groups.booked!} accent="orange" />
        <Group title="Overbooked (>8h)" rows={groups.overbooked!} accent="red" />
      </aside>
    </div>
  );
}

function Group({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: { resource: Resource; hours: number }[];
  accent: 'green' | 'yellow' | 'orange' | 'red';
}) {
  if (rows.length === 0) return null;
  return (
    <div className="side-panel-group">
      <h3 style={{ borderLeft: `3px solid var(--util-${accent})` }}>
        {title} <span className="muted">({rows.length})</span>
      </h3>
      <ul>
        {rows.map(({ resource, hours }) => (
          <li key={resource.autotask_id}>
            <span className="row-with-avatar">
              <span className="avatar-circle">
                {resource.first_name[0]}
                {resource.last_name[0]}
              </span>
              {resource.first_name} {resource.last_name}
            </span>
            <span className="muted num">{Math.round(hours * 10) / 10}h</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span><i style={{ background: 'var(--util-green)' }} /> ≥75% free</span>
      <span><i style={{ background: 'var(--util-yellow)' }} /> 50–75% free</span>
      <span><i style={{ background: 'var(--util-orange)' }} /> 25–50% free</span>
      <span><i style={{ background: 'var(--util-red)' }} /> &lt;25% free</span>
    </div>
  );
}

function isSameMonthAs(iso: string, monthOffset: number): boolean {
  const target = new Date();
  target.setMonth(target.getMonth() + monthOffset);
  return iso.slice(0, 7) === target.toISOString().slice(0, 7);
}
