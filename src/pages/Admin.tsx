// TODO(M4): Admin surface.
// - Status mappings table (CRUD), entity_type ∈ {project, task}
// - Weekly capacity defaults per resource
// - Sync history: last 20 sync_runs rows, status badges
// - Sync health banner: red if 3+ consecutive 'failed' rows

export function AdminPage() {
  return (
    <section>
      <h1>Admin</h1>
      <ul>
        <li>Status mappings (Autotask → app bucket)</li>
        <li>Weekly capacity defaults</li>
        <li>Sync run history</li>
      </ul>
      <div data-placeholder="admin-panels">Admin panels go here in M4.</div>
    </section>
  );
}
