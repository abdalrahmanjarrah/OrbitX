import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Daily.co API Key
  const DAILY_API_KEY = process.env.DAILY_API_KEY;

  // API Route to create a Daily.co room
  app.post("/api/create-daily-room", async (req, res) => {
    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY is not set in environment variables.");
      return res.status(500).json({ error: "Daily.co API key is missing" });
    }

    try {
      const response = await axios.post(
        "https://api.daily.co/v1/rooms",
        {
          properties: {
            enable_chat: true,
            start_video_off: true,
            start_audio_off: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.json({ url: response.data.url });
    } catch (error: any) {
      console.error("Error creating Daily.co room:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create voice room" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
