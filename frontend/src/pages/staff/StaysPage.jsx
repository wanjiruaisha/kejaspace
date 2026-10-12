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

const inputStyle =
  "mt-2 min-h-11 w-full rounded-lg border border-[#245747]/20 " +
  "bg-[#FAF7F2]/60 px-3 py-2 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const rowGrid =
  "grid min-w-0 gap-3 " +
  "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_100px] " +
  "lg:items-center lg:gap-4";

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
  return stay.resident_name || stay.resident_username || "Name unavailable";
}

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  return error.message || "This action could not be completed.";
}

function StatusBadge({ status }) {
  const details = statusDetails[status] || {
    label: status || "Unknown",
    classes: "bg-stone-100 text-stone-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1
        text-xs font-medium ${details.classes}`}
    >
      {details.label}
    </span>
  );
}

export default function StaysPage() {
  const [stays, setStays] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
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
          search,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected stay list.");
        }

        if (!controller.signal.aborted) {
          setStays(data.results);
          setHasNext(Boolean(data.next));
          setTotalCount(
            Number.isInteger(data.count) ? data.count : null,
          );
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
  }, [page, status, search, retry]);

  useEffect(() => {
    if (!selectedStay) return;

    detailsRef.current?.focus({ preventScroll: true });
  }, [selectedStay]);

  function resetDetails() {
    setSelectedStay(null);
    setConfirmation(null);
  }

  function closeDetails() {
    if (mutationRef.current) return;

    resetDetails();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function toggleDetails(stay, button) {
    if (mutationRef.current || loading) return;

    if (selectedStay?.id === stay.id) {
      closeDetails();
      return;
    }

    triggerRef.current = button;
    setSelectedStay(stay);
    setConfirmation(null);
  }

  function reloadStays() {
    resetDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleRefresh() {
    if (mutationRef.current || loading) return;

    // Return to a valid first page if records have changed.
    setPage(1);
    reloadStays();
  }

  function resetForFilterChange() {
    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setPage(1);
    setLoading(true);
  }

  function handleSearch(event) {
    event.preventDefault();

    if (mutationRef.current || loading || needsRefresh) return;

    resetForFilterChange();
    setSearch(searchInput.trim());
    setRetry((value) => value + 1);
  }

  function clearSearch() {
    if (mutationRef.current || loading || needsRefresh) return;

    resetForFilterChange();
    setSearchInput("");
    setSearch("");
    setRetry((value) => value + 1);
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

    resetForFilterChange();
    setStatus(nextStatus);
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

    const residentName = getResidentName(selectedStay);

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
        `${residentName}: ${statusDetails[updated.status].label}.`,
      );

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
          setPage(1);
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

  const controlsDisabled = loading || busy || needsRefresh;

  return (
    <section
      aria-labelledby="stays-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#965038]">
            Arrivals & departures
          </p>

          <h1
            id="stays-heading"
            className="mt-2 font-heading text-2xl font-bold
              tracking-tight text-[#173F35]"
          >
            Resident stays
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Manage room allocations, arrivals and departures.
          </p>
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
      </header>

      {/* Search and filter */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-[#245747]/15 bg-white p-4"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="stay-search"
              className="block text-xs font-semibold text-[#173F35]"
            >
              Search residents
            </label>

            <input
              id="stay-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Resident name, username or room"
              disabled={controlsDisabled}
              className={inputStyle}
            />
          </div>

          <div className="w-full xl:w-52">
            <label
              htmlFor="stay-status-filter"
              className="block text-xs font-semibold text-[#173F35]"
            >
              Stay status
            </label>

            <select
              id="stay-status-filter"
              value={status}
              disabled={controlsDisabled}
              onChange={changeFilter}
              className={inputStyle}
            >
              <option value="">All stays</option>

              {Object.entries(statusDetails).map(([value, details]) => (
                <option key={value} value={value}>
                  {details.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={controlsDisabled}
              className={primaryButton}
            >
              Search
            </button>

            {(searchInput || search) && (
              <button
                type="button"
                onClick={clearSearch}
                disabled={controlsDisabled}
                className={secondaryButton}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!loading && !listError && (
          <p
            role="status"
            className="mt-3 break-words text-xs leading-6 text-[#78716C]"
          >
            {totalCount !== null
              ? `${totalCount} matching ${
                  totalCount === 1 ? "stay" : "stays"
                }`
              : `${stays.length} on this page`}
            {search ? ` for “${search}”` : ""}
          </p>
        )}
      </form>

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
              className="mt-2 min-h-11 rounded-lg font-semibold
                underline underline-offset-4 disabled:opacity-50"
            >
              Refresh stays
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage label="Loading resident stays…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100
            bg-red-50 p-5 text-sm leading-6 text-red-800"
        >
          <p>{listError}</p>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className="mt-2 min-h-11 rounded-lg font-semibold
              underline underline-offset-4 disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : stays.length === 0 ? (
        <div
          className="rounded-xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-10 text-center"
        >
          <h2 className="text-base font-semibold text-[#173F35]">
            No stays found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            {search || status
              ? "Try a different search or change the status filter."
              : "Resident stays will appear here after application approval."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_100px]
              items-center gap-4 border-b border-[#245747]/10
              bg-[#F5F7F2] px-4 py-3 text-xs font-semibold
              text-[#57534E] lg:grid"
          >
            <span>Resident</span>
            <span>Room</span>
            <span>Status</span>
            <span>Checked in</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {stays.map((stay) => {
              const name = getResidentName(stay);
              const isSelected = selectedStay?.id === stay.id;
              const actions = allowedActions[stay.status] || [];
              const isConfirming =
                isSelected && confirmation?.stayId === stay.id;

              return (
                <li key={stay.id} className="min-w-0">
                  <article aria-labelledby={`stay-heading-${stay.id}`}>
                    <div
                      className={`${rowGrid} px-4 py-4 ${
                        isSelected
                          ? "bg-[#EDF3E8]"
                          : "transition-colors hover:bg-[#FAF7F2]/70"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center
                            justify-center rounded-lg bg-[#E8EDE4]
                            text-sm font-semibold text-[#245747]"
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>

                        <h2
                          id={`stay-heading-${stay.id}`}
                          className="min-w-0 break-words text-sm
                            font-semibold text-[#173F35]"
                        >
                          {name}
                        </h2>
                      </div>

                      <p className="break-words text-sm text-[#57534E]">
                        <span className="mr-2 text-xs text-[#78716C] lg:sr-only">
                          Room:
                        </span>
                        {stay.room_number || "Unavailable"}
                      </p>

                      <div>
                        <span className="sr-only">Status: </span>
                        <StatusBadge status={stay.status} />
                      </div>

                      <p className="text-xs leading-5 text-[#57534E]">
                        <span className="mr-2 text-[#78716C] lg:sr-only">
                          Checked in:
                        </span>
                        {formatTimestamp(stay.check_in_at)}
                      </p>

                      <div className="lg:text-right">
                        <button
                          type="button"
                          onClick={(event) =>
                            toggleDetails(stay, event.currentTarget)
                          }
                          disabled={busy}
                          aria-expanded={isSelected}
                          aria-controls={`stay-details-${stay.id}`}
                          aria-label={`${
                            isSelected ? "Hide" : "View"
                          } stay details for ${name}, room ${stay.room_number}`}
                          className={`${buttonBase} px-2 text-[#245747]
                            hover:bg-[#E8EDE4]`}
                        >
                          {isSelected ? "Hide details" : "Details"}
                          <span aria-hidden="true">
                            {isSelected ? "−" : "+"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Details expand directly beneath this row. */}
                    <div
                      id={`stay-details-${stay.id}`}
                      hidden={!isSelected}
                      ref={isSelected ? detailsRef : null}
                      tabIndex={-1}
                      role="region"
                      aria-label={`Stay details for ${name}`}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.stopPropagation();
                          closeDetails();
                        }
                      }}
                      className="border-t border-[#245747]/10
                        bg-[#FAF7F2]/70 px-4 py-5
                        focus-visible:outline-2 focus-visible:outline-inset
                        focus-visible:outline-[#245747] sm:px-6"
                    >
                      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          ["Resident", name],
                          ["Room", stay.room_number || "Unavailable"],
                          ["Stay reference", `Stay ${stay.id}`],
                          [
                            "Payment deadline",
                            formatTimestamp(
                              stay.payment_deadline,
                              "Not recorded",
                            ),
                          ],
                          ["Checked in", formatTimestamp(stay.check_in_at)],
                          ["Checked out", formatTimestamp(stay.check_out_at)],
                          [
                            "Created",
                            formatTimestamp(stay.created_at, "Not recorded"),
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
                      </dl>

                      {stay.status === "awaiting_payment" && (
                        <div
                          className="mt-4 rounded-lg border border-amber-200
                            bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                        >
                          <p>
                            The first month’s full rent is required before
                            the reservation can be confirmed.
                          </p>

                          {!stay.payment_deadline && (
                            <p className="mt-1 font-semibold">
                              No payment deadline is recorded. Staff review
                              is required.
                            </p>
                          )}
                        </div>
                      )}

                      {isConfirming ? (
                        <div
                          role="group"
                          aria-labelledby={`stay-confirmation-${stay.id}`}
                          aria-busy={busy}
                          className="mt-5 rounded-xl border
                            border-[#245747]/15 bg-white p-4"
                        >
                          <h3
                            id={`stay-confirmation-${stay.id}`}
                            className="text-sm font-semibold text-[#173F35]"
                          >
                            {actionDetails[confirmation.action].label} for{" "}
                            {name}?
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-[#57534E]">
                            {actionDetails[confirmation.action].message}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
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
                          {actions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {actions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  onClick={() =>
                                    openConfirmation(stay, action)
                                  }
                                  disabled={controlsDisabled}
                                  className={
                                    action === "cancel"
                                      ? dangerButton
                                      : primaryButton
                                  }
                                >
                                  {actionDetails[action].label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#78716C]">
                              No stay actions are available for this status.
                            </p>
                          )}
                        </div>
                      )}

                      <p className="mt-4 text-xs text-[#78716C]">
                        All times are shown in Nairobi time.
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <nav
        aria-label="Resident stay pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={controlsDisabled || Boolean(listError) || page === 1}
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
    </section>
  );
}