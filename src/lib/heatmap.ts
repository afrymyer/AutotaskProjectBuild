export type HeatmapColor = 'green' | 'yellow' | 'orange' | 'red';

/**
 * Maps a utilization fraction (0.85 = 85%) to a heatmap color.
 * Thresholds locked per CLAUDE.md and architecture.md §4.3.
 */
export function utilizationColor(utilization: number): HeatmapColor {
  if (utilization < 0.7) return 'green';
  if (utilization < 0.9) return 'yellow';
  if (utilization <= 1.1) return 'orange';
  return 'red';
}

export function utilizationCssVar(color: HeatmapColor): string {
  return `var(--util-${color})`;
}
