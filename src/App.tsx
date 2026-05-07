import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { LayoutGrid, Settings, Sparkles, Users } from 'lucide-react';
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
import { StatusDot } from './components/StatusDot';
import { PREVIEW_MODE } from './lib/data';

const NAV_ICON = 14;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      {PREVIEW_MODE && (
        <div className="preview-banner">
          Preview mode — auth disabled, dummy data. AI · M365 · digest email simulated.
        </div>
      )}
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-text">
            Imix <span className="brand-text-em">Projects</span>
          </span>
          <span className="workspace-chip">IMIX · PS</span>
        </div>

        <nav>
          <NavLink to="/dashboard">
            <LayoutGrid size={NAV_ICON} /> Dashboard
          </NavLink>
          <NavLink to="/team">
            <Users size={NAV_ICON} /> Team
          </NavLink>
          <NavLink to="/insights">
            <Sparkles size={NAV_ICON} /> Insights
          </NavLink>
          <NavLink to="/admin">
            <Settings size={NAV_ICON} /> Admin
          </NavLink>
        </nav>

        <div className="header-right">
          <span className="sync-chip" title="Hourly Autotask sync — last successful run">
            <StatusDot tone="green" pulse />
            Synced 1m ago
          </span>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

function Routed() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/heatmap" replace />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="heatmap" replace />} />
          <Route path="heatmap"   element={<HeatmapPage />} />
          <Route path="calendar"  element={<CalendarPage />} />
          <Route path="projects"  element={<ProjectsPage />} />
          <Route path="pipeline"  element={<PipelinePage />} />
          <Route path="scheduler" element={<SchedulerPage />} />
        </Route>

        <Route path="/team" element={<TeamLayout />}>
          <Route index element={<Navigate to="overrides" replace />} />
          <Route path="overrides" element={<OverridesPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="skills"    element={<SkillsPage />} />
          <Route path="me"        element={<MePage />} />
        </Route>

        <Route path="/insights" element={<InsightsLayout />}>
          <Route index element={<Navigate to="trends" replace />} />
          <Route path="trends"    element={<TrendsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="digest"    element={<DigestPage />} />
          <Route path="export"    element={<ExportPage />} />
        </Route>

        <Route path="/admin" element={<AdminPage />} />

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
