import { Activity, CalendarDays, Briefcase, ChevronsRight, ListChecks } from 'lucide-react';
import { SubTabs } from '../components/SubTabs';

const ICON = 14;

export function DashboardLayout() {
  return (
    <SubTabs
      tabs={[
        { to: '/dashboard/heatmap',   label: 'Heatmap',    icon: <Activity size={ICON} /> },
        { to: '/dashboard/calendar',  label: 'Calendar',   icon: <CalendarDays size={ICON} /> },
        { to: '/dashboard/projects',  label: 'Projects',   icon: <Briefcase size={ICON} /> },
        { to: '/dashboard/pipeline',  label: 'Pipeline',   icon: <ChevronsRight size={ICON} /> },
        { to: '/dashboard/scheduler', label: 'Scheduler',  icon: <ListChecks size={ICON} /> },
      ]}
    />
  );
}
