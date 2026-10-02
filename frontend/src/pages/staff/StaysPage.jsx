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
    classes: "bg-[#E8EDE4] text-[#245747]",
  },
  checked_in: {
    label: "Checked in",
    classes: "bg-emerald-50 text-emerald-800",
  },
  checked_out: {
    label: "Checked out",
    classes: "bg-stone-100 text-stone-700",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-800",
  },
  expired: {
    label: "Expired",
    classes: "bg-stone-100 text-stone-700",
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

const dangerButton =
  `${buttonBase} border border-red-200 bg-white ` +
  "text-red-700 hover:bg-red-50";

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
    classes: "bg-stone-100 text-stone-700",
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
    if (!selectedStay) return;

    detailsRef.current?.focus({ preventScroll: true });
    detailsRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedStay]);

  function resetDetails() {
    setSelectedStay(null);
    setConfirmation(null);
  }

  function openDetails(stay, button) {
    if (mutationRef.current || loading) return;

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

  // Used internally after mutations as well as by the Refresh button.
  function reloadStays() {
    resetDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleRefresh() {
    if (mutationRef.current || loading) return;
    reloadStays();
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
    setConfirmation({ stayId: stay.id, action });
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

    if (
      !details ||
      selectedStay?.id !== stayId ||
      !(allowedActions[selectedStay.status] || []).includes(action)
    ) {
      return;
    }

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
        throw new Error("The server returned an unexpected action result.");
      }

      setSuccessMessage(
        `Stay #${stayId}: ${statusDetails[updated.status].label}.`,
      );

      // The updated stay may no longer match the selected filter.
      setNeedsRefresh(true);
      setPage(1);
      reloadStays();
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
          reloadStays();
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
    if (
      mutationRef.current ||
      loading ||
      needsRefresh ||
      nextPage < 1
    ) {
      return;
    }

    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    if (mutationRef.current || loading || needsRefresh) return;

    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setStatus(event.target.value);
    setPage(1);
  }

  const availableActions = selectedStay
    ? allowedActions[selectedStay.status] || []
    : [];

  const controlsDisabled = loading || busy || needsRefresh;

  function renderDetailsButton(stay) {
    const isSelected = selectedStay?.id === stay.id;

    return (
      <button
        type="button"
        onClick={(event) => openDetails(stay, event.currentTarget)}
        disabled={busy}
        aria-label={`View details for ${getResidentName(stay)}, stay #${stay.id}`}
        aria-expanded={isSelected}
        aria-controls={isSelected ? "stay-details" : undefined}
        className="inline-flex min-h-11 items-center gap-2
          rounded-lg px-2 text-xs font-semibold text-[#245747]
          transition-colors hover:bg-[#E8EDE4]
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-[#245747]
          disabled:cursor-not-allowed disabled:opacity-50"
      >
        View details
        <span aria-hidden="true">→</span>
      </button>
    );
  }

  return (
    <section
      aria-labelledby="stays-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header
        className="rounded-2xl border border-[#245747]/10
          bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8]
          to-[#DCE9DD] p-5 sm:p-6"
      >
        <p
          className="text-xs font-semibold uppercase
            tracking-[0.14em] text-[#965038]"
        >
          Arrivals & departures
        </p>

        <h1
          id="stays-heading"
          className="mt-2 font-heading text-2xl
            font-bold tracking-tight text-[#173F35]"
        >
          Resident stays
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
          Keep track of room allocations, welcome arriving residents
          and record departures.
        </p>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100
            bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200
            bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || busy}
              className="mt-2 inline-flex min-h-11 items-center
                rounded-lg font-semibold underline underline-offset-4
                disabled:opacity-50"
            >
              Refresh stays
            </button>
          )}
        </div>
      )}

      {/* Filter */}
      <div
        className="flex flex-wrap items-end justify-between
          gap-4 rounded-2xl border border-[#245747]/15
          bg-white p-4 sm:p-5"
      >
        <div className="w-full sm:w-64">
          <label
            htmlFor="stay-status-filter"
            className="block text-sm font-semibold text-[#173F35]"
          >
            Stay status
          </label>

          <select
            id="stay-status-filter"
            value={status}
            disabled={controlsDisabled}
            onChange={changeFilter}
            className="mt-2 min-h-11 w-full rounded-xl
              border border-[#245747]/20 bg-[#FAF7F2]/60
              px-3 py-2.5 text-sm text-[#173F35]
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#245747]
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All stays</option>

            {Object.entries(statusDetails).map(([value, details]) => (
              <option key={value} value={value}>
                {details.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || busy}
          className={secondaryButton}
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage label="Loading resident stays…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100
            bg-red-50 p-5 text-sm leading-6 text-red-800"
        >
          <p>{listError}</p>

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
      ) : stays.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-9 text-center"
        >
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No stays found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No resident stays match the selected status.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile list */}
          <div className="space-y-3 md:hidden">
            {stays.map((stay) => (
              <article
                key={stay.id}
                className={`rounded-2xl border p-4 ${
                  selectedStay?.id === stay.id
                    ? "border-[#245747]/40 bg-[#EDF3E8]"
                    : "border-[#245747]/15 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#78716C]">
                      Stay #{stay.id}
                    </p>

                    <h2
                      className="mt-1 break-words font-heading
                        text-base font-semibold text-[#173F35]"
                    >
                      {getResidentName(stay)}
                    </h2>
                  </div>

                  <StatusBadge status={stay.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-[#78716C]">Room</dt>
                    <dd className="mt-1 break-words font-medium text-[#173F35]">
                      {stay.room_number}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-[#78716C]">Checked in</dt>
                    <dd className="mt-1 text-xs leading-5 text-[#57534E]">
                      {formatTimestamp(stay.check_in_at, "Not yet")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 border-t border-[#245747]/10 pt-2">
                  {renderDetailsButton(stay)}
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div
            className="hidden overflow-hidden rounded-2xl
              border border-[#245747]/15 bg-white md:block"
          >
            <div
              role="region"
              aria-label="Resident stays table"
              tabIndex={0}
              className="overflow-x-auto focus-visible:outline-2
                focus-visible:outline-[#245747]"
            >
              <table className="w-full min-w-[720px] table-fixed text-left text-sm">
                <caption className="sr-only">
                  Resident stays, allocated rooms and current status
                </caption>

                <thead
                  className="border-b border-[#245747]/15
                    bg-[#E8EDE4]/60 text-xs text-[#245747]"
                >
                  <tr>
                    <th scope="col" className="w-[28%] px-4 py-3">
                      Resident
                    </th>
                    <th scope="col" className="w-[12%] px-4 py-3">
                      Room
                    </th>
                    <th scope="col" className="w-[22%] px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="w-[22%] px-4 py-3">
                      Checked in
                    </th>
                    <th scope="col" className="w-[16%] px-4 py-3">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#245747]/10">
                  {stays.map((stay) => (
                    <tr
                      key={stay.id}
                      className={
                        selectedStay?.id === stay.id
                          ? "bg-[#EDF3E8]"
                          : "transition-colors hover:bg-[#FAF7F2]"
                      }
                    >
                      <th
                        scope="row"
                        className="px-4 py-3 font-medium text-[#173F35]"
                      >
                        <p className="break-words">
                          {getResidentName(stay)}
                        </p>
                        <p className="mt-1 text-xs font-normal text-[#78716C]">
                          Stay #{stay.id}
                        </p>
                      </th>

                      <td className="break-words px-4 py-3 text-[#57534E]">
                        {stay.room_number}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={stay.status} />
                      </td>

                      <td className="px-4 py-3 text-xs leading-5 text-[#78716C]">
                        {formatTimestamp(stay.check_in_at, "—")}
                      </td>

                      <td className="px-4 py-3">
                        {renderDetailsButton(stay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Selected stay */}
      {selectedStay && !loading && !listError && (
        <section
          id="stay-details"
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="stay-details-title"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !mutationRef.current) {
              event.stopPropagation();
              closeDetails();
            }
          }}
          className="min-w-0 scroll-mt-24 rounded-2xl
            border border-[#245747]/25 bg-white p-4
            focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-[#245747] sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase
                  tracking-wide text-[#965038]"
              >
                Stay #{selectedStay.id} · Room {selectedStay.room_number}
              </p>

              <h2
                id="stay-details-title"
                className="mt-2 break-words font-heading
                  text-lg font-semibold text-[#173F35]"
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
              ["Room", selectedStay.room_number],
              ["Resident number", `#${selectedStay.resident}`],
              ["Application number", `#${selectedStay.application}`],
              ["Checked in", formatTimestamp(selectedStay.check_in_at)],
              ["Checked out", formatTimestamp(selectedStay.check_out_at)],
              [
                "Created",
                formatTimestamp(selectedStay.created_at, "Unavailable"),
              ],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-[#78716C]">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-[#173F35]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {selectedStay.status === "awaiting_payment" && (
            <div
              className="mt-4 rounded-xl border border-amber-200
                bg-amber-50 p-4 text-sm leading-6 text-amber-900"
            >
              <p>
                The first month’s full rent is required before the
                reservation can be confirmed.
              </p>

              <p className="mt-2 font-semibold">
                Payment deadline:{" "}
                {formatTimestamp(
                  selectedStay.payment_deadline,
                  "Not available — staff review required",
                )}
              </p>
            </div>
          )}

          {confirmation?.stayId === selectedStay.id ? (
            <div
              role="group"
              aria-labelledby="stay-confirmation-heading"
              aria-busy={busy}
              className="mt-5 rounded-xl border
                border-[#245747]/15 bg-[#FAF7F2] p-4"
            >
              <h3
                id="stay-confirmation-heading"
                className="text-sm font-semibold text-[#173F35]"
              >
                {actionDetails[confirmation.action].label} for{" "}
                {getResidentName(selectedStay)}?
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                {actionDetails[confirmation.action].message}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  disabled={busy}
                  className={secondaryButton}
                >
                  Go back
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={controlsDisabled}
                  className={
                    confirmation.action === "cancel"
                      ? `${buttonBase} bg-red-700 text-white hover:bg-red-800`
                      : primaryButton
                  }
                >
                  {busy
                    ? "Saving…"
                    : `Confirm ${actionDetails[
                        confirmation.action
                      ].label.toLowerCase()}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 border-t border-[#245747]/10 pt-4">
              {availableActions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => openConfirmation(selectedStay, action)}
                      disabled={controlsDisabled}
                      className={
                        action === "cancel" ? dangerButton : primaryButton
                      }
                    >
                      {actionDetails[action].label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#78716C]">
                  No stay actions are available for this status.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <nav
        aria-label="Resident stay pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={controlsDisabled || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-[#57534E]">Page {page}</span>

        <button
          type="button"
          disabled={controlsDisabled || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>

      <p className="text-xs leading-5 text-[#78716C]">
        All times are shown in Nairobi time.
      </p>
    </section>
  );
}