import { Routes, Route, NavLink } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { HeatmapPage } from './pages/Heatmap';
import { CalendarPage } from './pages/Calendar';
import { ProjectsPage } from './pages/Projects';
import { PipelinePage } from './pages/Pipeline';
import { SchedulerPage } from './pages/Scheduler';
import { TrendsPage } from './pages/Trends';
import { SkillsPage } from './pages/Skills';
import { DrilldownPage } from './pages/Drilldown';
import { OverridesPage } from './pages/Overrides';
import { ApprovalsPage } from './pages/Approvals';
import { MePage } from './pages/Me';
import { AssistantPage } from './pages/Assistant';
import { DigestPage } from './pages/Digest';
import { AdminPage } from './pages/Admin';
import { ExportPage } from './pages/Export';
import { PREVIEW_MODE } from './lib/data';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      {PREVIEW_MODE && (
        <div className="preview-banner">
          PREVIEW MODE — auth disabled, dummy data. AI / M365 / digest email are simulated; production wires to real services.
        </div>
      )}
      <header className="app-header">
        <div className="brand">Imix Projects</div>
        <nav>
          <NavLink to="/" end>Heatmap</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/pipeline">Pipeline</NavLink>
          <NavLink to="/trends">Trends</NavLink>
          <NavLink to="/skills">Skills</NavLink>
          <span className="nav-sep" />
          <NavLink to="/overrides">Overrides</NavLink>
          <NavLink to="/approvals">Approvals</NavLink>
          <NavLink to="/me">Me</NavLink>
          <span className="nav-sep" />
          <NavLink to="/assistant">Assistant</NavLink>
          <NavLink to="/digest">Digest</NavLink>
          <NavLink to="/scheduler">Scheduler</NavLink>
          <span className="nav-sep" />
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
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/scheduler" element={<SchedulerPage />} />
        <Route path="/resource/:resourceId/week/:weekStart" element={<DrilldownPage />} />
        <Route path="/overrides" element={<OverridesPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/digest" element={<DigestPage />} />
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
