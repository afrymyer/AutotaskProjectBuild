import { useParams, Link } from 'react-router-dom';
import { useDrilldownEntries } from '../lib/data';
import { projectName, taskTitle } from '../dev/dummyData';

export function DrilldownPage() {
  const { resourceId, weekStart } = useParams();
  const id = Number(resourceId);
  const week = weekStart ?? '';
  const { entries, scheduledHours } = useDrilldownEntries(id, week);

  const grouped = new Map<number, typeof entries>();
  for (const e of entries) {
    const key = e.project_id ?? -1;
    const existing = grouped.get(key) ?? [];
    existing.push(e);
    grouped.set(key, existing);
  }

  return (
    <section>
      <p>
        <Link to="/">← Back to heatmap</Link>
      </p>
      <h1>Drilldown</h1>
      <p className="muted">
        Resource <code>{resourceId}</code> · week of <code>{week}</code> ·{' '}
        <strong>{scheduledHours}h scheduled</strong>
      </p>

      {entries.length === 0 ? (
        <p>No schedule entries for this week.</p>
      ) : (
        <div className="drilldown">
          {[...grouped.entries()].map(([projectId, projectEntries]) => {
            const total = projectEntries.reduce((s, e) => s + e.hours, 0);
            return (
              <div key={projectId} className="drilldown-project">
                <h3>
                  {projectName(projectId === -1 ? null : projectId)}{' '}
                  <span className="muted">· {Math.round(total * 10) / 10}h</span>
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Start</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectEntries.map((e) => (
                      <tr key={e.autotask_id}>
                        <td>{taskTitle(e.task_id)}</td>
                        <td>{new Date(e.start_at).toLocaleString()}</td>
                        <td>{e.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
