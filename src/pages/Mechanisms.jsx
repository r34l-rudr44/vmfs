// Mechanisms Page - Detailed List of All Mechanisms with New Scoring
import { useState, useMemo } from "react";
import { Layout, BentoCard, SectionHeader, Badge } from "../components/shared";
import { MECHANISMS, OOVS, COVERAGE_MATRIX, SCORE_DIMENSIONS, EVIDENCE_LOCATIONS } from "../vmfs-data";

// Mechanism Detail Modal
function MechanismModal({ mechanism, isOpen, onClose }) {
  if (!mechanism || !isOpen) return null;

  const cov = COVERAGE_MATRIX.find((c) => c.mechanismId === mechanism.id);
  const oovKeys = ["oov1_compute", "oov2_lineage", "oov3_deployment", "oov4_post_training"];
  
  const avgNewScore = mechanism.newScores
    ? (mechanism.newScores.hardness + mechanism.newScores.burden + mechanism.newScores.intrusion + mechanism.newScores.robustness) / 4
    : 3.0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: "900px",
          maxHeight: "85vh",
          background: "var(--bg-elevated)",
          borderRadius: "24px",
          border: "1px solid var(--border)",
          overflow: "hidden",
          zIndex: 101,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px",
            paddingRight: "60px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
          }}
        >
          <div style={{ flex: 1, paddingRight: "20px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>{mechanism.shortName}</h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "500px", lineHeight: 1.6 }}>
              {mechanism.definition}
            </p>
            {mechanism.evidenceLocations && (
              <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
                {mechanism.evidenceLocations.map(loc => {
                  const locObj = Object.values(EVIDENCE_LOCATIONS).find(l => l.id === loc);
                  return (
                    <span key={loc} style={{
                      padding: "4px 10px",
                      background: "rgba(50, 215, 75, 0.1)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "var(--accent)",
                    }}>
                      {locObj?.name?.split('/')[0]?.trim() || loc}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right", minWidth: "100px" }}>
            <div
              style={{
                fontSize: "42px",
                fontWeight: 700,
                fontFamily: "var(--mono)",
                color: avgNewScore >= 3.5 ? "var(--accent)" : avgNewScore >= 2.5 ? "var(--orange)" : "var(--red)",
                lineHeight: 1,
              }}
            >
              {avgNewScore.toFixed(1)}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", marginTop: "4px" }}>Composite Score</div>
          </div>

          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            x
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "calc(85vh - 140px)" }}>
          {/* New 4-Dimension Scores */}
          <div style={{ marginBottom: "28px" }}>
            <h4 style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
              Dimension Scores
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              {Object.entries(SCORE_DIMENSIONS).map(([key, dim]) => {
                const score = mechanism.newScores?.[key] || 3;
                return (
                  <div key={key} style={{ padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>{dim.name}</div>
                    <div style={{ fontSize: "10px", color: dim.color, marginBottom: "12px" }}>{dim.question}</div>
                    <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--mono)", color: dim.color }}>
                      {score.toFixed(1)}
                    </div>
                    <div style={{ marginTop: "8px", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                      <div style={{
                        height: "100%",
                        width: `${(score / 5) * 100}%`,
                        background: dim.color,
                        borderRadius: "2px",
                      }} />
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "8px" }}>
                      {dim.labels[Math.round(score) >= 4 ? 5 : Math.round(score) >= 2 ? 3 : 1]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Produced & What It Needs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
            <div>
              <h4 style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                Evidence Produced
              </h4>
              <div style={{ padding: "16px", background: "rgba(50, 215, 75, 0.05)", border: "1px solid rgba(50, 215, 75, 0.1)", borderRadius: "12px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {mechanism.evidenceProduced || mechanism.evidenceProducedList?.[0] || "N/A"}
                </p>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                What It Needs
              </h4>
              <div style={{ padding: "16px", background: "rgba(10, 132, 255, 0.05)", border: "1px solid rgba(10, 132, 255, 0.1)", borderRadius: "12px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {mechanism.whatItNeeds || mechanism.dependencies?.[0] || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* OoV Coverage */}
          <div style={{ marginBottom: "28px" }}>
            <h4 style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>
              Verification Coverage
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {OOVS.map((oov, i) => {
                const cell = cov?.[oovKeys[i]];
                const isPrimary = cell?.coverage === "primary";
                const isPartial = cell?.coverage === "partial";

                return (
                  <div key={oov.id} style={{
                    padding: "14px",
                    background: isPrimary ? "rgba(50, 215, 75, 0.08)" : isPartial ? "rgba(10, 132, 255, 0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isPrimary ? "rgba(50, 215, 75, 0.2)" : isPartial ? "rgba(10, 132, 255, 0.2)" : "var(--border)"}`,
                    borderRadius: "10px",
                    textAlign: "center",
                  }}>
                    <span style={{ fontSize: "18px", color: isPrimary ? "var(--accent)" : isPartial ? "var(--blue)" : "var(--text-tertiary)" }}>
                      {isPrimary ? "Y" : isPartial ? "-" : "X"}
                    </span>
                    <div style={{ fontSize: "12px", marginTop: "6px" }}>{oov.shortName}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                      {isPrimary ? "Primary" : isPartial ? "Partial" : "None"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Limitations & Evasion */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <h4 style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                Biggest Limitation
              </h4>
              <div style={{ padding: "16px", background: "rgba(255, 69, 58, 0.05)", border: "1px solid rgba(255, 69, 58, 0.1)", borderRadius: "12px" }}>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {mechanism.biggestLimitation || mechanism.limitations?.primary}
                </p>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: "11px", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                Evasion Vectors
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {mechanism.evasionModes?.map((e, i) => (
                  <Badge key={i} variant="default">{e}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Main Page
export default function MechanismsPage({ theme, toggleTheme }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("composite");
  const [selectedMechanism, setSelectedMechanism] = useState(null);

  const isLight = theme === "light";

  const sorted = useMemo(() => {
    let filtered = [...MECHANISMS];

    if (search) {
      filtered = filtered.filter(
        (m) => m.shortName.toLowerCase().includes(search.toLowerCase()) || m.mechanism.toLowerCase().includes(search.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aNewScore = a.newScores ? (a.newScores.hardness + a.newScores.burden + a.newScores.intrusion + a.newScores.robustness) / 4 : 0;
      const bNewScore = b.newScores ? (b.newScores.hardness + b.newScores.burden + b.newScores.intrusion + b.newScores.robustness) / 4 : 0;
      
      if (sortBy === "composite") return bNewScore - aNewScore;
      if (sortBy === "hardness") return (b.newScores?.hardness || 0) - (a.newScores?.hardness || 0);
      if (sortBy === "burden") return (b.newScores?.burden || 0) - (a.newScores?.burden || 0);
      if (sortBy === "intrusion") return (b.newScores?.intrusion || 0) - (a.newScores?.intrusion || 0);
      if (sortBy === "robustness") return (b.newScores?.robustness || 0) - (a.newScores?.robustness || 0);
      if (sortBy === "name") return a.shortName.localeCompare(b.shortName);
      return 0;
    });

    return filtered;
  }, [search, sortBy]);

  const oovKeys = ["oov1_compute", "oov2_lineage", "oov3_deployment", "oov4_post_training"];

  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 24px" }}>
        <SectionHeader 
          label="Analysis" 
          title="All Mechanisms" 
          subtitle={`${MECHANISMS.length} verification mechanisms evaluated across 4 dimensions: Evidence Hardness, Infrastructure Burden, Intrusion Level, and Evasion Robustness`} 
        />

        {/* Controls */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search mechanisms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--text)",
              fontSize: "14px",
              outline: "none",
            }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "12px 16px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--text)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <option value="composite" style={{ color: isLight ? "#111" : "var(--text)", background: isLight ? "#fff" : "#111" }}>
              Sort: Composite Score
            </option>
            <option value="hardness" style={{ color: isLight ? "#111" : "var(--text)", background: isLight ? "#fff" : "#111" }}>
              Sort: Hardness (Trust)
            </option>
            <option value="burden" style={{ color: isLight ? "#111" : "var(--text)", background: isLight ? "#fff" : "#111" }}>
              Sort: Burden (Cost)
            </option>
            <option value="intrusion" style={{ color: isLight ? "#111" : "var(--text)", background: isLight ? "#fff" : "#111" }}>
              Sort: Intrusion (Friction)
            </option>
            <option value="robustness" style={{ color: isLight ? "#111" : "var(--text)", background: isLight ? "#fff" : "#111" }}>
              Sort: Robustness (Cheating)
            </option>
            <option value="name" style={{ color: isLight ? "#111" : "var(--text)", background: isLight ? "#fff" : "#111" }}>
              Sort: Name
            </option>
          </select>
        </div>

        {/* Mechanisms Table */}
        <BentoCard hoverable={false} style={{ padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1.2fr 70px 70px 70px 70px 70px 100px",
              gap: "12px",
              padding: "16px 20px",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid var(--border)",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <div>#</div>
            <div>Mechanism</div>
            <div style={{ textAlign: "center" }}>Hard.</div>
            <div style={{ textAlign: "center" }}>Burd.</div>
            <div style={{ textAlign: "center" }}>Intr.</div>
            <div style={{ textAlign: "center" }}>Rob.</div>
            <div style={{ textAlign: "center" }}>Avg</div>
            <div style={{ textAlign: "center" }}>Coverage</div>
          </div>

          {/* Rows */}
          {sorted.map((m, i) => {
            const cov = COVERAGE_MATRIX.find((c) => c.mechanismId === m.id);
            const primaryCount = oovKeys.filter((k) => cov?.[k]?.coverage === "primary").length;
            const partialCount = oovKeys.filter((k) => cov?.[k]?.coverage === "partial").length;
            const avgScore = m.newScores
              ? (m.newScores.hardness + m.newScores.burden + m.newScores.intrusion + m.newScores.robustness) / 4
              : 3.0;

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMechanism(m)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1.2fr 70px 70px 70px 70px 70px 100px",
                  gap: "12px",
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: i < 3 ? "var(--accent)" : "rgba(255,255,255,0.06)",
                  color: i < 3 ? "var(--bg)" : "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                }}>
                  {i + 1}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{m.shortName}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {m.evidenceLocations?.map(loc => {
                      const locObj = Object.values(EVIDENCE_LOCATIONS).find(l => l.id === loc);
                      return locObj?.name?.split('/')[0]?.trim() || loc;
                    }).join(', ')}
                  </div>
                </div>

                <div style={{ textAlign: "center", fontFamily: "var(--mono)", color: SCORE_DIMENSIONS.hardness.color }}>
                  {(m.newScores?.hardness || 3).toFixed(1)}
                </div>
                <div style={{ textAlign: "center", fontFamily: "var(--mono)", color: SCORE_DIMENSIONS.burden.color }}>
                  {(m.newScores?.burden || 3).toFixed(1)}
                </div>
                <div style={{ textAlign: "center", fontFamily: "var(--mono)", color: SCORE_DIMENSIONS.intrusion.color }}>
                  {(m.newScores?.intrusion || 3).toFixed(1)}
                </div>
                <div style={{ textAlign: "center", fontFamily: "var(--mono)", color: SCORE_DIMENSIONS.robustness.color }}>
                  {(m.newScores?.robustness || 3).toFixed(1)}
                </div>

                <div style={{
                  textAlign: "center",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: avgScore >= 3.5 ? "var(--accent)" : avgScore >= 2.5 ? "var(--orange)" : "var(--red)",
                }}>
                  {avgScore.toFixed(1)}
                </div>

                <div style={{ textAlign: "center" }}>
                  <span style={{ color: "var(--accent)", marginRight: "6px" }}>Y{primaryCount}</span>
                  <span style={{ color: "var(--blue)" }}>-{partialCount}</span>
                </div>
              </div>
            );
          })}
        </BentoCard>

        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-tertiary)" }}>
            No mechanisms found matching your search.
          </div>
        )}
      </div>

      <MechanismModal mechanism={selectedMechanism} isOpen={!!selectedMechanism} onClose={() => setSelectedMechanism(null)} />
    </Layout>
  );
}
