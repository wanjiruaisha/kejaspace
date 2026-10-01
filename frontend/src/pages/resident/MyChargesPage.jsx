import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../../services/api";
import LoadingMessage from "../../components/common/LoadingMessage";
import useAuth from "../../hooks/useAuth";
import MpesaPaymentForm from "../../components/payments/MpesaPaymentForm";

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

const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? currencyFormatter.format(amount)
    : "Unavailable";
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
  const { user } = useAuth();

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
    <section className="mx-auto w-full min-w-0 max-w-5xl">
      {/* Page heading */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Your accommodation
          </p>

          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
            My charges
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
            Your rent bills, recorded payments and remaining balances.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCharges}
          disabled={loading}
          className={outlineButton}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {/* Reservation guidance */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#245747]/10 bg-[#FAF7F2] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-[#57534E]">
          Your first month’s full rent confirms your reservation once
          payment is recorded. Check My stay for the payment deadline
          and current reservation status.
        </p>

        <Link
          to="/my-stay"
          className="inline-flex min-h-11 shrink-0 items-center gap-2
            rounded-lg text-sm font-semibold text-[#245747]
            underline-offset-4 hover:underline"
        >
          My stay
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {loading ? (
        <div className="mt-5">
          <LoadingMessage label="Loading your rent charges…" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshCharges}
            className="mt-2 min-h-11 font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : charges.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#245747]/25 bg-[#FAF7F2] px-5 py-9 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No rent charges to show
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#57534E]">
            Your initial rent charge will appear after staff approve
            your accommodation application.
          </p>

          <Link
            to="/my-applications"
            className={`mt-5 ${primaryButton}`}
          >
            View my applications
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {charges.map((charge) => {
            const summary = charge.payment_summary;

            const paymentStatus = paymentStyles[summary?.status] || {
              label: "Status unavailable",
              classes: "bg-stone-100 text-stone-700",
            };

            const balance = Number(summary?.balance);

            const showPaymentForm =
              Boolean(user?.id) &&
              Number.isFinite(balance) &&
              balance > 0;

            return (
              <article
                key={charge.id}
                className="min-w-0 rounded-2xl border border-[#245747]/15 bg-white p-4 sm:p-5"
              >
                {/* Room, billing month and status */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-xs text-[#78716C]">
                      Room {charge.room_number} · Charge #{charge.id}
                    </p>

                    <h2 className="mt-1.5 font-heading text-base font-bold text-[#173F35]">
                      {formatDate(charge.billing_month, true)}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs
                      font-semibold ${paymentStatus.classes}`}
                  >
                    {paymentStatus.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-xs text-[#57534E]">
                    Due:{" "}
                    <span className="font-medium text-[#173F35]">
                      {formatDate(charge.due_date)}
                    </span>
                  </p>

                  {charge.is_initial_rent && (
                    <span className="rounded-full bg-[#FAF0E9] px-2.5 py-1 text-xs font-medium text-[#965038]">
                      First month’s rent
                    </span>
                  )}
                </div>

                {/* Amounts come directly from the backend */}
                <dl className="mt-4 grid gap-3 border-t border-[#245747]/10 pt-4 sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="text-xs text-[#57534E]">
                      Charge amount
                    </dt>

                    <dd className="mt-1 break-words text-base font-semibold tabular-nums text-[#173F35]">
                      {formatMoney(charge.amount)}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="text-xs text-[#57534E]">
                      Amount paid
                    </dt>

                    <dd className="mt-1 break-words text-base font-semibold tabular-nums text-emerald-800">
                      {formatMoney(summary?.amount_paid)}
                    </dd>
                  </div>

                  <div className="min-w-0 rounded-xl bg-[#E8EDE4] px-3 py-2">
                    <dt className="text-xs text-[#245747]">
                      Remaining balance
                    </dt>

                    <dd className="mt-1 break-words text-base font-bold tabular-nums text-[#173F35]">
                      {formatMoney(summary?.balance)}
                    </dd>
                  </div>
                </dl>

                {/* Collapsing this section keeps the form mounted */}
                <details className="mt-4 border-t border-[#245747]/10 pt-2">
                  <summary
                    className="w-fit cursor-pointer rounded-lg py-2
                      text-xs font-semibold text-[#245747]
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      focus-visible:outline-[#245747]"
                  >
                    {showPaymentForm
                      ? "Charge details and payment"
                      : "Charge details"}
                  </summary>

                  <div className="pt-2">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-[#78716C]">
                          Charge number
                        </dt>
                        <dd className="mt-1 font-medium text-[#173F35]">
                          #{charge.id}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#78716C]">
                          Stay number
                        </dt>
                        <dd className="mt-1 font-medium text-[#173F35]">
                          {charge.stay != null
                            ? `#${charge.stay}`
                            : "Unavailable"}
                        </dd>
                      </div>
                    </dl>

                    {charge.is_initial_rent && (
                      <p className="mt-4 rounded-xl bg-[#FAF7F2] p-3 text-xs leading-6 text-[#57534E]">
                        The reservation payment deadline is shown on
                        My stay. Check it before paying this initial
                        rent charge.
                      </p>
                    )}

                    {showPaymentForm && (
                      <div className="mt-4 min-w-0 border-t border-[#245747]/10 pt-4">
                        <MpesaPaymentForm
                          key={`${user.id}-${charge.id}`}
                          chargeId={charge.id}
                          userId={user.id}
                        />
                      </div>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Charge pages"
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