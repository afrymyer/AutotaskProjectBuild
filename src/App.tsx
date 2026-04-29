import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { HeatmapPage } from './pages/Heatmap';
import { DrilldownPage } from './pages/Drilldown';
import { OverridesPage } from './pages/Overrides';
import { AdminPage } from './pages/Admin';
import { ExportPage } from './pages/Export';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">Imix Projects</div>
        <nav>
          <NavLink to="/">Heatmap</NavLink>
          <NavLink to="/overrides">Overrides</NavLink>
          <NavLink to="/admin">Admin</NavLink>
          <NavLink to="/export">Export</NavLink>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <Shell>
          <Routes>
            <Route path="/" element={<HeatmapPage />} />
            <Route path="/resource/:resourceId/week/:weekStart" element={<DrilldownPage />} />
            <Route path="/overrides" element={<OverridesPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Routes>
        </Shell>
      </SignedIn>
    </>
  );
}
