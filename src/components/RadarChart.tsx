type Axis = { label: string; value: number };

/** Dependency-free SVG radar chart for 0-100 scores. */
export default function RadarChart({ axes, size = 300 }: { axes: Axis[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 56;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const point = (i: number, value: number) => {
    const d = (r * value) / 100;
    return [c + d * Math.cos(angle(i)), c + d * Math.sin(angle(i))] as const;
  };
  const ring = (v: number) => axes.map((_, i) => point(i, v).join(",")).join(" ");
  const shape = axes.map((a, i) => point(i, a.value).join(",")).join(" ");

  return (
    <svg
      viewBox={`-48 -8 ${size + 96} ${size + 16}`}
      className="h-auto w-full max-w-[380px] overflow-visible"
      role="img"
      aria-label={axes.map((a) => `${a.label} ${a.value}`).join(", ")}
    >
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(232 121 249)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {[25, 50, 75, 100].map((v) => (
        <polygon key={v} points={ring(v)} className="fill-none stroke-white/10" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-white/10" strokeWidth="1" />;
      })}
      <polygon points={shape} fill="url(#radar-fill)" className="stroke-fuchsia-300" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = point(i, a.value);
        return <circle key={i} cx={x} cy={y} r="3.5" className="fill-white" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, 128);
        const anchor = Math.abs(x - c) < 4 ? "middle" : x > c ? "start" : "end";
        return (
          <text key={a.label} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-zinc-300 text-[13px]">
            <tspan x={x} dy="-0.5em">{a.label}</tspan>
            <tspan x={x} dy="1.25em" className="fill-white text-[14px] font-semibold">{a.value}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
