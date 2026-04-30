import { useDashboardData, usePipelineData, useProjectsData, utilizationPct } from '../lib/data';

export function DigestPage() {
  const { resources, weeks, cells } = useDashboardData();
  const { forecast, pipeline } = usePipelineData();
  const { projects } = useProjectsData();

  const overload: { name: string; pct: number; week: string }[] = [];
  for (const r of resources) {
    const next4 = cells.filter(
      (c) =>
        c.resource_id === r.autotask_id && weeks.indexOf(c.week_start_et) >= 0 && weeks.indexOf(c.week_start_et) < 4,
    );
    const max = next4.reduce(
      (acc, c) => (utilizationPct(c) > acc.pct ? { pct: utilizationPct(c), week: c.week_start_et } : acc),
      { pct: 0, week: '' },
    );
    if (max.pct > 1.05) overload.push({ name: `${r.first_name} ${r.last_name}`, pct: max.pct, week: max.week });
  }
  overload.sort((a, b) => b.pct - a.pct);

  const exposed = projects.filter((p) => p.exposureFlag);
  const stalePipeline = pipeline
    .filter((p) => p.last_client_contact && daysSince(p.last_client_contact) > 14)
    .sort((a, b) => (b.estimated_hours - a.estimated_hours))
    .slice(0, 3);

  const today = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

  return (
    <section>
      <h1>Weekly digest preview</h1>
      <p className="muted">
        This is the email that, in production, will be sent every Monday at 7am ET to Andy +
        Director of Ops + vCIO via Resend (<code>integrations.resend</code>). Preview rendering
        only — no email is actually sent.
      </p>

      <div className="email-preview">
        <div className="email-header">
          <div><strong>To:</strong> andy@imixit.com, dirops@imixit.com, vcio@imixit.com</div>
          <div><strong>From:</strong> imix-projects@imixit.com</div>
          <div><strong>Subject:</strong> Imix Projects · Weekly capacity digest · {today}</div>
        </div>

        <div className="email-body">
          <h2 style={{ margin: 0, textTransform: 'none', color: 'var(--imix-text)', letterSpacing: 0 }}>
            Capacity at a glance — {today}
          </h2>

          <h3>Top overload risks (next 4 weeks)</h3>
          {overload.length === 0 ? (
            <p>No engineers currently projected over 105%. Healthy.</p>
          ) : (
            <ol>
              {overload.slice(0, 3).map((o, i) => (
                <li key={i}>
                  <strong>{o.name}</strong> — {Math.round(o.pct * 100)}% week of {o.week}
                </li>
              ))}
            </ol>
          )}

          <h3>Projects at delivery risk</h3>
          {exposed.length === 0 ? (
            <p>No active projects flagged.</p>
          ) : (
            <ul>
              {exposed.map((ph) => (
                <li key={ph.project.autotask_id}>
                  <strong>{ph.project.name}</strong> ({ph.project.account_name}) — {ph.daysUntilDue}d to commit, assignee &gt;110%.
                </li>
              ))}
            </ul>
          )}

          <h3>Client outreach prompts (stale pipeline)</h3>
          {stalePipeline.length === 0 ? (
            <p>No stale pipeline.</p>
          ) : (
            <ul>
              {stalePipeline.map((p) => (
                <li key={p.autotask_id}>
                  <strong>{p.account_name}</strong> — {p.name} · {daysSince(p.last_client_contact!)}d since contact · {p.next_action ?? '—'}
                </li>
              ))}
            </ul>
          )}

          <h3>Pipeline coverage</h3>
          <ul>
            {forecast.map((f) => (
              <li key={f.month}>
                <strong>{f.label}</strong> — {f.freeHours}h free / {f.pipelineHoursWeighted}h weighted pipeline (
                {Number.isFinite(f.coverageRatio)
                  ? Math.round(f.coverageRatio * 100) + '%'
                  : '—'}{' '}
                coverage)
              </li>
            ))}
          </ul>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--imix-muted)' }}>
            View the full dashboard: <a>https://imix-projects.imixit.com</a>{' '}
            · Manage delivery preferences in the app.
          </p>
        </div>
      </div>

      <div className="toolbar">
        <button className="primary" disabled>
          Send now (production: Resend API)
        </button>
        <button disabled>Schedule weekly Monday 7am ET</button>
      </div>
    </section>
  );
}

function daysSince(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (24 * 3600 * 1000));
}
