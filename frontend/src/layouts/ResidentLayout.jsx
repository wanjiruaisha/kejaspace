import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { Menu, X } from "lucide-react";

import useAuth from "../hooks/useAuth";
import LogoutButton from "../components/auth/LogoutButton";

const residentLinks = [
  { label: "My applications", to: "/my-applications" },
  { label: "My stay", to: "/my-stay" },
  { label: "Rent & payments", to: "/my-charges" },
  { label: "Maintenance", to: "/my-maintenance" },
  { label: "My visitors", to: "/my-visitors" },
  { label: "Announcements", to: "/resident/announcements" },
];

function ResidentNavigation({ onNavigate }) {
  return (
    <nav aria-label="Resident navigation" className="space-y-1">
      {residentLinks.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center rounded-xl px-3 py-2.5
            text-sm font-medium transition-colors
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#245747] ${
              isActive
                ? "bg-[#245747] text-white shadow-sm"
                : "text-[#57534E] hover:bg-[#E8EDE4] hover:text-[#173F35]"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function ResidentLayout() {
  const { user, authError } = useAuth();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);

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

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-dvh min-w-0 bg-[#FAF7F2] text-[#173F35]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed
          focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg
          focus:bg-white focus:p-3 focus:text-[#245747]"
      >
        Skip to content
      </a>

      {/* Mobile header */}
      <header className="border-b border-[#245747]/15 bg-white lg:hidden">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <Link
            to="/"
            aria-label="KejaSpace home"
            className="font-heading text-lg font-bold"
          >
            KejaSpace<span className="text-[#965038]">.</span>
          </Link>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="resident-mobile-menu"
            aria-label={
              menuOpen ? "Close account menu" : "Open account menu"
            }
            onClick={() => setMenuOpen((previous) => !previous)}
            className="inline-flex min-h-11 items-center justify-center
              gap-2 rounded-xl border border-[#245747]/20 px-3
              text-sm font-semibold hover:bg-[#E8EDE4]"
          >
            {menuOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
            <span>My account</span>
          </button>
        </div>

        <div
          id="resident-mobile-menu"
          hidden={!menuOpen}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto
            border-t border-[#245747]/10 p-4"
        >
          <p className="mb-4 break-words text-sm font-semibold">
            Karibu, {user?.username}.
          </p>

          <ResidentNavigation onNavigate={closeMenu} />

          <div className="mt-4 flex flex-wrap items-center justify-between
            gap-3 border-t border-[#245747]/15 pt-4">
            <Link
              to="/"
              onClick={closeMenu}
              className="inline-flex min-h-11 items-center text-sm
                font-semibold text-[#245747] hover:underline"
            >
              ← View website
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-60 flex-col
          border-r border-[#245747]/15 bg-white lg:flex"
      >
        <Link
          to="/"
          aria-label="KejaSpace home"
          className="flex items-center gap-3 px-5 py-6
            font-heading text-lg font-bold"
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center
              rounded-xl bg-[#245747] text-sm text-white"
          >
            K
          </span>

          <span>
            KejaSpace<span className="text-[#965038]">.</span>
          </span>
        </Link>

        <div className="mx-4 flex items-center gap-3 rounded-xl bg-[#E8EDE4] p-3">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center
              rounded-full bg-white text-sm font-bold text-[#245747]"
          >
            {user?.username?.charAt(0).toUpperCase() || "K"}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user?.username}
            </p>
            <p className="mt-0.5 text-xs text-[#57534E]">
              Resident account
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase
            tracking-wider text-[#78716C]">
            Your stay
          </p>

          <ResidentNavigation />
        </div>

        <div className="space-y-3 border-t border-[#245747]/15 p-4">
          <Link
            to="/rooms"
            className="flex min-h-11 items-center rounded-lg px-3
              text-sm font-medium text-[#245747] hover:bg-[#E8EDE4]"
          >
            Browse rooms
          </Link>

          <Link
            to="/"
            className="flex min-h-11 items-center rounded-lg px-3
              text-sm font-medium text-[#57534E] hover:bg-[#E8EDE4]"
          >
            ← View website
          </Link>

          <LogoutButton />
        </div>
      </aside>

      {/* Resident pages */}
      <div className="min-w-0 lg:pl-60">
        <div
          className="hidden min-h-16 items-center justify-between
            gap-4 border-b border-[#245747]/10 bg-white/70 px-8 lg:flex"
        >
          <p className="text-sm font-semibold">My account</p>

          <Link
            to="/contact"
            className="text-sm font-medium text-[#245747]
              underline-offset-4 hover:underline"
          >
            Need help?
          </Link>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-6xl
            px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {authError && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-amber-200
                bg-amber-50 p-3 text-sm text-amber-900"
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