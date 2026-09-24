import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../../components/common/LoadingMessage";
import {
  listStaffMaintenance,
  updateMaintenanceRequest,
} from "../../services/maintenanceService";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-800",
  resolved: "bg-emerald-50 text-emerald-800",
};

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  if (error.data && typeof error.data === "object") {
    return Object.entries(error.data)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return `${field}: ${message}`;
      })
      .join(" ");
  }

  return error.message || "Could not save the update.";
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [staffNote, setStaffNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests() {
      setLoading(true);
      setListError("");

      try {
        const data = await listStaffMaintenance({
          page,
          status: statusFilter,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error(
            "The server returned an unexpected maintenance list.",
          );
        }

        if (!controller.signal.aborted) {
          setRequests(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(
            error instanceof TypeError
              ? "Could not connect. Please check your connection."
              : error.message || "Could not load maintenance requests.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => controller.abort();
  }, [page, statusFilter, retry]);

  function startEditing(request) {
    setEditingId(request.id);
    setEditStatus(request.status);
    setStaffNote(request.staff_note || "");
    setActionError("");
    setSuccessMessage("");
  }

  function refreshList() {
    setEditingId(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    setEditingId(null);
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (savingRef.current || editingId === null) return;

    const requestId = editingId;

    savingRef.current = true;
    setSaving(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await updateMaintenanceRequest(requestId, {
        status: editStatus,
        staff_note: staffNote.trim(),
      });

      if (updated?.id !== requestId) {
        throw new Error("The server returned an unexpected update.");
      }

      setSuccessMessage(
        `Maintenance request #${requestId} updated successfully.`,
      );

      // Reload because the updated request may no longer match the filter.
      setPage(1);
      refreshList();
    } catch (error) {
      if ([400, 401, 403, 429].includes(error.status)) {
        setActionError(
          error.status === 429
            ? "Too many requests. Please wait before trying again."
            : getErrorMessage(error),
        );
      } else {
        setActionError(
          "We could not confirm the update. The list is being reloaded. " +
            "Check the request’s current status and note before editing again.",
        );

        refreshList();
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Hostel management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Maintenance requests
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-slate-500">
            Review reported problems and keep residents informed about repairs.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshList}
          disabled={loading || saving}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
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
        <p
          role="alert"
          className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {actionError}
        </p>
      )}

      <div className="mt-6">
        <label
          htmlFor="staff-maintenance-filter"
          className="block text-sm font-semibold text-slate-700"
        >
          Filter by status
        </label>

        <select
          id="staff-maintenance-filter"
          value={statusFilter}
          disabled={loading || saving}
          onChange={(event) => {
            setEditingId(null);
            setActionError("");
            setSuccessMessage("");
            setLoading(true);
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm sm:w-64"
        >
          <option value="">All statuses</option>

          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingMessage label="Loading maintenance requests…" />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl bg-red-50 p-6 text-red-800"
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
      ) : requests.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No maintenance requests match this view.
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {requests.map((request) => {
            const statusLabel =
              statusOptions.find(
                (option) => option.value === request.status,
              )?.label || request.status;

            return (
              <article
                key={request.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Request #{request.id}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusStyles[request.status] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <h2 className="mt-4 break-words text-xl font-bold text-slate-900">
                  {request.title}
                </h2>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Resident</dt>
                    <dd className="break-words text-right font-medium text-slate-900">
                      {request.resident_username}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Room</dt>
                    <dd className="font-medium text-slate-900">
                      {request.room_number}
                    </dd>
                  </div>
                </dl>

                <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {request.description}
                </p>

                {editingId === request.id ? (
                  <form
                    onSubmit={handleSave}
                    className="mt-6 space-y-4 border-t border-slate-200 pt-5"
                  >
                    <div>
                      <label
                        htmlFor={`status-${request.id}`}
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Status
                      </label>

                      <select
                        id={`status-${request.id}`}
                        value={editStatus}
                        onChange={(event) =>
                          setEditStatus(event.target.value)
                        }
                        disabled={saving}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      >
                        {statusOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`note-${request.id}`}
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Note to resident
                      </label>

                      <textarea
                        id={`note-${request.id}`}
                        value={staffNote}
                        onChange={(event) =>
                          setStaffNote(event.target.value)
                        }
                        rows={4}
                        disabled={saving}
                        placeholder="For example: A plumber will visit tomorrow morning."
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        The resident can read this note.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save update"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    {request.staff_note && (
                      <div className="mb-5 rounded-xl bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-900">
                          Current staff note
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-blue-800">
                          {request.staff_note}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => startEditing(request)}
                      disabled={saving}
                      className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      Update request
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Staff maintenance pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || saving || page === 1}
          onClick={() => changePage(page - 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {page}
        </span>

        <button
          type="button"
          disabled={
            loading || saving || Boolean(listError) || !hasNext
          }
          onClick={() => changePage(page + 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}