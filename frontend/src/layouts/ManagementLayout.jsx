import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import useAuth from "../hooks/useAuth";
import LogoutButton from "../components/auth/LogoutButton";

const staffLinks = [
  { label: "Dashboard", to: "/staff/dashboard" },
  
  { label: "Applications", to: "/staff/applications" },
  { label: "Resident stays", to: "/staff/stays" },
  { label: "Rent & payments", to: "/staff/rent-payments" },
  { label: "Maintenance", to: "/staff/maintenance" },
  { label: "Visitors", to: "/staff/visitors" },
  { label: "Hostel notices", to: "/staff/notices" },
];

const adminLinks = [
  { label: "Manage rooms", to: "/admin/rooms" },
  { label: "Manage users", to: "/admin/users" },
  { label: "Manage announcements", to: "/admin/announcements" },
];

function navigationStyle({ isActive }) {
  return [
    "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export default function ManagementLayout() {
  const { user, authError } = useAuth();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);

  const isAdmin = Boolean(user?.is_superuser);
  const roleLabel = isAdmin ? "Administrator" : "Staff";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, user?.id]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function renderLinks(links) {
    return links.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={navigationStyle}
        onClick={() => setMenuOpen(false)}
      >
        {item.label}
      </NavLink>
    ));
  }

  return (
    <div className="min-h-dvh min-w-0 bg-[#f5f7fb]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-blue-700"
      >
        Skip to content
      </a>

      {/* Mobile header and expandable navigation */}
      <header className="border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Link
            to="/"
            className="font-heading text-lg font-bold text-slate-900"
          >
            Keja<span className="text-blue-700">Space</span>
          </Link>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="management-mobile-navigation"
            onClick={() => setMenuOpen((previous) => !previous)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            <svg
              width="20"
              height="20"
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

            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        <div
          id="management-mobile-navigation"
          hidden={!menuOpen}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-100 p-4"
        >
          <p className="break-words text-sm font-semibold text-slate-900">
            {user?.username}
          </p>
          <p className="mt-1 text-xs text-slate-500">{roleLabel}</p>

          <nav aria-label="Mobile management navigation" className="mt-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Hostel operations
            </p>

            <div className="space-y-1">{renderLinks(staffLinks)}</div>

            {isAdmin && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Administration
                </p>
                <div className="space-y-1">{renderLinks(adminLinks)}</div>
              </div>
            )}
          </nav>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <Link
              to="/"
              className="text-sm font-medium text-slate-600 hover:text-blue-700"
            >
              View website
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-100 px-5 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-heading text-lg font-bold text-slate-900"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-xl bg-blue-700 text-sm text-white"
            >
              K
            </span>

            <span>
              Keja<span className="text-blue-700">Space</span>
            </span>
          </Link>

          <div className="mt-5 rounded-xl bg-slate-50 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user?.username}
            </p>
            <p className="mt-1 text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>

        <nav
          aria-label="Management navigation"
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          <p className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Hostel operations
          </p>

          <div className="space-y-1">{renderLinks(staffLinks)}</div>

          {isAdmin && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Administration
              </p>
              <div className="space-y-1">{renderLinks(adminLinks)}</div>
            </div>
          )}
        </nav>

        <div className="space-y-4 border-t border-slate-100 p-5">
          <Link
            to="/"
            className="block text-sm font-medium text-slate-600 hover:text-blue-700"
          >
            ← View website
          </Link>

          <LogoutButton />
        </div>
      </aside>

      {/* Current page */}
      <div className="min-w-0 lg:pl-60">
        <header className="hidden h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 lg:flex">
          <p className="text-sm font-medium text-slate-600">
            Hostel management
          </p>
          <p className="text-xs text-slate-500">{roleLabel} workspace</p>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6"
        >
          {authError && (
            <p
              role="alert"
              className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
            >
              {authError}
            </p>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}