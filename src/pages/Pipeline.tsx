import { usePipelineData } from '../lib/data';
import type { PipelineStatus } from '../lib/types';

export function PipelinePage() {
  const { pipeline, forecast } = usePipelineData();
  const today = new Date().toISOString().slice(0, 10);

  const weightedRevenueByMonth = new Map<string, number>();
  for (const p of pipeline) {
    weightedRevenueByMonth.set(
      p.target_month,
      (weightedRevenueByMonth.get(p.target_month) ?? 0) + p.contract_value * p.win_probability,
    );
  }

  return (
    <section>
      <h1>Pipeline</h1>
      <p className="muted">
        Projects with status <em>On Hold</em>, <em>Discovery</em>, or any{' '}
        <em>Opportunity</em> bucket. Coverage is weighted by win probability so the forecast
        reflects expected demand, not fantasy demand.
      </p>

      <h2>Forecast — capacity vs weighted pipeline</h2>
      <table className="data-table forecast-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Free team hours</th>
            <th>Pipeline (unweighted)</th>
            <th>Pipeline (weighted)</th>
            <th>Expected revenue</th>
            <th>Coverage</th>
            <th>Read</th>
          </tr>
        </thead>
        <tbody>
          {forecast.map((f) => {
            const pct = Math.round(f.coverageRatio * 100);
            const read = readForecast(f.coverageRatio);
            const expectedRevenue = weightedRevenueByMonth.get(f.month) ?? 0;
            return (
              <tr key={f.month}>
                <td>{f.label}</td>
                <td>{f.freeHours}h</td>
                <td className="muted">{f.pipelineHoursUnweighted}h</td>
                <td>{f.pipelineHoursWeighted}h</td>
                <td>{fmtUsd(expectedRevenue)}</td>
                <td>
                  <span className={`pill pill-${read.tone}`}>
                    {Number.isFinite(f.coverageRatio) ? `${pct}%` : '—'}
                  </span>
                </td>
                <td className="muted">{read.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Pipeline projects</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Status</th>
            <th>Est. hours</th>
            <th>Contract value</th>
            <th>Win prob</th>
            <th>Target month</th>
            <th>Last contact</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          {pipeline.map((p) => {
            const stale = p.last_client_contact && p.last_client_contact < daysBefore(today, 14);
            return (
              <tr key={p.autotask_id}>
                <td>{p.name}</td>
                <td>{p.account_name ?? '—'}</td>
                <td><StatusPill status={p.status} /></td>
                <td>{p.estimated_hours}h</td>
                <td>{p.contract_value > 0 ? fmtUsd(p.contract_value) : <span className="muted">T&amp;M</span>}</td>
                <td>
                  <ProbBar value={p.win_probability} />
                </td>
                <td>{formatMonth(p.target_month)}</td>
                <td className={stale ? 'cell-warn' : ''}>
                  {p.last_client_contact ?? '—'}
                  {stale && <span className="cell-warn-marker"> ·  stale</span>}
                </td>
                <td>{p.next_action ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function ProbBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.7 ? 'green' : value >= 0.4 ? 'yellow' : 'orange';
  return (
    <div className="prob-bar" title={`${pct}% probability`}>
      <div
        className="prob-bar-fill"
        style={{ width: `${pct}%`, background: `var(--util-${tone})` }}
      />
      <span>{pct}%</span>
    </div>
  );
}

function StatusPill({ status }: { status: PipelineStatus }) {
  const tone =
    status === 'Opportunity - On Track' ? 'success'
    : status === 'Opportunity - Off Track' ? 'failed'
    : status === 'On Hold' ? 'partial'
    : 'running';
  return <span className={`pill pill-${tone}`}>{status}</span>;
}

function readForecast(ratio: number): { tone: 'success' | 'partial' | 'failed'; text: string } {
  if (!Number.isFinite(ratio)) return { tone: 'partial', text: 'No free hours this month' };
  if (ratio < 0.5)  return { tone: 'failed',  text: 'Pipeline shortfall — push more leads' };
  if (ratio < 0.9)  return { tone: 'partial', text: 'Healthy pipeline, some slack' };
  if (ratio <= 1.1) return { tone: 'success', text: 'Well-matched' };
  return { tone: 'failed', text: 'Over-pipelined — capacity is the bottleneck' };
}

function formatMonth(monthKey: string): string {
  const d = new Date(`${monthKey}-01T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function daysBefore(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
