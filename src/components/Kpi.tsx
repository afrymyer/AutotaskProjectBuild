import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface KpiProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'green' | 'yellow' | 'orange' | 'red' | 'neutral';
  trend?: { delta: string; direction: 'up' | 'down' | 'flat'; positive: boolean };
  subtle?: string;
}

export function Kpi({ icon, label, value, tone = 'neutral', trend, subtle }: KpiProps) {
  return (
    <div className={`kpi kpi-${tone}`}>
      <div className="kpi-head">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {trend && (
          <span className={`kpi-trend kpi-trend-${trend.positive ? 'up' : 'down'}`}>
            {trend.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.delta}
          </span>
        )}
        {subtle && <span className="kpi-subtle">{subtle}</span>}
      </div>
    </div>
  );
}
