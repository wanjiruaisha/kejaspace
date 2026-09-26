import { useRef, useState } from "react";
import { Link, Navigate } from "react-router";

import useAuth from "../../hooks/useAuth";

export default function LoginPage() {
  const { user, login, authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submissionRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submissionRef.current) return;

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Please enter your username.");
      return;
    }

    submissionRef.current = true;
    setSubmitting(true);

    try {
      await login(cleanUsername, password);

      // AuthContext updates "user".
      // The Navigate component below then selects the correct page.
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not connect to the server. Please try again."
          : err.message || "Login failed. Please try again.",
      );
    } finally {
      submissionRef.current = false;
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <p role="status" className="py-6 text-center text-sm text-slate-600">
        Checking your session…
      </p>
    );
  }

  if (user) {
    const isManagement = user.is_staff || user.is_superuser;

    return (
      <Navigate
        to={isManagement ? "/staff/applications" : "/my-applications"}
        replace
      />
    );
  }

  return (
    <section
      aria-labelledby="login-heading"
      className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Welcome back
      </p>

      <h1 id="login-heading" className="page-title mt-2">
        Log in to KejaSpace
      </h1>

      <p className="page-description">
        Access your accommodation and hostel services.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        aria-busy={submitting}
        className="mt-5"
      >
        <fieldset disabled={submitting} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="form-label">
              Username
            </label>

            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="form-label">
              Password
            </label>

            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="button-primary w-full"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </fieldset>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        New to KejaSpace?{" "}
        <Link
          to="/register"
          className="font-semibold text-blue-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}