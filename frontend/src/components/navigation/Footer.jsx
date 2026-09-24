import { Link } from "react-router";
import useAuth from "../../hooks/useAuth";

const residentLinks = [
  { label: "My applications", to: "/my-applications" },
  { label: "My stay", to: "/my-stay" },
  { label: "My charges", to: "/my-charges" },
  { label: "Maintenance", to: "/my-maintenance" },
];

const managementLinks = [
  { label: "Applications", to: "/staff/applications" },
  { label: "Resident stays", to: "/staff/stays" },
  { label: "Maintenance", to: "/staff/maintenance" },
  { label: "Visitors", to: "/staff/visitors" },
];

const guestLinks = [
  { label: "Log in", to: "/login" },
  { label: "Create an account", to: "/register" },
];

const linkClass =
  "text-sm leading-6 text-slate-300 transition hover:text-white hover:underline underline-offset-4";

export default function Footer() {
  const { user, authLoading } = useAuth();

  const isManagement = Boolean(
    user && (user.is_staff || user.is_superuser),
  );

  const accountLinks = !user
    ? guestLinks
    : isManagement
      ? managementLinks
      : residentLinks;

  const accountTitle = !user
    ? "Your account"
    : isManagement
      ? "Management"
      : "Your stay";

  return (
    <footer className="mt-12 bg-slate-950 text-white sm:mt-16">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link
              to="/"
              aria-label="KejaSpace home"
              className="inline-flex items-center gap-3"
            >
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold"
              >
                K
              </span>

              <span className="text-2xl font-bold tracking-tight">
                Keja<span className="text-blue-400">Space</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-400">
              Find your room, follow your application and manage
              everyday hostel life in one place.
            </p>

            <p className="mt-5 text-sm font-medium text-blue-300">
              Your space. Your stay. Simplified.
            </p>
          </div>

          {/* General navigation */}
          <div>
            <h2 className="text-sm font-semibold text-white">
              Explore
            </h2>

            <nav aria-label="Footer explore" className="mt-5">
              <ul className="space-y-3">
                <li>
                  <Link to="/" className={linkClass}>
                    Home
                  </Link>
                </li>

                <li>
                  <Link to="/rooms" className={linkClass}>
                    Browse rooms
                  </Link>
                </li>

                {!authLoading && user && (
                  <li>
                    <Link to="/announcements" className={linkClass}>
                      Announcements
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>

          {/* Role-specific navigation */}
          <div>
            <h2 className="text-sm font-semibold text-white">
              {authLoading ? "Your account" : accountTitle}
            </h2>

            {authLoading ? (
              <p role="status" className="mt-5 text-sm text-slate-400">
                Loading account links…
              </p>
            ) : (
              <nav aria-label="Footer account" className="mt-5">
                <ul className="space-y-3">
                  {accountLinks.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  {user?.is_superuser && (
                    <li>
                      <Link
                        to="/admin/announcements"
                        className={linkClass}
                      >
                        Manage announcements
                      </Link>
                    </li>
                  )}
                </ul>
              </nav>
            )}
          </div>

          {/* Useful guidance */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white">
              Before you move in
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              After application approval, pay the first month’s full
              rent before your payment deadline to confirm your
              reservation.
            </p>

            <Link
              to="/rooms"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:text-blue-200"
            >
              Explore your options
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs leading-6 text-slate-400 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} KejaSpace. All rights reserved.
          </p>

          <p>Room applications · Resident services · Hostel management</p>
        </div>
      </div>
    </footer>
  );
}