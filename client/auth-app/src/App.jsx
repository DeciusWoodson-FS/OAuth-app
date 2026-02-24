import { useState } from "react";
import Header from "./components/Header";
import VideoGrid from "./components/VideoGrid";
import "./index.css";

export default function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [basedOn, setBasedOn] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const discoverMusic = async () => {
    setLoading(true);
    setPlaylistUrl("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/youtube/discover-new`
      );
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setBasedOn(data.basedOn);
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      alert("Make sure you are logged in first!");
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (recommendations.length === 0) return;
    setLoading(true);
    try {
      const videoIds = recommendations.map((video) => video.videoId);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/youtube/create-playlist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoIds: videoIds,
            title: "Curated Mix",
          }),
        }
      );

      const data = await response.json();
      setPlaylistUrl(data.playlistUrl);
    } catch (error) {
      console.error("Error creating playlist:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      <Header onLogin={handleLogin} />

      <main className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <button
            onClick={discoverMusic}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? "Curating..." : "Discover New Music"}
          </button>
        </div>

        {basedOn && (
          <h3 className="text-center text-gray-500 mb-8 font-medium">
            Curated based on:{" "}
            <span className="text-gray-800 font-bold">{basedOn}</span>
          </h3>
        )}

        <VideoGrid videos={recommendations} />

        {recommendations.length > 0 && (
          <div className="mt-16 text-center p-8 bg-white shadow-sm border border-gray-100 rounded-2xl max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Found your new groove?</h2>
            {!playlistUrl ? (
              <button
                onClick={createPlaylist}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors disabled:opacity-50"
              >
                {loading ? "Exporting..." : "Send to YouTube Playlist"}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-green-600 font-bold">
                  Playlist Created Successfully!
                </p>
                <a
                  href={playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded shadow-md transition-colors"
                >
                  Listen on YouTube 🎧
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
