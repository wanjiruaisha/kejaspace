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
    classes: "bg-[#F5E8DE] text-[#965038]",
  },
  paid: {
    label: "Paid",
    classes: "bg-emerald-50 text-emerald-800",
  },
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#E8EDE4]";

const inputClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl " +
  "border border-[#245747]/20 bg-white px-3 py-2.5 " +
  "text-sm text-[#173F35] placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClass = "block text-sm font-semibold text-[#173F35]";

const panelClass =
  "min-w-0 scroll-mt-24 rounded-2xl border border-[#245747]/20 " +
  "bg-white p-4 sm:p-5 focus-visible:outline-2 " +
  "focus-visible:outline-offset-4 focus-visible:outline-[#245747]";

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

// Use whole cents when comparing amounts.
function toCents(value) {
  const text = String(value ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  const cents =
    Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

function getErrorMessage(error) {
  if (
    error.data &&
    typeof error.data === "object" &&
    !Array.isArray(error.data)
  ) {
    const message = Object.entries(error.data)
      .map(([field, value]) => {
        const text = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return field === "detail" || field === "non_field_errors"
          ? text
          : `${field.replaceAll("_", " ")}: ${text}`;
      })
      .join(" ");

    if (message) return message;
  }

  return error.message || "Something went wrong.";
}

function PaymentBadge({ status }) {
  const details = paymentStatuses[status] || {
    label: "Unavailable",
    classes: "bg-stone-100 text-stone-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full
        px-2.5 py-1.5 text-xs font-medium ${details.classes}`}
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

  // Also called internally after a successful save.
  function refreshCharges() {
    resetPanels();
    setLoading(true);
    setReload((value) => value + 1);
  }

  function handleRefresh() {
    if (mutationLock.current || loading) return;
    refreshCharges();
  }

  function changePage(nextPage) {
    if (mutationLock.current || loading || nextPage < 1) return;

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
    if (mutationLock.current || loading) return;

    triggerRef.current = button;
    setSelectedCharge(charge);
    setShowCreate(false);
    setShowPayment(false);
    setMessage("");

    if (!needsReview) setActionError("");

    setPaymentForm({
      ...emptyPayment,
      amount: String(charge.payment_summary?.balance ?? ""),
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
      setActionError("The due date cannot be before the billing month.");
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
    const currentBalance = toCents(
      selectedCharge.payment_summary?.balance,
    );

    if (!reference) {
      setActionError("Enter a receipt or bank transaction reference.");
      return;
    }

    if (amountCents === null || amountCents <= 0) {
      setActionError(
        "Enter a positive amount with at most two decimal places.",
      );
      return;
    }

    if (currentBalance === null || currentBalance <= 0) {
      setActionError("Refresh the charge to check its current balance.");
      return;
    }

    if (amountCents > currentBalance) {
      setActionError("The payment cannot exceed the remaining balance.");
      return;
    }

    if (
      selectedCharge.is_initial_rent &&
      amountCents !== toCents(selectedCharge.amount)
    ) {
      setActionError("Initial rent must be paid in full in one payment.");
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

  function handlePanelKeyDown(event) {
    if (event.key === "Escape" && !mutationLock.current) {
      event.stopPropagation();
      closePanel();
    }
  }

  const locked = busy || needsReview || loading;

  const balanceCents = selectedCharge
    ? toCents(selectedCharge.payment_summary?.balance)
    : null;

  const hasBalance = balanceCents !== null && balanceCents > 0;

  return (
    <section
      aria-labelledby="rent-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header
        className="flex flex-wrap items-center justify-between
          gap-4 rounded-2xl border border-[#245747]/10
          bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8]
          to-[#DCE9DD] p-5 sm:p-6"
      >
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase
              tracking-[0.14em] text-[#965038]"
          >
            Charges & records
          </p>

          <h1
            id="rent-heading"
            className="mt-2 font-heading text-2xl
              font-bold tracking-tight text-[#173F35]"
          >
            Rent & payments
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
            Check rent balances, create monthly charges and record
            cash or bank payments received.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || loading}
            onClick={handleRefresh}
            className={secondaryButton}
          >
            <span aria-hidden="true">↻</span>
            Refresh
          </button>

          <button
            type="button"
            disabled={locked}
            onClick={(event) => startCreating(event.currentTarget)}
            className={primaryButton}
          >
            <span aria-hidden="true">+</span>
            Create charge
          </button>
        </div>
      </header>

      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100
            bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
        >
          {message}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200
            bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsReview && (
            <div className="mt-3 space-y-2">
              <p>
                Submissions are paused on this page. Review the recorded
                payments and refresh the charges. Reopen the page only
                after checking whether the earlier action succeeded.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/staff/reports/payments"
                  className="inline-flex min-h-11 items-center
                    rounded-lg font-semibold underline underline-offset-4"
                >
                  Open payment report
                </Link>

                <button
                  type="button"
                  disabled={busy || loading}
                  onClick={handleRefresh}
                  className={secondaryButton}
                >
                  Refresh charges
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search, filters and ordering */}
      <form onSubmit={applyFilters} className={panelClass}>
        <fieldset disabled={busy || loading} className="min-w-0">
          <legend className="font-heading text-base font-semibold text-[#173F35]">
            Find rent charges
          </legend>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                name: "search",
                label: "Search room",
                type: "search",
                placeholder: "For example: A101",
              },
              {
                name: "billing_month",
                label: "Billing month",
                type: "month",
              },
              {
                name: "due_date",
                label: "Due date",
                type: "date",
              },
            ].map((field) => (
              <div key={field.name} className="min-w-0">
                <label
                  htmlFor={`filter-${field.name}`}
                  className={labelClass}
                >
                  {field.label}
                </label>

                <input
                  id={`filter-${field.name}`}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={filterForm[field.name]}
                  onChange={updateFilterForm}
                  className={inputClass}
                />
              </div>
            ))}

            <div className="min-w-0">
              <label htmlFor="charge-ordering" className={labelClass}>
                Sort by
              </label>

              <select
                id="charge-ordering"
                name="ordering"
                value={filterForm.ordering}
                onChange={updateFilterForm}
                className={inputClass}
              >
                <option value="-billing_month,-id">
                  Latest billing month
                </option>
                <option value="billing_month,id">
                  Earliest billing month
                </option>
                <option value="amount,id">Amount: low to high</option>
                <option value="-amount,-id">Amount: high to low</option>
                <option value="due_date,id">Earliest due date</option>
                <option value="-due_date,-id">Latest due date</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className={primaryButton}>
              Apply filters
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className={secondaryButton}
            >
              Clear filters
            </button>
          </div>
        </fieldset>
      </form>

      {/* Charge list */}
      {loading ? (
        <p role="status" className={`${panelClass} text-sm text-[#57534E]`}>
          Loading charges…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className="mt-2 inline-flex min-h-11 items-center
              rounded-lg font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : charges.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-9 text-center"
        >
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No charges found
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No charges match this view. Try clearing the filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {charges.map((charge) => {
            const selected = selectedCharge?.id === charge.id;

            return (
              <article
                key={charge.id}
                className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${
                  selected
                    ? "border-[#245747]/40 bg-[#EDF3E8]"
                    : "border-[#245747]/15 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#78716C]">
                      Charge #{charge.id} · Room {charge.room_number}
                    </p>

                    <h2
                      className="mt-1 break-words font-heading
                        text-base font-semibold text-[#173F35]"
                    >
                      {charge.resident_username || "Resident unavailable"}
                    </h2>
                  </div>

                  <PaymentBadge status={charge.payment_summary?.status} />
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <dl className="grid flex-1 grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    {[
                      ["Billing month", charge.billing_month?.slice(0, 7)],
                      ["Due date", charge.due_date],
                      ["Charge", money(charge.amount)],
                      ["Balance", money(charge.payment_summary?.balance)],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-xs text-[#78716C]">{label}</dt>
                        <dd
                          className={`mt-1 break-words tabular-nums ${
                            label === "Balance"
                              ? "font-bold text-[#245747]"
                              : "font-medium text-[#173F35]"
                          }`}
                        >
                          {value ?? "Unavailable"}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) =>
                      viewDetails(charge, event.currentTarget)
                    }
                    aria-label={`View details for charge #${charge.id}`}
                    aria-expanded={selected}
                    aria-controls={selected ? "charge-details" : undefined}
                    className={secondaryButton}
                  >
                    View details <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create a later monthly charge */}
      {showCreate && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="create-charge-title"
          onKeyDown={handlePanelKeyDown}
          className={panelClass}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#965038]">
                Monthly billing
              </p>
              <h2
                id="create-charge-title"
                className="mt-1 font-heading text-lg font-semibold text-[#173F35]"
              >
                Create a rent charge
              </h2>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={closePanel}
              className={secondaryButton}
            >
              Close
            </button>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#57534E]">
            Approval already creates the initial rent charge. Use this form
            for later months of a reserved or checked-in stay.
          </p>

          <form onSubmit={handleCreate} aria-busy={busy}>
            <fieldset
              disabled={locked}
              className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2"
            >
              <legend className="sr-only">New charge details</legend>

              {[
                {
                  name: "stay",
                  label: "Stay ID",
                  type: "number",
                  min: "1",
                  step: "1",
                },
                {
                  name: "billing_month",
                  label: "Billing month",
                  type: "month",
                },
                {
                  name: "amount",
                  label: "Rent amount (KES)",
                  type: "number",
                  min: "0.01",
                  step: "0.01",
                },
                {
                  name: "due_date",
                  label: "Due date",
                  type: "date",
                  min: chargeForm.billing_month
                    ? `${chargeForm.billing_month}-01`
                    : undefined,
                },
              ].map((field) => (
                <div key={field.name} className="min-w-0">
                  <label
                    htmlFor={`create-${field.name}`}
                    className={labelClass}
                  >
                    {field.label}
                  </label>

                  <input
                    id={`create-${field.name}`}
                    name={field.name}
                    type={field.type}
                    min={field.min}
                    step={field.step}
                    required
                    value={chargeForm[field.name]}
                    onChange={(event) =>
                      setChargeForm((previous) => ({
                        ...previous,
                        [field.name]: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />

                  {field.name === "stay" && (
                    <p className="mt-2 text-xs leading-5 text-[#78716C]">
                      Find the stay ID on the Resident stays page.
                    </p>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="submit" className={primaryButton}>
                  {busy ? "Saving…" : "Save charge"}
                </button>

                <button
                  type="button"
                  onClick={closePanel}
                  className={secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      {/* Selected charge and manual payment form */}
      {selectedCharge && !loading && !error && (
        <section
          id="charge-details"
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="charge-details-title"
          onKeyDown={handlePanelKeyDown}
          className={panelClass}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#965038]">
                Charge #{selectedCharge.id}
              </p>

              <h2
                id="charge-details-title"
                className="mt-1 break-words font-heading
                  text-lg font-semibold text-[#173F35]"
              >
                {selectedCharge.resident_username || "Resident unavailable"}
              </h2>

              <p className="mt-1 text-sm text-[#57534E]">
                Room {selectedCharge.room_number}
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
              className={`${secondaryButton} shrink-0`}
            >
              Close
            </button>
          </div>

          <dl
            className="mt-5 grid gap-4 rounded-xl
              bg-[#FAF7F2] p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              ["Stay ID", selectedCharge.stay],
              ["Billing month", selectedCharge.billing_month?.slice(0, 7)],
              ["Due date", selectedCharge.due_date],
              ["Charge amount", money(selectedCharge.amount)],
              ["Amount paid", money(selectedCharge.payment_summary?.amount_paid)],
              ["Balance", money(selectedCharge.payment_summary?.balance)],
              [
                "Charge type",
                selectedCharge.is_initial_rent ? "Initial rent" : "Monthly rent",
              ],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-[#78716C]">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#173F35]">
                  {value ?? "Unavailable"}
                </dd>
              </div>
            ))}
          </dl>

          {balanceCents === null && (
            <p className="mt-4 text-sm leading-6 text-amber-800">
              The balance is unavailable. Refresh the charge before
              recording a payment.
            </p>
          )}

          {balanceCents === 0 && (
            <p className="mt-4 text-sm font-medium text-[#245747]">
              This charge has no remaining balance.
            </p>
          )}

          {hasBalance && !showPayment && (
            <div className="mt-5 border-t border-[#245747]/10 pt-4">
              <button
                type="button"
                disabled={locked}
                onClick={() => setShowPayment(true)}
                className={primaryButton}
              >
                Record payment
              </button>
            </div>
          )}

          {hasBalance && showPayment && (
            <form
              onSubmit={handlePayment}
              aria-busy={busy}
              className="mt-5 border-t border-[#245747]/10 pt-5"
            >
              <h3 className="font-heading text-base font-semibold text-[#173F35]">
                Record received payment
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                Record only confirmed cash or bank payments.
                {selectedCharge.is_initial_rent &&
                  " Initial rent requires full payment before the hold expires."}
              </p>

              <fieldset
                disabled={locked}
                className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <legend className="sr-only">Payment details</legend>

                <div className="min-w-0">
                  <label htmlFor="payment-amount" className={labelClass}>
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
                      setPaymentForm((previous) => ({
                        ...previous,
                        amount: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div className="min-w-0">
                  <label htmlFor="payment-method" className={labelClass}>
                    Payment method
                  </label>
                  <select
                    id="payment-method"
                    value={paymentForm.method}
                    onChange={(event) =>
                      setPaymentForm((previous) => ({
                        ...previous,
                        method: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank transfer</option>
                  </select>
                </div>

                <div className="min-w-0">
                  <label htmlFor="payment-reference" className={labelClass}>
                    Receipt / transaction reference
                  </label>
                  <input
                    id="payment-reference"
                    type="text"
                    required
                    maxLength={100}
                    value={paymentForm.reference}
                    onChange={(event) =>
                      setPaymentForm((previous) => ({
                        ...previous,
                        reference: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                  <button type="submit" className={primaryButton}>
                    {busy ? "Recording…" : "Save payment"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPayment(false)}
                    className={secondaryButton}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </section>
      )}

      <nav
        aria-label="Charge pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-[#57534E]">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}