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
    description:
      "This marks the expected visit as cancelled.",
  },
};

const allowedActions = {
  expected: ["check-in", "cancel"],
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

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  return error.message || "The action could not be completed.";
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

    if (!needsRefresh) setActionError("");
  }

  function closeDetails() {
    if (mutationRef.current) return;

    resetDetails();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  // Also called internally after a successful action.
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
      fullName: visitor.full_name,
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

      // The visitor's new status may not match the current filter.
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

  const controlsDisabled = loading || busy || needsRefresh;

  const availableActions = selectedVisitor
    ? allowedActions[selectedVisitor.status] || []
    : [];

  return (
    <section
      aria-labelledby="visitors-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      {/* Introduction */}
      <header
        className="rounded-2xl border border-[#245747]/10
          bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8]
          to-[#DCE9DD] p-5 sm:p-6"
      >
        <p
          className="text-xs font-semibold uppercase
            tracking-[0.14em] text-[#965038]"
        >
          Visits & arrivals
        </p>

        <h1
          id="visitors-heading"
          className="mt-2 font-heading text-2xl
            font-bold tracking-tight text-[#173F35]"
        >
          Visitor management
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
          See who is expected, confirm their host and record
          arrivals and departures.
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
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh visitors
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
            htmlFor="visitor-status-filter"
            className="block text-sm font-semibold text-[#173F35]"
          >
            Visit status
          </label>

          <select
            id="visitor-status-filter"
            value={status}
            disabled={controlsDisabled}
            onChange={changeFilter}
            className="mt-2 min-h-11 w-full rounded-xl
              border border-[#245747]/20 bg-white
              px-3 py-2.5 text-sm text-[#173F35]
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#245747]
              disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Visitor list */}
      {loading ? (
        <div
          className="rounded-2xl border
            border-[#245747]/15 bg-white p-5"
        >
          <LoadingMessage label="Loading visitors…" compact />
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
      ) : visitors.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-9 text-center"
        >
          <h2
            className="font-heading text-base
              font-semibold text-[#173F35]"
          >
            No visitors found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No visits match the selected status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visitors.map((visitor) => {
            const isSelected = selectedVisitor?.id === visitor.id;

            return (
              <article
                key={visitor.id}
                aria-labelledby={`visitor-title-${visitor.id}`}
                className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${
                  isSelected
                    ? "border-[#245747]/40 bg-[#EDF3E8]"
                    : "border-[#245747]/15 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-xs text-[#78716C]">
                      Visit #{visitor.id}
                    </p>

                    <h2
                      id={`visitor-title-${visitor.id}`}
                      className="mt-1 break-words font-heading
                        text-base font-semibold text-[#173F35]"
                    >
                      {visitor.full_name}
                    </h2>
                  </div>

                  <StatusBadge status={visitor.status} />
                </div>

                <div
                  className="mt-4 flex flex-wrap items-end
                    justify-between gap-4"
                >
                  <dl
                    className="grid min-w-0 flex-1 grid-cols-2
                      gap-4 text-sm sm:grid-cols-3"
                  >
                    <div className="min-w-0">
                      <dt className="text-xs text-[#78716C]">
                        Host resident
                      </dt>
                      <dd
                        className="mt-1 break-words
                          font-medium text-[#173F35]"
                      >
                        {visitor.resident_username || "Unavailable"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-xs text-[#78716C]">Room</dt>
                      <dd
                        className="mt-1 break-words
                          font-medium text-[#173F35]"
                      >
                        {visitor.room_number || "Unavailable"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#78716C]">
                        Scheduled date
                      </dt>
                      <dd className="mt-1 font-medium text-[#173F35]">
                        {visitor.visit_date}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={(event) =>
                      openDetails(visitor, event.currentTarget)
                    }
                    disabled={busy}
                    aria-label={`View details for visit #${visitor.id}`}
                    aria-expanded={isSelected}
                    aria-controls={
                      isSelected ? "visitor-details" : undefined
                    }
                    className={secondaryButton}
                  >
                    View details
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Full visit details and actions */}
      {selectedVisitor && !loading && !listError && (
        <section
          id="visitor-details"
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="visitor-details-title"
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
              <p className="text-xs font-semibold text-[#965038]">
                Visit #{selectedVisitor.id}
              </p>

              <h2
                id="visitor-details-title"
                className="mt-2 break-words font-heading
                  text-lg font-semibold text-[#173F35]"
              >
                {selectedVisitor.full_name}
              </h2>

              <div className="mt-3">
                <StatusBadge status={selectedVisitor.status} />
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
              ["Host resident", selectedVisitor.resident_username],
              ["Room", selectedVisitor.room_number],
              ["Phone", selectedVisitor.phone_number || "Not provided"],
              ["Scheduled date", selectedVisitor.visit_date],
              [
                "Checked in",
                formatTimestamp(selectedVisitor.check_in_at),
              ],
              [
                "Checked out",
                formatTimestamp(selectedVisitor.check_out_at),
              ],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-[#78716C]">{label}</dt>

                <dd
                  className="mt-1 break-words text-sm
                    font-medium text-[#173F35]"
                >
                  {value || "Unavailable"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 border-t border-[#245747]/10 pt-4">
            <h3 className="text-sm font-semibold text-[#173F35]">
              Purpose of visit
            </h3>

            <p
              className="mt-2 whitespace-pre-wrap break-words
                text-sm leading-7 text-[#57534E]"
            >
              {selectedVisitor.purpose || "No purpose provided."}
            </p>
          </div>

          {confirmation?.id === selectedVisitor.id ? (
            <div
              role="group"
              aria-labelledby="visitor-confirmation-heading"
              aria-busy={busy}
              className="mt-5 rounded-xl border
                border-[#245747]/15 bg-[#FAF7F2] p-4"
            >
              <h3
                id="visitor-confirmation-heading"
                className="text-sm font-semibold text-[#173F35]"
              >
                {actions[confirmation.action].label} for{" "}
                {selectedVisitor.full_name}?
              </h3>

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
              {selectedVisitor.status === "expected" && (
                <p className="mb-3 max-w-2xl text-xs leading-6 text-[#78716C]">
                  Check-in is allowed on the scheduled visit date while
                  the host resident is still checked in.
                </p>
              )}

              {availableActions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableActions.map((actionName) => (
                    <button
                      key={actionName}
                      type="button"
                      onClick={() =>
                        openConfirmation(selectedVisitor, actionName)
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
                  {selectedVisitor.status === "checked_out"
                    ? "This visit has ended."
                    : selectedVisitor.status === "cancelled"
                      ? "This visit was cancelled."
                      : "No actions are available for this status."}
                </p>
              )}
            </div>
          )}
        </section>
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
        Arrival and departure times are shown in Nairobi time.
      </p>
    </section>
  );
}