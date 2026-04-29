// TODO(M4): Override editor.
// - Table: rows = active PS resources, columns = next 12 weeks
// - Each cell: editable PTO hours + unavailable hours (defaults 0/0)
// - Save calls a Postgres RPC `upsert_weekly_override` that writes to
//   weekly_overrides AND audit_log in the same transaction.
// - Show a "saved" toast and refresh the heatmap query.

export function OverridesPage() {
  return (
    <section>
      <h1>Overrides — PTO &amp; unavailable hours</h1>
      <p>Adjust per-resource per-week capacity. Edits are audit-logged.</p>
      <div data-placeholder="overrides-grid">Override editor goes here in M4.</div>
    </section>
  );
}
