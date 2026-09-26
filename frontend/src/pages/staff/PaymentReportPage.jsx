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

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value));
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
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
    setDraftFilters({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setFilterError("");
    setExpandedId(null);
    setPage(1);
    setLoading(true);
  }

  function refreshReport() {
    setExpandedId(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    setExpandedId(null);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Reports
          </p>

          <h1 className="page-title mt-2">Payment report</h1>

          <p className="page-description">
            Review recorded payments by resident, room, date and payment method.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshReport}
          disabled={loading}
          className="button-secondary"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="payment-search" className="form-label">
              Search
            </label>

            <input
              id="payment-search"
              name="search"
              type="search"
              value={draftFilters.search}
              onChange={updateFilter}
              placeholder="Resident, room or reference"
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="payment-method" className="form-label">
              Payment method
            </label>

            <select
              id="payment-method"
              name="method"
              value={draftFilters.method}
              onChange={updateFilter}
              className="form-input"
            >
              <option value="">All methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment-start-date" className="form-label">
              Recorded from
            </label>

            <input
              id="payment-start-date"
              name="startDate"
              type="date"
              value={draftFilters.startDate}
              onChange={updateFilter}
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="payment-end-date" className="form-label">
              Recorded through
            </label>

            <input
              id="payment-end-date"
              name="endDate"
              type="date"
              value={draftFilters.endDate}
              onChange={updateFilter}
              className="form-input"
            />
          </div>
        </div>

        {filterError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {filterError}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="button-primary"
          >
            Apply filters
          </button>

          <button
            type="button"
            onClick={resetFilters}
            disabled={loading}
            className="button-secondary"
          >
            Reset
          </button>

          {!loading && !error && (
            <p role="status" className="text-sm text-slate-500 sm:ml-auto">
              {count} matching {count === 1 ? "payment" : "payments"}
            </p>
          )}
        </div>
      </form>

      {loading ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
        >
          Loading the payment report…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshReport}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No recorded payments found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Try different filters. Unpaid charges and unresolved M-Pesa
            attempts do not appear as recorded payments.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <caption className="sr-only">
                Recorded payments and their details
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Resident</th>
                  <th scope="col" className="px-4 py-3">Room</th>
                  <th scope="col" className="px-4 py-3">Method</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  <th scope="col" className="px-4 py-3">Recorded</th>
                  <th scope="col" className="px-4 py-3">Details</th>
                </tr>
              </thead>

              {payments.map((payment) => {
                const expanded = expandedId === payment.id;

                return (
                  <tbody
                    key={payment.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <tr className="hover:bg-slate-50/70">
                      <th
                        scope="row"
                        className="px-4 py-3 font-medium text-slate-900"
                      >
                        <span
                          className="block max-w-44 truncate"
                          title={payment.resident_name}
                        >
                          {payment.resident_name || "Name unavailable"}
                        </span>
                      </th>

                      <td className="px-4 py-3 text-slate-600">
                        {payment.room_number}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {methodLabels[payment.method] || payment.method}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney(payment.amount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {formatDate(payment.created_at)}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`payment-details-${payment.id}`}
                          aria-label={`${
                            expanded ? "Hide" : "View"
                          } details for payment ${payment.id}`}
                          onClick={() =>
                            setExpandedId(expanded ? null : payment.id)
                          }
                          className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {expanded ? "Hide details" : "View details"}
                        </button>
                      </td>
                    </tr>

                    <tr hidden={!expanded}>
                      <td colSpan={6} className="bg-slate-50 p-4">
                        <div id={`payment-details-${payment.id}`}>
                          <h2 className="text-sm font-semibold text-slate-900">
                            Payment #{payment.id}
                          </h2>

                          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-xs text-slate-500">
                                Resident
                              </dt>
                              <dd className="mt-1 break-words font-medium text-slate-800">
                                {payment.resident_name || "Name unavailable"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                Charge number
                              </dt>
                              <dd className="mt-1 font-medium text-slate-800">
                                #{payment.charge}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                Billing month
                              </dt>
                              <dd className="mt-1 font-medium text-slate-800">
                                {payment.billing_month?.slice(0, 7) || "—"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-xs text-slate-500">
                                Recorded at — Nairobi time
                              </dt>
                              <dd className="mt-1 font-medium text-slate-800">
                                {formatDate(payment.created_at)}
                              </dd>
                            </div>

                            <div className="sm:col-span-2">
                              <dt className="text-xs text-slate-500">
                                Payment reference
                              </dt>
                              <dd className="mt-1 break-all font-mono text-xs leading-6 text-slate-800">
                                {payment.reference || "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                );
              })}
            </table>
          </div>
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
            className="button-secondary"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">Page {page}</span>

          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => changePage(page + 1)}
            className="button-secondary"
          >
            Next
          </button>
        </nav>
      )}

      <p className="text-xs leading-6 text-slate-500">
        Dates shown use Nairobi time. Date filters use the backend’s configured
        timezone. This report lists recorded payments, not outstanding balances.
      </p>
    </section>
  );
}