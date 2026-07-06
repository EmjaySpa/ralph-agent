/** Tiny inline SVG sparkline (values on a 1-5 scale). No dependencies. */
export function Sparkline({
  values,
  color = "#4C8788",
  height = 40,
  width = 120,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (values.length === 0) return null;
  const min = 1;
  const max = 5;
  const pad = 3;
  const stepX = (width - pad * 2) / (values.length - 1 || 1);
  const scaleY = (v: number) => height - pad - ((v - min) / (max - min)) * (height - pad * 2);
  const points = values.map((v, i) => [pad + i * stepX, scaleY(v)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area =
    `${pad},${height} ` +
    points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ") +
    ` ${(width - pad).toFixed(1)},${height}`;
  const gid = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.6" fill={color} />
    </svg>
  );
}
