// Treaty Advisor Page - AI-Powered Document Analysis with Verification Architect
import { useState } from "react";
import { Layout, BentoCard, Button, Badge } from "../components/shared";
import { MECHANISMS, COVERAGE_MATRIX, SCORE_DIMENSIONS, EVIDENCE_LOCATIONS, VERIFICATION_GOALS } from "../vmfs-data";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use unpkg CDN for reliability
const PDFJS_VERSION = pdfjsLib.version;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

// ============================================================================
// VERIFICATION ARCHITECT SYSTEM PROMPT
// ============================================================================
const VERIFICATION_ARCHITECT_PROMPT = `You are the "Verification Architect" - a Technical Auditor for international treaty verification.
Your Goal: Help users build a robust treaty verification regime.
Your Persona: You care about "Proof" and "Cost." You are precise, cite specific scores, and focus on trade-offs.

KNOWLEDGE BASE - You have access to these mechanism scores:

${MECHANISMS.map(m => `${m.shortName}:
  - Hardness (Trust): ${m.newScores?.hardness || 'N/A'}/5 - Is evidence physics-based or human trust?
  - Burden (Cost): ${m.newScores?.burden || 'N/A'}/5 - Infrastructure needed (5=law only, 1=new hardware)
  - Intrusion (Friction): ${m.newScores?.intrusion || 'N/A'}/5 - IP/privacy exposure (5=external, 1=deep access)
  - Robustness (Cheating): ${m.newScores?.robustness || 'N/A'}/5 - Evasion difficulty
  - Evidence Location: ${m.evidenceLocations?.join(', ') || 'N/A'}
  - Evidence Produced: ${m.evidenceProduced || 'N/A'}
  - Biggest Limitation: ${m.biggestLimitation || m.limitations?.primary || 'N/A'}`).join('\n\n')}

RULES:
1. Always cite specific scores (e.g., "I recommend Remote Sensing because it has High Intrusion score (5.0) meaning zero IP exposure.")
2. Focus on trade-offs (e.g., "This tool has strong trust evidence, but requires significant infrastructure investment.")
3. Use the Evidence Location to explain WHERE the tool looks.
4. When recommending portfolios, check for blind spots - especially chip-level coverage.
5. Be concise and actionable. You are a technical auditor, not a diplomat.`;

// ============================================================================
// QUICK CHIP PROMPTS
// ============================================================================
const QUICK_PROMPTS = [
    { label: "High-trust mechanism", prompt: "Find me a high-trust (Hardness > 4) mechanism that produces physics-based evidence." },
    { label: "Cheapest verification", prompt: "What is the cheapest (highest Burden score) way to verify compute usage?" },
    { label: "Why high intrusion?", prompt: "Why does Third-Party Audits have a low Intrusion score? What data does it expose?" },
    { label: "Portfolio for compute", prompt: "Build me a portfolio to verify compute usage with redundant verification paths." },
    { label: "Blind spot analysis", prompt: "What are the critical blind spots if I only use Remote Sensing and Declaration Regimes?" },
    { label: "Global South friendly", prompt: "Which mechanisms are most accessible for Global South nations with limited infrastructure?" },
];

export default function TreatyAdvisorPage({ theme, toggleTheme }) {
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [extractedText, setExtractedText] = useState(null);
    const [generatingOnePager, setGeneratingOnePager] = useState(false);
    const [onePager, setOnePager] = useState(null);
    
    // Chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    
    // Crowdsourcing state
    const [newMechanismInput, setNewMechanismInput] = useState("");
    const [newMechanismResult, setNewMechanismResult] = useState(null);
    const [scoringNewMechanism, setScoringNewMechanism] = useState(false);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            setResult(null);
            setError(null);
            setExtractedText(null);
            setOnePager(null);
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
            let text;
            if (file.type === 'application/pdf') {
                text = await extractTextFromPdf(file);
            } else {
                text = await file.text();
            }

            if (!text || text.trim().length < 50) {
                throw new Error("Document appears to be empty or too short");
            }

            setExtractedText(text);

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `You are a Verification Architect analyzing treaty requirements.

Analyze this policy/treaty document and extract verification requirements:

${text.substring(0, 15000)}

Return ONLY valid JSON (no markdown, no backticks, no explanation) with this exact structure:
{
  "requirements": ["requirement 1", "requirement 2", "requirement 3"],
  "evidence_locations_needed": ["chip_hardware", "data_center", "institutional"],
  "verification_goals": ["goal description 1", "goal description 2"],
  "priorities": {
    "trust_importance": "high/medium/low",
    "cost_sensitivity": "high/medium/low",
    "privacy_concerns": "high/medium/low"
  },
  "constraints": ["constraint 1", "constraint 2"]
}

Focus on concrete, actionable verification needs related to AI systems. Map requirements to evidence locations where possible.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            const cleanJson = textResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .replace(/^[^{]*/, '')
                .replace(/[^}]*$/, '')
                .trim();
            
            const analysis = JSON.parse(cleanJson);

            if (!analysis.requirements || !Array.isArray(analysis.requirements)) {
                throw new Error("Invalid response format from AI");
            }

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
        return MECHANISMS.map(m => {
            let score = 0;

            // Score based on evidence location match (40%)
            const neededLocations = analysis.evidence_locations_needed || [];
            if (neededLocations.length > 0 && m.evidenceLocations) {
                const matchCount = m.evidenceLocations.filter(loc => neededLocations.includes(loc)).length;
                score += (matchCount / neededLocations.length) * 40;
            } else {
                score += 20;
            }

            // Score based on priorities (40%)
            const priorities = analysis.priorities || {};
            if (m.newScores) {
                if (priorities.trust_importance === 'high') {
                    score += (m.newScores.hardness / 5) * 15;
                }
                if (priorities.cost_sensitivity === 'high') {
                    score += (m.newScores.burden / 5) * 15;
                }
                if (priorities.privacy_concerns === 'high') {
                    score += (m.newScores.intrusion / 5) * 10;
                }
            }

            // Base mechanism quality (20%)
            if (m.newScores) {
                const avgScore = (m.newScores.hardness + m.newScores.burden + m.newScores.intrusion + m.newScores.robustness) / 4;
                score += (avgScore / 5) * 20;
            }

            return {
                mechanism: m,
                score: Math.min(100, Math.round(score)),
                rationale: generateRationale(m, analysis)
            };
        }).sort((a, b) => b.score - a.score).slice(0, 3);
    };

    const generateRationale = (mechanism, analysis) => {
        const reasons = [];
        const scores = mechanism.newScores;
        
        if (scores) {
            if (scores.hardness >= 4.0) {
                reasons.push(`High trust evidence (Hardness: ${scores.hardness})`);
            }
            if (scores.burden >= 4.0) {
                reasons.push(`Low infrastructure cost (Burden: ${scores.burden})`);
            }
            if (scores.intrusion >= 4.0) {
                reasons.push(`Minimal IP exposure (Intrusion: ${scores.intrusion})`);
            }
            if (scores.robustness >= 3.5) {
                reasons.push(`Resistant to evasion (Robustness: ${scores.robustness})`);
            }
        }
        
        if (mechanism.evidenceLocations?.length) {
            const locations = mechanism.evidenceLocations.map(loc => {
                const locObj = Object.values(EVIDENCE_LOCATIONS).find(l => l.id === loc);
                return locObj?.name?.split('/')[0]?.trim() || loc;
            });
            reasons.push(`Monitors: ${locations.join(', ')}`);
        }
        
        return reasons.length > 0 
            ? reasons.join('. ') + '.' 
            : "Addresses key verification requirements effectively.";
    };

    // Chat with Verification Architect
    const sendChatMessage = async (messageText = null) => {
        const message = messageText || chatInput.trim();
        if (!message) return;

        const userMessage = { role: 'user', content: message };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput("");
        setChatLoading(true);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const conversationHistory = chatMessages.map(m => 
                `${m.role === 'user' ? 'User' : 'Verification Architect'}: ${m.content}`
            ).join('\n\n');

            const prompt = `${VERIFICATION_ARCHITECT_PROMPT}

Previous conversation:
${conversationHistory}

User: ${message}

Respond as the Verification Architect. Be precise, cite scores, and focus on trade-offs.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const assistantMessage = { role: 'assistant', content: response.text() };
            
            setChatMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error("Chat error:", err);
            setChatMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "I encountered an error processing your request. Please try again." 
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Crowdsourcing: Score new mechanism idea
    const scoreNewMechanism = async () => {
        if (!newMechanismInput.trim()) return;

        setScoringNewMechanism(true);
        setNewMechanismResult(null);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `You are the VMFS Scorer (Verification Mechanism Feasibility Scorer).

Analyze this new mechanism idea and score it:

"${newMechanismInput}"

Return ONLY valid JSON with this structure:
{
  "mechanism_name": "extracted name",
  "evidence_location": "one of: chip_hardware, data_center, supply_chain, developer_lab, institutional, model_registry, deployment_point",
  "scores": {
    "hardness": 1.0-5.0,
    "burden": 1.0-5.0,
    "intrusion": 1.0-5.0,
    "robustness": 1.0-5.0
  },
  "rationale": {
    "hardness": "quote or reasoning",
    "burden": "quote or reasoning",
    "intrusion": "quote or reasoning",
    "robustness": "quote or reasoning"
  },
  "evidence_produced": "what proof it provides",
  "biggest_limitation": "main weakness",
  "missing_data_warning": true/false
}

SCORING RULES:
- Hardness: 5=physics/crypto, 3=digital/mutable, 1=human testimony
- Burden: 5=policy/software only, 3=commercial/cloud, 1=new hardware
- Intrusion: 5=external/aggregate, 3=metadata/API, 1=deep IP access
- Robustness: 5=airtight, 3=costly evasion, 1=known gaps`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            const cleanJson = textResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .replace(/^[^{]*/, '')
                .replace(/[^}]*$/, '')
                .trim();

            const scored = JSON.parse(cleanJson);
            setNewMechanismResult(scored);
        } catch (err) {
            console.error("Scoring error:", err);
            setError("Failed to score mechanism. Please try again.");
        } finally {
            setScoringNewMechanism(false);
        }
    };

    const generateOnePager = async () => {
        if (!extractedText || !result) return;

        setGeneratingOnePager(true);
        setError(null);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const treatyName = file?.name?.replace(/\.[^/.]+$/, "") || "Treaty";

            const prompt = `You are the Verification Architect generating an executive brief.

DOCUMENT NAME: ${treatyName}

DOCUMENT TEXT:
${extractedText.substring(0, 20000)}

ANALYSIS RESULTS:
- Requirements: ${result.analysis.requirements?.join(', ')}
- Evidence Locations: ${result.analysis.evidence_locations_needed?.join(', ')}
- Top Recommendations: ${result.recommendations.map(r => r.mechanism.shortName).join(', ')}

Generate a structured one-page brief in MARKDOWN format:

# ${treatyName} - Verification Brief

## Overview
[2-3 sentence summary]

## Verification Requirements
| Requirement | Evidence Location | Priority |
|-------------|------------------|----------|
(4-6 requirements)

## Recommended Mechanisms
1. **[Name]** (Score: X.X) - [Why recommended with dimension scores]
2. **[Name]** (Score: X.X) - [Why recommended]
3. **[Name]** (Score: X.X) - [Why recommended]

## Dimension Analysis
| Dimension | Portfolio Avg | Interpretation |
|-----------|--------------|----------------|
| Hardness (Trust) | X.X | [Assessment] |
| Burden (Cost) | X.X | [Assessment] |
| Intrusion (Friction) | X.X | [Assessment] |
| Robustness (Cheating) | X.X | [Assessment] |

## Blind Spot Analysis
[Critical gaps in the verification portfolio]

## Implementation Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

---
*Generated by VMFS Verification Architect*`;

            const genResult = await model.generateContent(prompt);
            const response = await genResult.response;
            setOnePager(response.text());
        } catch (err) {
            console.error("One-pager generation error:", err);
            setError("Failed to generate one-pager: " + err.message);
        } finally {
            setGeneratingOnePager(false);
        }
    };

    const downloadOnePager = (format) => {
        if (!onePager) return;
        const treatyName = file?.name?.replace(/\.[^/.]+$/, "") || "Treaty";
        
        if (format === 'md') {
            const blob = new Blob([onePager], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${treatyName}_Verification_Brief.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <Layout theme={theme} toggleTheme={toggleTheme}>
            <div style={{ 
                maxWidth: "1200px", 
                margin: "0 auto", 
                padding: "60px 24px",
                position: "relative",
            }}>
                {/* Background gradient */}
                <div style={{
                    position: "absolute",
                    top: "10%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "700px",
                    height: "500px",
                    background: theme === 'light'
                        ? "radial-gradient(ellipse, rgba(30, 64, 175, 0.08) 0%, transparent 70%)"
                        : "radial-gradient(ellipse, rgba(50, 215, 75, 0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                    zIndex: 0,
                }} />

                {/* Header */}
                <div style={{ 
                    textAlign: "center", 
                    marginBottom: "48px",
                    position: "relative",
                    zIndex: 1,
                }}>
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        background: theme === 'light'
                            ? "rgba(30, 64, 175, 0.1)"
                            : "rgba(50, 215, 75, 0.08)",
                        border: theme === 'light'
                            ? "1px solid rgba(30, 64, 175, 0.2)"
                            : "1px solid rgba(50, 215, 75, 0.15)",
                        borderRadius: "100px",
                        marginBottom: "20px",
                    }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
                        <span style={{ fontSize: "12px", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            Verification Architect
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: "clamp(32px, 5vw, 48px)",
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                        marginBottom: "16px",
                    }}>
                        Treaty Verification<br />
                        <span style={{ color: "var(--accent)" }}>Advisor</span>
                    </h1>
                    <p style={{
                        fontSize: "16px",
                        color: "var(--text-secondary)",
                        maxWidth: "600px",
                        margin: "0 auto",
                        lineHeight: 1.6,
                    }}>
                        I help you build robust treaty verification regimes. I care about Proof and Cost.
                        Ask me about mechanisms, trade-offs, or analyze your treaty documents.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", position: "relative", zIndex: 1 }}>
                    {/* Left Column - Document Analysis & Crowdsourcing */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {/* Document Upload */}
                        <BentoCard hoverable={false}>
                            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                                Document Analysis
                            </h3>
                            
                            <div style={{
                                border: file ? "2px solid var(--accent)" : "2px dashed var(--border)",
                                borderRadius: "12px",
                                padding: "32px 24px",
                                textAlign: "center",
                                marginBottom: "16px",
                                background: file ? "rgba(50, 215, 75, 0.05)" : "transparent",
                            }}>
                                <input
                                    type="file"
                                    accept=".txt,.md,.doc,.docx,.pdf"
                                    onChange={handleFileUpload}
                                    style={{ display: "none" }}
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                                        {file ? file.name : "Upload treaty document"}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                                        {file ? "Ready for analysis" : "PDF, TXT, MD supported"}
                                    </div>
                                </label>
                            </div>

                            {file && !result && (
                                <Button
                                    variant="primary"
                                    onClick={analyzeDocument}
                                    style={{ width: "100%" }}
                                    disabled={analyzing}
                                >
                                    {analyzing ? "Analyzing..." : "Analyze Document"}
                                </Button>
                            )}

                            {result && (
                                <div style={{ marginTop: "16px" }}>
                                    <div style={{ fontSize: "12px", color: "var(--accent)", marginBottom: "8px" }}>
                                        Analysis Complete
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <Button variant="primary" onClick={generateOnePager} disabled={generatingOnePager} style={{ flex: 1 }}>
                                            {generatingOnePager ? "Generating..." : "Generate Brief"}
                                        </Button>
                                        {onePager && (
                                            <Button variant="secondary" onClick={() => downloadOnePager('md')}>
                                                Download
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </BentoCard>

                        {/* Recommendations */}
                        {result && (
                            <BentoCard hoverable={false}>
                                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                                    Recommended Mechanisms
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {result.recommendations.map((rec, i) => {
                                        const avgScore = rec.mechanism.newScores 
                                            ? (rec.mechanism.newScores.hardness + rec.mechanism.newScores.burden + rec.mechanism.newScores.intrusion + rec.mechanism.newScores.robustness) / 4 
                                            : 3;
                                        return (
                                            <div key={i} style={{
                                                padding: "12px",
                                                background: "rgba(50, 215, 75, 0.06)",
                                                border: "1px solid rgba(50, 215, 75, 0.15)",
                                                borderRadius: "10px",
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                    <span style={{ fontWeight: 600, fontSize: "14px" }}>
                                                        #{i + 1} {rec.mechanism.shortName}
                                                    </span>
                                                    <span style={{ fontFamily: "var(--mono)", color: "var(--accent)", fontWeight: 700 }}>
                                                        {avgScore.toFixed(1)}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                                    {rec.rationale}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </BentoCard>
                        )}

                        {/* Crowdsourcing - Add New Mechanism */}
                        <BentoCard hoverable={false}>
                            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                                Test New Mechanism Idea
                            </h3>
                            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                                Describe a new verification mechanism and get it scored against the framework
                            </p>
                            
                            <textarea
                                value={newMechanismInput}
                                onChange={(e) => setNewMechanismInput(e.target.value)}
                                placeholder="e.g., A global registry of AI researchers where all individuals working on frontier AI must register their credentials and affiliations..."
                                style={{
                                    width: "100%",
                                    height: "100px",
                                    padding: "12px",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "10px",
                                    color: "var(--text)",
                                    fontSize: "13px",
                                    resize: "none",
                                    marginBottom: "12px",
                                }}
                            />
                            
                            <Button
                                variant="primary"
                                onClick={scoreNewMechanism}
                                disabled={scoringNewMechanism || !newMechanismInput.trim()}
                                style={{ width: "100%" }}
                            >
                                {scoringNewMechanism ? "Scoring..." : "Score This Mechanism"}
                            </Button>

                            {newMechanismResult && (
                                <div style={{ marginTop: "16px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                                    <div style={{ fontWeight: 600, marginBottom: "8px", color: "var(--accent)" }}>
                                        {newMechanismResult.mechanism_name}
                                    </div>
                                    
                                    {/* Score radar mini */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
                                        {Object.entries(newMechanismResult.scores || {}).map(([key, value]) => {
                                            const dim = SCORE_DIMENSIONS[key];
                                            return (
                                                <div key={key} style={{ textAlign: "center", padding: "8px", background: `${dim?.color}15`, borderRadius: "8px" }}>
                                                    <div style={{ fontSize: "18px", fontWeight: 700, color: dim?.color }}>{value.toFixed(1)}</div>
                                                    <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>{dim?.shortName || key}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                                        <strong>Evidence:</strong> {newMechanismResult.evidence_produced}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--red)" }}>
                                        <strong>Limitation:</strong> {newMechanismResult.biggest_limitation}
                                    </div>
                                    
                                    {newMechanismResult.missing_data_warning && (
                                        <div style={{ marginTop: "8px", padding: "8px", background: "rgba(255, 159, 10, 0.1)", borderRadius: "6px", fontSize: "11px", color: "var(--orange)" }}>
                                            Note: Some scores defaulted to 3.0 due to insufficient detail in description.
                                        </div>
                                    )}
                                </div>
                            )}
                        </BentoCard>
                    </div>

                    {/* Right Column - Chat Interface */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <BentoCard hoverable={false} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                                Ask the Verification Architect
                            </h3>

                            {/* Quick Prompts */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                                {QUICK_PROMPTS.map((qp, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendChatMessage(qp.prompt)}
                                        disabled={chatLoading}
                                        style={{
                                            padding: "6px 12px",
                                            background: "rgba(50, 215, 75, 0.08)",
                                            border: "1px solid rgba(50, 215, 75, 0.2)",
                                            borderRadius: "16px",
                                            fontSize: "11px",
                                            color: "var(--accent)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {qp.label}
                                    </button>
                                ))}
                            </div>

                            {/* Chat Messages */}
                            <div style={{ 
                                flex: 1, 
                                minHeight: "300px",
                                maxHeight: "400px",
                                overflowY: "auto", 
                                marginBottom: "16px",
                                padding: "12px",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: "10px",
                            }}>
                                {chatMessages.length === 0 ? (
                                    <div style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "40px 20px" }}>
                                        <div style={{ fontSize: "32px", marginBottom: "12px" }}>?</div>
                                        <div style={{ fontSize: "14px" }}>Ask me about verification mechanisms</div>
                                        <div style={{ fontSize: "12px", marginTop: "4px" }}>
                                            I will cite specific scores and focus on trade-offs
                                        </div>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                marginBottom: "12px",
                                                padding: "12px",
                                                background: msg.role === 'user' ? "rgba(10, 132, 255, 0.08)" : "rgba(50, 215, 75, 0.08)",
                                                borderRadius: "10px",
                                                borderLeft: `3px solid ${msg.role === 'user' ? 'var(--blue)' : 'var(--accent)'}`,
                                            }}
                                        >
                                            <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginBottom: "6px", textTransform: "uppercase" }}>
                                                {msg.role === 'user' ? 'You' : 'Verification Architect'}
                                            </div>
                                            <div style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {chatLoading && (
                                    <div style={{ padding: "12px", color: "var(--text-tertiary)", fontSize: "12px" }}>
                                        Analyzing...
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                    placeholder="Ask about mechanisms, trade-offs, or portfolios..."
                                    style={{
                                        flex: 1,
                                        padding: "12px",
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "10px",
                                        color: "var(--text)",
                                        fontSize: "13px",
                                    }}
                                />
                                <Button
                                    variant="primary"
                                    onClick={() => sendChatMessage()}
                                    disabled={chatLoading || !chatInput.trim()}
                                >
                                    Send
                                </Button>
                            </div>
                        </BentoCard>
                    </div>
                </div>

                {error && (
                    <div style={{
                        marginTop: "20px",
                        padding: "16px",
                        background: "rgba(255, 69, 58, 0.08)",
                        border: "1px solid rgba(255, 69, 58, 0.25)",
                        borderRadius: "12px",
                        color: "var(--red)",
                        fontSize: "14px",
                    }}>
                        {error}
                    </div>
                )}
            </div>
        </Layout>
    );
}
