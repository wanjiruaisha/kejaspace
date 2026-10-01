import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import useAuth from "../hooks/useAuth";
import LogoutButton from "../components/auth/LogoutButton";
import ManagementIcon from "../components/common/ManagementIcon";

const operationsLinks = [
  {
    label: "Dashboard",
    to: "/staff/dashboard",
    icon: "dashboard",
  },
  {
    label: "Applications",
    to: "/staff/applications",
    icon: "applications",
  },
  {
    label: "Resident stays",
    to: "/staff/stays",
    icon: "stays",
  },
  {
    label: "Rent & payments",
    to: "/staff/rent-payments",
    icon: "payments",
  },
  {
    label: "Maintenance",
    to: "/staff/maintenance",
    icon: "maintenance",
  },
  {
    label: "Visitors",
    to: "/staff/visitors",
    icon: "visitors",
  },
  {
    label: "Hostel notices",
    to: "/staff/notices",
    icon: "notices",
  },
];

const reportLinks = [
  {
    label: "Occupancy report",
    to: "/staff/reports/occupancy",
    icon: "rooms",
  },
  {
    label: "Payment report",
    to: "/staff/reports/payments",
    icon: "payments",
  },
];

const adminLinks = [
  {
    label: "Manage rooms",
    to: "/admin/rooms",
    icon: "rooms",
  },
  {
    label: "Manage users",
    to: "/admin/users",
    icon: "users",
  },
  {
    label: "Announcements",
    to: "/admin/announcements",
    icon: "notices",
  },
];

const allLinks = [...operationsLinks, ...reportLinks, ...adminLinks];

function SidebarLinks({ links, onNavigate }) {
  return (
    <ul className="space-y-1">
      {links.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === "/staff/dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-xl
              px-3 py-2.5 text-[13px] font-medium
              transition-colors
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#E9BC9F] ${
                isActive
                  ? "bg-[#E8EDE4] text-[#173F35] shadow-sm"
                  : "text-[#D5E4DB] hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <ManagementIcon
              name={item.icon}
              className="size-4 shrink-0"
            />

            <span className="min-w-0 break-words">{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function NavigationGroup({ title, links, onNavigate }) {
  return (
    <div>
      <p
        className="mb-2 px-3 text-[11px] font-semibold
          uppercase tracking-[0.14em] text-[#ADC6B7]"
      >
        {title}
      </p>

      <SidebarLinks links={links} onNavigate={onNavigate} />
    </div>
  );
}

function Brand({ onNavigate }) {
  return (
    <Link
      to="/staff/dashboard"
      onClick={onNavigate}
      aria-label="KejaSpace management dashboard"
      className="inline-flex min-h-11 items-center gap-2.5
        rounded-lg font-heading text-lg font-bold text-white
        focus-visible:outline-2 focus-visible:outline-offset-4
        focus-visible:outline-[#E9BC9F]"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center
          rounded-xl border border-white/20
          bg-gradient-to-br from-[#739981] to-[#365F4D]
          text-sm text-white"
      >
        K
      </span>

      <span>
        KejaSpace<span className="text-[#E9BC9F]">.</span>
      </span>
    </Link>
  );
}

function AccountSummary({ username, roleLabel }) {
  return (
    <div
      className="flex min-w-0 items-center gap-3
        rounded-xl border border-white/10 bg-white/5 p-3"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center
          rounded-full bg-[#E9BC9F] text-sm
          font-bold text-[#173F35]"
      >
        {username?.charAt(0).toUpperCase() || "K"}
      </span>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {username || "Your account"}
        </p>

        <p className="mt-0.5 text-xs text-[#BDD1C5]">
          {roleLabel}
        </p>
      </div>
    </div>
  );
}

export default function ManagementLayout() {
  const { user, authError } = useAuth();
  const { pathname } = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleRef = useRef(null);
  const mobileHeaderRef = useRef(null);

  const isAdmin = Boolean(user?.is_superuser);
  const roleLabel = isAdmin ? "Administrator" : "Staff";

  const currentPage = allLinks.find(
    (item) =>
      pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  function closeMenu() {
    setMenuOpen(false);
  }

  // Close the mobile menu after changing pages or accounts.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, user?.id]);

  // Close with Escape, an outside click, or keyboard focus leaving the menu.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    function handlePointerDown(event) {
      if (!mobileHeaderRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleFocusIn(event) {
      if (!mobileHeaderRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [menuOpen]);

  // Prevent an open mobile menu from lingering after switching to desktop.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 64rem)");

    function handleScreenChange(event) {
      if (event.matches) {
        setMenuOpen(false);
      }
    }

    mediaQuery.addEventListener("change", handleScreenChange);

    return () => {
      mediaQuery.removeEventListener("change", handleScreenChange);
    };
  }, []);

  function renderNavigation() {
    return (
      <div className="space-y-6">
        <NavigationGroup
          title="Daily operations"
          links={operationsLinks}
          onNavigate={closeMenu}
        />

        <NavigationGroup
          title="Reports"
          links={reportLinks}
          onNavigate={closeMenu}
        />

        {isAdmin && (
          <NavigationGroup
            title="Administration"
            links={adminLinks}
            onNavigate={closeMenu}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-w-0 bg-[#FAF7F2] text-[#173F35]">
      <a
        href="#main-content"
        onClick={closeMenu}
        className="sr-only focus:not-sr-only focus:fixed
          focus:left-4 focus:top-4 focus:z-50
          focus:rounded-xl focus:bg-white focus:p-3
          focus:text-[#173F35] focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Mobile header and dropdown navigation */}
      <header
        ref={mobileHeaderRef}
        className="sticky top-0 z-40 border-b border-white/10
          bg-[#173F35] lg:hidden"
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Brand onNavigate={closeMenu} />

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="management-mobile-menu"
            aria-label={
              menuOpen
                ? "Close management navigation"
                : "Open management navigation"
            }
            onClick={() => setMenuOpen((previous) => !previous)}
            className="inline-flex min-h-11 items-center
              justify-center gap-2 rounded-xl
              border border-white/20 px-3 text-sm
              font-medium text-white transition-colors
              hover:bg-white/10
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#E9BC9F]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-5"
            >
              {menuOpen ? (
                <>
                  <path d="m6 6 12 12" />
                  <path d="M6 18 18 6" />
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
          id="management-mobile-menu"
          hidden={!menuOpen}
          className="absolute inset-x-0 top-full
            max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain
            border-t border-white/10 bg-[#173F35]
            p-4 shadow-xl"
        >
          <AccountSummary
            username={user?.username}
            roleLabel={roleLabel}
          />

          <nav
            aria-label="Mobile management navigation"
            className="mt-5"
          >
            {renderNavigation()}
          </nav>

          <div
            className="mt-5 flex flex-wrap items-center
              justify-between gap-3 border-t border-white/15 pt-4"
          >
            <Link
              to="/"
              onClick={closeMenu}
              className="inline-flex min-h-11 items-center gap-2
                rounded-lg text-sm font-medium text-[#E2EBE4]
                hover:text-white
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-[#E9BC9F]"
            >
              <span aria-hidden="true">↗</span>
              View website
            </Link>

            <div className="rounded-xl bg-[#FAF7F2] p-1 text-[#173F35]">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden
          w-60 flex-col border-r border-[#102E28]/10
          bg-gradient-to-b from-[#173F35] to-[#102E28] lg:flex"
      >
        <div className="shrink-0 px-5 pb-5 pt-6">
          <Brand />

          <p className="mt-2 pl-0.5 text-xs text-[#BDD1C5]">
            Hostel management
          </p>
        </div>

        <div className="mx-3 shrink-0">
          <AccountSummary
            username={user?.username}
            roleLabel={roleLabel}
          />
        </div>

        <nav
          aria-label="Management navigation"
          className="min-h-0 flex-1 overflow-y-auto
            overscroll-contain px-3 py-6"
        >
          {renderNavigation()}
        </nav>

        <div className="shrink-0 border-t border-white/15 p-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2
              rounded-lg text-sm font-medium text-[#D5E4DB]
              hover:text-white
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#E9BC9F]"
          >
            <span aria-hidden="true">↗</span>
            View website
          </Link>

          <div className="mt-2 rounded-xl bg-[#FAF7F2] p-2 text-[#173F35]">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Management workspace */}
      <div className="min-w-0 lg:pl-60">
        <div className="border-b border-[#245747]/10 bg-white/70">
          <div
            className="mx-auto flex min-h-16 w-full
              max-w-[1400px] items-center justify-between
              gap-4 px-4 py-3 sm:px-6 lg:px-8"
          >
            <div className="min-w-0">
              <p
                className="text-[11px] font-semibold uppercase
                  tracking-[0.12em] text-[#965038]"
              >
                Management
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-[#173F35]">
                {currentPage?.label || "Workspace"}
              </p>
            </div>

            <span
              className="shrink-0 rounded-full border
                border-[#245747]/15 bg-[#E8EDE4]
                px-3 py-1.5 text-xs font-medium text-[#245747]"
            >
              {roleLabel}
            </span>
          </div>
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1400px]
            scroll-mt-20 px-4 py-5 sm:px-6
            lg:px-8 lg:py-7"
        >
          {authError && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-amber-200
                bg-amber-50 p-3 text-sm leading-6 text-amber-900"
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