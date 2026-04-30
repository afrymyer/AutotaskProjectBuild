import { useProjectsData, type ProjectHealth } from '../lib/data';
import { DUMMY_RESOURCES } from '../dev/dummyData';

export function ProjectsPage() {
  const { projects, totals } = useProjectsData();

  const exposed = projects.filter((p) => p.exposureFlag);
  const offTrack = projects.filter((p) => p.burnRiskScore > 0.15);

  return (
    <section>
      <h1>Active projects — margin, burn &amp; slip risk</h1>
      <p className="muted">
        Per-engagement profitability and timeline health. Overdue tasks and
        engineer overload roll up into the slip-risk read.
      </p>

      <div className="kpi-row">
        <Kpi label="Revenue at risk" value={fmtUsd(totals.revenueAtRiskDollars)} tone={totals.revenueAtRiskDollars > 0 ? 'red' : 'green'} />
        <Kpi label="Overdue tasks" value={String(totals.overdueTaskCount)} tone={totals.overdueTaskCount > 0 ? 'orange' : 'green'} />
        <Kpi label="Fixed-fee margin (current)" value={fmtUsd(totals.fixedFeeMarginDollars)} tone={totals.fixedFeeMarginDollars > 0 ? 'green' : 'red'} />
      </div>

      {exposed.length > 0 && (
        <div className="banner danger">
          <strong>{exposed.length} project{exposed.length === 1 ? '' : 's'} at delivery risk:</strong>{' '}
          {exposed.map((p, i) => (
            <span key={p.project.autotask_id}>
              {i > 0 && '; '}
              {p.project.name} ({p.daysUntilDue}d to commit, assignee &gt;110%)
            </span>
          ))}
        </div>
      )}

      <h2>Margin &amp; burn-vs-budget</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Type</th>
            <th>Hours</th>
            <th>Burn vs timeline</th>
            <th>Margin</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((ph) => (
            <ProjectRow key={ph.project.autotask_id} ph={ph} />
          ))}
        </tbody>
      </table>

      {offTrack.length > 0 && (
        <>
          <h2>Slip risk flagged</h2>
          <ul className="risk-list">
            {offTrack.map((ph) => (
              <li key={ph.project.autotask_id}>
                <strong>{ph.project.name}</strong>
                <ul>
                  {ph.slipReasons.map((r, i) => (
                    <li key={i} className="muted">{r}</li>
                  ))}
                  {ph.assignedResources
                    .filter((r) => r.util_next_4w > 1.1)
                    .map((r) => {
                      const res = DUMMY_RESOURCES.find((x) => x.autotask_id === r.resource_id);
                      return (
                        <li key={r.resource_id} className="muted">
                          {res ? `${res.first_name} ${res.last_name}` : `Resource ${r.resource_id}`}{' '}
                          at {Math.round(r.util_next_4w * 100)}% next 4 weeks
                        </li>
                      );
                    })}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ProjectRow({ ph }: { ph: ProjectHealth }) {
  const burn = ph.burnRiskScore;
  const burnTone =
    burn > 0.15 ? 'failed' : burn > 0.05 ? 'partial' : 'success';
  const due = ph.daysUntilDue;

  return (
    <tr>
      <td>
        {ph.project.name}
        {ph.exposureFlag && <span className="cell-warn-marker"> · at risk</span>}
      </td>
      <td>{ph.project.account_name ?? '—'}</td>
      <td>
        <span className="pill pill-running">
          {ph.project.contract_type === 'fixed_fee' ? 'Fixed fee' :
           ph.project.contract_type === 'retainer' ? 'Retainer' : 'T&M'}
        </span>
      </td>
      <td>
        {ph.hoursDelivered}h / {ph.hoursBudgeted}h{' '}
        <span className="muted">({pctStr(ph.hoursPctConsumed)})</span>
      </td>
      <td>
        <BurnBar pctHours={ph.hoursPctConsumed} pctTime={ph.timePctElapsed} />
        <span className={`pill pill-${burnTone}`}>
          {burn > 0 ? '+' : ''}
          {Math.round(burn * 100)}%
        </span>
      </td>
      <td>
        {ph.marginDollars == null ? (
          <span className="muted">— (T&amp;M)</span>
        ) : (
          <span className={ph.marginDollars >= 0 ? '' : 'cell-warn'}>
            {fmtUsd(ph.marginDollars)} ({Math.round((ph.marginPct ?? 0) * 100)}%)
          </span>
        )}
      </td>
      <td className={due < 7 ? 'cell-warn' : ''}>
        {due < 0 ? `${-due}d overdue` : `${due}d`}
      </td>
    </tr>
  );
}

function BurnBar({ pctHours, pctTime }: { pctHours: number; pctTime: number }) {
  return (
    <div className="burn-bar">
      <div className="burn-track">
        <div
          className="burn-time"
          style={{ width: `${Math.min(100, Math.round(pctTime * 100))}%` }}
        />
        <div
          className="burn-hours"
          style={{ width: `${Math.min(100, Math.round(pctHours * 100))}%` }}
        />
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'green' | 'orange' | 'red' }) {
  return (
    <div className={`kpi kpi-${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pctStr(n: number): string {
  return `${Math.round(n * 100)}%`;
}
