import { useEffect, useState } from "react";

export default function LoadingMessage({
  label = "Loading…",
  compact = false,
}) {
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTakingLonger(true);
    }, 12000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        compact
          ? "max-w-48 text-xs text-slate-500"
          : "rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-blue-100 border-t-blue-700 motion-reduce:animate-none"
        />

        <span>{label}</span>
      </div>

      {takingLonger && (
        <p className="mt-3 leading-6">
          This is taking longer than usual. We’re still waiting for a
          response.
        </p>
      )}
    </div>
  );
}