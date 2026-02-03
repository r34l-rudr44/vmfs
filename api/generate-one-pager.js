import Groq from "groq-sdk";
import { buildOnePagerPrompt } from "../server/onePagerPrompt.js";

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
    const { treatyText, treatyName } = req.body;

    if (!treatyText || treatyText.trim().length < 50) {
      return res
        .status(400)
        .json({ error: "Treaty text is too short or missing" });
    }

    const prompt = buildOnePagerPrompt(treatyText, treatyName);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL_NAME,
    });

    const onePagerContent = completion.choices[0]?.message?.content || "";

    return res.status(200).json({
      success: true,
      onePager: onePagerContent,
      treatyName: treatyName || "Treaty Analysis",
    });
  } catch (error) {
    console.error("One-pager generation error (serverless):", error);
    return res
      .status(500)
      .json({ error: "Failed to generate one-pager: " + error.message });
  }
}

