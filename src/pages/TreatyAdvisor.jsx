// Treaty Advisor Page - AI-Powered Document Analysis
import { useState } from "react";
import { Layout, BentoCard, Button, Badge } from "../components/shared";
import { MECHANISMS } from "../vmfs-data";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function TreatyAdvisorPage({ theme, toggleTheme }) {
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            setResult(null);
            setError(null);
        }
    };

    const extractTextFromPdf = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            return fullText;
        } catch (err) {
            throw new Error(`PDF extraction failed: ${err.message}`);
        }
    };

    const analyzeDocument = async () => {
        if (!file) return;

        setAnalyzing(true);
        setError(null);

        try {
            // Extract text based on file type
            let text;
            if (file.type === 'application/pdf') {
                text = await extractTextFromPdf(file);
            } else {
                text = await file.text();
            }

            if (!text || text.trim().length < 50) {
                throw new Error("Document appears to be empty or too short");
            }

            // Call Gemini API
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are an AI governance expert analyzing treaty requirements.

Analyze this policy/treaty document and extract verification requirements:

${text.substring(0, 15000)}

Return ONLY valid JSON (no markdown, no backticks, no explanation) with this exact structure:
{
  "requirements": ["requirement 1", "requirement 2", "requirement 3"],
  "oovs_needed": ["compute", "lineage", "deployment", "post-training"],
  "priorities": ["technicalFeasibility", "politicalTractability"],
  "constraints": ["constraint 1", "constraint 2"]
}

Focus on concrete, actionable verification needs related to AI systems.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            // Parse JSON (remove markdown if present)
            const cleanJson = textResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .replace(/^[^{]*/, '')
                .replace(/[^}]*$/, '')
                .trim();
            
            const analysis = JSON.parse(cleanJson);

            // Validate structure
            if (!analysis.requirements || !Array.isArray(analysis.requirements)) {
                throw new Error("Invalid response format from AI");
            }

            // Match mechanisms
            const recommendations = matchMechanisms(analysis);

            setResult({ analysis, recommendations });
        } catch (err) {
            console.error("Analysis error:", err);
            setError(err.message || "Failed to analyze document. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const matchMechanisms = (analysis) => {
        const oovMapping = {
            "compute": "oov1_compute",
            "lineage": "oov2_lineage",
            "deployment": "oov3_deployment",
            "post-training": "oov4_post_training"
        };

        return MECHANISMS.map(m => {
            let score = 0;

            // Score based on OoV coverage (40%)
            const neededOovs = analysis.oovs_needed || [];
            const COVERAGE_MATRIX = window.COVERAGE_MATRIX || [];
            const cov = COVERAGE_MATRIX.find(c => c.mechanismId === m.id);

            if (cov && neededOovs.length > 0) {
                neededOovs.forEach(oov => {
                    const oovKey = oovMapping[oov];
                    if (oovKey && cov[oovKey]?.coverage === "primary") {
                        score += 40 / neededOovs.length;
                    } else if (oovKey && cov[oovKey]?.coverage === "partial") {
                        score += 20 / neededOovs.length;
                    }
                });
            } else {
                score += 20; // Default if no OoVs specified
            }

            // Score based on priority dimensions (40%)
            const priorities = analysis.priorities || ["technicalFeasibility", "politicalTractability"];
            const dimScore = priorities.reduce((sum, dim) => {
                return sum + (m.vmfsScores[dim] || 2.5);
            }, 0) / priorities.length;
            score += (dimScore / 5) * 40;

            // Constraint bonus (20%)
            score += 20;

            return {
                mechanism: m,
                score: Math.min(100, Math.round(score)),
                rationale: generateRationale(m, analysis)
            };
        }).sort((a, b) => b.score - a.score).slice(0, 3);
    };

    const generateRationale = (mechanism, analysis) => {
        const reasons = [];
        if (mechanism.vmfsScores.weightedAvg >= 3.5) {
            reasons.push("High overall feasibility");
        }
        if (mechanism.vmfsScores.politicalTractability >= 4.0) {
            reasons.push("Strong political support likely");
        }
        if (mechanism.vmfsScores.globalSouthAdoptability >= 3.5) {
            reasons.push("Accessible to Global South nations");
        }
        if (mechanism.vmfsScores.sovereigntyImpact >= 4.0) {
            reasons.push("Respects national sovereignty");
        }
        
        return reasons.length > 0 
            ? reasons.join(". ") + "." 
            : "Addresses key verification requirements effectively.";
    };

    return (
        <Layout theme={theme} toggleTheme={toggleTheme}>
            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "60px 24px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                    <Badge variant="accent">AI-Powered</Badge>
                    <h1 style={{
                        fontSize: "48px",
                        fontWeight: 700,
                        marginTop: "16px",
                        marginBottom: "16px",
                    }}>
                        Treaty Advisor
                    </h1>
                    <p style={{
                        fontSize: "18px",
                        color: "var(--text-secondary)",
                        maxWidth: "600px",
                        margin: "0 auto",
                        lineHeight: 1.7,
                    }}>
                        Upload a treaty or policy document to get AI-powered mechanism recommendations
                        tailored to your verification requirements.
                    </p>
                </div>

                {/* Upload Section */}
                <BentoCard hoverable={false} style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
                        Upload Document
                    </h3>

                    <div style={{
                        border: "2px dashed var(--border)",
                        borderRadius: "12px",
                        padding: "40px",
                        textAlign: "center",
                        marginBottom: "16px",
                        background: file ? "rgba(50, 215, 75, 0.05)" : "transparent",
                        transition: "all 0.3s ease",
                    }}>
                        <input
                            type="file"
                            accept=".txt,.md,.doc,.docx,.pdf"
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                                {file ? "✅" : "📄"}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                                {file ? file.name : "Click to upload document"}
                            </div>
                            <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                                Supports: PDF, TXT, MD, DOC, DOCX
                            </div>
                        </label>
                    </div>

                    {file && (
                        <Button
                            variant="primary"
                            onClick={analyzeDocument}
                            style={{ width: "100%" }}
                            disabled={analyzing}
                        >
                            {analyzing ? "🤖 Analyzing..." : "Analyze Document"}
                        </Button>
                    )}

                    {error && (
                        <div style={{
                            marginTop: "16px",
                            padding: "16px",
                            background: "rgba(255, 69, 58, 0.1)",
                            border: "1px solid rgba(255, 69, 58, 0.3)",
                            borderRadius: "8px",
                            color: "var(--red)",
                            fontSize: "14px",
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                </BentoCard>

                {/* Results */}
                {result && (
                    <>
                        {/* Requirements */}
                        <BentoCard hoverable={false} style={{ marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
                                📋 Requirements Identified
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {result.analysis.requirements.slice(0, 5).map((req, i) => (
                                    <div key={i} style={{
                                        padding: "12px",
                                        background: "var(--bg-card)",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        color: "var(--text)",
                                    }}>
                                        ✓ {req}
                                    </div>
                                ))}
                            </div>
                        </BentoCard>

                        {/* Recommendations */}
                        <div style={{ marginBottom: "16px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
                                🎯 Recommended Mechanisms
                            </h3>
                        </div>

                        {result.recommendations.map((rec, i) => (
                            <BentoCard key={i} hoverable={false} style={{ marginBottom: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                            <div style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "8px",
                                                background: i === 0 ? "var(--accent)" : "rgba(255,255,255,0.08)",
                                                color: i === 0 ? "var(--bg)" : "var(--text)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                fontWeight: 700,
                                            }}>
                                                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)" }}>
                                                    {rec.mechanism.shortName}
                                                </h4>
                                                <p style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                                                    Match Score: {rec.score}%
                                                </p>
                                            </div>
                                        </div>

                                        <p style={{
                                            fontSize: "14px",
                                            color: "var(--text-secondary)",
                                            lineHeight: 1.6,
                                            marginBottom: "12px",
                                        }}>
                                            {rec.mechanism.definition}
                                        </p>

                                        <div style={{
                                            padding: "12px",
                                            background: "rgba(50, 215, 75, 0.08)",
                                            borderRadius: "8px",
                                        }}>
                                            <div style={{
                                                fontSize: "11px",
                                                color: "var(--accent)",
                                                textTransform: "uppercase",
                                                marginBottom: "4px",
                                                fontWeight: 600,
                                            }}>
                                                Why Recommended
                                            </div>
                                            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                                {rec.rationale}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right", marginLeft: "20px" }}>
                                        <div style={{
                                            fontSize: "32px",
                                            fontWeight: 700,
                                            fontFamily: "var(--mono)",
                                            color: "var(--accent)",
                                        }}>
                                            {rec.mechanism.vmfsScores.weightedAvg.toFixed(1)}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                            Feasibility
                                        </div>
                                    </div>
                                </div>
                            </BentoCard>
                        ))}
                    </>
                )}

                {/* Example Documents */}
                {!result && !analyzing && (
                    <BentoCard hoverable={false}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "var(--text)" }}>
                            💡 Try These Examples
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {[
                                "Upload a treaty requiring compute verification above thresholds",
                                "Upload policy about model deployment restrictions",
                                "Upload agreement about post-training safety modifications",
                            ].map((ex, i) => (
                                <div key={i} style={{
                                    padding: "10px",
                                    fontSize: "13px",
                                    color: "var(--text-tertiary)",
                                }}>
                                    • {ex}
                                </div>
                            ))}
                        </div>
                    </BentoCard>
                )}
            </div>
        </Layout>
    );
}