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
    classes: "bg-slate-100 text-slate-700",
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
  },
  "check-out": {
    label: "Check out",
    expectedResult: "checked_out",
    execute: checkOutVisitor,
  },
  cancel: {
    label: "Cancel visit",
    expectedResult: "cancelled",
    execute: cancelVisitor,
  },
};

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

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  return error.message || "The action could not be completed.";
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
    if (selectedVisitor) {
      detailsRef.current?.focus({ preventScroll: true });

      detailsRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedVisitor]);

  function resetDetails() {
    setSelectedVisitor(null);
    setConfirmation(null);
  }

  function openDetails(visitor, button) {
    if (mutationRef.current) return;

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

  function refreshList() {
    resetDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function openConfirmation(visitor, actionName) {
    if (mutationRef.current || needsRefresh || loading) return;

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

    if (!action) return;

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

      const resultLabel = statusDetails[updated.status].label;

      setSuccessMessage(`${selected.fullName}: ${resultLabel}.`);
      setNeedsRefresh(true);

      // The updated visitor may no longer match the status filter.
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
    resetDetails();

    if (!needsRefresh) {
      setActionError("");
    }

    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    resetDetails();

    if (!needsRefresh) {
      setActionError("");
    }

    setSuccessMessage("");
    setLoading(true);
    setStatus(event.target.value);
    setPage(1);
  }

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Hostel management
          </p>

          <h1 className="page-title mt-2">Visitor management</h1>

          <p className="page-description">
            Review expected visitors and record their arrival and departure.
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
              Refresh visitors
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="visitor-status-filter" className="form-label">
            Filter by status
          </label>

          <select
            id="visitor-status-filter"
            value={status}
            disabled={loading || busy}
            onChange={changeFilter}
            className="form-input"
          >
            <option value="">All visitors</option>

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
          <LoadingMessage label="Loading visitors…" compact />
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
      ) : visitors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No visitors found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No visits match the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Visitors, host residents, visit dates and current status
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="w-[25%] px-4 py-3">
                    Visitor
                  </th>
                  <th scope="col" className="w-[20%] px-4 py-3">
                    Host resident
                  </th>
                  <th scope="col" className="w-[10%] px-4 py-3">
                    Room
                  </th>
                  <th scope="col" className="w-[15%] px-4 py-3">
                    Visit date
                  </th>
                  <th scope="col" className="w-[15%] px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="w-[15%] px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visitors.map((visitor) => (
                  <tr
                    key={visitor.id}
                    className={
                      selectedVisitor?.id === visitor.id
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium text-slate-900"
                    >
                      <p className="truncate" title={visitor.full_name}>
                        {visitor.full_name}
                      </p>

                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Visit #{visitor.id}
                      </p>
                    </th>

                    <td className="px-4 py-3 text-slate-600">
                      <p
                        className="truncate"
                        title={visitor.resident_username}
                      >
                        {visitor.resident_username || "Unavailable"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      <p className="truncate" title={visitor.room_number}>
                        {visitor.room_number}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {visitor.visit_date}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={visitor.status} />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) =>
                          openDetails(visitor, event.currentTarget)
                        }
                        disabled={busy}
                        aria-label={`View details for visit ${visitor.id}`}
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
        aria-label="Staff visitor pages"
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

      {selectedVisitor && !loading && !listError && (
        <section
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="visitor-details-title"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                Visit #{selectedVisitor.id}
              </p>

              <h2
                id="visitor-details-title"
                className="mt-2 break-words font-heading text-base font-semibold text-slate-900"
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
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Host resident", selectedVisitor.resident_username],
              ["Room", selectedVisitor.room_number],
              ["Phone", selectedVisitor.phone_number || "Not provided"],
              ["Visit date", selectedVisitor.visit_date],
              [
                "Checked in · Nairobi",
                formatTimestamp(selectedVisitor.check_in_at),
              ],
              [
                "Checked out · Nairobi",
                formatTimestamp(selectedVisitor.check_out_at),
              ],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-slate-500">{label}</dt>

                <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                  {value || "Unavailable"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Purpose of visit
            </h3>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
              {selectedVisitor.purpose || "No purpose provided."}
            </p>
          </div>

          {confirmation?.id === selectedVisitor.id ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">
                {actions[confirmation.action].label} for{" "}
                {selectedVisitor.full_name}?
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
              {selectedVisitor.status === "expected" && (
                <>
                  <p className="mb-3 text-xs leading-5 text-slate-500">
                    Check-in is allowed on the scheduled visit date while
                    the host resident is still checked in.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openConfirmation(selectedVisitor, "check-in")
                      }
                      disabled={busy || needsRefresh}
                      className="button-primary"
                    >
                      Check in
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openConfirmation(selectedVisitor, "cancel")
                      }
                      disabled={busy || needsRefresh}
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Cancel visit
                    </button>
                  </div>
                </>
              )}

              {selectedVisitor.status === "checked_in" && (
                <button
                  type="button"
                  onClick={() =>
                    openConfirmation(selectedVisitor, "check-out")
                  }
                  disabled={busy || needsRefresh}
                  className="button-primary"
                >
                  Check out
                </button>
              )}

              {selectedVisitor.status === "checked_out" && (
                <p className="text-sm text-slate-500">
                  This visit has ended.
                </p>
              )}

              {selectedVisitor.status === "cancelled" && (
                <p className="text-sm text-slate-500">
                  This visit was cancelled.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}