import { useRef, useState } from "react";
import YouTube, { type YouTubeEvent } from "react-youtube";
import { describeYoutubeError } from "../../lib/youtube/errorMessages";
import type { PlayerSummary } from "../../lib/socket";
import Leaderboard from "./Leaderboard";

interface YoutubeStageProps {
  videoId: string;
  roomCode: string;
  players: PlayerSummary[];
  onChangeVideo: () => void;
  onVideoEnded: () => void;
}

const PLAYER_OPTS = {
  width: "100%",
  height: "100%",
  playerVars: {
    autoplay: 1,
    playsinline: 1,
    rel: 0,
    modestbranding: 1,
  },
};

export default function YoutubeStage({
  videoId,
  roomCode,
  players,
  onChangeVideo,
  onVideoEnded,
}: YoutubeStageProps) {
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleError(event: YouTubeEvent<number>) {
    setError(describeYoutubeError(event.data));
  }

  function handleFullscreen() {
    containerRef.current?.requestFullscreen();
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
          <p className="max-w-sm text-center text-lg">{error}</p>
          <button
            type="button"
            onClick={onChangeVideo}
            className="rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold hover:bg-purple-500"
          >
            Try another video
          </button>
        </div>
      ) : (
        <YouTube
          videoId={videoId}
          opts={PLAYER_OPTS}
          className="absolute inset-0"
          iframeClassName="h-full w-full"
          onError={handleError}
          onEnd={onVideoEnded}
        />
      )}

      <div className="fixed top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
        Room: {roomCode}
      </div>

      <Leaderboard players={players} />

      {!error && (
        <div className="fixed bottom-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={onChangeVideo}
            className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Change video
          </button>
          <button
            type="button"
            onClick={handleFullscreen}
            className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
