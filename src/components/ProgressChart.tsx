type Point = { label: string; score: number };

/** Dependency-free SVG line chart of interview scores over time (oldest to newest). */
export default function ProgressChart({ points }: { points: Point[] }) {
  const w = 640;
  const h = 220;
  const pad = { top: 16, right: 16, bottom: 28, left: 32 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (score: number) => pad.top + innerH - (score / 100) * innerH;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.score)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`Scores over time: ${points.map((p) => p.score).join(", ")}`}>
      <defs>
        <linearGradient id="progress-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(167 139 250)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(167 139 250)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={w - pad.right} y1={y(v)} y2={y(v)} className="stroke-white/10" strokeDasharray={v === 0 ? undefined : "3 4"} />
          <text x={pad.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-zinc-500 text-[11px]">{v}</text>
        </g>
      ))}
      {points.length > 1 && <path d={area} fill="url(#progress-fill)" />}
      {points.length > 1 && <path d={line} fill="none" className="stroke-violet-300" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.score)} r="4.5" className="fill-zinc-950 stroke-violet-200" strokeWidth="2">
            <title>{`${p.label}: ${p.score}`}</title>
          </circle>
          {(i % labelEvery === 0 || i === points.length - 1) && (
            <text x={x(i)} y={h - 8} textAnchor="middle" className="fill-zinc-500 text-[11px]">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
