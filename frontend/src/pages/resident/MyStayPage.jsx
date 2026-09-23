import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../../services/api";
import LoadingMessage from "../../components/common/LoadingMessage";

const statusDetails = {
  awaiting_payment: {
    label: "Awaiting payment",
    style: "bg-amber-50 text-amber-800",
    message:
      "Pay your first month’s full rent before the payment deadline to confirm your reservation.",
  },
  reserved: {
    label: "Reserved",
    style: "bg-blue-50 text-blue-800",
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
    style: "bg-slate-100 text-slate-700",
    message: "This stay has ended. It remains here for your records.",
  },
  cancelled: {
    label: "Cancelled",
    style: "bg-red-50 text-red-800",
    message: "This stay was cancelled.",
  },
  expired: {
    label: "Expired",
    style: "bg-slate-100 text-slate-700",
    message: "The payment window for this stay expired.",
  },
};

function formatDateTime(value) {
  if (!value) return "Not yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export default function MyStayPage() {
  const [stays, setStays] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

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
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Your accommodation
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My stay
          </h1>

          <p className="mt-3 max-w-xl text-slate-500">
            View your room allocation, reservation status and stay history.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshStays}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingMessage label="Loading your stays…" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl bg-red-50 p-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshStays}
            className="mt-4 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : stays.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            No stay yet
          </h2>

          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-500">
            Your stay will appear here after hostel staff approve your
            accommodation application.
          </p>

          <Link
            to="/my-applications"
            className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            View my applications
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {stays.map((stay) => {
            const details = statusDetails[stay.status] || {
              label: stay.status,
              style: "bg-slate-100 text-slate-700",
              message: "Refresh this page to check your current stay status.",
            };

            const deadlinePassed =
              stay.status === "awaiting_payment" &&
              stay.payment_deadline &&
              new Date(stay.payment_deadline).getTime() <= Date.now();

            return (
              <article
                key={stay.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="bg-slate-900 px-6 py-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                    Assigned room
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold">
                      Room {stay.room_number}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${details.style}`}
                    >
                      {details.label}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm leading-7 text-slate-600">
                    {deadlinePassed
                      ? "The displayed payment deadline has passed. Refresh to check the latest status before attempting payment."
                      : details.message}
                  </p>

                  <dl className="mt-6 space-y-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Stay number</dt>
                      <dd className="font-semibold text-slate-900">
                        #{stay.id}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Application number
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        #{stay.application}
                      </dd>
                    </div>

                    {stay.status === "awaiting_payment" &&
                      stay.payment_deadline && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">
                            Payment deadline
                          </dt>
                          <dd className="text-right font-semibold text-amber-800">
                            {formatDateTime(stay.payment_deadline)}
                          </dd>
                        </div>
                      )}

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Checked in</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatDateTime(stay.check_in_at)}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Checked out</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatDateTime(stay.check_out_at)}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    Dates and times are shown in East Africa Time.
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Stay pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}