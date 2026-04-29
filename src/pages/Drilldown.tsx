import { useParams } from 'react-router-dom';

// TODO(M3): Drilldown for a single (resource, week) cell.
// - Pull schedule entries for resource_id where week_start_et(start_at) = :weekStart
// - Group by project, then by task; show hours per row
// - Surface the override (PTO, unavailable) for the same week if any

export function DrilldownPage() {
  const { resourceId, weekStart } = useParams();
  return (
    <section>
      <h1>Drilldown</h1>
      <p>
        Resource <code>{resourceId}</code> · week of <code>{weekStart}</code>
      </p>
      <div data-placeholder="drilldown-list">
        Schedule entries grouped by project/task will render here.
      </div>
    </section>
  );
}
