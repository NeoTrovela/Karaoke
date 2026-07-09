import { useState } from "react";

export default function EndSessionButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-sm text-white">
        <span>End session for everyone?</span>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold hover:bg-red-500"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg bg-slate-700 px-3 py-1.5 hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm text-white hover:bg-slate-700"
    >
      End session
    </button>
  );
}
