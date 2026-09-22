import { Link, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";

import Navbar from "../components/navigation/Navbar";


export default function PublicLayout() {
  const {  authError } = useAuth();
  
return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb]">
      <Navbar />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
      >
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
