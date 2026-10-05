import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = 3000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static("."));

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Text is required"
      });
    }

    // Text को लगभग 180 characters के chunks में बाँटना
    // ताकि Groq की 200-character limit के अंदर रहे।
    const words = text.trim().split(/\s+/);
    const chunks = [];
    let current = "";

    for (const word of words) {
      const test = current ? current + " " + word : word;

      if (test.length <= 180) {
        current = test;
      } else {
        if (current) chunks.push(current);
        current = word;
      }
    }

    if (current) {
      chunks.push(current);
    }

    const audioChunks = [];

    for (const chunk of chunks) {
      console.log("Generating audio:", chunk);

      const response = await groq.audio.speech.create({
        model: "canopylabs/orpheus-v1-english",
        voice: "hannah",
        input: chunk,
        response_format: "wav"
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      audioChunks.push({
        text: chunk,
        audio: buffer.toString("base64")
      });
    }

    res.json({
      success: true,
      chunks: audioChunks
    });

  } catch (error) {
    console.error("TTS ERROR:", error);

    res.status(500).json({
      error: error?.message || "Voice generation failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`PageVaani running at http://localhost:${PORT}`);
});