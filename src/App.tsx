import { Routes, Route, NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { HeatmapPage } from './pages/Heatmap';
import { CalendarPage } from './pages/Calendar';
import { PipelinePage } from './pages/Pipeline';
import { SchedulerPage } from './pages/Scheduler';
import { DrilldownPage } from './pages/Drilldown';
import { OverridesPage } from './pages/Overrides';
import { AdminPage } from './pages/Admin';
import { ExportPage } from './pages/Export';
import { PREVIEW_MODE } from './lib/data';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      {PREVIEW_MODE && (
        <div className="preview-banner">
          PREVIEW MODE — auth disabled, dummy data. Set VITE_CLERK_PUBLISHABLE_KEY to go live.
        </div>
      )}
      <header className="app-header">
        <div className="brand">Imix Projects</div>
        <nav>
          <NavLink to="/" end>Heatmap</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/pipeline">Pipeline</NavLink>
          <NavLink to="/scheduler">Scheduler</NavLink>
          <NavLink to="/overrides">Overrides</NavLink>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/export">Export</NavLink>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function Routed() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HeatmapPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/resource/:resourceId/week/:weekStart" element={<DrilldownPage />} />
        <Route path="/overrides" element={<OverridesPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  if (PREVIEW_MODE) return <Routed />;
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <Routed />
      </SignedIn>
    </>
  );
}
