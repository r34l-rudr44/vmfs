// Treaty Advisor Page - AI-Powered Document Analysis
import { useState } from "react";
import { Layout, BentoCard, Button, Badge } from "../components/shared";
import { MECHANISMS } from "../vmfs-data";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - use unpkg CDN for reliability
const PDFJS_VERSION = pdfjsLib.version;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export default function TreatyAdvisorPage({ theme, toggleTheme }) {
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [extractedText, setExtractedText] = useState(null);
    const [generatingOnePager, setGeneratingOnePager] = useState(false);
    const [onePager, setOnePager] = useState(null);

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

            // Save extracted text for one-pager generation
            setExtractedText(text);

            // Call Gemini API
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    const generateOnePager = async () => {
        if (!extractedText || !result) return;

        setGeneratingOnePager(true);
        setError(null);

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const treatyName = file?.name?.replace(/\.[^/.]+$/, "") || "Treaty";

            const prompt = `You are an expert AI governance analyst. Create a concise, professional one-page briefing document from this treaty/policy document.

DOCUMENT NAME: ${treatyName}

DOCUMENT TEXT:
${extractedText.substring(0, 20000)}

---

Generate a structured one-page brief in MARKDOWN format with the following sections:

# ${treatyName} - Executive Brief

## 📋 Overview
[2-3 sentence summary of the document's purpose and scope]

## 🎯 Key Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]
(List 3-5 main objectives)

## ✅ Core Requirements
| Requirement | Description | Priority |
|-------------|-------------|----------|
| [Name] | [Brief description] | High/Medium/Low |
(Include 4-6 key requirements in table format)

## 🔍 Verification Needs
- **Compute Monitoring**: [Yes/No/Partial - brief explanation]
- **Model Lineage**: [Yes/No/Partial - brief explanation]  
- **Deployment Controls**: [Yes/No/Partial - brief explanation]
- **Post-Training Audits**: [Yes/No/Partial - brief explanation]

## 🛠️ Recommended Mechanisms
1. **[Mechanism Name]**: [Why it's recommended]
2. **[Mechanism Name]**: [Why it's recommended]
3. **[Mechanism Name]**: [Why it's recommended]

## ⚠️ Implementation Challenges
- [Challenge 1]
- [Challenge 2]
- [Challenge 3]

## 📊 Feasibility Assessment
| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| Technical Feasibility | [X] | [Brief note] |
| Political Tractability | [X] | [Brief note] |
| Sovereignty Impact | [X] | [Brief note] |
| Global South Adoptability | [X] | [Brief note] |

## 💡 Key Takeaways
1. [Main insight 1]
2. [Main insight 2]
3. [Main insight 3]

---
*Generated by VMFS Treaty Advisor*

IMPORTANT: 
- Keep the entire brief to roughly one page when printed
- Use clear, professional language suitable for policymakers
- Be specific and actionable in recommendations`;

            const genResult = await model.generateContent(prompt);
            const response = await genResult.response;
            const markdown = response.text();

            setOnePager(markdown);
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
            // Download as Markdown
            const blob = new Blob([onePager], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${treatyName}_Executive_Brief.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Download as HTML
            const htmlContent = markdownToHtml(onePager, treatyName);
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${treatyName}_Executive_Brief.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Improved markdown to HTML converter
    const markdownToHtml = (md, treatyName) => {
        let html = md;
        
        // Process tables first (before other replacements)
        html = html.replace(/\|(.+)\|/g, (match, content) => {
            const cells = content.split('|').map(c => c.trim()).filter(c => c);
            if (cells.length === 0) return '';
            
            // Check if it's a separator row
            if (cells.every(c => /^[-:]+$/.test(c))) return '';
            
            const isHeader = html.indexOf(match) < html.indexOf('|---|') || 
                           (html.indexOf(match) < html.indexOf('| --- |') && html.indexOf('| --- |') !== -1);
            const tag = isHeader ? 'th' : 'td';
            return `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
        });
        
        // Wrap table rows in table tags
        html = html.replace(/(<tr>.*?<\/tr>)/gs, (match) => {
            if (match.includes('<th>')) {
                return `<table><thead>${match}</thead><tbody>`;
            }
            return match;
        });
        html = html.replace(/<\/tr>\s*(?=<tr>)/g, '</tr>');
        html = html.replace(/(<\/tr>)(?!\s*<tr>)/g, '$1</tbody></table>');
        
        // Headers (order matters - process h3 before h2, h2 before h1)
        html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');
        
        // Bold text
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Horizontal rules
        html = html.replace(/^---$/gim, '<hr>');
        html = html.replace(/^___$/gim, '<hr>');
        html = html.replace(/^\*\*\*$/gim, '<hr>');
        
        // Lists - process ordered lists first
        html = html.replace(/^(\d+)\. (.+)$/gim, '<li>$2</li>');
        
        // Unordered lists
        html = html.replace(/^[-*+] (.+)$/gim, '<li>$1</li>');
        
        // Wrap consecutive list items
        html = html.replace(/(<li>.*?<\/li>)(?:\s*<li>)/gs, (match) => {
            if (!match.includes('<ul>') && !match.includes('<ol>')) {
                return match.replace(/(<li>.*?<\/li>)/, '<ul>$1');
            }
            return match;
        });
        html = html.replace(/(<\/li>)(?!\s*<li>)/g, '$1</ul>');
        
        // Wrap paragraphs (text between headers, lists, tables)
        const lines = html.split('\n');
        let result = [];
        let inParagraph = false;
        let paragraphContent = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                if (inParagraph && paragraphContent.length > 0) {
                    result.push(`<p>${paragraphContent.join(' ')}</p>`);
                    paragraphContent = [];
                    inParagraph = false;
                }
                continue;
            }
            
            // If it's a block element, close paragraph if open
            if (line.match(/^<(h[1-6]|ul|ol|table|hr|li)/)) {
                if (inParagraph && paragraphContent.length > 0) {
                    result.push(`<p>${paragraphContent.join(' ')}</p>`);
                    paragraphContent = [];
                    inParagraph = false;
                }
                result.push(line);
            } else if (!line.match(/^</)) {
                // Regular text line
                inParagraph = true;
                paragraphContent.push(line);
            } else {
                result.push(line);
            }
        }
        
        // Close any open paragraph
        if (inParagraph && paragraphContent.length > 0) {
            result.push(`<p>${paragraphContent.join(' ')}</p>`);
        }
        
        html = result.join('\n');
        
        // Clean up any double wrapping
        html = html.replace(/<p><p>/g, '<p>');
        html = html.replace(/<\/p><\/p>/g, '</p>');
        
        // Generate full HTML document
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${treatyName} - Executive Verification Brief</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: #1a1a2e;
            max-width: 850px;
            margin: 0 auto;
            padding: 48px 32px;
            background: #ffffff;
        }
        
        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #0f0f23;
            margin: 0 0 32px 0;
            padding-bottom: 16px;
            border-bottom: 3px solid #32d74b;
        }
        
        h2 {
            font-size: 18px;
            font-weight: 600;
            color: #32d74b;
            margin: 32px 0 16px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1a1a2e;
            margin: 24px 0 12px 0;
        }
        
        p {
            margin: 0 0 16px 0;
            color: #2d2d44;
            line-height: 1.8;
        }
        
        ul, ol {
            margin: 16px 0 16px 24px;
            padding-left: 8px;
        }
        
        li {
            margin: 8px 0;
            color: #2d2d44;
            line-height: 1.7;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
            border: 1px solid #e0e0e0;
        }
        
        thead {
            background: #f8f9fa;
        }
        
        th {
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: #1a1a2e;
            border-bottom: 2px solid #e0e0e0;
        }
        
        td {
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f0;
            color: #2d2d44;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        strong {
            color: #0f0f23;
            font-weight: 600;
        }
        
        em {
            font-style: italic;
            color: #4a4a6a;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e0e0e0;
            margin: 32px 0;
        }
        
        .footer {
            font-size: 12px;
            color: #6e6e73;
            text-align: center;
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #e0e0e0;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            h1, h2, h3 {
                page-break-after: avoid;
            }
            
            table {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
${html}
<div class="footer">Generated by VMFS Treaty Verification Advisor</div>
</body>
</html>`;
    };

    return (
        <Layout theme={theme} toggleTheme={toggleTheme}>
            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "60px 24px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "56px" }}>
                    <Badge variant="accent" style={{ 
                        fontSize: "11px", 
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        padding: "6px 12px"
                    }}>
                        Verification Intelligence
                    </Badge>
                    <h1 style={{
                        fontSize: "52px",
                        fontWeight: 700,
                        marginTop: "20px",
                        marginBottom: "20px",
                        background: "linear-gradient(135deg, var(--text) 0%, var(--text-secondary) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}>
                        Treaty Verification Advisor
                    </h1>
                    <p style={{
                        fontSize: "18px",
                        color: "var(--text-secondary)",
                        maxWidth: "680px",
                        margin: "0 auto",
                        lineHeight: 1.8,
                        fontWeight: 400,
                    }}>
                        Analyze treaty documents to identify verification requirements, assess compliance mechanisms, 
                        and receive evidence-based recommendations for AI safety governance frameworks.
                    </p>
                </div>

                {/* Upload Section */}
                <BentoCard hoverable={false} style={{ marginBottom: "32px" }}>
                    <div style={{ marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "6px" }}>
                            Document Upload
                        </h3>
                        <p style={{ fontSize: "13px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                            Upload treaty, policy, or regulatory documents for verification requirement analysis
                        </p>
                    </div>

                    <div style={{
                        border: file ? "2px solid var(--accent)" : "2px dashed var(--border)",
                        borderRadius: "12px",
                        padding: "48px 40px",
                        textAlign: "center",
                        marginBottom: "20px",
                        background: file 
                            ? "linear-gradient(135deg, rgba(50, 215, 75, 0.08) 0%, rgba(50, 215, 75, 0.02) 100%)" 
                            : "transparent",
                        transition: "all 0.3s ease",
                        position: "relative",
                        overflow: "hidden",
                    }}>
                        {file && (
                            <div style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: "var(--accent)",
                                boxShadow: "0 0 12px rgba(50, 215, 75, 0.6)",
                            }} />
                        )}
                        <input
                            type="file"
                            accept=".txt,.md,.doc,.docx,.pdf"
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" style={{ cursor: "pointer", display: "block" }}>
                            <div style={{ 
                                marginBottom: "16px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}>
                                {file ? (
                                    <div style={{
                                        width: "56px",
                                        height: "56px",
                                        borderRadius: "12px",
                                        background: "var(--accent)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--bg)",
                                        fontSize: "24px",
                                        fontWeight: 600,
                                    }}>
                                        ✓
                                    </div>
                                ) : (
                                    <div style={{
                                        width: "56px",
                                        height: "56px",
                                        borderRadius: "12px",
                                        border: "2px solid var(--border)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--text-tertiary)",
                                        fontSize: "20px",
                                    }}>
                                        +
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "var(--text)" }}>
                                {file ? file.name : "Select document to analyze"}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", letterSpacing: "0.3px" }}>
                                {file ? "Document ready for verification analysis" : "PDF, TXT, MD, DOC, DOCX formats supported"}
                            </div>
                        </label>
                    </div>

                    {file && !result && (
                        <Button
                            variant="primary"
                            onClick={analyzeDocument}
                            style={{ width: "100%", height: "48px", fontSize: "15px", fontWeight: 600 }}
                            disabled={analyzing}
                        >
                            {analyzing ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                                    <span style={{
                                        width: "16px",
                                        height: "16px",
                                        border: "2px solid currentColor",
                                        borderTopColor: "transparent",
                                        borderRadius: "50%",
                                        animation: "spin 0.8s linear infinite",
                                        display: "inline-block"
                                    }} />
                                    Analyzing Verification Requirements...
                                </span>
                            ) : (
                                "Begin Verification Analysis"
                            )}
                        </Button>
                    )}

                    {result && (
                        <div style={{
                            marginTop: "20px",
                            padding: "14px 20px",
                            background: "rgba(50, 215, 75, 0.1)",
                            border: "1px solid rgba(50, 215, 75, 0.25)",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                        }}>
                            <div style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "6px",
                                background: "var(--accent)",
                                color: "var(--bg)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "14px",
                                fontWeight: 700,
                                flexShrink: 0,
                            }}>
                                ✓
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, color: "var(--accent)", fontSize: "14px" }}>
                                    Analysis Completed
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                    Verification requirements and mechanism recommendations are ready
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            marginTop: "20px",
                            padding: "16px 20px",
                            background: "rgba(255, 69, 58, 0.08)",
                            border: "1px solid rgba(255, 69, 58, 0.2)",
                            borderRadius: "10px",
                            color: "var(--red)",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                        }}>
                            <div style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                background: "rgba(255, 69, 58, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: "1px",
                                fontSize: "12px",
                                fontWeight: 600,
                            }}>
                                !
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Analysis Error</div>
                                <div style={{ opacity: 0.9 }}>{error}</div>
                            </div>
                        </div>
                    )}
                </BentoCard>

                {/* Results */}
                {result && (
                    <>
                        {/* One-Pager Generation */}
                        <BentoCard hoverable={false} style={{ 
                            marginBottom: "32px", 
                            background: "linear-gradient(135deg, rgba(50, 215, 75, 0.08) 0%, rgba(50, 215, 75, 0.02) 100%)",
                            border: "1px solid rgba(50, 215, 75, 0.15)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                                <div style={{ flex: 1, minWidth: "280px" }}>
                                    <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
                                        Executive Verification Brief
                                    </h3>
                                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                                        Generate a comprehensive one-page compliance brief with verification requirements, 
                                        mechanism recommendations, and feasibility assessment
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                    {!onePager ? (
                                        <Button
                                            variant="primary"
                                            onClick={generateOnePager}
                                            disabled={generatingOnePager}
                                            style={{ minWidth: "180px" }}
                                        >
                                            {generatingOnePager ? (
                                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span style={{
                                                        width: "14px",
                                                        height: "14px",
                                                        border: "2px solid currentColor",
                                                        borderTopColor: "transparent",
                                                        borderRadius: "50%",
                                                        animation: "spin 0.8s linear infinite",
                                                        display: "inline-block"
                                                    }} />
                                                    Generating Brief...
                                                </span>
                                            ) : (
                                                "Generate Brief"
                                            )}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                variant="primary"
                                                onClick={() => downloadOnePager('html')}
                                                style={{ minWidth: "140px" }}
                                            >
                                                Download HTML
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={() => downloadOnePager('md')}
                                                style={{ 
                                                    minWidth: "140px",
                                                    background: "rgba(50, 215, 75, 0.1)",
                                                    color: "var(--accent)",
                                                    border: "1px solid var(--accent)"
                                                }}
                                            >
                                                Download Markdown
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {onePager && (
                                <div style={{
                                    marginTop: "20px",
                                    padding: "14px 16px",
                                    background: "rgba(50, 215, 75, 0.12)",
                                    borderRadius: "10px",
                                    fontSize: "13px",
                                    color: "var(--accent)",
                                    border: "1px solid rgba(50, 215, 75, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                }}>
                                    <div style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background: "var(--accent)",
                                        boxShadow: "0 0 8px rgba(50, 215, 75, 0.6)",
                                    }} />
                                    <span>Verification brief ready for download</span>
                                </div>
                            )}
                        </BentoCard>

                        {/* Requirements */}
                        <BentoCard hoverable={false} style={{ marginBottom: "32px" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
                                    Verification Requirements Identified
                                </h3>
                                <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                                    Core compliance obligations extracted from the document
                                </p>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {result.analysis.requirements.slice(0, 5).map((req, i) => (
                                    <div key={i} style={{
                                        padding: "14px 16px",
                                        background: "var(--bg-card)",
                                        borderRadius: "10px",
                                        fontSize: "14px",
                                        color: "var(--text)",
                                        border: "1px solid var(--border)",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        transition: "all 0.2s ease",
                                    }}>
                                        <div style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "6px",
                                            background: "var(--accent)",
                                            color: "var(--bg)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            flexShrink: 0,
                                            marginTop: "1px",
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, lineHeight: 1.6 }}>{req}</div>
                                    </div>
                                ))}
                            </div>
                        </BentoCard>

                        {/* Recommendations */}
                        <div style={{ marginBottom: "24px" }}>
                            <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "6px" }}>
                                Recommended Verification Mechanisms
                            </h3>
                            <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                                Mechanisms ranked by alignment with identified verification requirements
                            </p>
                        </div>

                        {result.recommendations.map((rec, i) => (
                            <BentoCard key={i} hoverable={false} style={{ marginBottom: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "10px",
                                                background: i === 0 
                                                    ? "linear-gradient(135deg, var(--accent) 0%, rgba(50, 215, 75, 0.8) 100%)" 
                                                    : i === 1
                                                    ? "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)"
                                                    : "rgba(255,255,255,0.06)",
                                                color: i === 0 ? "var(--bg)" : "var(--text)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "16px",
                                                fontWeight: 700,
                                                border: i === 0 ? "none" : "1px solid var(--border)",
                                            }}>
                                                #{i + 1}
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                                                    {rec.mechanism.shortName}
                                                </h4>
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                                                        Alignment Score: <strong style={{ color: "var(--accent)" }}>{rec.score}%</strong>
                                                    </span>
                                                </div>
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
                                            padding: "14px 16px",
                                            background: "rgba(50, 215, 75, 0.06)",
                                            borderRadius: "10px",
                                            border: "1px solid rgba(50, 215, 75, 0.15)",
                                            marginTop: "12px",
                                        }}>
                                            <div style={{
                                                fontSize: "10px",
                                                color: "var(--accent)",
                                                textTransform: "uppercase",
                                                marginBottom: "8px",
                                                fontWeight: 700,
                                                letterSpacing: "0.5px",
                                            }}>
                                                Recommendation Rationale
                                            </div>
                                            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
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
                    <BentoCard hoverable={false} style={{ marginTop: "32px" }}>
                        <div style={{ marginBottom: "16px" }}>
                            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
                                Document Types Supported
                            </h3>
                            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                                The verification advisor can analyze various types of governance documents
                            </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {[
                                { title: "International Treaties", desc: "Multi-party agreements with verification requirements" },
                                { title: "Regulatory Policies", desc: "National or regional AI governance frameworks" },
                                { title: "Compliance Standards", desc: "Technical specifications for verification mechanisms" },
                            ].map((ex, i) => (
                                <div key={i} style={{
                                    padding: "14px 16px",
                                    background: "var(--bg-card)",
                                    borderRadius: "10px",
                                    border: "1px solid var(--border)",
                                    fontSize: "13px",
                                }}>
                                    <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                                        {ex.title}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                                        {ex.desc}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </BentoCard>
                )}
            </div>
        </Layout>
    );
}