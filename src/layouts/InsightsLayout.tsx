import { SubTabs } from '../components/SubTabs';

export function InsightsLayout() {
  return (
    <SubTabs
      tabs={[
        { to: '/insights/trends',    label: 'Trends' },
        { to: '/insights/assistant', label: 'Assistant' },
        { to: '/insights/digest',    label: 'Digest' },
        { to: '/insights/export',    label: 'Export' },
      ]}
    />
  );
}
