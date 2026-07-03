import { useState, type FormEvent } from "react";
import { parseYoutubeVideoId } from "../../lib/youtube/parseVideoId";

interface VideoUrlFormProps {
  onSubmit: (videoId: string) => void;
}

export default function VideoUrlForm({ onSubmit }: VideoUrlFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const videoId = parseYoutubeVideoId(value);
    if (!videoId) {
      setError("Couldn't find a video in that link. Paste a full YouTube URL or video ID.");
      return;
    }
    setError(null);
    onSubmit(videoId);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste a YouTube URL"
        className="rounded-lg bg-slate-800 px-4 py-3 text-center text-white outline-none focus:ring-2 focus:ring-purple-500"
      />
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={!value}
        className="rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold hover:bg-purple-500 disabled:opacity-50"
      >
        Play video
      </button>
    </form>
  );
}
