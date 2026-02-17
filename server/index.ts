import express from "express";
import type { Request, Response } from "express";
import { google } from "googleapis";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "./models/user.js";
import { checkAuth } from "./middleware/auth.js";

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
const PORT = process.env.PORT || 5001;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// --- ROUTES ---

app.get("/", (req: Request, res: Response) => {
  res.send("Music Curator API is running...");
});

// OAuth Routes(Scopes)
app.get("/auth/google", (req: Request, res: Response) => {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "email",
    "profile",
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("No code provided.");
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    await User.findOneAndUpdate(
      { googleId: payload?.sub },
      {
        email: payload?.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      },
      { upsert: true, new: true }
    );
    res.send("Authentication successful! Data saved to database.");
  } catch (error) {
    res.status(500).send("Authentication failed.");
  }
});

// --- YOUTUBE ROUTES ---

// Get Liked Videos
app.get(
  "/youtube/liked-videos",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const auth = (req as any).ytAuth;
      const youtube = google.youtube({ version: "v3", auth });
      const response = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: "LL",
        maxResults: 10,
      });
      const items = response.data.items || [];
      const likedMusic = items.map((video: any) => ({
        title: video.snippet?.title,
        videoId: video.contentDetails?.videoId,
        thumbnail: video.snippet?.thumbnails?.default?.url,
      }));
      res.json(likedMusic);
    } catch (error: any) {
      res.status(500).send("Failed to fetch YouTube data.");
    }
  }
);

// Discover New Songs(Playlist Logic)
app.get(
  "/youtube/discover-new",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const auth = (req as any).ytAuth;
      const youtube = google.youtube({ version: "v3", auth });

      //See what has been liked recently
      const likedRes = await youtube.playlistItems.list({
        part: ["snippet"],
        playlistId: "LL",
        maxResults: 5,
      });
      const seedTitles =
        likedRes.data.items?.map((item) => item.snippet?.title) || [];

      // Use those likes to find new stuff
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: `${seedTitles[0]} official audio recommendations`,
        type: ["video"],
        videoCategoryId: "10",
        maxResults: 10,
      });

      const suggestions = searchRes.data.items?.map((video) => ({
        title: video.snippet?.title,
        videoId: video.id?.videoId,
        thumbnail: video.snippet?.thumbnails?.high?.url,
      }));

      res.json({
        basedOn: seedTitles[0],
        recommendations: suggestions,
      });
    } catch (error: any) {
      res.status(500).send("Failed to generate recommendations.");
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
