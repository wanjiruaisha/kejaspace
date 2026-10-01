import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../../services/api";
import LoadingMessage from "../../components/common/LoadingMessage";
import { getRoomCoverImage } from "../../utils/roomImages";

const statusDetails = {
  awaiting_payment: {
    label: "Awaiting payment",
    style: "bg-amber-50 text-amber-800",
    message:
      "Pay your first month’s full rent before the payment deadline to confirm your reservation.",
  },
  reserved: {
    label: "Reserved",
    style: "bg-[#E8EDE4] text-[#245747]",
    message:
      "Your reservation is confirmed. Hostel staff will check you in when you arrive.",
  },
  checked_in: {
    label: "Checked in",
    style: "bg-emerald-50 text-emerald-800",
    message: "You are currently staying in this room.",
  },
  checked_out: {
    label: "Checked out",
    style: "bg-stone-100 text-stone-700",
    message: "This stay has ended. It remains here for your records.",
  },
  cancelled: {
    label: "Cancelled",
    style: "bg-red-50 text-red-800",
    message: "This stay was cancelled.",
  },
  expired: {
    label: "Expired",
    style: "bg-stone-100 text-stone-700",
    message: "The payment window for this stay expired.",
  },
};

const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "border border-[#245747]/20 bg-white px-4 py-2 text-sm " +
  "font-semibold text-[#245747] transition-colors hover:bg-[#E8EDE4] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "bg-[#245747] px-4 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747]";

function formatDateTime(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function StayPhoto({ stay }) {
  // The stay response includes room_number.
  // The utility uses that to find the assigned cover photo.
  const image = getRoomCoverImage({
    room_number: stay.room_number,
  });

  const [failedSource, setFailedSource] = useState(null);
  const showPhoto = Boolean(image) && failedSource !== image;

  return (
    <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-[#E8EDE4] sm:w-32">
      {showPhoto ? (
        <>
          <img
            src={image}
            alt={`Illustrative photo for room ${stay.room_number}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailedSource(image)}
            className="h-full w-full object-cover"
          />

          <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-white">
            Illustrative
          </span>
        </>
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center">
          <span className="break-words text-sm font-bold text-[#245747]">
            {stay.room_number}
          </span>
        </div>
      )}
    </div>
  );
}

function StayCard({ stay, now }) {
  const details = statusDetails[stay.status] || {
    label: stay.status || "Unknown",
    style: "bg-stone-100 text-stone-700",
    message: "Refresh the page to check your current stay status.",
  };

  const awaitingPayment = stay.status === "awaiting_payment";

  const deadlineTime = stay.payment_deadline
    ? new Date(stay.payment_deadline).getTime()
    : NaN;

  const validDeadline = Number.isFinite(deadlineTime);
  const deadlinePassed =
    awaitingPayment && validDeadline && deadlineTime <= now;

  const missingDeadline = awaitingPayment && !validDeadline;

  const message = deadlinePassed
    ? "The displayed payment deadline has passed. Refresh to check the latest status before attempting payment."
    : missingDeadline
      ? "A valid payment deadline is not available. Contact hostel staff before attempting payment."
      : details.message;

  const showChargeLink = [
    "awaiting_payment",
    "reserved",
    "checked_in",
    "checked_out",
  ].includes(stay.status);

  return (
    <article className="min-w-0 rounded-2xl border border-[#245747]/15 bg-white p-4 sm:p-5">
      {/* Room summary */}
      <div className="flex flex-wrap items-center gap-4">
        <StayPhoto stay={stay} />

        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#78716C]">
            Stay #{stay.id}
          </p>

          <h2 className="mt-1 break-words font-heading text-lg font-bold text-[#173F35]">
            Room {stay.room_number}
          </h2>

          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1
              text-xs font-semibold ${details.style}`}
          >
            {details.label}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#57534E]">
        {message}
      </p>

      {/* Keep the deadline visible */}
      {awaitingPayment && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs font-semibold text-amber-900">
            {deadlinePassed ? "Displayed deadline has passed" : "Payment deadline"}
          </p>

          <p className="mt-1 text-sm font-semibold text-amber-900">
            {validDeadline
              ? `${formatDateTime(stay.payment_deadline)} EAT`
              : "Contact hostel staff"}
          </p>
        </div>
      )}

      {/* Links depend on the recorded stay status */}
      {(showChargeLink || stay.status === "checked_in") && (
        <div className="mt-4 flex flex-wrap gap-2">
          {showChargeLink && (
            <Link to="/my-charges" className={outlineButton}>
              View rent charges
            </Link>
          )}

          {stay.status === "checked_in" && (
            <>
              <Link to="/my-maintenance" className={outlineButton}>
                Maintenance
              </Link>

              <Link to="/my-visitors" className={outlineButton}>
                My visitors
              </Link>
            </>
          )}
        </div>
      )}

      {/* Secondary information stays collapsed */}
      <details className="mt-4 border-t border-[#245747]/10 pt-2">
        <summary
          className="w-fit cursor-pointer rounded-lg py-2
            text-xs font-semibold text-[#245747]
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#245747]"
        >
          Stay records
        </summary>

        <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[#78716C]">
              Application number
            </dt>
            <dd className="mt-1 font-medium text-[#173F35]">
              {stay.application ? `#${stay.application}` : "Not recorded"}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[#78716C]">Stay number</dt>
            <dd className="mt-1 font-medium text-[#173F35]">
              #{stay.id}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[#78716C]">Checked in</dt>
            <dd className="mt-1 font-medium text-[#173F35]">
              {formatDateTime(stay.check_in_at)}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-[#78716C]">Checked out</dt>
            <dd className="mt-1 font-medium text-[#173F35]">
              {formatDateTime(stay.check_out_at)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs leading-5 text-[#78716C]">
          Dates and times are shown in East Africa Time.
        </p>
      </details>
    </article>
  );
}

export default function MyStayPage() {
  const [stays, setStays] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Recheck displayed deadlines while the page is open.
  // This does not change the status stored by the backend.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStays() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(
          `/stays/?page=${page}&page_size=6`,
          { signal: controller.signal },
        );

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected stay list.");
        }

        if (!controller.signal.aborted) {
          setStays(data.results);
          setHasNext(Boolean(data.next));
          setNow(Date.now());
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection and try again."
              : err.message || "Could not load your stays.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadStays();

    return () => controller.abort();
  }, [page, retry]);

  function refreshStays() {
    if (loading) return;

    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    if (loading) return;

    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Your accommodation
          </p>

          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
            My stay
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-[#57534E]">
            Your allocated room, reservation status and stay history.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshStays}
          disabled={loading}
          className={outlineButton}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {loading ? (
        <div className="mt-5">
          <LoadingMessage label="Loading your stays…" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshStays}
            className="mt-2 min-h-11 font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : stays.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#245747]/25 bg-[#FAF7F2] px-5 py-9 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No stays to show
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#57534E]">
            Your stay will appear here after hostel staff approve your
            accommodation application.
          </p>

          <Link
            to="/my-applications"
            className={`mt-5 ${primaryButton}`}
          >
            View my applications
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {stays.map((stay) => (
            <StayCard key={stay.id} stay={stay} now={now} />
          ))}
        </div>
      )}

      <nav
        aria-label="Stay pages"
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className={outlineButton}
        >
          Previous
        </button>

        <span aria-current="page" className="text-sm text-[#57534E]">
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={outlineButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}