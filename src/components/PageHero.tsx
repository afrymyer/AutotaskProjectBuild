import type { ReactNode } from 'react';

interface PageHeroProps {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHero({ icon, title, subtitle, actions, children }: PageHeroProps) {
  return (
    <header className="page-hero">
      <div className="page-hero-text">
        <div className="page-hero-title">
          {icon && <span className="page-hero-icon">{icon}</span>}
          <h1>{title}</h1>
        </div>
        {subtitle && <p className="page-hero-subtitle muted">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-hero-actions">{actions}</div>}
    </header>
  );
}
