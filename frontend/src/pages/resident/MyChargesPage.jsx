import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../../services/api";
import LoadingMessage from "../../components/common/LoadingMessage";

const paymentStyles = {
  unpaid: {
    label: "Unpaid",
    classes: "bg-amber-50 text-amber-800",
  },
  partially_paid: {
    label: "Partially paid",
    classes: "bg-blue-50 text-blue-800",
  },
  paid: {
    label: "Paid",
    classes: "bg-emerald-50 text-emerald-800",
  },
};

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Unavailable";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value, monthOnly = false) {
  if (!value) return "Unavailable";

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "long",
    ...(monthOnly ? {} : { day: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}

export default function MyChargesPage() {
  const [charges, setCharges] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCharges() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(
          `/charges/?page=${page}&page_size=6`,
          { signal: controller.signal },
        );

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected charge list.");
        }

        if (!controller.signal.aborted) {
          setCharges(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection and try again."
              : err.message || "Could not load your rent charges.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCharges();

    return () => controller.abort();
  }, [page, retry]);

  function refreshCharges() {
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
            My charges
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-slate-500">
            View your monthly rent bills, recorded payments and remaining
            balances.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCharges}
          disabled={loading}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm leading-7 text-blue-900">
          Your first month’s full rent is required to confirm your reservation.
          Check My stay for your reservation status and payment deadline.
        </p>

        <Link
          to="/my-stay"
          className="mt-3 inline-flex text-sm font-semibold text-blue-700 hover:underline"
        >
          View my stay →
        </Link>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingMessage label="Loading your rent charges…" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl bg-red-50 p-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshCharges}
            className="mt-4 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : charges.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            No rent charges yet
          </h2>

          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-500">
            Your initial rent charge will appear after staff approve your
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
          {charges.map((charge) => {
            const summary = charge.payment_summary;

            const paymentStatus = paymentStyles[summary?.status] || {
              label: "Status unavailable",
              classes: "bg-slate-100 text-slate-700",
            };

            return (
              <article
                key={charge.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        Room {charge.room_number}
                      </p>

                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {formatDate(charge.billing_month, true)}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatus.classes}`}
                    >
                      {paymentStatus.label}
                    </span>
                  </div>

                  {charge.is_initial_rent && (
                    <p className="mt-4 inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      First month’s rent
                    </p>
                  )}
                </div>

                <div className="p-6">
                  <p className="text-sm text-slate-500">
                    Rent amount
                  </p>

                  <p className="mt-2 break-words text-3xl font-bold text-slate-900">
                    {formatMoney(charge.amount)}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-medium text-emerald-800">
                        Amount paid
                      </p>

                      <p className="mt-2 break-words text-lg font-bold text-emerald-900">
                        {formatMoney(summary?.amount_paid)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-600">
                        Remaining balance
                      </p>

                      <p className="mt-2 break-words text-lg font-bold text-slate-900">
                        {formatMoney(summary?.balance)}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 space-y-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Charge number
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        #{charge.id}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Stay number
                      </dt>
                      <dd className="font-semibold text-slate-900">
                        #{charge.stay}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">
                        Rent due date
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {formatDate(charge.due_date)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Charge pages"
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