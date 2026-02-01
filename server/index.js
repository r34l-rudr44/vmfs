import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildOnePagerPrompt } from "./onePagerPrompt.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Generate one-pager from treaty text
app.post('/api/generate-one-pager', async (req, res) => {
    try {
        const { treatyText, treatyName } = req.body;
        
        if (!treatyText || treatyText.trim().length < 50) {
            return res.status(400).json({ error: 'Treaty text is too short or missing' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = buildOnePagerPrompt(treatyText, treatyName);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const onePagerContent = response.text();

        res.json({ 
            success: true, 
            onePager: onePagerContent,
            treatyName: treatyName || 'Treaty Analysis'
        });
    } catch (error) {
        console.error('One-pager generation error:', error);
        res.status(500).json({ error: 'Failed to generate one-pager: ' + error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});