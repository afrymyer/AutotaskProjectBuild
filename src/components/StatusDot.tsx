export function StatusDot({
  tone,
  pulse = false,
}: {
  tone: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'muted';
  pulse?: boolean;
}) {
  return <span className={`status-dot status-dot-${tone} ${pulse ? 'pulse' : ''}`} />;
}
