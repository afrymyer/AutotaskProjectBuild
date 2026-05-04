import { SubTabs } from '../components/SubTabs';

export function TeamLayout() {
  return (
    <SubTabs
      tabs={[
        { to: '/team/overrides', label: 'Overrides' },
        { to: '/team/approvals', label: 'Approvals' },
        { to: '/team/skills',    label: 'Skills' },
        { to: '/team/me',        label: 'Me' },
      ]}
    />
  );
}
