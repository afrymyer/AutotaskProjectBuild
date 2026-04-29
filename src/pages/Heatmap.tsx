// TODO(M3): Implement heatmap.
// - Query utilization_weekly view via supabase
// - Rows: active PS resources (autotask_resources WHERE department='Professional Services')
// - Columns: next 12 weeks (week_start_et)
// - Cell color: utilizationColor(scheduled / max(capacity - unavailable - pto, 0.1))
// - Click → /resource/:id/week/:weekStart

export function HeatmapPage() {
  return (
    <section>
      <h1>Capacity heatmap</h1>
      <p>Next 12 weeks of utilization across the PS team.</p>
      <div data-placeholder="heatmap-grid">
        Heatmap grid will render here once M2 (sync) and M3 (utilization view) are in place.
      </div>
    </section>
  );
}
