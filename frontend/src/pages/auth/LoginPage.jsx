import { useRef, useState } from "react";
import { Link, Navigate } from "react-router";

import useAuth from "../../hooks/useAuth";

const inputStyle =
  "mt-2 min-h-11 w-full rounded-xl border border-[#245747]/20 " +
  "bg-white px-3.5 py-3 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] " +
  "focus:border-[#245747] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const { user, login, authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
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

      // AuthContext updates user.
      // Navigate below sends them to the appropriate page.
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
      <p role="status" className="py-8 text-center text-sm text-[#57534E]">
        Checking your session…
      </p>
    );
  }

  if (user) {
    const isManagement = user.is_staff || user.is_superuser;

    return (
      <Navigate
        to={isManagement ? "/staff/dashboard" : "/my-applications"}
        replace
      />
    );
  }

  return (
    <section
      aria-labelledby="login-heading"
      className="mx-auto grid w-full max-w-4xl overflow-hidden
        rounded-3xl border border-[#245747]/15 bg-[#FAF7F2]
        shadow-[0_12px_40px_rgba(23,63,53,0.07)]
        md:grid-cols-[0.9fr_1.1fr]"
    >
      {/* Decorative photo panel, shown on larger screens */}
      <div className="relative isolate hidden overflow-hidden bg-[#173F35] md:flex md:flex-col md:justify-between">
        {!photoFailed && (
          <img
            src="/images/home-hero.jpg"
            alt=""
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b
            from-[#102E28]/65 via-[#102E28]/25 to-[#102E28]/85"
        />

        <Link
          to="/"
          aria-label="KejaSpace home"
          className="m-6 inline-flex min-h-11 items-center gap-2
            self-start rounded-lg px-2 font-heading text-lg
            font-bold text-white focus-visible:outline-2
            focus-visible:outline-offset-4
            focus-visible:outline-[#E9BC9F]"
        >
          KejaSpace
          <span aria-hidden="true" className="text-[#E9BC9F]">
            .
          </span>
        </Link>

        <div className="m-6 rounded-2xl border border-white/25 bg-[#102E28]/85 p-5 text-white supports-[backdrop-filter:blur(1px)]:bg-[#102E28]/65 supports-[backdrop-filter:blur(1px)]:backdrop-blur-md">
          <p lang="sw" className="text-xs font-semibold text-[#E9BC9F]">
            Karibu tena.
          </p>

          <h2 className="mt-3 font-heading text-2xl font-bold leading-tight">
            Your space.
            <br />
            All in one place.
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#E2EBE4]">
            Check your applications, keep up with hostel notices
            and pick up where you left off.
          </p>
        </div>
      </div>

      {/* Login form */}
      <div className="min-w-0 px-5 py-7 sm:px-8 sm:py-9">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2
            rounded-lg text-xs font-semibold text-[#245747]
            underline-offset-4 hover:underline"
        >
          <span aria-hidden="true">←</span>
          Back to home
        </Link>

        <p
          lang="sw"
          className="mt-4 text-xs font-semibold uppercase
            tracking-[0.14em] text-[#965038]"
        >
          Karibu tena
        </p>

        <h1
          id="login-heading"
          className="mt-2 font-heading text-2xl font-bold
            tracking-tight text-[#173F35]"
        >
          Make yourself at home.
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#57534E]">
          Log in to your KejaSpace account to continue.
        </p>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="mt-5 rounded-xl border border-red-100
              bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            {error}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          aria-describedby={error ? "login-error" : undefined}
          className="mt-6"
        >
          <fieldset disabled={submitting} className="min-w-0 space-y-4">
            <legend className="sr-only">Login details</legend>

            <div>
              <label
                htmlFor="login-username"
                className="block text-sm font-semibold text-[#173F35]"
              >
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
                placeholder="Enter your username"
                required
                className={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-[#173F35]"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className={`${inputStyle} pr-20`}
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="login-password"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute bottom-1 right-1 inline-flex
                    min-h-11 items-center justify-center rounded-lg
                    px-3 text-xs font-semibold text-[#245747]
                    hover:bg-[#E8EDE4]
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-[#245747]
                    disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center
                justify-center gap-2 rounded-xl bg-[#245747]
                px-4 py-3 text-sm font-semibold text-white
                transition-colors hover:bg-[#173F35]
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[#245747]
                disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Logging in…" : "Log in"}

              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </fieldset>
        </form>

        <p className="mt-6 border-t border-[#245747]/15 pt-5 text-sm leading-6 text-[#57534E]">
          New here?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#245747]
              underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}