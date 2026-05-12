// Lightweight, dependency-free SVG charts tailored for the CafeConnect dashboard.

export function Sparkline({
  values,
  width = 100,
  height = 36,
  stroke = "var(--color-primary)",
  fill = "rgba(30, 57, 50, 0.1)",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });
  const path = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${width} ${height} L0 ${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2.5"
        fill={stroke}
      />
    </svg>
  );
}

export type DonutSlice = { label: string; value: number; color: string };

export function Donut({
  slices,
  size = 160,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const r = size / 2;
  const cx = r;
  const cy = r;
  const innerR = r - thickness;

  let acc = 0;
  const paths = slices.map((s) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    const large = end - start > Math.PI ? 1 : 0;
    const d = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      "Z",
    ].join(" ");
    return { d, color: s.color, key: s.label };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill={p.color} />
        ))}
        {(centerValue || centerLabel) && (
          <>
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontWeight="700"
              fontSize="22"
              fill="var(--color-primary)"
            >
              {centerValue}
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              fontSize="9"
              letterSpacing="1.5"
              fill="var(--color-muted)"
              style={{ textTransform: "uppercase" }}
            >
              {centerLabel}
            </text>
          </>
        )}
      </svg>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[var(--color-muted)]">{s.label}</span>
            <span className="font-semibold text-[var(--color-primary)]">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HourlyBars({
  values,
  labels,
  height = 120,
  barColor = "var(--color-primary)",
  highlightColor = "var(--color-accent)",
  highlightIndex,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  barColor?: string;
  highlightColor?: string;
  highlightIndex?: number;
}) {
  const max = Math.max(...values, 1);
  const n = values.length;
  const gap = 4;
  const W = 480;
  const barW = (W - gap * (n - 1)) / n;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${height + 18}`}
      preserveAspectRatio="none"
      className="block"
      aria-hidden
    >
      {values.map((v, i) => {
        const h = (v / max) * height;
        const x = i * (barW + gap);
        const y = height - h;
        const isHi = i === highlightIndex;
        return (
          <g key={i}>
            <rect
              x={x}
              y={height}
              width={barW}
              height={0}
              rx={4}
              fill={isHi ? highlightColor : barColor}
              opacity={isHi ? 1 : 0.85}
            >
              <animate
                attributeName="y"
                from={height}
                to={y}
                dur="0.7s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.22 0.61 0.36 1"
              />
              <animate
                attributeName="height"
                from="0"
                to={h}
                dur="0.7s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.22 0.61 0.36 1"
              />
            </rect>
            {labels && labels[i] && (
              <text
                x={x + barW / 2}
                y={height + 12}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-muted)"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
