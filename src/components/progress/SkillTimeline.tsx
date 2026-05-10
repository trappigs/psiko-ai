'use client';

export type TimelinePoint = {
  date: string;
  value: number;
  label?: string;
};

export function SkillTimeline({
  points,
  height = 140,
  format = 'number',
  accentColor = 'var(--color-ink)',
}: {
  points: TimelinePoint[];
  height?: number;
  format?: 'number' | 'percent';
  accentColor?: string;
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted italic">— veri yok —</p>
    );
  }
  if (points.length === 1) {
    const p = points[0];
    return (
      <div className="text-sm text-muted">
        Tek nokta: {fmt(p.value, format)}{' '}
        <span className="text-muted">({p.label ?? p.date})</span>
      </div>
    );
  }

  const w = 600;
  const h = height;
  const pad = { top: 16, right: 16, bottom: 24, left: 32 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(0, ...points.map((p) => p.value));
  const range = max - min || 1;

  const xs = points.map((_, i) => pad.left + (i / (points.length - 1)) * innerW);
  const ys = points.map((p) => pad.top + innerH - ((p.value - min) / range) * innerH);

  const path = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(' ');

  const areaPath = `${path} L${xs[xs.length - 1].toFixed(1)},${(pad.top + innerH).toFixed(1)} L${xs[0].toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  // y-axis ticks: min, mid, max
  const yTicks = [min, (min + max) / 2, max];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ overflow: 'visible' }}
    >
      {/* y-axis labels */}
      {yTicks.map((t, i) => {
        const y = pad.top + innerH - ((t - min) / range) * innerH;
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={w - pad.right}
              y1={y}
              y2={y}
              stroke="var(--color-rule)"
              strokeDasharray={i === 0 || i === yTicks.length - 1 ? undefined : '2 4'}
              strokeWidth="0.5"
            />
            <text
              x={pad.left - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="var(--color-muted)"
              fontFamily="var(--font-mono)"
            >
              {fmt(t, format)}
            </text>
          </g>
        );
      })}

      {/* area fill */}
      <path d={areaPath} fill={accentColor} fillOpacity="0.06" />

      {/* line */}
      <path d={path} fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinejoin="round" />

      {/* points */}
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="3" fill={accentColor} />
          <text
            x={x}
            y={pad.top + innerH + 14}
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-muted)"
            fontFamily="var(--font-mono)"
          >
            {points[i].label ?? `#${i + 1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

function fmt(v: number, format: 'number' | 'percent') {
  if (format === 'percent') return `${Math.round(v * 100)}%`;
  return Math.round(v).toString();
}
