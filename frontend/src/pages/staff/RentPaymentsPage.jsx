import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import {
  listStaffCharges,
  createRentCharge,
  recordManualPayment,
} from "../../services/staffPaymentService";

const emptyCharge = {
  stay: "",
  billing_month: "",
  amount: "",
  due_date: "",
};

const emptyPayment = {
  amount: "",
  method: "cash",
  reference: "",
};

const defaultFilters = {
  search: "",
  billing_month: "",
  due_date: "",
  ordering: "-billing_month,-id",
};

const paymentStatuses = {
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

function money(value) {
  if (
    value == null ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "Unavailable";
  }

  return currencyFormatter.format(Number(value));
}

// Convert amounts to whole cents for exact comparisons.
function toCents(value) {
  const text = String(value ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  const cents =
    Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

function getErrorMessage(error) {
  if (error.data && typeof error.data === "object") {
    return Object.entries(error.data)
      .map(([field, value]) => {
        const text = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return field === "detail" || field === "non_field_errors"
          ? text
          : `${field.replaceAll("_", " ")}: ${text}`;
      })
      .join(" ");
  }

  return error.message || "Something went wrong.";
}

function PaymentBadge({ status }) {
  const details = paymentStatuses[status] || {
    label: "Unavailable",
    classes: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${details.classes}`}
    >
      {details.label}
    </span>
  );
}

export default function RentPaymentsPage() {
  const [charges, setCharges] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [filterForm, setFilterForm] = useState({ ...defaultFilters });
  const [filters, setFilters] = useState({ ...defaultFilters });

  const [showCreate, setShowCreate] = useState(false);
  const [chargeForm, setChargeForm] = useState({ ...emptyCharge });

  const [selectedCharge, setSelectedCharge] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ ...emptyPayment });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [needsReview, setNeedsReview] = useState(false);

  const mutationLock = useRef(false);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCharges() {
      setLoading(true);
      setError("");

      try {
        const data = await listStaffCharges(
          page,
          controller.signal,
          filters,
        );

        if (!Array.isArray(data?.results)) {
          throw new Error(
            "The server returned an unexpected charge list.",
          );
        }

        if (!controller.signal.aborted) {
          setCharges(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection."
              : getErrorMessage(err),
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
  }, [page, reload, filters]);

  useEffect(() => {
    if (showCreate || selectedCharge) {
      panelRef.current?.focus({ preventScroll: true });
      panelRef.current?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
      });
    }
  }, [showCreate, selectedCharge]);

  function resetPanels() {
    setSelectedCharge(null);
    setShowCreate(false);
    setShowPayment(false);
    setChargeForm({ ...emptyCharge });
    setPaymentForm({ ...emptyPayment });
  }

  function closePanel() {
    if (mutationLock.current) return;

    resetPanels();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function refreshCharges() {
    resetPanels();
    setLoading(true);
    setReload((value) => value + 1);
  }

  function changePage(nextPage) {
    if (mutationLock.current || loading) return;

    resetPanels();
    setLoading(true);
    setPage(nextPage);
  }

  function updateFilterForm(event) {
    const { name, value } = event.target;

    setFilterForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    if (mutationLock.current || loading) return;

    resetPanels();
    setPage(1);
    setLoading(true);
    setMessage("");

    setFilters({
      ...filterForm,
      search: filterForm.search.trim(),
    });
  }

  function clearFilters() {
    if (mutationLock.current || loading) return;

    resetPanels();
    setFilterForm({ ...defaultFilters });
    setFilters({ ...defaultFilters });
    setPage(1);
    setLoading(true);
    setMessage("");
  }

  function startCreating(button) {
    if (mutationLock.current || needsReview || loading) return;

    resetPanels();
    triggerRef.current = button;
    setActionError("");
    setMessage("");
    setShowCreate(true);
  }

  function viewDetails(charge, button) {
    if (mutationLock.current) return;

    triggerRef.current = button;
    setSelectedCharge(charge);
    setShowCreate(false);
    setShowPayment(false);
    setMessage("");

    if (!needsReview) setActionError("");

    setPaymentForm({
      ...emptyPayment,
      amount: charge.payment_summary?.balance || "",
    });
  }

  function handleFailure(err) {
    if ([400, 401, 403, 404, 409, 429].includes(err.status)) {
      setActionError(
        err.status === 429
          ? "Too many requests. Please wait before trying again."
          : getErrorMessage(err),
      );
    } else {
      setNeedsReview(true);

      setActionError(
        "We could not confirm whether this was saved. Do not submit again yet. " +
          "Check the charge and recorded payments before continuing.",
      );
    }
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (mutationLock.current || needsReview || loading) return;

    setActionError("");
    setMessage("");

    const stayId = Number(chargeForm.stay);
    const amount = chargeForm.amount.trim();
    const amountCents = toCents(amount);

    if (!Number.isSafeInteger(stayId) || stayId < 1) {
      setActionError("Enter a valid stay ID.");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(chargeForm.billing_month)) {
      setActionError("Choose a valid billing month.");
      return;
    }

    const billingMonth = `${chargeForm.billing_month}-01`;

    if (!chargeForm.due_date || chargeForm.due_date < billingMonth) {
      setActionError(
        "The due date cannot be before the billing month.",
      );
      return;
    }

    if (amountCents === null || amountCents <= 0) {
      setActionError(
        "Enter a positive amount with at most two decimal places.",
      );
      return;
    }

    mutationLock.current = true;
    setBusy(true);

    try {
      const created = await createRentCharge({
        stay: stayId,
        billing_month: billingMonth,
        amount,
        due_date: chargeForm.due_date,
      });

      if (created?.id == null) {
        throw new Error("Unexpected charge response.");
      }

      // Clear filters so the new charge is not hidden by an old filter.
      setFilterForm({ ...defaultFilters });
      setFilters({ ...defaultFilters });
      setPage(1);

      setMessage(
        "Rent charge created successfully. Filters have been cleared.",
      );

      refreshCharges();
    } catch (err) {
      handleFailure(err);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  async function handlePayment(event) {
    event.preventDefault();

    if (
      !selectedCharge ||
      mutationLock.current ||
      needsReview ||
      loading
    ) {
      return;
    }

    setActionError("");
    setMessage("");

    const reference = paymentForm.reference.trim();
    const amount = paymentForm.amount.trim();

    const amountCents = toCents(amount);
    const balanceCents = toCents(
      selectedCharge.payment_summary?.balance,
    );

    if (!reference) {
      setActionError(
        "Enter a receipt or bank transaction reference.",
      );
      return;
    }

    if (amountCents === null || amountCents <= 0) {
      setActionError(
        "Enter a positive amount with at most two decimal places.",
      );
      return;
    }

    if (balanceCents === null || balanceCents <= 0) {
      setActionError(
        "Refresh the charge to check its current balance.",
      );
      return;
    }

    if (amountCents > balanceCents) {
      setActionError(
        "The payment cannot exceed the remaining balance.",
      );
      return;
    }

    if (
      selectedCharge.is_initial_rent &&
      amountCents !== toCents(selectedCharge.amount)
    ) {
      setActionError(
        "Initial rent must be paid in full in one payment.",
      );
      return;
    }

    if (!["cash", "bank"].includes(paymentForm.method)) {
      setActionError("Choose cash or bank transfer.");
      return;
    }

    mutationLock.current = true;
    setBusy(true);

    try {
      const recorded = await recordManualPayment({
        charge: selectedCharge.id,
        amount,
        method: paymentForm.method,
        reference,
      });

      if (
        recorded?.id == null ||
        recorded.charge !== selectedCharge.id
      ) {
        throw new Error("Unexpected payment response.");
      }

      setMessage("Payment recorded successfully.");
      refreshCharges();
    } catch (err) {
      handleFailure(err);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  const locked = busy || needsReview || loading;

  const balanceCents = selectedCharge
    ? toCents(selectedCharge.payment_summary?.balance)
    : null;

  const hasBalance = balanceCents !== null && balanceCents > 0;

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Hostel management
          </p>

          <h1 className="page-title mt-2">Rent & payments</h1>

          <p className="page-description">
            Review rent charges and record cash or bank payments received.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || loading}
            onClick={refreshCharges}
            className="button-secondary"
          >
            Refresh
          </button>

          <button
            type="button"
            disabled={locked}
            onClick={(event) => startCreating(event.currentTarget)}
            className="button-primary"
          >
            Create charge
          </button>
        </div>
      </header>

      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>{actionError}</p>

          {needsReview && (
            <div className="mt-3 space-y-2">
              <p>
                Submissions are paused on this page. Review the recorded
                payments and refresh the charges before reopening it.
              </p>

              <Link
                to="/staff/reports/payments"
                className="inline-block font-semibold underline"
              >
                Open payment report
              </Link>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <fieldset disabled={busy || loading}>
          <legend className="text-sm font-semibold text-slate-900">
            Find rent charges
          </legend>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="charge-search" className="form-label">
                Search room
              </label>

              <input
                id="charge-search"
                name="search"
                type="search"
                value={filterForm.search}
                onChange={updateFilterForm}
                placeholder="For example: A101"
                className="form-input"
              />
            </div>

            <div>
              <label
                htmlFor="charge-filter-month"
                className="form-label"
              >
                Billing month
              </label>

              <input
                id="charge-filter-month"
                name="billing_month"
                type="month"
                value={filterForm.billing_month}
                onChange={updateFilterForm}
                className="form-input"
              />
            </div>

            <div>
              <label
                htmlFor="charge-filter-due"
                className="form-label"
              >
                Due date
              </label>

              <input
                id="charge-filter-due"
                name="due_date"
                type="date"
                value={filterForm.due_date}
                onChange={updateFilterForm}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="charge-ordering" className="form-label">
                Sort by
              </label>

              <select
                id="charge-ordering"
                name="ordering"
                value={filterForm.ordering}
                onChange={updateFilterForm}
                className="form-input"
              >
                <option value="-billing_month,-id">
                  Latest billing month
                </option>
                <option value="billing_month,id">
                  Earliest billing month
                </option>
                <option value="amount,id">
                  Charge amount: low to high
                </option>
                <option value="-amount,-id">
                  Charge amount: high to low
                </option>
                <option value="due_date,id">
                  Earliest due date
                </option>
                <option value="-due_date,-id">
                  Latest due date
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className="button-primary">
              Apply filters
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="button-secondary"
            >
              Clear filters
            </button>
          </div>
        </fieldset>
      </form>

      {loading ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
        >
          Loading charges…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshCharges}
            disabled={busy}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : charges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No charges found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No charges match this view. Try clearing the filters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Rent charges, remaining balances and payment status
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="w-[21%] px-4 py-3">
                    Resident
                  </th>
                  <th scope="col" className="w-[8%] px-4 py-3">
                    Room
                  </th>
                  <th scope="col" className="w-[11%] px-4 py-3">
                    Month
                  </th>
                  <th
                    scope="col"
                    className="w-[16%] px-4 py-3 text-right"
                  >
                    Charge
                  </th>
                  <th
                    scope="col"
                    className="w-[16%] px-4 py-3 text-right"
                  >
                    Balance
                  </th>
                  <th scope="col" className="w-[15%] px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="w-[13%] px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {charges.map((charge) => (
                  <tr
                    key={charge.id}
                    className={
                      selectedCharge?.id === charge.id
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium text-slate-900"
                    >
                      <p
                        className="truncate"
                        title={charge.resident_username}
                      >
                        {charge.resident_username || "Unavailable"}
                      </p>

                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Charge #{charge.id}
                      </p>
                    </th>

                    <td className="px-4 py-3 text-slate-600">
                      <p className="truncate" title={charge.room_number}>
                        {charge.room_number}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {charge.billing_month?.slice(0, 7)}
                    </td>

                    <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-700">
                      {money(charge.amount)}
                    </td>

                    <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-slate-900">
                      {money(charge.payment_summary?.balance)}
                    </td>

                    <td className="px-4 py-3">
                      <PaymentBadge
                        status={charge.payment_summary?.status}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) =>
                          viewDetails(charge, event.currentTarget)
                        }
                        aria-label={`View details for charge ${charge.id}`}
                        className="rounded-lg px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <nav
        aria-label="Charge pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => changePage(page - 1)}
          className="button-secondary"
        >
          Previous
        </button>

        <span className="text-sm text-slate-500">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {showCreate && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="create-charge-title"
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <h2
              id="create-charge-title"
              className="font-heading text-base font-semibold text-slate-900"
            >
              Create monthly charge
            </h2>

            <button
              type="button"
              disabled={busy}
              onClick={closePanel}
              className="button-secondary"
            >
              Close
            </button>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Approval already creates the initial rent charge. Use this
            form for later months of a reserved or checked-in stay.
          </p>

          <form onSubmit={handleCreate}>
            <fieldset
              disabled={locked}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label htmlFor="stay-id" className="form-label">
                  Stay ID
                </label>

                <input
                  id="stay-id"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={chargeForm.stay}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      stay: event.target.value,
                    })
                  }
                  className="form-input"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Use the stay’s ID, not the resident or room ID.
                </p>
              </div>

              <div>
                <label htmlFor="billing-month" className="form-label">
                  Billing month
                </label>

                <input
                  id="billing-month"
                  type="month"
                  required
                  value={chargeForm.billing_month}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      billing_month: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="charge-amount" className="form-label">
                  Rent amount (KES)
                </label>

                <input
                  id="charge-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={chargeForm.amount}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      amount: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="due-date" className="form-label">
                  Due date
                </label>

                <input
                  id="due-date"
                  type="date"
                  required
                  value={chargeForm.due_date}
                  onChange={(event) =>
                    setChargeForm({
                      ...chargeForm,
                      due_date: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button type="submit" className="button-primary">
                  {busy ? "Saving…" : "Save charge"}
                </button>

                <button
                  type="button"
                  onClick={closePanel}
                  className="button-secondary"
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      {selectedCharge && !loading && !error && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="charge-details-title"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="charge-details-title"
                className="font-heading text-base font-semibold text-slate-900"
              >
                Charge #{selectedCharge.id}
              </h2>

              <p className="mt-2 break-words text-sm text-slate-600">
                {selectedCharge.resident_username} · Room{" "}
                {selectedCharge.room_number}
              </p>

              <div className="mt-3">
                <PaymentBadge
                  status={selectedCharge.payment_summary?.status}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={closePanel}
              className="button-secondary"
            >
              Close
            </button>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Stay ID", selectedCharge.stay],
              [
                "Billing month",
                selectedCharge.billing_month?.slice(0, 7),
              ],
              ["Due date", selectedCharge.due_date],
              ["Charge amount", money(selectedCharge.amount)],
              [
                "Amount paid",
                money(selectedCharge.payment_summary?.amount_paid),
              ],
              [
                "Balance",
                money(selectedCharge.payment_summary?.balance),
              ],
              [
                "Charge type",
                selectedCharge.is_initial_rent
                  ? "Initial rent"
                  : "Monthly rent",
              ],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {hasBalance && !showPayment && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={locked}
                onClick={() => setShowPayment(true)}
                className="button-primary"
              >
                Record payment
              </button>
            </div>
          )}

          {hasBalance && showPayment && (
            <form
              onSubmit={handlePayment}
              className="mt-5 border-t border-slate-100 pt-5"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                Record received payment
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Record only confirmed cash or bank payments.
                {selectedCharge.is_initial_rent &&
                  " Initial rent requires full payment before the hold expires."}
              </p>

              <fieldset
                disabled={locked}
                className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label
                    htmlFor="payment-amount"
                    className="form-label"
                  >
                    Amount received (KES)
                  </label>

                  <input
                    id="payment-amount"
                    type="number"
                    min="0.01"
                    max={selectedCharge.payment_summary.balance}
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-method"
                    className="form-label"
                  >
                    Method
                  </label>

                  <select
                    id="payment-method"
                    value={paymentForm.method}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        method: event.target.value,
                      })
                    }
                    className="form-input"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank transfer</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="payment-reference"
                    className="form-label"
                  >
                    Receipt / transaction reference
                  </label>

                  <input
                    id="payment-reference"
                    required
                    maxLength={100}
                    value={paymentForm.reference}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference: event.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>

                <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
                  <button type="submit" className="button-primary">
                    {busy ? "Recording…" : "Save payment"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPayment(false)}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </section>
      )}
    </section>
  );
}