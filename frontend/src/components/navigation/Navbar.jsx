import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

import useAuth from "../../hooks/useAuth";
import LogoutButton from "../auth/LogoutButton";
import LoadingMessage from "../common/LoadingMessage";
import { Menu, X } from "lucide-react";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "Rooms", to: "/rooms" },
  { label: "About", to: "/about" },
  {
    label: "Contact",
    to: "/contact",
    roles: ["guest", "resident", "staff", "admin"],
  },
];

const accountLinks = [
  {
    label: "Dashboard",
    to: "/staff/dashboard",
    roles: ["staff", "admin"],
  },
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
    label: "Rent & payments",
    to: "/staff/rent-payments",
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
];

const adminLinks = [
  { label: "Manage rooms", to: "/admin/rooms" },
  { label: "Manage users", to: "/admin/users" },
  { label: "Manage announcements", to: "/admin/announcements" },
];

function dropdownLinkStyle({ isActive }) {
  return [
    "block rounded-lg px-3 py-2.5 text-sm font-medium transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-[#245747]",
    isActive
      ? "bg-[#E3EDE3] text-[#173F35]"
      : "text-[#57534E] hover:bg-[#EEF2EA] hover:text-[#173F35]",
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

  const visibleLinks = accountLinks.filter((item) => item.roles.includes(role));

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, user?.id, role]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }

    function handleOutsideInteraction(event) {
      const insideMenu = menuRef.current?.contains(event.target);
      const insideToggle = toggleRef.current?.contains(event.target);

      if (!insideMenu && !insideToggle) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsideInteraction);
    document.addEventListener("focusin", handleOutsideInteraction);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutsideInteraction);
      document.removeEventListener("focusin", handleOutsideInteraction);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-[#245747]/15
        bg-gradient-to-r from-[#FAF7F2] via-[#EDF3E8] to-[#D6E7DD]
        shadow-[0_4px_20px_rgba(23,63,53,0.07)]"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute
          focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg
          focus:bg-white focus:p-3 focus:text-[#173F35]"
      >
        Skip to content
      </a>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex h-18 items-center justify-between gap-3">
          {/* Brand */}
          <Link
            to="/"
            aria-label="KejaSpace home"
            onClick={closeMenu}
            className="group inline-flex shrink-0 items-center gap-2.5"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center
                rounded-t-xl rounded-b-md
                bg-gradient-to-br from-[#39735D] to-[#173F35]
                font-heading text-lg font-bold text-white
                shadow-[0_4px_10px_rgba(23,63,53,0.18)]
                transition-transform motion-safe:group-hover:-rotate-6"
            >
              K
            </span>

            <span className="font-heading text-lg font-bold tracking-tight text-[#173F35]">
              KejaSpace
              <span className="text-[#B45336]">.</span>
            </span>
          </Link>

          {/* Public navigation on larger screens */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 md:flex"
          >
            {publicLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                    "border-b-2 px-1 py-2 text-sm font-semibold transition",
                    isActive
                      ? "border-[#B45336] text-[#173F35]"
                      : "border-transparent text-[#57534E] hover:border-[#B45336]/50 hover:text-[#173F35]",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Account and menu controls */}
          <div className="flex min-w-0 items-center gap-3">
            {!authLoading && !user && (
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm
                  font-semibold text-[#173F35] transition
                  hover:bg-white/50 sm:inline-flex"
              >
                Log in
              </Link>
            )}

            {!authLoading && user && (
              <span className="hidden max-w-32 truncate text-sm font-medium text-[#173F35] lg:block">
                Hi, {user.username}
              </span>
            )}

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="navbar-menu"
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              onClick={() => setMenuOpen((previous) => !previous)}
              className="inline-flex min-h-11 shrink-0 items-center
                justify-center gap-2 rounded-xl border border-white/70
                bg-white/60 px-3.5 py-2 text-sm font-semibold
                text-[#173F35] shadow-sm backdrop-blur-md transition
                hover:border-[#245747]/25 hover:bg-white/90
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[#245747]"
            >
              <span className="hidden sm:inline">
                {menuOpen ? "Close" : "Menu"}
              </span>

              {menuOpen ? (
                <X size={22} aria-hidden="true" />
              ) : (
                <Menu size={22} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Dropdown stays above the page instead of pushing it down */}
        <div
          ref={menuRef}
          id="navbar-menu"
          hidden={!menuOpen}
          className="absolute right-4 top-full mt-2
            max-h-[calc(100dvh-6rem)] w-80
            max-w-[calc(100vw-2rem)] overflow-y-auto
            overscroll-contain rounded-2xl border border-[#245747]/15
            bg-[#FCFAF6] shadow-[0_20px_60px_rgba(23,63,53,0.18)]
            sm:right-8"
        >
          {/* Account information */}
          <div className="border-b border-[#245747]/10 bg-[#E8EDE4]/60 p-4">
            {authLoading ? (
              <LoadingMessage label="Checking session…" compact />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center
                    justify-center rounded-xl bg-[#245747]
                    text-sm font-bold text-white"
                >
                  {user.username?.charAt(0).toUpperCase() || "K"}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#173F35]">
                    {user.username}
                  </p>

                  <p className="mt-0.5 text-xs capitalize text-[#57534E]">
                    {role === "admin" ? "Administrator" : role}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-heading text-sm font-bold text-[#173F35]">
                  Welcome to KejaSpace
                </p>

                <p className="mt-1 text-xs leading-5 text-[#57534E]">
                  Find your room and manage your stay.
                </p>
              </div>
            )}
          </div>

          <div className="p-3">
            {/* Public links in the mobile menu */}
            <nav aria-label="Mobile navigation" className="space-y-1 md:hidden">
              {publicLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeMenu}
                  className={dropdownLinkStyle}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {!authLoading && user && (
              <>
                <nav
                  aria-label="Account navigation"
                  className="mt-3 space-y-1 border-t
                    border-[#245747]/10 pt-3 md:mt-0
                    md:border-t-0 md:pt-0"
                >
                  <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[#78716C]">
                    Your account
                  </p>

                  {visibleLinks.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={closeMenu}
                      className={dropdownLinkStyle}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>

                {role === "admin" && (
                  <nav
                    aria-label="Administration navigation"
                    className="mt-3 space-y-1 border-t border-[#245747]/10 pt-3"
                  >
                    <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-[#78716C]">
                      Administration
                    </p>

                    {adminLinks.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={closeMenu}
                        className={dropdownLinkStyle}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                )}
              </>
            )}
          </div>

          {!authLoading && (
            <div className="border-t border-[#245747]/10 p-4">
              {user ? (
                <LogoutButton />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="inline-flex min-h-11 items-center
                      justify-center rounded-xl border border-[#245747]/25
                      px-3 py-2 text-sm font-semibold text-[#173F35]
                      transition hover:bg-[#E8EDE4]"
                  >
                    Log in
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="inline-flex min-h-11 items-center
                      justify-center rounded-xl bg-[#245747]
                      px-3 py-2 text-sm font-semibold text-white
                      transition hover:bg-[#173F35]"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
