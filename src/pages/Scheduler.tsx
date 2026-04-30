export function SchedulerPage() {
  return (
    <section>
      <h1>Scheduler</h1>
      <p className="muted">
        Capacity-aware project scheduling — given a project's hours and target start, suggest a
        week-by-week allocation across engineers based on real availability.
      </p>

      <div className="banner roadmap">
        <strong>v1.5 roadmap.</strong> Deferred from the 2026-05-13 pilot per the build plan
        (<code>docs/build-plan.md</code> §5). Will be designed against one full sprint of real
        sync data so the suggestions are grounded — and is the natural surface for the future
        AI assist (overload prediction, narrative explanations).
      </div>

      <ul className="muted">
        <li>Tier 1 — greedy capacity fill (proposed for v1.5)</li>
        <li>Tier 2 — milestone &amp; dependency-aware planner (v2)</li>
        <li>Tier 3 — Claude-assisted plan iteration (v2 once AI scope is approved)</li>
      </ul>
    </section>
  );
}
