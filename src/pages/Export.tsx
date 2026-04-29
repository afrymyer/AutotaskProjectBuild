// TODO(M4): CSV export for Director of Ops + vCIO.
// - Columns (proposed, confirm at M4 kickoff):
//     resource_name, week_start_et, scheduled_hours, pto_hours,
//     unavailable_hours, weekly_capacity_hours, utilization_pct
// - Range: next 12 weeks
// - Generated client-side from utilization_weekly query result; no PII in PostHog payload

export function ExportPage() {
  return (
    <section>
      <h1>Export</h1>
      <p>Download next 12 weeks of utilization as CSV.</p>
      <button disabled data-placeholder="export-button">
        Download CSV (M4)
      </button>
    </section>
  );
}
