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

    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(CLIENT_URL);
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

// Discover New Songs (Playlist Logic)
app.get(
  "/youtube/discover-new",
  checkAuth,
  async (req: Request, res: Response) => {
    try {
      const auth = (req as any).ytAuth;
      const youtube = google.youtube({ version: "v3", auth });

      // Pull the last 10 liked videos
      const likedRes = await youtube.playlistItems.list({
        part: ["snippet"],
        playlistId: "LL",
        maxResults: 10,
      });

      const seedTitles =
        likedRes.data.items?.map((item) => item.snippet?.title || "") || [];

      // Extract JUST the Artist/Genre, discard the song name
      const extractArtist = (title: string) => {
        // YouTube music is usually formatted as "Artist - Song Title"
        let artist = title.split("-")[0];
        return artist
          .replace(/#\w+/g, "")
          .replace(/[\p{Emoji}]/gu, "")
          .replace(/\|.*/g, "")
          .replace(/\(Official.*/gi, "")
          .replace(/\[Official.*/gi, "")
          .trim();
      };

      // Clean artists and grab the top 2 distinct ones to base the mix on
      const artists = seedTitles.map(extractArtist).filter((t) => t.length > 2);
      const targetArtists = Array.from(new Set(artists)).slice(0, 2);

      // Search for broader mixes instead of the specific song
      const searchPromises = targetArtists.map((artist) =>
        youtube.search.list({
          part: ["snippet"],
          q: `${artist} playlist OR similar artists mix`,
          type: ["video"],
          videoCategoryId: "10",
          maxResults: 15,
        })
      );

      const searchResults = await Promise.all(searchPromises);

      // Flatten the results
      let suggestions = searchResults.flatMap(
        (result) =>
          result.data.items?.map((video) => ({
            title: video.snippet?.title || "",
            videoId: video.id?.videoId || "",
            thumbnail: video.snippet?.thumbnails?.high?.url || "",
          })) || []
      );

      // Filter out remixes or live versions of liked songs
      suggestions = suggestions.filter((suggestedVideo) => {
        const suggestedLower = suggestedVideo.title.toLowerCase();

        const isTooSimilar = seedTitles.some((likedTitle) => {
          // Extract just the "Song Name" from liked list
          const songName = likedTitle.split("-")[1]?.trim().toLowerCase();

          // If the suggested video contains that exact song name, reject it.
          if (
            songName &&
            songName.length > 3 &&
            suggestedLower.includes(songName)
          ) {
            return true;
          }
          return false;
        });

        return !isTooSimilar; // Keep it if it's NOT too similar
      });

      // Remove absolute duplicates and slice back down to 10
      const uniqueSuggestions = Array.from(
        new Map(suggestions.map((item) => [item.videoId, item])).values()
      ).slice(0, 10);

      res.json({
        basedOn: targetArtists.join(" & "),
        recommendations: uniqueSuggestions,
      });
    } catch (error: any) {
      console.error("Discovery Error:", error.message);
      res.status(500).send("Failed to generate recommendations.");
    }
  }
);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
