import express from "express";
import type { Request, Response } from "express";
import { google } from "googleapis";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize the OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// --- ROUTES ---

app.get("/", (req: Request, res: Response) => {
  res.send("Music Curator API is running...");
});

// Redirect user to Google
app.get("/auth/google", (req: Request, res: Response) => {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // Required for refresh tokens
    scope: scopes,
    prompt: "consent", // Ensures a refresh token every time during dev
  });

  res.redirect(url);
});

// Exchange the Code for Tokens
app.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("No authorization code provided.");
  }

  try {
    // Exchange the authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code as string);

    // Attach the tokens to the client so it can make authorized requests
    oauth2Client.setCredentials(tokens);

    // For now, log the tokens to ensure they are being received
    // Adding MongoDB later
    console.log("Successfully authenticated!");
    console.log("Access Token:", tokens.access_token);

    if (tokens.refresh_token) {
      console.log("Refresh Token Received:", tokens.refresh_token);
    }

    // Send a success message or redirect back to frontend
    res.send(
      "Authentication successful! You can now close this tab and return to the app."
    );
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed during token exchange.");
  }
});

// Fetch Liked Videos
app.get("/youtube/liked-videos", async (req: Request, res: Response) => {
  try {
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // Requesting the 'snippet' (title, description) and 'contentDetails' (video ID)
    const response = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: "LL",
      maxResults: 10, // Just fetching 10 for now to test
    });

    const videos = response.data.items;

    if (!videos || videos.length === 0) {
      return res.send("No liked videos found.");
    }

    // Map the results to a cleaner format for frontend
    const likedMusic = videos.map((video) => ({
      title: video.snippet?.title,
      videoId: video.contentDetails?.videoId,
      thumbnail: video.snippet?.thumbnails?.default?.url,
    }));

    res.json(likedMusic);
  } catch (error) {
    console.error("Error fetching liked videos:", error);
    res.status(500).send("Failed to fetch YouTube data.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
