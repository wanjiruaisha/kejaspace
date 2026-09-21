import { Link, NavLink, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";

export default function PublicLayout() {
  const { user, authLoading, authError } = useAuth();
  const linkStyle = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb]">
      <header className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"
        >
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-700 text-lg font-bold text-white">
              K
            </span>

            <span className="text-xl font-bold tracking-tight text-slate-900">
              Keja<span className="text-blue-700">Space</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-1">
            <NavLink to="/" end className={linkStyle}>
              Home
            </NavLink>

            <NavLink to="/rooms" className={linkStyle}>
              Rooms
            </NavLink>
            {authLoading ? (
              <span className="px-3 text-sm text-slate-500">
                Checking session…
              </span>
            ) : user ? (
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                Hi, {user.username}
              </span>
            ) : (
              <>
                <NavLink to="/login" className={linkStyle}>
                  Log in
                </NavLink>

                <Link
                  to="/register"
                  className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {authError && (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          >
            {authError}
          </p>
        )}
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand and introduction */}
            <div>
              <Link to="/" className="inline-flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-700 text-lg font-bold text-white">
                  K
                </span>

                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Keja<span className="text-blue-700">Space</span>
                </span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
                Find your room, manage your accommodation and stay connected
                with hostel management—all in one place.
              </p>
            </div>

            {/* Working navigation links */}
            <div>
              <h2 className="text-sm font-bold text-slate-900">Explore</h2>

              <nav aria-label="Footer navigation" className="mt-4">
                <ul className="space-y-3 text-sm text-slate-600">
                  <li>
                    <Link
                      to="/"
                      className="transition hover:text-blue-700 hover:underline"
                    >
                      Home
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/rooms"
                      className="transition hover:text-blue-700 hover:underline"
                    >
                      Browse rooms
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Useful accommodation information */}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Planning your stay?
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-500">
                Compare room prices and available spaces before applying. Your
                reservation is confirmed after approval and payment of the first
                month’s rent.
              </p>

              <Link
                to="/rooms"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                Find a room
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} KejaSpace. All rights reserved.</p>

            <p>Your space. Your stay. Simplified.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
