import Groq from "groq-sdk";
import { VERIFICATION_ARCHITECT_PROMPT } from "../server/vmfsPrompts.js";

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
    const { message, conversationHistory } = req.body;

    if (!message || message.trim().length < 1) {
      return res.status(400).json({ error: "Message is required" });
    }

    const historyMessages =
      conversationHistory?.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })) || [];

    const messages = [
      {
        role: "system",
        content: VERIFICATION_ARCHITECT_PROMPT,
      },
      ...historyMessages,
      {
        role: "user",
        content: message,
      },
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: MODEL_NAME,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    return res.status(200).json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error("Chat error (serverless):", error);
    return res
      .status(500)
      .json({ error: "Failed to process chat: " + error.message });
  }
}

