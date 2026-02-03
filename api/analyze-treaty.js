import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_AI_API_KEY,
});

const MODEL_NAME = "moonshotai/kimi-k2-instruct-0905";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { treatyText } = req.body;

    if (!treatyText || treatyText.trim().length < 50) {
      return res.status(400).json({ error: "Treaty text is too short" });
    }

    const prompt = `You are a Verification Architect analyzing treaty requirements.

Analyze this policy/treaty document and extract verification requirements:

${treatyText.substring(0, 15000)}

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

Focus on concrete, actionable verification needs related to AI systems.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL_NAME,
    });

    const textResponse = completion.choices[0]?.message?.content || "";

    const cleanJson = textResponse
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^[^{]*/, "")
      .replace(/[^}]*$/, "")
      .trim();

    const analysis = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Treaty analysis error (serverless):", error);
    return res
      .status(500)
      .json({ error: "Failed to analyze treaty: " + error.message });
  }
}

