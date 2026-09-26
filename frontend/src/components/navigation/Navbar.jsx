import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

import useAuth from "../../hooks/useAuth";
import LogoutButton from "../auth/LogoutButton";
import LoadingMessage from "../common/LoadingMessage";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "About", to: "/about" },
];

const accountLinks = [
  {
    label: "My applications",
    to: "/my-applications",
    roles: ["resident"],
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
  {
    label: "Maintenance",
    to: "/my-maintenance",
    roles: ["resident"],
  },
  {
    label: "My visitors",
    to: "/my-visitors",
    roles: ["resident"],
  },
  {
    label: "Applications",
    to: "/staff/applications",
    roles: ["staff", "admin"],
  },
  {
    label: "Resident stays",
    to: "/staff/stays",
    roles: ["staff", "admin"],
  },
  {
    label: "Maintenance",
    to: "/staff/maintenance",
    roles: ["staff", "admin"],
  },
  {
    label: "Visitors",
    to: "/staff/visitors",
    roles: ["staff", "admin"],
  },
  {
    label: "Announcements",
    to: "/announcements",
    roles: ["resident", "staff", "admin"],
  },
  {
  label: "Rent & payments",
  to: "/staff/rent-payments",
  roles: ["staff", "admin"],
  },
];

const adminLinks = [
  { label: "Manage rooms", to: "/admin/rooms" },
  { label: "Manage users", to: "/admin/users" },
  { label: "Manage announcements", to: "/admin/announcements" },
];

function linkStyle({ isActive }) {
  return [
    "block rounded-xl px-4 py-3 text-sm font-semibold transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export default function Navbar() {
  const { user, authLoading } = useAuth();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  const role = !user
    ? "guest"
    : user.is_superuser
      ? "admin"
      : user.is_staff
        ? "staff"
        : "resident";

  const visibleLinks = accountLinks.filter((item) =>
    item.roles.includes(role),
  );

  // Close navigation after changing pages or accounts.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, user?.id, role]);

  // Close with Escape or by clicking outside the menu.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    function handlePointerDown(event) {
      if (
        !menuRef.current?.contains(event.target) &&
        !toggleRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    // Also close when keyboard focus moves outside the menu.
    function handleFocusIn(event) {
      if (
        !menuRef.current?.contains(event.target) &&
        !toggleRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [menuOpen]);

  function renderLinks(items) {
    return items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === "/"}
        className={linkStyle}
        onClick={() => setMenuOpen(false)}
      >
        {item.label}
      </NavLink>
    ));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-blue-700"
      >
        Skip to content
      </a>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex h-20 items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="KejaSpace home"
            className="flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-2xl bg-blue-700 text-lg font-bold text-white"
            >
              K
            </span>

            <span className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Keja<span className="text-blue-700">Space</span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {renderLinks(publicLinks)}
          </nav>

          <div className="flex min-w-0 items-center gap-3">
            {!authLoading && user && (
              <div className="hidden min-w-0 text-right lg:block">
                <p className="max-w-32 truncate text-sm font-semibold text-slate-900">
                  {user.username}
                </p>

                <p className="text-xs capitalize text-slate-500">
                  {role}
                </p>
              </div>
            )}

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="account-navigation"
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              onClick={() => setMenuOpen((previous) => !previous)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
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

              <span className="hidden sm:inline">
                {menuOpen ? "Close" : "Menu"}
              </span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            ref={menuRef}
            id="account-navigation"
            className="absolute right-4 top-full mt-2 max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-xl sm:right-8"
          >
            <div className="border-b border-slate-100 p-5">
              {authLoading ? (
                <LoadingMessage label="Checking session…" compact />
              ) : user ? (
                <>
                  <p className="break-words font-bold text-slate-900">
                    {user.username}
                  </p>

                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {role} account
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-900">
                    Welcome to KejaSpace
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Find and manage your space.
                  </p>
                </>
              )}
            </div>

            <nav aria-label="Account navigation" className="p-3">
              <div className="md:hidden">
                <p className="px-4 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Explore
                </p>

                <div className="flex flex-col gap-1">
                  {renderLinks(publicLinks)}
                </div>
              </div>

              {!authLoading && user && (
                <div className="mt-3 md:mt-0">
                  <p className="px-4 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {role === "resident" ? "My accommodation" : "Hostel operations"}
                  </p>

                  <div className="flex flex-col gap-1">
                    {renderLinks(visibleLinks)}
                  </div>
                </div>
              )}

              {!authLoading && role === "admin" && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="px-4 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Administration
                  </p>

                  <div className="flex flex-col gap-1">
                    {renderLinks(adminLinks)}
                  </div>
                </div>
              )}
            </nav>

            {!authLoading && (
              <div className="border-t border-slate-100 p-4">
                {user ? (
                  <LogoutButton />
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Log in
                    </Link>

                    <Link
                      to="/register"
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}