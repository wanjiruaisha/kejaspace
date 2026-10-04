import { Link } from "react-router";
import useAuth from "../../hooks/useAuth";
import SocialLinks from "../common/SocialLinks";

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
  "inline-block rounded-sm text-sm leading-6 text-[#D4E2D8] " +
  "transition hover:text-white hover:underline underline-offset-4 " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#E9BC9F]";

export default function Footer() {
  const { user, authLoading } = useAuth();

  const isManagement = Boolean(user && (user.is_staff || user.is_superuser));

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
    <footer
      className="relative isolate overflow-hidden
        bg-gradient-to-br from-[#173F35] via-[#204D40] to-[#102E28]
        text-[#FAF7F2]"
    >
      {/* Subtle background detail */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32
          -z-10 size-96 rounded-full
          bg-[#A8C3A0]/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24
          -z-10 size-80 rounded-full
          bg-[#C78965]/10 blur-3xl"
      />

      {/* Warm accent along the top edge */}
      <div
        aria-hidden="true"
        className="h-1 bg-gradient-to-r
          from-[#B45336] via-[#D6B18E] to-[#8FAC98]"
      />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.9fr_1.1fr]">
          {/* Brand */}
          <div className="min-w-0">
            <Link
              to="/"
              aria-label="KejaSpace home"
              className="inline-flex items-center gap-2.5 rounded-sm
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[#E9BC9F]"
            >
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center
                  rounded-t-xl rounded-b-md border border-white/20
                  bg-white/10 font-heading text-lg font-bold
                  text-[#FAF7F2]"
              >
                K
              </span>

              <span className="font-heading text-xl font-bold tracking-tight">
                KejaSpace
                <span className="text-[#E9BC9F]">.</span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-[#D4E2D8]">
              Find your room, follow your application and manage everyday hostel
              life in one place.
            </p>

            <p className="mt-5 text-xs font-medium tracking-wide text-[#E9BC9F]">
              Your space. Your stay. Simplified.
            </p>
            {/* Instagram and TikTok links */}
            <div className="mt-6">
              <SocialLinks dark />
            </div>
          </div>

          {/* General navigation */}
          <div>
            <h2 className="font-heading text-sm font-semibold text-[#FAF7F2]">
              Explore
            </h2>

            <nav aria-label="Footer explore" className="mt-4">
              <ul className="space-y-2.5">
                <li>
                  <Link to="/" className={linkClass}>
                    Home
                  </Link>
                </li>

                <li>
                  <Link to="/about" className={linkClass}>
                    About KejaSpace
                  </Link>
                </li>

                <li>
                  <Link to="/rooms" className={linkClass}>
                    Browse rooms
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className={linkClass}>
                    Contact
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
            <h2 className="font-heading text-sm font-semibold text-[#FAF7F2]">
              {authLoading ? "Your account" : accountTitle}
            </h2>

            {authLoading ? (
              <p
                role="status"
                className="mt-4 text-sm leading-6 text-[#D4E2D8]"
              >
                Loading account links…
              </p>
            ) : (
              <nav aria-label="Footer account" className="mt-4">
                <ul className="space-y-2.5">
                  {accountLinks.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  {user?.is_superuser && (
                    <li>
                      <Link to="/admin/announcements" className={linkClass}>
                        Manage announcements
                      </Link>
                    </li>
                  )}
                </ul>
              </nav>
            )}
          </div>

          {/* Glass guidance panel */}
          <div
            className="self-start rounded-2xl border border-white/15
              bg-white/10 p-5 backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#E9BC9F]">
              Planning your stay?
            </p>

            <h2 className="mt-2 font-heading text-sm font-semibold text-[#FAF7F2]">
              Before you move in
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#D4E2D8]">
              After application approval, pay the first month’s full rent before
              your payment deadline to confirm your reservation.
            </p>

            <Link
              to="/rooms"
              className="mt-4 inline-flex min-h-10 items-center gap-2
                rounded-lg border border-white/20 bg-white/10
                px-3 py-2 text-xs font-semibold text-[#FAF7F2]
                transition hover:border-white/40 hover:bg-white/15
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[#E9BC9F]"
            >
              Explore your options
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-8 flex flex-col gap-2 border-t border-white/15
            pt-5 text-xs leading-6 text-[#C4D5CA]
            sm:mt-10 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>© {new Date().getFullYear()} KejaSpace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
