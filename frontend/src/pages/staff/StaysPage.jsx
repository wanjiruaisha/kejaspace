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
      "Confirm that this resident has arrived. The first month’s rent must be fully paid before check-in.",
  },
  "check-out": {
    label: "Check out",
    result: "checked_out",
    message:
      "Confirm that this resident is leaving. This ends their active stay.",
  },
  cancel: {
    label: "Cancel allocation",
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

function formatTimestamp(value, fallback = "Not yet") {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function getResidentName(stay) {
  return stay.resident_username || `Resident #${stay.resident}`;
}

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  return error.message || "This action is not allowed.";
}

function StatusBadge({ status }) {
  const details = statusDetails[status] || {
    label: status,
    classes: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${details.classes}`}
    >
      {details.label}
    </span>
  );
}

export default function StaysPage() {
  const [stays, setStays] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedStay, setSelectedStay] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const mutationRef = useRef(false);
  const detailsRef = useRef(null);
  const triggerRef = useRef(null);

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

  useEffect(() => {
    if (selectedStay) {
      detailsRef.current?.focus({ preventScroll: true });

      detailsRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedStay]);

  function resetDetails() {
    setSelectedStay(null);
    setConfirmation(null);
  }

  function openDetails(stay, button) {
    if (mutationRef.current) return;

    triggerRef.current = button;
    setSelectedStay(stay);
    setConfirmation(null);
    setSuccessMessage("");

    if (!needsRefresh) setActionError("");
  }

  function closeDetails() {
    if (mutationRef.current) return;

    resetDetails();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function refreshList() {
    resetDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function openConfirmation(stay, action) {
    if (
      mutationRef.current ||
      loading ||
      needsRefresh ||
      !(allowedActions[stay.status] || []).includes(action)
    ) {
      return;
    }

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
    const details = actionDetails[action];

    if (!details) return;

    mutationRef.current = true;
    setBusy(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await performStayAction(stayId, action);

      if (
        updated?.id !== stayId ||
        updated.status !== details.result
      ) {
        throw new Error(
          "The server returned an unexpected action result.",
        );
      }

      setSuccessMessage(
        `Stay #${stayId}: ${statusDetails[updated.status].label}.`,
      );

      // Reload because the new status may not match the current filter.
      setNeedsRefresh(true);
      setPage(1);
      refreshList();
    } catch (error) {
      setConfirmation(null);

      if ([400, 401, 403, 404, 429].includes(error.status)) {
        setActionError(
          error.status === 429
            ? "Too many requests. Please wait before trying again."
            : getErrorMessage(error),
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
    resetDetails();

    if (!needsRefresh) setActionError("");

    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    resetDetails();

    if (!needsRefresh) setActionError("");

    setSuccessMessage("");
    setLoading(true);
    setStatus(event.target.value);
    setPage(1);
  }

  const availableActions = selectedStay
    ? allowedActions[selectedStay.status] || []
    : [];

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Hostel management
          </p>

          <h1 className="page-title mt-2">Resident stays</h1>

          <p className="page-description">
            Manage room allocations, resident arrivals and departures.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshList}
          disabled={loading || busy}
          className="button-secondary"
        >
          Refresh
        </button>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="stay-status-filter" className="form-label">
            Filter by status
          </label>

          <select
            id="stay-status-filter"
            value={status}
            disabled={loading || busy}
            onChange={changeFilter}
            className="form-input"
          >
            <option value="">All stays</option>

            {Object.entries(statusDetails).map(([value, details]) => (
              <option key={value} value={value}>
                {details.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <LoadingMessage label="Loading resident stays…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-5 text-sm text-red-800"
        >
          <p>{listError}</p>

          <button
            type="button"
            onClick={refreshList}
            disabled={busy}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : stays.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No stays found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No resident stays match the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Resident stays, allocated rooms and current status
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="w-[30%] px-4 py-3">
                    Resident
                  </th>
                  <th scope="col" className="w-[12%] px-4 py-3">
                    Room
                  </th>
                  <th scope="col" className="w-[23%] px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="w-[20%] px-4 py-3">
                    Checked in
                  </th>
                  <th scope="col" className="w-[15%] px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {stays.map((stay) => (
                  <tr
                    key={stay.id}
                    className={
                      selectedStay?.id === stay.id
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
                        title={getResidentName(stay)}
                      >
                        {getResidentName(stay)}
                      </p>

                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Stay #{stay.id}
                      </p>
                    </th>

                    <td className="px-4 py-3 text-slate-600">
                      <p className="truncate" title={stay.room_number}>
                        {stay.room_number}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={stay.status} />
                    </td>

                    <td className="px-4 py-3 text-xs leading-5 text-slate-500">
                      {formatTimestamp(stay.check_in_at, "—")}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) =>
                          openDetails(stay, event.currentTarget)
                        }
                        disabled={busy}
                        aria-label={`View details for stay ${stay.id}`}
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
        aria-label="Resident stay pages"
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
          disabled={loading || busy || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {selectedStay && !loading && !listError && (
        <section
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="stay-details-title"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                Stay #{selectedStay.id}
              </p>

              <h2
                id="stay-details-title"
                className="mt-2 break-words font-heading text-base font-semibold text-slate-900"
              >
                {getResidentName(selectedStay)}
              </h2>

              <div className="mt-3">
                <StatusBadge status={selectedStay.status} />
              </div>
            </div>

            <button
              type="button"
              onClick={closeDetails}
              disabled={busy}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Room", selectedStay.room_number],
              ["Resident number", `#${selectedStay.resident}`],
              ["Application number", `#${selectedStay.application}`],
              [
                "Checked in · Nairobi",
                formatTimestamp(selectedStay.check_in_at),
              ],
              [
                "Checked out · Nairobi",
                formatTimestamp(selectedStay.check_out_at),
              ],
              [
                "Created · Nairobi",
                formatTimestamp(selectedStay.created_at, "Unavailable"),
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

          {selectedStay.status === "awaiting_payment" && (
            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p>
                The first month’s full rent is required before the
                reservation can be confirmed.
              </p>

              <p className="mt-2 font-medium">
                Payment deadline · Nairobi:{" "}
                {formatTimestamp(
                  selectedStay.payment_deadline,
                  "Not available — staff review required",
                )}
              </p>
            </div>
          )}

          {confirmation?.stayId === selectedStay.id ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {actionDetails[confirmation.action].label} for{" "}
                {getResidentName(selectedStay)}?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {actionDetails[confirmation.action].message}
              </p>

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy || needsRefresh}
                  className="button-primary"
                >
                  {busy ? "Saving…" : "Confirm"}
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  disabled={busy}
                  className="button-secondary"
                >
                  Go back
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 border-t border-slate-100 pt-5">
              {availableActions.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {availableActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() =>
                        openConfirmation(selectedStay, action)
                      }
                      disabled={busy || needsRefresh}
                      className={
                        action === "cancel"
                          ? "rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          : "button-primary"
                      }
                    >
                      {actionDetails[action].label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No stay actions are available for this status.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}