import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-5xl font-bold">Karaoke Party</h1>
      <div className="flex gap-4">
        <Link
          to="/host"
          className="rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold hover:bg-purple-500"
        >
          Host a Game
        </Link>
        <Link
          to="/play"
          className="rounded-lg bg-slate-800 px-6 py-3 text-lg font-semibold hover:bg-slate-700"
        >
          Join a Game
        </Link>
      </div>
    </div>
  );
}
