import { useState } from "react";
import { useNavigate } from "react-router";
import useAuth from "../../hooks/useAuth";

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setSubmitting(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not connect. Please try logging out again."
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={submitting}
        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Logging out…" : "Log out"}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-xs text-right text-xs text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}