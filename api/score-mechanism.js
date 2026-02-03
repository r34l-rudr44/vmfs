import Groq from "groq-sdk";
import { VMFS_SCORER_PROMPT } from "../server/vmfsPrompts.js";

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
    const { mechanismDescription } = req.body;

    if (!mechanismDescription || mechanismDescription.trim().length < 20) {
      return res
        .status(400)
        .json({ error: "Mechanism description is too short" });
    }

    const prompt = `${VMFS_SCORER_PROMPT}

INPUT MECHANISM TO SCORE:
"${mechanismDescription}"

Analyze this mechanism and output the JSON scores.`;

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

    const scores = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      scores,
    });
  } catch (error) {
    console.error("Mechanism scoring error (serverless):", error);
    return res
      .status(500)
      .json({ error: "Failed to score mechanism: " + error.message });
  }
}

