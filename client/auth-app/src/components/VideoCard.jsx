export default function VideoCard({ video }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all"
    >
      <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
      />
      <div className="p-4">
        <h4 className="font-semibold text-sm line-clamp-2 leading-snug text-gray-800 group-hover:text-blue-600 transition-colors">
          {video.title}
        </h4>
      </div>
    </a>
  );
}
