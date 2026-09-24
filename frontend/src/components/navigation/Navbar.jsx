import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

import useAuth from "../../hooks/useAuth";
import LogoutButton from "../auth/LogoutButton";
import LoadingMessage from "../common/LoadingMessage";

export default function Navbar() {
  const { user, authLoading } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = !user
    ? "guest"
    : user.is_superuser
      ? "admin"
      : user.is_staff
        ? "staff"
        : "resident";

  // Only include pages we have already built.
  const navigation = [
    {
      label: "Home",
      to: "/",
      roles: ["guest", "resident", "staff", "admin"],
    },
    {
      label: "Rooms",
      to: "/rooms",
      roles: ["guest", "resident", "staff", "admin"],
    },
    {
      label: "My applications",
      to: "/my-applications",
      roles: ["resident"],
    },
    {
      label: "Applications",
      to: "/staff/applications",
      roles: ["staff", "admin"],
    },
    {
     label: "My stay",
     to: "/my-stay",
     roles: ["resident"],
    },
    {
     label: "My charges",
     to: "/my-charges",
     roles: ["resident"],
    },
  ];

  const visibleLinks = navigation.filter((item) => item.roles.includes(role));

  // Close the mobile menu after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, user]);

  // Allow keyboard users to close the menu with Escape.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("mobile-menu-toggle")?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function linkStyle({ isActive }) {
    return `rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  }

  function renderAccountControls() {
    if (authLoading) {
      return <LoadingMessage label="Checking session…" compact />;
    }

    if (user) {
      return (
        <>
          <div className="min-w-0">
            <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
              {user.username}
            </p>

            <p className="text-xs capitalize text-slate-500">{role}</p>
          </div>

          <LogoutButton />
        </>
      );
    }

    return (
      <>
        <Link
          to="/login"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Log in
        </Link>

        <Link
          to="/register"
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          Create account
        </Link>
      </>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-blue-700"
      >
        Skip to content
      </a>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex min-h-20 items-center justify-between gap-5">
          <Link
            to="/"
            aria-label="KejaSpace home"
            className="flex shrink-0 items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-2xl bg-blue-700 text-lg font-bold text-white shadow-sm"
            >
              K
            </span>

            <span className="text-xl font-bold tracking-tight text-slate-900">
              Keja<span className="text-blue-700">Space</span>
            </span>
          </Link>

          {/* Navigation for larger screens */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {visibleLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={linkStyle}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            {renderAccountControls()}
          </div>

          {/* Menu toggle for smaller screens */}
          <button
            id="mobile-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            onClick={() => setMenuOpen((previous) => !previous)}
            className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M6 18L18 6" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Expandable mobile navigation */}
        <div
          id="mobile-navigation"
          hidden={!menuOpen}
          className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-slate-100 pb-5 lg:hidden"
        >
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col gap-1 py-4"
          >
            {visibleLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={linkStyle}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
            {renderAccountControls()}
          </div>
        </div>
      </div>
    </header>
  );
}
