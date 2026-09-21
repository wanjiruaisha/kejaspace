import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import useAuth from "../../hooks/useAuth";

export default function LoginPage() {
  const { user, login, authLoading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate("/rooms", { replace: true });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not connect to the server. Please try again."
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <p role="status">Checking your session…</p>;
  }

  if (user) {
    return <Navigate to="/rooms" replace />;
  }

  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
        Welcome back
      </p>

      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        Log in to KejaSpace
      </h1>

      <p className="mt-3 text-slate-500">
        Your room, payments and hostel updates in one place.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label
            htmlFor="login-username"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Username
          </label>

          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to KejaSpace?{" "}
        <Link to="/register" className="font-semibold text-blue-700">
          Create an account
        </Link>
      </p>
    </section>
  );
}