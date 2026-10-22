import { ImageResponse } from "next/og";
import { getSharedInterview } from "@/lib/interviews";
import { COMPETENCIES } from "@/lib/scorecard";

export const alt = "InterviewPilot interview scorecard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function color(score: number) {
  return score >= 80 ? "#6ee7b7" : score >= 60 ? "#fcd34d" : "#fda4af";
}

/** The preview card LinkedIn and other sites show when a scorecard link is posted. */
export default async function OpenGraphImage({ params }: { params: Promise<{ shareId: string }> }) {
  const row = await getSharedInterview((await params).shareId);
  const score = row?.overallScore ?? 0;
  const name = row?.setup.candidateName || "Candidate";
  const role = row?.roleTitle ?? "AI mock interview";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background: "radial-gradient(ellipse at top left, #4c1d95 0%, #09090b 60%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#c4b5fd" }}>
          <div style={{ display: "flex", width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg,#8b5cf6,#d946ef)", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 22 }}>
            IP
          </div>
          InterviewPilot · AI interview scorecard
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 64, marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300, height: 300, borderRadius: 300, border: `16px solid ${color(score)}` }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, lineHeight: 1 }}>{score}</div>
            <div style={{ display: "flex", fontSize: 26, color: "#a1a1aa" }}>out of 100</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>{name}</div>
            <div style={{ display: "flex", fontSize: 30, color: "#d4d4d8", marginBottom: 12 }}>{role.length > 48 ? `${role.slice(0, 45)}…` : role}</div>
            {row &&
              COMPETENCIES.map((c) => {
                const v = row.scorecard.competencies[c.key].score;
                return (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 22 }}>
                    <div style={{ display: "flex", width: 210, color: "#a1a1aa" }}>{c.label}</div>
                    <div style={{ display: "flex", flex: 1, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)" }}>
                      <div style={{ display: "flex", width: `${v}%`, height: 14, borderRadius: 7, background: color(v) }} />
                    </div>
                    <div style={{ display: "flex", width: 44, textAlign: "right", fontWeight: 700 }}>{v}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
