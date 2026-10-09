import { Link } from "react-router";
import useAuth from "../../hooks/useAuth";

const EMAIL = "wanjiruaisha30@gmail.com";
const PHONE = "+254797959709";
const WHATSAPP_URL = "https://wa.me/254797959709";

const linkStyle =
  "rounded-sm text-sm leading-6 text-slate-300 transition-colors " +
  "hover:text-white focus-visible:outline-2 " +
  "focus-visible:outline-offset-4 focus-visible:outline-emerald-300";

const socialStyle =
  "inline-flex size-11 items-center justify-center rounded-xl " +
  "border border-white/5 bg-white/10 text-slate-200 " +
  "transition-colors hover:bg-emerald-400 hover:text-[#102A43] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-emerald-300";

function FooterIcon({ name, className = "size-5" }) {
  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    email: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.79a2 2 0 0 1-.45 2.11L8.09 9.89a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.89.34 1.83.58 2.79.7A2 2 0 0 1 22 16.92Z" />
    ),
    location: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
    tiktok: (
      <>
        <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47" />
        <path d="M14 3c.6 3.3 2.7 5 6 5v3a9 9 0 0 1-6-2" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M21 11.5a9 9 0 0 1-13.4 7.9L3 21l1.6-4.6A9 9 0 1 1 21 11.5Z" />
        <path d="M8 7.5c0 4 4.5 8 8 8l1-2.5-3-1-1 1c-1.5-.7-2.5-1.7-3-3l1-1-1-2.5Z" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function Footer() {
  const { user, authLoading } = useAuth();

  const isManagement = Boolean(
    user?.is_staff || user?.is_superuser,
  );

  const accountPath = isManagement
    ? "/staff/dashboard"
    : "/my-applications";

  return (
    <footer className="bg-[#102A43] text-white">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-12 sm:px-8 sm:pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.7fr_1.2fr_0.9fr] lg:gap-8">
          {/* Brand */}
          <div className="min-w-0">
            <Link
              to="/"
              aria-label="KejaSpace home"
              className="inline-flex items-center gap-3 rounded-lg
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-emerald-300"
            >
              <span
                className="flex size-11 items-center justify-center
                  rounded-xl bg-white/10 text-emerald-400"
              >
                <FooterIcon name="home" className="size-6" />
              </span>

              <span className="font-heading text-xl font-bold tracking-tight">
                KejaSpace
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">
              Find your room, follow your application and manage
              everyday hostel life in one place.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h2 className="font-heading text-base font-semibold">
              Quick links
            </h2>

            <nav aria-label="Footer navigation" className="mt-5">
              <ul className="space-y-3">
                <li>
                  <Link to="/" className={linkStyle}>
                    Home
                  </Link>
                </li>

                <li>
                  <Link to="/rooms" className={linkStyle}>
                    Browse rooms
                  </Link>
                </li>

                <li>
                  <Link to="/about" className={linkStyle}>
                    About us
                  </Link>
                </li>

                <li>
                  <Link to="/contact" className={linkStyle}>
                    Contact
                  </Link>
                </li>

                {!authLoading && (
                  <li>
                    <Link
                      to={user ? accountPath : "/login"}
                      className={linkStyle}
                    >
                      {user
                        ? isManagement
                          ? "Management dashboard"
                          : "My applications"
                        : "Log in"}
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>

          {/* Contact details */}
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold">
              Contact
            </h2>

            <address className="mt-5 space-y-4 not-italic">
              <a
                href={`mailto:${EMAIL}`}
                className={`${linkStyle} flex items-start gap-3`}
              >
                <FooterIcon
                  name="email"
                  className="mt-0.5 size-5 shrink-0 text-emerald-400"
                />

                <span className="min-w-0 break-words">
                  {EMAIL}
                </span>
              </a>

              <a
                href={`tel:${PHONE}`}
                className={`${linkStyle} flex items-center gap-3`}
              >
                <FooterIcon
                  name="phone"
                  className="size-5 shrink-0 text-emerald-400"
                />

                <span>+254 797 959 709</span>
              </a>

              <p className="flex items-center gap-3 text-sm leading-6 text-slate-300">
                <FooterIcon
                  name="location"
                  className="size-5 shrink-0 text-emerald-400"
                />

                <span>Nairobi, Kenya</span>
              </p>
            </address>
          </div>

          {/* Social links */}
          <div>
            <h2 className="font-heading text-base font-semibold">
              Follow us
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-300">
              Stay connected with KejaSpace.
            </p>

            <nav
              aria-label="Social media and WhatsApp"
              className="mt-5 flex flex-wrap gap-3"
            >
              <a
                href="https://www.instagram.com/wwanjiru._/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (opens in a new tab)"
                title="Instagram"
                className={socialStyle}
              >
                <FooterIcon name="instagram" />
              </a>

              <a
                href="https://www.tiktok.com/@_.wwwanjiruu._"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok (opens in a new tab)"
                title="TikTok"
                className={socialStyle}
              >
                <FooterIcon name="tiktok" />
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp (opens in a new tab)"
                title="WhatsApp"
                className={socialStyle}
              >
                <FooterIcon name="whatsapp" />
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 flex flex-col gap-2 border-t
            border-white/15 pt-5 text-xs leading-6
            text-slate-400 sm:mt-12 sm:flex-row
            sm:items-center sm:justify-between"
        >
          <p>
            © {new Date().getFullYear()} KejaSpace. All rights reserved.
          </p>

          <p>Your space. Your stay. Simplified.</p>
        </div>
      </div>
    </footer>
  );
}