import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../../components/common/LoadingMessage";

import {
  listStaffVisitors,
  checkInVisitor,
  checkOutVisitor,
  cancelVisitor,
} from "../../services/visitorService";

const statusDetails = {
  expected: {
    label: "Expected",
    classes: "bg-amber-50 text-amber-800",
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
};

const actions = {
  "check-in": {
    label: "Check in",
    expectedResult: "checked_in",
    execute: checkInVisitor,
    description:
      "Confirm that this visitor has arrived. Check-in requires the scheduled visit date and a host resident who is still checked in.",
  },
  "check-out": {
    label: "Check out",
    expectedResult: "checked_out",
    execute: checkOutVisitor,
    description:
      "Confirm that this visitor has left. Their departure time will be recorded.",
  },
  cancel: {
    label: "Cancel visit",
    expectedResult: "cancelled",
    execute: cancelVisitor,
    description: "This marks the expected visit as cancelled.",
  },
};

const allowedActions = {
  expected: ["check-in", "cancel"],
  checked_in: ["check-out"],
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
  "text-[#245747] hover:bg-[#E8EDE4]";

const dangerButton =
  `${buttonBase} border border-red-200 bg-white ` +
  "text-red-700 hover:bg-red-50";

const rowGrid =
  "grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-3 " +
  "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_120px]";

function formatTimestamp(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function formatVisitDate(value) {
  if (!value) return "Unavailable";

  // Treat the API's YYYY-MM-DD value as a calendar date.
  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function getResidentName(visitor) {
  return (
    visitor.resident_name ||
    visitor.resident_username ||
    "Resident unavailable"
  );
}

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  return error.message || "The action could not be completed.";
}

function StatusBadge({ status }) {
  const details = statusDetails[status] || {
    label: status || "Unavailable",
    classes: "bg-stone-100 text-stone-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${details.classes}`}
    >
      {details.label}
    </span>
  );
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedVisitor, setSelectedVisitor] = useState(null);
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

    async function loadVisitors() {
      setLoading(true);
      setListError("");

      try {
        const data = await listStaffVisitors({
          page,
          status,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error(
            "The server returned an unexpected visitor list.",
          );
        }

        if (!controller.signal.aborted) {
          setVisitors(data.results);
          setHasNext(Boolean(data.next));
          setNeedsRefresh(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(
            error instanceof TypeError
              ? "Could not connect. Please check your connection."
              : error.message || "Could not load visitors.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadVisitors();

    return () => controller.abort();
  }, [page, status, retry]);

  useEffect(() => {
    if (!selectedVisitor) return;

    detailsRef.current?.focus({ preventScroll: true });
    detailsRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedVisitor]);

  function resetDetails() {
    setSelectedVisitor(null);
    setConfirmation(null);
  }

  function openDetails(visitor, button) {
    if (mutationRef.current || loading) return;

    triggerRef.current = button;
    setSelectedVisitor(visitor);
    setConfirmation(null);
    setSuccessMessage("");

    if (!needsRefresh) {
      setActionError("");
    }
  }

  function closeDetails() {
    if (mutationRef.current) return;

    resetDetails();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function reloadVisitors() {
    resetDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleRefresh() {
    if (mutationRef.current || loading) return;

    reloadVisitors();
  }

  function openConfirmation(visitor, actionName) {
    if (
      mutationRef.current ||
      needsRefresh ||
      loading ||
      !(allowedActions[visitor.status] || []).includes(actionName)
    ) {
      return;
    }

    setActionError("");
    setSuccessMessage("");

    setConfirmation({
      id: visitor.id,
      fullName: visitor.full_name || "Visitor",
      action: actionName,
    });
  }

  async function handleConfirm() {
    if (
      mutationRef.current ||
      !confirmation ||
      needsRefresh ||
      loading
    ) {
      return;
    }

    const selected = confirmation;
    const action = actions[selected.action];

    if (
      !action ||
      selectedVisitor?.id !== selected.id ||
      !(allowedActions[selectedVisitor.status] || []).includes(
        selected.action,
      )
    ) {
      return;
    }

    mutationRef.current = true;
    setBusy(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await action.execute(selected.id);

      if (
        updated?.id !== selected.id ||
        updated.status !== action.expectedResult
      ) {
        throw new Error(
          "The server returned an unexpected action result.",
        );
      }

      setSuccessMessage(
        `${selected.fullName}: ${statusDetails[updated.status].label}.`,
      );

      // The new status might no longer match the current filter.
      setNeedsRefresh(true);
      setPage(1);
      reloadVisitors();
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
          reloadVisitors();
        }
      } else {
        setNeedsRefresh(true);
        setActionError(
          "We could not confirm the action. Refresh the visitor list " +
            "and check the current status before trying again.",
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
      nextPage < 1 ||
      nextPage === page
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
    const nextStatus = event.target.value;

    if (
      mutationRef.current ||
      loading ||
      needsRefresh ||
      nextStatus === status
    ) {
      return;
    }

    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setStatus(nextStatus);
    setPage(1);
  }

  const controlsDisabled = loading || busy || needsRefresh;

  const availableActions = selectedVisitor
    ? allowedActions[selectedVisitor.status] || []
    : [];

  return (
    <section
      aria-labelledby="visitors-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
          Visits & arrivals
        </p>

        <h1
          id="visitors-heading"
          className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]"
        >
          Visitor management
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#57534E]">
          Review expected visits and record arrivals and departures.
        </p>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || busy}
              className="mt-2 inline-flex min-h-11 items-center rounded-lg font-semibold underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh visitors
            </button>
          )}
        </div>
      )}

      {/* Existing status filter */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#245747]/15 bg-white p-4">
        <div className="w-full sm:w-56">
          <label
            htmlFor="visitor-status-filter"
            className="block text-xs font-semibold text-[#173F35]"
          >
            Visit status
          </label>

          <select
            id="visitor-status-filter"
            value={status}
            disabled={controlsDisabled}
            onChange={changeFilter}
            className="mt-2 min-h-11 w-full rounded-lg border border-[#245747]/20 bg-white px-3 py-2 text-sm text-[#173F35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245747] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All visitors</option>

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
        <div className="rounded-xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage label="Loading visitors…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{listError}</p>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className="mt-2 inline-flex min-h-11 items-center rounded-lg font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : visitors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#245747]/25 bg-white px-5 py-8 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No visitors found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No visits match the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          {/* Desktop column headings */}
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10 bg-[#F5F7F3] px-4 py-3 text-xs font-semibold text-[#57534E] lg:grid`}
          >
            <span>Visitor</span>
            <span>Host resident / room</span>
            <span>Scheduled date</span>
            <span>Status</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {visitors.map((visitor) => {
              const isSelected = selectedVisitor?.id === visitor.id;
              const residentName = getResidentName(visitor);
              const visitorName = visitor.full_name || "Unnamed visitor";

              return (
                <li key={visitor.id} className="min-w-0">
                  <article
                    aria-labelledby={`visitor-title-${visitor.id}`}
                    className="min-w-0"
                  >
                    <div
                      className={`${rowGrid} px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-[#EDF3E8]"
                          : "hover:bg-[#FAFBF8]"
                      }`}
                    >
                      {/* Visitor name */}
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Visitor
                        </p>

                        <h2
                          id={`visitor-title-${visitor.id}`}
                          title={visitorName}
                          className="truncate text-sm font-semibold text-[#173F35]"
                        >
                          {visitorName}
                        </h2>
                      </div>

                      {/* Host and room */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Host resident / room
                        </p>

                        <p
                          title={residentName}
                          className="truncate text-sm font-medium text-[#173F35]"
                        >
                          {residentName}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#78716C]">
                          {visitor.room_number
                            ? `Room ${visitor.room_number}`
                            : "Room unavailable"}
                        </p>
                      </div>

                      {/* Scheduled date */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Scheduled date
                        </p>

                        <p className="text-sm text-[#57534E]">
                          {formatVisitDate(visitor.visit_date)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Status
                        </p>

                        <StatusBadge status={visitor.status} />
                      </div>

                      {/* Details toggle */}
                      <div className="justify-self-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            if (isSelected) {
                              closeDetails();
                            } else {
                              openDetails(visitor, event.currentTarget);
                            }
                          }}
                          disabled={busy}
                          aria-label={`${
                            isSelected ? "Hide" : "View"
                          } details for ${visitorName}`}
                          aria-expanded={isSelected}
                          aria-controls={
                            isSelected
                              ? `visitor-details-${visitor.id}`
                              : undefined
                          }
                          className={secondaryButton}
                        >
                          {isSelected ? "Hide details" : "View details"}
                          <span aria-hidden="true">
                            {isSelected ? "−" : "+"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded details beneath this visitor */}
                    {isSelected && (
                      <section
                        id={`visitor-details-${visitor.id}`}
                        ref={detailsRef}
                        tabIndex={-1}
                        aria-labelledby={`visitor-details-title-${visitor.id}`}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Escape" &&
                            !mutationRef.current
                          ) {
                            event.stopPropagation();
                            closeDetails();
                          }
                        }}
                        className="min-w-0 scroll-mt-24 border-t border-[#245747]/10 bg-[#FAF7F2] p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#245747] sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#965038]">
                              Visit details
                            </p>

                            <h3
                              id={`visitor-details-title-${visitor.id}`}
                              className="mt-2 break-words font-heading text-base font-semibold text-[#173F35]"
                            >
                              {visitorName}
                            </h3>
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

                        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {[
                            ["Host resident", residentName],
                            ["Room", visitor.room_number],
                            [
                              "Phone",
                              visitor.phone_number || "Not provided",
                            ],
                            [
                              "Scheduled date",
                              formatVisitDate(visitor.visit_date),
                            ],
                            [
                              "Checked in",
                              formatTimestamp(visitor.check_in_at),
                            ],
                            [
                              "Checked out",
                              formatTimestamp(visitor.check_out_at),
                            ],
                            [
                              "Registered on",
                              formatTimestamp(visitor.created_at),
                            ],
                          ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <dt className="text-xs text-[#78716C]">
                                {label}
                              </dt>

                              <dd className="mt-1 break-words text-sm font-medium text-[#173F35]">
                                {value || "Unavailable"}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <div className="mt-5 border-t border-[#245747]/10 pt-4">
                          <h4 className="text-sm font-semibold text-[#173F35]">
                            Purpose of visit
                          </h4>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
                            {visitor.purpose || "No purpose provided."}
                          </p>

                          <p className="mt-3 text-xs text-[#78716C]">
                            Internal visit reference: {visitor.id}
                          </p>
                        </div>

                        {/* Action confirmation */}
                        {confirmation?.id === visitor.id ? (
                          <div
                            role="group"
                            aria-labelledby={`visitor-confirmation-${visitor.id}`}
                            aria-busy={busy}
                            className="mt-5 rounded-xl border border-[#245747]/15 bg-white p-4"
                          >
                            <h4
                              id={`visitor-confirmation-${visitor.id}`}
                              className="break-words text-sm font-semibold text-[#173F35]"
                            >
                              {actions[confirmation.action].label} for{" "}
                              {visitorName}?
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-[#57534E]">
                              {actions[confirmation.action].description}
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
                                  : `Confirm ${actions[
                                      confirmation.action
                                    ].label.toLowerCase()}`}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 border-t border-[#245747]/10 pt-4">
                            {visitor.status === "expected" && (
                              <p className="mb-3 max-w-2xl text-xs leading-6 text-[#78716C]">
                                Check-in is allowed on the scheduled visit
                                date while the host resident is still
                                checked in.
                              </p>
                            )}

                            {availableActions.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {availableActions.map((actionName) => (
                                  <button
                                    key={actionName}
                                    type="button"
                                    onClick={() =>
                                      openConfirmation(
                                        selectedVisitor,
                                        actionName,
                                      )
                                    }
                                    disabled={controlsDisabled}
                                    className={
                                      actionName === "cancel"
                                        ? dangerButton
                                        : primaryButton
                                    }
                                  >
                                    {actions[actionName].label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-[#78716C]">
                                {visitor.status === "checked_out"
                                  ? "This visit has ended."
                                  : visitor.status === "cancelled"
                                    ? "This visit was cancelled."
                                    : "No actions are available for this status."}
                              </p>
                            )}
                          </div>
                        )}
                      </section>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <nav
        aria-label="Staff visitor pages"
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

        <span className="text-xs text-[#57534E]">Page {page}</span>

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
        Arrival and departure times are shown in Nairobi time.
      </p>
    </section>
  );
}