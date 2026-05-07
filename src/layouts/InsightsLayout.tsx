import { Bot, Download, LineChart, Mail } from 'lucide-react';
import { SubTabs } from '../components/SubTabs';

const ICON = 14;

export function InsightsLayout() {
  return (
    <SubTabs
      tabs={[
        { to: '/insights/trends',    label: 'Trends',    icon: <LineChart size={ICON} /> },
        { to: '/insights/assistant', label: 'Assistant', icon: <Bot size={ICON} /> },
        { to: '/insights/digest',    label: 'Digest',    icon: <Mail size={ICON} /> },
        { to: '/insights/export',    label: 'Export',    icon: <Download size={ICON} /> },
      ]}
    />
  );
}
