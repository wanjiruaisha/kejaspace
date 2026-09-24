import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../../components/common/LoadingMessage";
import {
  listStaffStays,
  performStayAction,
} from "../../services/accommodationService";

const statusDetails = {
  awaiting_payment: {
    label: "Awaiting payment",
    classes: "bg-amber-50 text-amber-800",
  },
  reserved: {
    label: "Reserved",
    classes: "bg-blue-50 text-blue-800",
  },
  checked_in: {
    label: "Checked in",
    classes: "bg-emerald-50 text-emerald-800",
  },
  checked_out: {
    label: "Checked out",
    classes: "bg-slate-100 text-slate-700",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-800",
  },
  expired: {
    label: "Expired",
    classes: "bg-slate-100 text-slate-700",
  },
};

const actionDetails = {
  "check-in": {
    label: "Check in",
    result: "checked_in",
    message:
      "Confirm that this resident has arrived. Django will check that the first month’s rent is fully paid.",
  },
  "check-out": {
    label: "Check out",
    result: "checked_out",
    message:
      "Confirm that this resident is leaving. This ends their active stay.",
  },
  cancel: {
    label: "Cancel reservation",
    result: "cancelled",
    message:
      "This cancels the room allocation. It does not automatically refund any recorded payment.",
  },
};

const allowedActions = {
  awaiting_payment: ["cancel"],
  reserved: ["check-in", "cancel"],
  checked_in: ["check-out"],
};

const secondaryButton =
  "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";

function formatTimestamp(value) {
  if (!value) return "Not yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export default function StaysPage() {
  const [stays, setStays] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const mutationRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStays() {
      setLoading(true);
      setListError("");

      try {
        const data = await listStaffStays({
          page,
          status,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected stay list.");
        }

        if (!controller.signal.aborted) {
          setStays(data.results);
          setHasNext(Boolean(data.next));
          setNeedsRefresh(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(
            error instanceof TypeError
              ? "Could not connect. Please check your connection."
              : error.message || "Could not load resident stays.",
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
  }, [page, status, retry]);

  function refreshList() {
    setConfirmation(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function openConfirmation(stay, action) {
    setActionError("");
    setSuccessMessage("");
    setConfirmation({
      stayId: stay.id,
      action,
    });
  }

  async function handleConfirm() {
    if (
      mutationRef.current ||
      !confirmation ||
      loading ||
      needsRefresh
    ) {
      return;
    }

    const { stayId, action } = confirmation;

    mutationRef.current = true;
    setBusy(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await performStayAction(stayId, action);

      if (
        updated?.id !== stayId ||
        updated.status !== actionDetails[action].result
      ) {
        throw new Error("The server returned an unexpected action result.");
      }

      setSuccessMessage(
        `Stay #${stayId}: ${statusDetails[updated.status].label}.`,
      );

      setNeedsRefresh(true);
      setPage(1);
      refreshList();
    } catch (error) {
      setConfirmation(null);

      if ([400, 401, 403, 404, 429].includes(error.status)) {
        setActionError(
          error.status === 429
            ? "Too many requests. Please wait before trying again."
            : error.data?.detail ||
                error.message ||
                "This action is not allowed.",
        );

        if (error.status === 400 || error.status === 404) {
          setNeedsRefresh(true);
          refreshList();
        }
      } else {
        setNeedsRefresh(true);
        setActionError(
          "We could not confirm the action. Refresh the list and check " +
            "the stay’s current status before trying again.",
        );
      }
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  function changePage(nextPage) {
    setConfirmation(null);
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Hostel management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Resident stays
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-500">
            Manage room allocations, resident arrivals and departures.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshList}
          disabled={loading || busy}
          className={secondaryButton}
        >
          Refresh
        </button>
      </div>

      {successMessage && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{actionError}</p>

          {needsRefresh && (
            <button
              type="button"
              onClick={refreshList}
              disabled={loading || busy}
              className="mt-3 font-semibold underline disabled:opacity-50"
            >
              Refresh stays
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="stay-status-filter"
          className="block text-sm font-semibold text-slate-700"
        >
          Filter by status
        </label>

        <select
          id="stay-status-filter"
          value={status}
          disabled={loading || busy}
          onChange={(event) => {
            setConfirmation(null);
            setActionError("");
            setSuccessMessage("");
            setLoading(true);
            setStatus(event.target.value);
            setPage(1);
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm sm:w-64"
        >
          <option value="">All stays</option>

          {Object.entries(statusDetails).map(([value, details]) => (
            <option key={value} value={value}>
              {details.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingMessage label="Loading resident stays…" />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="mt-8 rounded-xl bg-red-50 p-6 text-red-800"
        >
          <p>{listError}</p>

          <button
            type="button"
            onClick={refreshList}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : stays.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No stays match this view.
        </p>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {stays.map((stay) => {
            const details = statusDetails[stay.status] || {
              label: stay.status,
              classes: "bg-slate-100 text-slate-700",
            };

            const availableActions = allowedActions[stay.status] || [];

            return (
              <article
                key={stay.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Stay #{stay.id}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${details.classes}`}
                  >
                    {details.label}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Room {stay.room_number}
                </h2>

                <dl className="mt-5 space-y-3 text-sm">
                  {[
                    ["Resident", stay.resident_username || `Resident #${stay.resident}`],
                    ["Application number", `#${stay.application}`],
                    ["Checked in", formatTimestamp(stay.check_in_at)],
                    ["Checked out", formatTimestamp(stay.check_out_at)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4"
                    >
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {stay.status === "awaiting_payment" && (
                  <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <p>
                      First month’s full rent is required before the
                      reservation can be confirmed.
                    </p>

                    <p className="mt-2 font-semibold">
                      Payment deadline:{" "}
                      {stay.payment_deadline
                        ? formatTimestamp(stay.payment_deadline)
                        : "Not available — staff review required"}
                    </p>
                  </div>
                )}

                {confirmation?.stayId === stay.id ? (
                  <div className="mt-6 rounded-xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">
                      {actionDetails[confirmation.action].label}?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {actionDetails[confirmation.action].message}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={busy || needsRefresh}
                        className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {busy ? "Saving…" : "Confirm"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmation(null)}
                        disabled={busy}
                        className={secondaryButton}
                      >
                        Go back
                      </button>
                    </div>
                  </div>
                ) : (
                  availableActions.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      {availableActions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => openConfirmation(stay, action)}
                          disabled={busy || needsRefresh}
                          className={
                            action === "cancel"
                              ? "rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                              : "rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                          }
                        >
                          {actionDetails[action].label}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Resident stay pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || busy || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}