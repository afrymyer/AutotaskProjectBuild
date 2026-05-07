import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface SubTab {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
}

export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  return (
    <>
      <nav className="subtabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            {t.icon && <span className="subtab-icon">{t.icon}</span>}
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}
