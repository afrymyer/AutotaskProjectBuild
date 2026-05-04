import { NavLink, Outlet } from 'react-router-dom';

export interface SubTab {
  to: string;
  label: string;
  end?: boolean;
}

export function SubTabs({ tabs }: { tabs: SubTab[] }) {
  return (
    <>
      <nav className="subtabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}
