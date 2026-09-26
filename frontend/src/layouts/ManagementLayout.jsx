import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import useAuth from "../hooks/useAuth";
import LogoutButton from "../components/auth/LogoutButton";
import ManagementIcon from "../components/common/ManagementIcon";

const staffLinks = [
  { label: "Dashboard", to: "/staff/dashboard", icon: "dashboard" },
  { label: "Applications", to: "/staff/applications", icon: "applications" },
  { label: "Resident stays", to: "/staff/stays", icon: "stays" },
  { label: "Rent & payments", to: "/staff/rent-payments", icon: "payments" },
  { label: "Maintenance", to: "/staff/maintenance", icon: "maintenance" },
  { label: "Visitors", to: "/staff/visitors", icon: "visitors" },
  { label: "Hostel notices", to: "/staff/notices", icon: "notices" },
];

const adminLinks = [
  { label: "Manage rooms", to: "/admin/rooms", icon: "rooms" },
  { label: "Manage users", to: "/admin/users", icon: "users" },
  {
    label: "Announcements",
    to: "/admin/announcements",
    icon: "notices",
  },
];

function SidebarLinks({ links, onNavigate }) {
  return (
    <div className="space-y-1">
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`
          }
        >
          <ManagementIcon name={item.icon} className="size-4 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
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

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  function renderNavigation() {
    return (
      <>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Navigation
        </p>

        <SidebarLinks
          links={staffLinks}
          onNavigate={() => setMenuOpen(false)}
        />

        {isAdmin && (
          <div className="mt-6">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Administration
            </p>

            <SidebarLinks
              links={adminLinks}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-dvh min-w-0 bg-gradient-to-br from-slate-50 via-[#f1fbfc] to-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-blue-700"
      >
        Skip to content
      </a>

      {/* Mobile navigation */}
      <header className="border-b border-slate-200/70 bg-white lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="font-heading text-base font-bold text-slate-900">
            Keja<span className="text-blue-600">Space</span>
          </Link>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="management-mobile-menu"
            onClick={() => setMenuOpen((previous) => !previous)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
          >
            {menuOpen ? "Close menu" : "☰ Menu"}
          </button>
        </div>

        <div
          id="management-mobile-menu"
          hidden={!menuOpen}
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-100 p-3"
        >
          {renderNavigation()}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <Link to="/" className="text-sm text-slate-600">
              View website
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col border-r border-slate-200/70 bg-white lg:flex">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-5 py-6 font-heading text-base font-bold text-slate-900"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 text-xs text-white">
            K
          </span>
          KejaSpace
        </Link>

        <div className="mx-3 flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700"
          >
            {user?.username?.charAt(0).toUpperCase() || "K"}
          </span>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700">
              {user?.username}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
              {roleLabel}
            </p>
          </div>
        </div>

        <nav
          aria-label="Management navigation"
          className="min-h-0 flex-1 overflow-y-auto px-3 py-6"
        >
          {renderNavigation()}
        </nav>

        <div className="space-y-3 border-t border-slate-100 p-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700"
          >
            <ManagementIcon name="arrow" />
            View website
          </Link>

          <LogoutButton />
        </div>
      </aside>

      {/* Pages render here */}
      <div className="min-w-0 lg:pl-52">
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {authError && (
            <p
              role="alert"
              className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
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