import { useEffect, useState } from "react";

import { getPaymentReport } from "../../services/reportService";

const emptyFilters = {
  method: "",
  startDate: "",
  endDate: "",
  search: "",
};

const methodLabels = {
  cash: "Cash",
  bank: "Bank",
  mpesa: "M-Pesa",
};

const methodStyles = {
  cash: "bg-[#E8EDE4] text-[#245747]",
  bank: "bg-[#F8EDE5] text-[#965038]",
  mpesa: "bg-emerald-50 text-emerald-800",
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "px-4 py-2 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#EDF3E8]";

const inputStyle =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#245747]/20 " +
  "bg-white px-3.5 py-2.5 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelStyle = "block text-sm font-semibold text-[#173F35]";

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Nairobi",
});

function formatMoney(value) {
  const amount = Number(value);

  if (
    value == null ||
    String(value).trim() === "" ||
    !Number.isFinite(amount)
  ) {
    return "Unavailable";
  }

  return moneyFormatter.format(amount);
}

function formatDate(value) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : dateFormatter.format(date);
}

function MethodBadge({ method }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        methodStyles[method] || "bg-stone-100 text-stone-600"
      }`}
    >
      {methodLabels[method] || method || "Unavailable"}
    </span>
  );
}

export default function PaymentReportPage() {
  const [payments, setPayments] = useState([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState({ ...emptyFilters });
  const [filters, setFilters] = useState({ ...emptyFilters });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPayments() {
      setLoading(true);
      setError("");

      try {
        const data = await getPaymentReport({
          ...filters,
          page,
          signal: controller.signal,
        });

        if (
          !Array.isArray(data?.results) ||
          !Number.isInteger(data?.count) ||
          data.count < 0
        ) {
          throw new Error("The server returned an unexpected payment report.");
        }

        const validPayments = data.results.every(
          (payment) =>
            payment &&
            payment.id != null &&
            payment.amount != null &&
            String(payment.amount).trim() !== "" &&
            Number.isFinite(Number(payment.amount)),
        );

        if (!validPayments) {
          throw new Error("Some payment information is incomplete.");
        }

        if (!controller.signal.aborted) {
          setPayments(data.results);
          setCount(data.count);
          setHasNext(Boolean(data.next));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect to the server. Please try again."
              : err.message || "Could not load the payment report.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPayments();

    return () => controller.abort();
  }, [page, filters, retry]);

  function updateFilter(event) {
    const { name, value } = event.target;

    setDraftFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFilterError("");
  }

  function applyFilters(event) {
    event.preventDefault();

    if (loading) return;

    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      setFilterError("The end date must be on or after the start date.");
      return;
    }

    setFilterError("");
    setExpandedId(null);
    setPage(1);
    setLoading(true);

    setFilters({
      ...draftFilters,
      search: draftFilters.search.trim(),
    });
  }

  function resetFilters() {
    if (loading) return;

    setDraftFilters({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setFilterError("");
    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function refreshReport() {
    if (loading) return;

    setExpandedId(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    if (loading || nextPage < 1 || nextPage === page) return;

    setExpandedId(null);
    setLoading(true);
    setPage(nextPage);
  }

  const hasAppliedFilters = Object.values(filters).some(Boolean);

  const filtersChanged = Object.keys(emptyFilters).some((key) => {
    const draftValue =
      key === "search" ? draftFilters.search.trim() : draftFilters[key];

    return draftValue !== filters[key];
  });

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
      {/* Page header */}
      <header className="rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
              Reports
            </p>

            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
              Payment report
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Find recorded payments by resident, room, reference,
              payment method or date.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className={secondaryButton}
          >
            {loading ? "Loading…" : "Refresh report"}
          </button>
        </div>
      </header>

      {/* Search and filters */}
      <form
        onSubmit={applyFilters}
        aria-describedby={filterError ? "payment-filter-error" : undefined}
        className="rounded-2xl border border-[#245747]/15 bg-white p-4 sm:p-5"
      >
        <fieldset disabled={loading} className="min-w-0">
          <legend className="sr-only">Filter recorded payments</legend>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="payment-search" className={labelStyle}>
                Search
              </label>

              <input
                id="payment-search"
                name="search"
                type="search"
                value={draftFilters.search}
                onChange={updateFilter}
                placeholder="Resident, room or reference"
                className={inputStyle}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="payment-method" className={labelStyle}>
                Payment method
              </label>

              <select
                id="payment-method"
                name="method"
                value={draftFilters.method}
                onChange={updateFilter}
                className={inputStyle}
              >
                <option value="">All methods</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="mpesa">M-Pesa</option>
              </select>
            </div>

            <div className="min-w-0">
              <label htmlFor="payment-start-date" className={labelStyle}>
                Recorded from
              </label>

              <input
                id="payment-start-date"
                name="startDate"
                type="date"
                value={draftFilters.startDate}
                onChange={updateFilter}
                className={inputStyle}
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="payment-end-date" className={labelStyle}>
                Recorded through
              </label>

              <input
                id="payment-end-date"
                name="endDate"
                type="date"
                value={draftFilters.endDate}
                onChange={updateFilter}
                aria-invalid={Boolean(filterError)}
                aria-describedby={
                  filterError ? "payment-filter-error" : undefined
                }
                className={inputStyle}
              />
            </div>
          </div>

          {filterError && (
            <p
              id="payment-filter-error"
              role="alert"
              className="mt-3 text-sm leading-6 text-red-700"
            >
              {filterError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className={primaryButton}
            >
              Apply filters
            </button>

            <button
              type="button"
              onClick={resetFilters}
              disabled={loading}
              className={secondaryButton}
            >
              Reset
            </button>

            {filtersChanged && !loading && (
              <p className="text-xs leading-5 text-[#965038] sm:ml-2">
                Select Apply filters to update the results.
              </p>
            )}
          </div>
        </fieldset>
      </form>

      {/* Applied filters describe the results currently being displayed. */}
      {hasAppliedFilters && (
        <div
          aria-label="Applied payment filters"
          className="flex flex-wrap items-center gap-2 text-xs text-[#245747]"
        >
          <span className="font-semibold">Applied:</span>

          {filters.search && (
            <span className="max-w-full break-words rounded-lg bg-[#E8EDE4] px-3 py-2">
              Search: {filters.search}
            </span>
          )}

          {filters.method && (
            <span className="rounded-lg bg-[#E8EDE4] px-3 py-2">
              Method: {methodLabels[filters.method] || filters.method}
            </span>
          )}

          {filters.startDate && (
            <span className="rounded-lg bg-[#E8EDE4] px-3 py-2">
              From: {filters.startDate}
            </span>
          )}

          {filters.endDate && (
            <span className="rounded-lg bg-[#E8EDE4] px-3 py-2">
              Through: {filters.endDate}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[#173F35]">
          Recorded payments
        </h2>

        {!loading && !error && (
          <p role="status" className="text-xs leading-6 text-[#78716C]">
            <span className="font-semibold text-[#173F35]">{count}</span>{" "}
            matching {count === 1 ? "payment" : "payments"} ·{" "}
            {payments.length} shown on this page
          </p>
        )}
      </div>

      {/* Payment list */}
      {loading ? (
        <p
          role="status"
          className="rounded-2xl border border-[#245747]/15 bg-white p-6 text-sm text-[#57534E]"
        >
          Loading the payment report…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={refreshReport}
              className="min-h-11 font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => changePage(1)}
                className="min-h-11 font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#245747]/25 bg-white p-6 text-center">
          <h3 className="font-heading text-base font-semibold text-[#173F35]">
            No recorded payments found
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
            Try different filters. Unpaid charges and unresolved M-Pesa
            attempts do not appear as recorded payments.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {payments.map((payment) => {
            const expanded = expandedId === payment.id;
            const detailsId = `payment-details-${payment.id}`;

            return (
              <li
                key={payment.id}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  expanded
                    ? "border-[#245747]/40"
                    : "border-[#245747]/15"
                }`}
              >
                <article aria-labelledby={`payment-heading-${payment.id}`}>
                  <div className="grid items-center gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <div className="min-w-0">
                      <p className="text-xs text-[#78716C]">
                        Payment #{payment.id} · Room{" "}
                        {payment.room_number || "unavailable"}
                      </p>

                      <h3
                        id={`payment-heading-${payment.id}`}
                        title={payment.resident_name || ""}
                        className="mt-1 truncate font-heading text-base font-semibold text-[#173F35]"
                      >
                        {payment.resident_name || "Name unavailable"}
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-[#78716C]">
                        Recorded: {formatDate(payment.created_at)} · Nairobi
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end md:gap-2">
                      <p className="text-base font-semibold tabular-nums text-[#173F35]">
                        {formatMoney(payment.amount)}
                      </p>

                      <MethodBadge method={payment.method} />
                    </div>

                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={detailsId}
                      aria-label={`${
                        expanded ? "Hide" : "View"
                      } details for payment ${payment.id}`}
                      onClick={() =>
                        setExpandedId((current) =>
                          current === payment.id ? null : payment.id,
                        )
                      }
                      className={`${secondaryButton} w-full md:w-auto`}
                    >
                      {expanded ? "Hide details" : "View details"}
                      <span aria-hidden="true">
                        {expanded ? "−" : "+"}
                      </span>
                    </button>
                  </div>

                  {/* Full payment details */}
                  <div
                    id={detailsId}
                    hidden={!expanded}
                    className="border-t border-[#245747]/10 bg-[#FAF7F2] p-4 sm:p-5"
                  >
                    <h4 className="text-sm font-semibold text-[#173F35]">
                      Payment details
                    </h4>

                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div className="min-w-0">
                        <dt className="text-xs text-[#78716C]">Resident</dt>
                        <dd className="mt-1 break-words font-medium text-[#173F35]">
                          {payment.resident_name || "Name unavailable"}
                        </dd>
                      </div>

                      <div className="min-w-0">
                        <dt className="text-xs text-[#78716C]">Room</dt>
                        <dd className="mt-1 break-words font-medium text-[#173F35]">
                          {payment.room_number || "Unavailable"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#78716C]">
                          Charge number
                        </dt>
                        <dd className="mt-1 font-medium text-[#173F35]">
                          {payment.charge != null
                            ? `#${payment.charge}`
                            : "Unavailable"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#78716C]">
                          Billing month
                        </dt>
                        <dd className="mt-1 font-medium text-[#173F35]">
                          {typeof payment.billing_month === "string"
                            ? payment.billing_month.slice(0, 7)
                            : "Unavailable"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#78716C]">Amount</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-[#173F35]">
                          {formatMoney(payment.amount)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-[#78716C]">
                          Payment method
                        </dt>
                        <dd className="mt-1 font-medium text-[#173F35]">
                          {methodLabels[payment.method] ||
                            payment.method ||
                            "Unavailable"}
                        </dd>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-xs text-[#78716C]">
                          Recorded at · Nairobi time
                        </dt>
                        <dd className="mt-1 font-medium text-[#173F35]">
                          {formatDate(payment.created_at)}
                        </dd>
                      </div>

                      <div className="min-w-0 border-t border-[#245747]/10 pt-4 sm:col-span-2 lg:col-span-3">
                        <dt className="text-xs text-[#78716C]">
                          Payment reference
                        </dt>
                        <dd className="mt-2 break-all rounded-lg border border-[#245747]/10 bg-white px-3 py-2 font-mono text-xs leading-6 text-[#173F35]">
                          {payment.reference || "Unavailable"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {!error && (
        <nav
          aria-label="Payment report pages"
          className="flex items-center justify-between gap-3"
        >
          <button
            type="button"
            disabled={loading || page === 1}
            onClick={() => changePage(page - 1)}
            className={secondaryButton}
          >
            Previous
          </button>

          <span className="text-sm text-[#78716C]">Page {page}</span>

          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => changePage(page + 1)}
            className={secondaryButton}
          >
            Next
          </button>
        </nav>
      )}

      <p className="rounded-xl bg-[#E8EDE4]/60 px-4 py-3 text-xs leading-6 text-[#57534E]">
        Dates shown use Nairobi time. Date filters use the backend’s
        configured timezone. This report lists recorded payments, not
        outstanding balances or unresolved payment attempts.
      </p>
    </section>
  );
}