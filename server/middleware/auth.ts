import type { Request, Response, NextFunction } from "express";
import { User } from "../models/user.js";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Fetch the user
    const user = await User.findOne();

    if (!user || !user.accessToken) {
      return res
        .status(401)
        .send("No credentials found. Please login at /auth/google.");
    }

    // Set the credentials
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
      expiry_date: user.expiryDate,
    });

    // Check if token is expired
    const now = Date.now();
    if (user.expiryDate && user.expiryDate <= now) {
      console.log("Token expired. Refreshing...");

      // Perform the refresh
      const response = await oauth2Client.refreshAccessToken();
      const newTokens = response.credentials;

      // Update the DB
      user.accessToken = newTokens.access_token!;
      user.expiryDate = newTokens.expiry_date!;
      await user.save();

      // Update the client
      oauth2Client.setCredentials(newTokens);
    }

    // Attach the auth client to the request so routes can use it
    (req as any).ytAuth = oauth2Client;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).send("Authentication failed.");
  }
};
