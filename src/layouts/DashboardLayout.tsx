import { SubTabs } from '../components/SubTabs';

export function DashboardLayout() {
  return (
    <SubTabs
      tabs={[
        { to: '/dashboard/heatmap',   label: 'Heatmap' },
        { to: '/dashboard/calendar',  label: 'Calendar' },
        { to: '/dashboard/projects',  label: 'Projects' },
        { to: '/dashboard/pipeline',  label: 'Pipeline' },
        { to: '/dashboard/scheduler', label: 'Scheduler' },
      ]}
    />
  );
}
