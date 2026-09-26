import { useEffect, useRef, useState } from "react";

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

function money(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(value));
}

function getErrorMessage(error) {
  if (error.data && typeof error.data === "object") {
    return Object.entries(error.data)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(" ") : String(value);

        return field === "detail" || field === "non_field_errors"
          ? text
          : `${field.replaceAll("_", " ")}: ${text}`;
      })
      .join(" ");
  }

  return error.message || "Something went wrong.";
}

export default function RentPaymentsPage() {
  const [charges, setCharges] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [chargeForm, setChargeForm] = useState({ ...emptyCharge });

  const [selectedCharge, setSelectedCharge] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ ...emptyPayment });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [needsReview, setNeedsReview] = useState(false);

  const mutationLock = useRef(false);
  const detailsRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCharges() {
      setLoading(true);
      setError("");

      try {
        const data = await listStaffCharges(page, controller.signal);

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected charge list.");
        }

        if (!controller.signal.aborted) {
          setCharges(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCharges();

    return () => controller.abort();
  }, [page, reload]);

  useEffect(() => {
    if (selectedCharge) {
      detailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      detailsRef.current?.focus({ preventScroll: true });
    }
  }, [selectedCharge]);

  function refreshCharges() {
    setSelectedCharge(null);
    setReload((value) => value + 1);
  }

  function handleFailure(err) {
    if ([400, 401, 403, 404, 409, 429].includes(err.status)) {
      setActionError(getErrorMessage(err));
    } else {
      setNeedsReview(true);
      setActionError(
        "We could not confirm whether this was saved. Do not submit again yet. Check the charge and payment records before continuing.",
      );
    }
  }

  function viewDetails(charge) {
    setSelectedCharge(charge);
    setShowCreate(false);
    setPaymentForm({
      ...emptyPayment,
      amount: charge.payment_summary?.balance || "",
    });
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (mutationLock.current || needsReview) return;

    setActionError("");
    setMessage("");

    const stayId = Number(chargeForm.stay);
    const billingMonth = `${chargeForm.billing_month}-01`;

    if (!Number.isInteger(stayId) || stayId < 1) {
      setActionError("Enter a valid stay ID.");
      return;
    }

    if (chargeForm.due_date < billingMonth) {
      setActionError("The due date cannot be before the billing month.");
      return;
    }

    mutationLock.current = true;
    setBusy(true);

    try {
      await createRentCharge({
        stay: stayId,
        billing_month: billingMonth,
        amount: chargeForm.amount,
        due_date: chargeForm.due_date,
      });

      setChargeForm({ ...emptyCharge });
      setShowCreate(false);
      setMessage("Rent charge created successfully.");
      setPage(1);
      setReload((value) => value + 1);
    } catch (err) {
      handleFailure(err);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  async function handlePayment(event) {
    event.preventDefault();

    if (!selectedCharge || mutationLock.current || needsReview) return;

    setActionError("");
    setMessage("");

    const reference = paymentForm.reference.trim();

    if (!reference) {
      setActionError("Enter a receipt or bank transaction reference.");
      return;
    }

    mutationLock.current = true;
    setBusy(true);

    try {
      await recordManualPayment({
        charge: selectedCharge.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        reference,
      });

      setSelectedCharge(null);
      setPaymentForm({ ...emptyPayment });
      setMessage("Payment recorded successfully.");
      setReload((value) => value + 1);
    } catch (err) {
      handleFailure(err);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }

  const locked = busy || needsReview;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Rent & payments</h1>
          <p className="page-description">
            View rent charges and record cash or bank payments received.
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
            onClick={() => {
              setShowCreate((previous) => !previous);
              setSelectedCharge(null);
            }}
            className="button-primary"
          >
            {showCreate ? "Close form" : "Create charge"}
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{actionError}</p>
          {needsReview && (
            <p className="mt-2">
              Submissions are paused. Check the staff payment list in Postman
              and refresh the charges before reopening this page.
            </p>
          )}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="section-title">Create monthly charge</h2>
          <p className="card-description">
            Approval already creates the initial rent charge. Use this form
            for later months of a reserved or checked-in stay.
          </p>

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
                  setChargeForm({ ...chargeForm, stay: event.target.value })
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
                  setChargeForm({ ...chargeForm, amount: event.target.value })
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
                  setChargeForm({ ...chargeForm, due_date: event.target.value })
                }
                className="form-input"
              />
            </div>

            <div className="sm:col-span-2">
              <button type="submit" className="button-primary">
                {busy ? "Saving…" : "Save charge"}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {selectedCharge && (
        <section
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="charge-details-title"
          className="mt-6 scroll-mt-24 rounded-2xl border border-blue-200 bg-white p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="charge-details-title" className="section-title">
                Charge #{selectedCharge.id}
              </h2>
              <p className="card-description">
                {selectedCharge.resident_username} · Room{" "}
                {selectedCharge.room_number}
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => setSelectedCharge(null)}
              className="button-secondary"
            >
              Close
            </button>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Stay ID", selectedCharge.stay],
              ["Billing month", selectedCharge.billing_month?.slice(0, 7)],
              ["Due date", selectedCharge.due_date],
              ["Charge amount", money(selectedCharge.amount)],
              [
                "Amount paid",
                money(selectedCharge.payment_summary?.amount_paid),
              ],
              ["Balance", money(selectedCharge.payment_summary?.balance)],
              [
                "Charge type",
                selectedCharge.is_initial_rent ? "Initial rent" : "Monthly rent",
              ],
              [
                "Status",
                selectedCharge.payment_summary?.status?.replaceAll("_", " "),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold capitalize">{value}</dd>
              </div>
            ))}
          </dl>

          {Number(selectedCharge.payment_summary?.balance) > 0 && (
            <form
              onSubmit={handlePayment}
              className="mt-6 border-t border-slate-100 pt-5"
            >
              <h3 className="card-title">Record received payment</h3>
              <p className="card-description">
                Record only confirmed cash or bank payments.
                {selectedCharge.is_initial_rent &&
                  " Initial rent requires full payment before the hold expires."}
              </p>

              <fieldset
                disabled={locked}
                className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label htmlFor="payment-amount" className="form-label">
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
                  <label htmlFor="payment-method" className="form-label">
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
                  <label htmlFor="payment-reference" className="form-label">
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

                <div className="sm:col-span-2 lg:col-span-3">
                  <button type="submit" className="button-primary">
                    {busy ? "Recording…" : "Record payment"}
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </section>
      )}

      <div className="mt-8">
        {loading ? (
          <p role="status" className="text-sm text-slate-600">
            Loading charges…
          </p>
        ) : error ? (
          <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={refreshCharges}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : charges.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-slate-500">
            No charges on this page.
          </p>
        ) : (
          <div className="card-grid">
            {charges.map((charge) => (
              <article key={charge.id} className="content-card">
                <h2 className="card-title">{charge.resident_username}</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Room {charge.room_number} · {charge.billing_month?.slice(0, 7)}
                </p>

                <span className="mt-3 self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-800">
                  {charge.payment_summary?.status?.replaceAll("_", " ")}
                </span>

                <p className="mt-4 text-xs text-slate-500">Remaining balance</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {money(charge.payment_summary?.balance)}
                </p>

                <div className="card-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => viewDetails(charge)}
                    className="button-secondary"
                  >
                    View details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <nav
        aria-label="Charge pages"
        className="mt-6 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => {
            setSelectedCharge(null);
            setPage((value) => value - 1);
          }}
          className="button-secondary"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(error) || !hasNext}
          onClick={() => {
            setSelectedCharge(null);
            setPage((value) => value + 1);
          }}
          className="button-secondary"
        >
          Next
        </button>
      </nav>
    </section>
  );
}