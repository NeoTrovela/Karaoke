export default function SessionEnded({ onStartNew }: { onStartNew: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-3xl font-bold">Session ended</h1>
      <p className="text-slate-400">Everyone's been disconnected. Thanks for singing!</p>
      <button
        type="button"
        onClick={onStartNew}
        className="rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold hover:bg-purple-500"
      >
        Start new room
      </button>
    </div>
  );
}
