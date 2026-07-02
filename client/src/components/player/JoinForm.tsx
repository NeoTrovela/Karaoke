import { useState, type FormEvent } from "react";

interface JoinFormProps {
  initialCode: string;
  onSubmit: (code: string, displayName: string) => void;
  error: string | null;
  submitting: boolean;
}

export default function JoinForm({ initialCode, onSubmit, error, submitting }: JoinFormProps) {
  const [code, setCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(code, displayName);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Room code"
        maxLength={5}
        className="rounded-lg bg-slate-800 px-4 py-3 text-center text-2xl tracking-[0.3em] uppercase text-white outline-none focus:ring-2 focus:ring-purple-500"
      />
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
        maxLength={20}
        className="rounded-lg bg-slate-800 px-4 py-3 text-center text-lg text-white outline-none focus:ring-2 focus:ring-purple-500"
      />
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !code || !displayName}
        className="rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold hover:bg-purple-500 disabled:opacity-50"
      >
        {submitting ? "Joining…" : "Join"}
      </button>
    </form>
  );
}
