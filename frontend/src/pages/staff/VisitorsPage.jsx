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

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  return error.message || "The action could not be completed.";
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState([]);
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
          throw new Error("The server returned an unexpected visitor list.");
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

  function refreshList() {
    setConfirmation(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function openConfirmation(visitor, action) {
    setActionError("");
    setSuccessMessage("");
    setConfirmation({
      id: visitor.id,
      fullName: visitor.full_name,
      action,
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
        throw new Error("The server returned an unexpected action result.");
      }

      const resultLabel = statusDetails[updated.status].label;

      setSuccessMessage(`${selected.fullName}: ${resultLabel}.`);
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
            Visitor management
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-500">
            Review expected visitors and record their arrival and departure.
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
              Refresh visitors
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="visitor-status-filter"
          className="block text-sm font-semibold text-slate-700"
        >
          Filter by status
        </label>

        <select
          id="visitor-status-filter"
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
          <option value="">All visitors</option>
          <option value="expected">Expected</option>
          <option value="checked_in">Checked in</option>
          <option value="checked_out">Checked out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingMessage label="Loading visitors…" />
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
      ) : visitors.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No visitors match this view.
        </p>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {visitors.map((visitor) => {
            const details = statusDetails[visitor.status] || {
              label: visitor.status,
              classes: "bg-slate-100 text-slate-700",
            };

            return (
              <article
                key={visitor.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Visit #{visitor.id}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${details.classes}`}
                  >
                    {details.label}
                  </span>
                </div>

                <h2 className="mt-4 break-words text-xl font-bold text-slate-900">
                  {visitor.full_name}
                </h2>

                <dl className="mt-5 space-y-3 text-sm">
                  {[
                    ["Host resident", visitor.resident_username],
                    ["Room", visitor.room_number],
                    ["Phone", visitor.phone_number || "Not provided"],
                    ["Visit date", visitor.visit_date],
                    ["Checked in", formatTimestamp(visitor.check_in_at)],
                    ["Checked out", formatTimestamp(visitor.check_out_at)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4"
                    >
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="break-words text-right font-medium text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {visitor.purpose && (
                  <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                    {visitor.purpose}
                  </p>
                )}

                {confirmation?.id === visitor.id ? (
                  <div className="mt-6 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-800">
                      {actions[confirmation.action].label} for{" "}
                      {visitor.full_name}?
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
                  <div className="mt-6 flex flex-wrap gap-3">
                    {visitor.status === "expected" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            openConfirmation(visitor, "check-in")
                          }
                          disabled={busy || needsRefresh}
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Check in
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openConfirmation(visitor, "cancel")
                          }
                          disabled={busy || needsRefresh}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                        >
                          Cancel visit
                        </button>
                      </>
                    )}

                    {visitor.status === "checked_in" && (
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmation(visitor, "check-out")
                        }
                        disabled={busy || needsRefresh}
                        className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Check out
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Staff visitor pages"
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