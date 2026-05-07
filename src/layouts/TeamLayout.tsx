import { CalendarOff, ShieldCheck, Sparkles, UserCircle2 } from 'lucide-react';
import { SubTabs } from '../components/SubTabs';

const ICON = 14;

export function TeamLayout() {
  return (
    <SubTabs
      tabs={[
        { to: '/team/overrides', label: 'Overrides', icon: <CalendarOff size={ICON} /> },
        { to: '/team/approvals', label: 'Approvals', icon: <ShieldCheck size={ICON} /> },
        { to: '/team/skills',    label: 'Skills',    icon: <Sparkles size={ICON} /> },
        { to: '/team/me',        label: 'Me',        icon: <UserCircle2 size={ICON} /> },
      ]}
    />
  );
}
