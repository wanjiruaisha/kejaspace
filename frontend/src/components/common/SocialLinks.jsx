const socialLinks = [
  {
    name: "Instagram",
    username: "@wwanjiru._",
    href: "https://www.instagram.com/wwanjiru._/",
    icon: "instagram",
  },
  {
    name: "TikTok",
    username: "@_.wwwanjiruu._",
    href: "https://www.tiktok.com/@_.wwwanjiruu._",
    icon: "tiktok",
  },
];

function SocialIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      {name === "instagram" ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle
            cx="17.5"
            cy="6.5"
            r="1"
            fill="currentColor"
            stroke="none"
          />
        </g>
      ) : (
        <path
          fill="currentColor"
          d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89
          2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0
          .6.05.88.14V9.4a6.34 6.34 0 0 0-5.07 10.87 6.34
          6.34 0 0 0 10.53-4.6V8.68a8.16 8.16 0 0 0
          4.77 1.52V6.77a4.85 4.85 0 0 1-1-.08Z"
        />
      )}
    </svg>
  );
}

export default function SocialLinks({ dark = false }) {
  return (
    <div>
      <p
        className={`text-sm font-semibold ${
          dark ? "text-white" : "text-[#173F35]"
        }`}
      >
      </p>

      <div className="mt-3 flex flex-wrap gap-3">
        {socialLinks.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${social.name}: ${social.username} (opens in a new tab)`}
            className={`inline-flex min-h-11 items-center gap-2
              rounded-xl border px-4 py-2.5 text-sm font-medium
              transition-colors focus-visible:outline-2
              focus-visible:outline-offset-4 ${
                dark
                  ? "border-white/20 bg-white/5 text-white hover:bg-white/15 focus-visible:outline-white"
                  : "border-[#245747]/20 bg-white text-[#245747] hover:bg-[#EDF3E8] focus-visible:outline-[#245747]"
              }`}
          >
            <SocialIcon name={social.icon} />
            {social.name}
            <span aria-hidden="true" className="text-xs opacity-70">
              ↗
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}