import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

const email = "wanjiruaisha30@gmail.com";
const phone = "+254797959709";

const subject = "KejaSpace enquiry";

const gmailUrl =
  "https://mail.google.com/mail/?view=cm&fs=1" +
  `&to=${encodeURIComponent(email)}` +
  `&su=${encodeURIComponent(subject)}`;

const emailUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

const whatsappUrl =
  "https://wa.me/254797959709?text=" +
  encodeURIComponent("Hi Aisha! I have a question about KejaSpace.");

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747]";

const primaryButton = `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#EDF3E8]";

function ContactIcon({ type, className = "size-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {type === "email" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m3 7 9 6 9-6" />
        </>
      ) : type === "copy" ? (
        <>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </>
      ) : (
        <>
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z" />
          <path d="M8 9h8M8 13h5" />
        </>
      )}
    </svg>
  );
}

export default function ContactPage() {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const emailRef = useRef(null);
  const resetTimer = useRef(null);

  useEffect(() => {
    return () => window.clearTimeout(resetTimer.current);
  }, []);

  async function copyEmail() {
    window.clearTimeout(resetTimer.current);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable.");
      }

      await navigator.clipboard.writeText(email);

      setCopied(true);
      setCopyMessage("Email copied. Paste it into your email app.");

      resetTimer.current = window.setTimeout(() => {
        setCopied(false);
        setCopyMessage("");
      }, 5000);
    } catch {
      setCopied(false);

      // Select the address so it can still be copied manually.
      emailRef.current?.focus();
      emailRef.current?.select();

      setCopyMessage(
        "Automatic copying is unavailable. The email is selected—copy it manually.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7 sm:space-y-9">
      {/* Introduction */}
      <section
        aria-labelledby="contact-heading"
        className="grid overflow-hidden rounded-3xl
          border border-[#245747]/15 bg-[#FAF7F2]
          md:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="relative px-5 py-8 sm:px-8 sm:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-5 top-6
              size-20 rounded-full border-[14px] border-[#E9BC9F]/25"
          />

          <div className="relative">
            <p
              className="text-xs font-semibold uppercase
                tracking-[0.16em] text-[#965038]"
            >
              A little conversation goes a long way
            </p>

            <h1
              id="contact-heading"
              className="mt-4 font-heading text-3xl font-bold
                leading-tight tracking-tight text-[#173F35]
                sm:text-4xl"
            >
              Questions?
              <span className="block text-[#965038]">
                You’re in the right place.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#57534E]">
              Have a question about KejaSpace or need help finding your way
              around? Get in touch with your enquiries, feedback or suggestions.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Questions", "Feedback", "Ideas"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[#245747]/15
                    bg-white/80 px-3 py-1.5 text-xs
                    font-medium text-[#245747]"
                >
                  {label}
                </span>
              ))}
            </div>

            <p className="mt-6 text-xs leading-6 text-[#78716C]">
              Choose email or WhatsApp below. You don’t need an account to get
              in touch.
            </p>
          </div>
        </div>

        {/* Existing project photo with a graceful fallback */}
        <div
          className="relative isolate flex min-h-60
            items-end overflow-hidden bg-[#173F35] p-5 sm:p-6"
        >
          {!photoFailed && (
            <img
              src="/images/home-hero.jpg"
              alt=""
              decoding="async"
              onError={() => setPhotoFailed(true)}
              className="absolute inset-0 -z-20 h-full
                w-full object-cover object-center"
            />
          )}

          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t
              from-[#102E28]/95 via-[#102E28]/45 to-[#102E28]/10"
          />

          <div
            className="w-full rounded-2xl border border-white/25
              bg-[#102E28]/80 p-5 text-white
              supports-[backdrop-filter:blur(1px)]:bg-[#102E28]/60
              supports-[backdrop-filter:blur(1px)]:backdrop-blur-md"
          >
            <span
              className="inline-flex size-10 items-center
                justify-center rounded-xl bg-white/15 text-[#E9BC9F]"
            >
              <ContactIcon type="chat" />
            </span>

            <h2 className="mt-3 font-heading text-xl font-semibold">
              A person on the other end.
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/85">
              These messages come directly to me. Thanks for helping KejaSpace
              grow.
            </p>
          </div>
        </div>
      </section>

      {/* Contact options */}
      <section aria-labelledby="contact-options-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="contact-options-heading"
              className="font-heading text-xl font-semibold text-[#173F35]"
            >
              How would you like to reach out?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Pick whichever feels easiest.
            </p>
          </div>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {/* Email */}
          <article
            className="relative flex min-w-0 flex-col overflow-hidden
              rounded-2xl border border-[#245747]/15 bg-white p-5
              transition-shadow hover:shadow-md sm:p-6
              motion-safe:transition-transform
              motion-safe:hover:-translate-y-1"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r
                from-[#965038] via-[#E9BC9F] to-[#FAF7F2]"
            />

            <span
              className="flex size-11 items-center justify-center
                rounded-xl bg-[#F5E8DE] text-[#965038]"
            >
              <ContactIcon type="email" />
            </span>

            <h3
              className="mt-4 font-heading text-lg
                font-semibold text-[#173F35]"
            >
              Put it in an email.
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Great for detailed questions, screenshots or feedback you’d like
              to explain.
            </p>

            <label htmlFor="contact-email" className="sr-only">
              Contact email address
            </label>

            <input
              ref={emailRef}
              id="contact-email"
              type="text"
              value={email}
              readOnly
              spellCheck={false}
              className="mt-4 min-h-11 w-full min-w-0 rounded-lg
                border border-[#245747]/15 bg-[#FAF7F2]
                px-3 py-2 text-sm font-medium text-[#173F35]
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-[#245747]"
            />

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButton}
              >
                Open Gmail
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>

              <button
                type="button"
                onClick={copyEmail}
                className={secondaryButton}
              >
                <ContactIcon type="copy" className="size-4" />
                {copied ? "Copied!" : "Copy email"}
              </button>
            </div>

            <p
              role="status"
              aria-atomic="true"
              className="mt-2 text-xs leading-5 text-[#245747]"
            >
              {copyMessage}
            </p>

            <div className="mt-auto pt-4">
              <a
                href={emailUrl}
                className="inline-flex min-h-11 items-center
                  rounded-lg text-sm font-semibold text-[#965038]
                  underline underline-offset-4
                  hover:text-[#173F35]"
              >
                Use my email app instead
              </a>

              <p className="text-xs leading-5 text-[#78716C]">
                Gmail may ask you to sign in. The email-app option requires a
                configured mail application.
              </p>
            </div>
          </article>

          {/* WhatsApp */}
          <article
            className="relative flex min-w-0 flex-col overflow-hidden
              rounded-2xl border border-[#245747]/15 bg-[#EDF3E8]
              p-5 transition-shadow hover:shadow-md sm:p-6
              motion-safe:transition-transform
              motion-safe:hover:-translate-y-1"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r
                from-[#173F35] via-[#699878] to-[#DCE9DD]"
            />

            <span
              className="flex size-11 items-center justify-center
                rounded-xl bg-[#245747] text-white"
            >
              <ContactIcon type="chat" />
            </span>

            <h3
              className="mt-4 font-heading text-lg
                font-semibold text-[#173F35]"
            >
              Start a conversation.
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Prefer chatting? Send a WhatsApp message with your question and a
              little context.
            </p>

            <p className="mt-5 text-base font-semibold text-[#245747]">
              +254 797 959 709
            </p>

            <div
              className="mt-5 rounded-xl rounded-bl-sm
                border border-[#245747]/10 bg-white/80 p-4"
            >
              <p className="text-sm leading-6 text-[#57534E]">
                “Hi Aisha! I have a question about KejaSpace.”
              </p>
              <p className="mt-2 text-xs text-[#78716C]">
                A starting point—you can edit it before sending.
              </p>
            </div>

            <div className="mt-auto pt-5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButton}
              >
                Open WhatsApp
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>

              <p className="mt-3 text-xs leading-5 text-[#78716C]">
                Opens WhatsApp or WhatsApp Web. Nothing is sent automatically.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Brief guidance */}
      <section
        aria-labelledby="helpful-details-heading"
        className="grid gap-5 rounded-2xl border
          border-[#245747]/10 bg-[#FAF7F2] p-5
          sm:p-6 md:grid-cols-2"
      >
        <div>
          <h2
            id="helpful-details-heading"
            className="font-heading text-base font-semibold text-[#173F35]"
          >
            A little detail helps.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            If something isn’t working, mention the page, what you tried and the
            message you saw. You can attach a screenshot after opening email or
            WhatsApp.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#173F35]">
            Keep private details private.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Don’t share passwords, M-Pesa PINs or login tokens. Hide sensitive
            details in screenshots.
          </p>
        </div>
      </section>

      <div
        className="flex flex-col items-start justify-between
          gap-4 border-t border-[#245747]/15 pt-5
          sm:flex-row sm:items-center"
      >
       

        <Link
          to="/rooms"
          className="inline-flex min-h-11 shrink-0 items-center
            gap-2 rounded-lg text-sm font-semibold text-[#245747]
            underline-offset-4 hover:underline"
        >
          Back to exploring
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
