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
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#EDF3E8]";

const inputStyle =
  "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[#245747]/20 " +
  "bg-white px-3 py-2 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelStyle = "block text-xs font-semibold text-[#173F35]";

const rowGrid =
  "grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-3 " +
  "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_120px]";

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

const shortDateFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeZone: "Africa/Nairobi",
});

const monthFormatter = new Intl.DateTimeFormat("en-KE", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
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

function formatDate(value, includeTime = true) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return includeTime
    ? dateFormatter.format(date)
    : shortDateFormatter.format(date);
}

function formatBillingMonth(value) {
  if (typeof value !== "string") return "Unavailable";

  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);

  if (!match) return "Unavailable";

  const month = Number(match[2]);

  if (month < 1 || month > 12) return "Unavailable";

  const date = new Date(`${match[1]}-${match[2]}-01T00:00:00Z`);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : monthFormatter.format(date);
}

function MethodBadge({ method }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
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
    <section
      aria-labelledby="payment-report-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Reports
          </p>

          <h1
            id="payment-report-heading"
            className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]"
          >
            Payment report
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Review recorded payments, billing months and payment references.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshReport}
          disabled={loading}
          className={secondaryButton}
        >
          <span aria-hidden="true">↻</span>
          {loading ? "Loading…" : "Refresh report"}
        </button>
      </header>

      {/* Existing search and filters */}
      <form
        onSubmit={applyFilters}
        aria-describedby={filterError ? "payment-filter-error" : undefined}
        className="rounded-xl border border-[#245747]/15 bg-white p-4"
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

      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-[#245747]/15 bg-white p-5 text-sm text-[#57534E]"
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
              className="min-h-11 rounded-lg font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => changePage(1)}
                className="min-h-11 rounded-lg font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#245747]/25 bg-white px-5 py-8 text-center">
          <h3 className="font-heading text-base font-semibold text-[#173F35]">
            No recorded payments found
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
            Try different filters. Unpaid charges and unresolved M-Pesa
            attempts do not appear as recorded payments.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          {/* Column headings on wide screens */}
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10 bg-[#F5F7F3] px-4 py-3 text-xs font-semibold text-[#57534E] xl:grid`}
          >
            <span>Resident / room</span>
            <span>Billing month</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Recorded on</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {payments.map((payment) => {
              const expanded = expandedId === payment.id;
              const detailsId = `payment-details-${payment.id}`;
              const toggleId = `payment-toggle-${payment.id}`;
              const residentName =
                payment.resident_name || "Name unavailable";

              return (
                <li key={payment.id} className="min-w-0">
                  <article
                    aria-labelledby={`payment-heading-${payment.id}`}
                    className="min-w-0"
                  >
                    <div
                      className={`${rowGrid} px-4 py-3 transition-colors ${
                        expanded
                          ? "bg-[#EDF3E8]"
                          : "hover:bg-[#FAFBF8]"
                      }`}
                    >
                      <div className="col-span-2 min-w-0 xl:col-span-1">
                        <h3
                          id={`payment-heading-${payment.id}`}
                          title={residentName}
                          className="truncate text-sm font-semibold text-[#173F35]"
                        >
                          {residentName}
                        </h3>

                        <p className="mt-1 truncate text-xs text-[#78716C]">
                          {payment.room_number
                            ? `Room ${payment.room_number}`
                            : "Room unavailable"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] xl:hidden">
                          Billing month
                        </p>

                        <p className="text-sm text-[#57534E]">
                          {formatBillingMonth(payment.billing_month)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] xl:hidden">
                          Amount
                        </p>

                        <p className="text-sm font-semibold tabular-nums text-[#173F35]">
                          {formatMoney(payment.amount)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-[#78716C] xl:hidden">
                          Method
                        </p>

                        <MethodBadge method={payment.method} />
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] xl:hidden">
                          Recorded on
                        </p>

                        <p className="text-sm text-[#57534E]">
                          {formatDate(payment.created_at, false)}
                        </p>
                      </div>

                      <div className="col-span-2 justify-self-end xl:col-span-1">
                        <button
                          id={toggleId}
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={detailsId}
                          aria-label={`${
                            expanded ? "Hide" : "View"
                          } payment details for ${residentName}, ${formatMoney(
                            payment.amount,
                          )}`}
                          onClick={() =>
                            setExpandedId((current) =>
                              current === payment.id ? null : payment.id,
                            )
                          }
                          className={secondaryButton}
                        >
                          {expanded ? "Hide details" : "View details"}
                          <span aria-hidden="true">
                            {expanded ? "−" : "+"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <section
                      id={detailsId}
                      hidden={!expanded}
                      aria-labelledby={`payment-details-heading-${payment.id}`}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.stopPropagation();
                          setExpandedId(null);
                          document.getElementById(toggleId)?.focus();
                        }
                      }}
                      className="border-t border-[#245747]/10 bg-[#FAF7F2] p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4
                          id={`payment-details-heading-${payment.id}`}
                          className="font-heading text-base font-semibold text-[#173F35]"
                        >
                          Payment details
                        </h4>

                        <button
                          type="button"
                          onClick={() => {
                            setExpandedId(null);
                            document.getElementById(toggleId)?.focus();
                          }}
                          className={`${secondaryButton} shrink-0`}
                        >
                          Close
                        </button>
                      </div>

                      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          ["Resident", residentName],
                          ["Room", payment.room_number || "Unavailable"],
                          [
                            "Billing month",
                            formatBillingMonth(payment.billing_month),
                          ],
                          ["Amount", formatMoney(payment.amount)],
                          [
                            "Payment method",
                            methodLabels[payment.method] ||
                              payment.method ||
                              "Unavailable",
                          ],
                          [
                            "Recorded at · Nairobi time",
                            formatDate(payment.created_at),
                          ],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-[#78716C]">
                              {label}
                            </dt>

                            <dd className="mt-1 break-words text-sm font-medium text-[#173F35]">
                              {value}
                            </dd>
                          </div>
                        ))}

                        <div className="min-w-0 border-t border-[#245747]/10 pt-4 sm:col-span-2 lg:col-span-3">
                          <dt className="text-xs text-[#78716C]">
                            Payment reference
                          </dt>

                          <dd className="mt-2 break-all rounded-lg border border-[#245747]/10 bg-white px-3 py-2 font-mono text-xs leading-6 text-[#173F35]">
                            {payment.reference || "Unavailable"}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs text-[#78716C]">
                            Internal payment reference
                          </dt>
                          <dd className="mt-1 text-xs text-[#57534E]">
                            {payment.id}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs text-[#78716C]">
                            Internal charge reference
                          </dt>
                          <dd className="mt-1 text-xs text-[#57534E]">
                            {payment.charge ?? "Unavailable"}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

          <span className="text-xs text-[#78716C]">Page {page}</span>

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

      <p className="text-xs leading-6 text-[#78716C]">
        Dates shown use Nairobi time. Date filters use the backend’s
        configured timezone. This report lists recorded payments, not
        outstanding balances or unresolved payment attempts.
      </p>
    </section>
  );
}