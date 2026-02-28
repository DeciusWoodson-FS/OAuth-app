# Google OAuth app

This repository contains my work for the **Project and Portfolio III** class I'm taking at **Full Sail University**. The objective is to create Full-Stack Application that properly implements Google OAuth, passport will not be used in this application.

> Both this repo and this project are a work in progress and are subject to change.

---

## Features ✨

- **Custom OAuth 2.0 Flow:** Secure Google Sign-In implementation handling token exchange, refresh tokens, and session persistence in MongoDB.
- **YouTube API Integration:** Dynamically fetches and analyzes the user's `LL` (Liked List) playlist.
- **Algorithmic Discovery:** Custom backend logic that cleans video titles, extracts artist names, and queries YouTube for mathematically similar recommendations while filtering out duplicates.
- **One-Click Export:** Automatically generates a new private playlist on the user's channel and populates it with the discovered tracks via POST requests.
- **Modern UI:** Responsive, dark-themed interface built with React, Vite, and Tailwind CSS.

---

## Technologies 💻

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)
![React](https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB)
![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=fff)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-%23000000.svg?logo=vercel&logoColor=white)

---

## Prerequisites ⚠️

- Node.js
- npm
- Modern Web Browser
- [Google developer account](https://support.google.com/cloud/answer/15544987?hl=en)

---

## Getting started 🚀

### 1. Clone the repository
\`\`\`bash
git clone <your-repo-url>
cd oauth-app
\`\`\`

### 2. Install Dependencies
You will need to install the dependencies for both the client and the server.
\`\`\`bash
# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client/auth-app
npm install
\`\`\`

### 3. Environment Variables
Create a `.env` file in the `server` directory and add the following keys:
\`\`\`env
PORT=5001
MONGO_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/auth/google/callback
CLIENT_URL=http://localhost:5173
\`\`\`

Create a `.env` file in the `client/auth-app` directory:
\`\`\`env
VITE_API_URL=http://localhost:5001
\`\`\`

### 4. Run the Application
Open two separate terminal windows.

**Terminal 1 (Backend):**
\`\`\`bash
cd server
npm run dev
\`\`\`

**Terminal 2 (Frontend):**
\`\`\`bash
cd client/auth-app
npm run dev
\`\`\`
The application will be running at `http://localhost:5173`.

---
### Live Deployment
- **Live Site:** http://o-auth-app-544m.vercel.app

### Local API Endpoints
- `GET /auth/google` - Initiates the Google OAuth consent screen.
- `GET /youtube/liked-videos` - Returns the user's 10 most recently liked YouTube videos.
- `GET /youtube/discover-new` - Analyzes liked videos and returns an array of new song recommendations.
- `POST /youtube/create-playlist` - Creates a new private playlist on the user's account and populates it with the recommended video IDs.
