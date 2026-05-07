/**
 * Real SVG line chart with gridlines, target line, and area fill.
 * Used by Trends. Pure presentation; takes a series of {label, value} points.
 */

interface SparklinePoint {
  label: string;
  value: number; // 0..1+ for utilization-style data
}

interface SparklineProps {
  points: SparklinePoint[];
  height?: number;
  targetLine?: number;
  /** y-axis max — defaults to 1.4 (140% util). */
  yMax?: number;
  showAxis?: boolean;
}

export function LineChart({
  points,
  height = 96,
  targetLine,
  yMax = 1.4,
  showAxis = true,
}: SparklineProps) {
  if (points.length === 0) return null;

  const padX = showAxis ? 36 : 4;
  const padY = 8;
  const width = 600;
  const innerW = width - padX - 4;
  const innerH = height - padY * 2;

  const xFor = (i: number) =>
    padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yFor = (v: number) => padY + (1 - Math.min(v, yMax) / yMax) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${xFor(points.length - 1).toFixed(1)},${(padY + innerH).toFixed(1)} L${xFor(0).toFixed(1)},${(padY + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.5, 1.0];

  return (
    <svg
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="line-chart"
    >
      {/* gridlines */}
      {showAxis &&
        yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padX}
              x2={width - 4}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--border)"
              strokeDasharray="2 4"
            />
            <text
              x={padX - 6}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-subtle)"
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

      {targetLine !== undefined && (
        <line
          x1={padX}
          x2={width - 4}
          y1={yFor(targetLine)}
          y2={yFor(targetLine)}
          stroke="var(--accent)"
          strokeDasharray="3 3"
          strokeOpacity="0.6"
        />
      )}

      <defs>
        <linearGradient id="lc-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#lc-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => {
        const tone =
          p.value < 0.7
            ? 'var(--util-green)'
            : p.value < 0.9
            ? 'var(--util-yellow)'
            : p.value <= 1.1
            ? 'var(--util-orange)'
            : 'var(--util-red)';
        return (
          <circle
            key={p.label + i}
            cx={xFor(i)}
            cy={yFor(p.value)}
            r="2.5"
            fill={tone}
            stroke="var(--surface)"
            strokeWidth="1.5"
          >
            <title>
              {p.label}: {Math.round(p.value * 100)}%
            </title>
          </circle>
        );
      })}
    </svg>
  );
}
