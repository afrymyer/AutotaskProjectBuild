import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { TeamLayout } from './layouts/TeamLayout';
import { InsightsLayout } from './layouts/InsightsLayout';
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
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/team">Team</NavLink>
          <NavLink to="/insights">Insights</NavLink>
          <NavLink to="/admin">Admin</NavLink>
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
        {/* Default landing */}
        <Route path="/" element={<Navigate to="/dashboard/heatmap" replace />} />

        {/* Dashboard group */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="heatmap" replace />} />
          <Route path="heatmap"   element={<HeatmapPage />} />
          <Route path="calendar"  element={<CalendarPage />} />
          <Route path="projects"  element={<ProjectsPage />} />
          <Route path="pipeline"  element={<PipelinePage />} />
          <Route path="scheduler" element={<SchedulerPage />} />
        </Route>

        {/* Team group */}
        <Route path="/team" element={<TeamLayout />}>
          <Route index element={<Navigate to="overrides" replace />} />
          <Route path="overrides" element={<OverridesPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="skills"    element={<SkillsPage />} />
          <Route path="me"        element={<MePage />} />
        </Route>

        {/* Insights group */}
        <Route path="/insights" element={<InsightsLayout />}>
          <Route index element={<Navigate to="trends" replace />} />
          <Route path="trends"    element={<TrendsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="digest"    element={<DigestPage />} />
          <Route path="export"    element={<ExportPage />} />
        </Route>

        {/* Admin (single page, no sub-tabs) */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Drilldown stays top-level — it's a deep view, not a sub-tab */}
        <Route path="/resource/:resourceId/week/:weekStart" element={<DrilldownPage />} />

        {/* Backwards-compatible redirects from the old flat URLs */}
        <Route path="/calendar"  element={<Navigate to="/dashboard/calendar"  replace />} />
        <Route path="/projects"  element={<Navigate to="/dashboard/projects"  replace />} />
        <Route path="/pipeline"  element={<Navigate to="/dashboard/pipeline"  replace />} />
        <Route path="/scheduler" element={<Navigate to="/dashboard/scheduler" replace />} />
        <Route path="/overrides" element={<Navigate to="/team/overrides"      replace />} />
        <Route path="/approvals" element={<Navigate to="/team/approvals"      replace />} />
        <Route path="/skills"    element={<Navigate to="/team/skills"         replace />} />
        <Route path="/me"        element={<Navigate to="/team/me"             replace />} />
        <Route path="/trends"    element={<Navigate to="/insights/trends"     replace />} />
        <Route path="/assistant" element={<Navigate to="/insights/assistant"  replace />} />
        <Route path="/digest"    element={<Navigate to="/insights/digest"     replace />} />
        <Route path="/export"    element={<Navigate to="/insights/export"     replace />} />
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
