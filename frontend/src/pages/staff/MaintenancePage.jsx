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

function getStatusLabel(status) {
  return (
    statusOptions.find((option) => option.value === status)?.label ||
    status
  );
}

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

function formatDate(value) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        statusStyles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("pending");
  const [staffNote, setStaffNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const savingRef = useRef(false);
  const detailsRef = useRef(null);

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

  useEffect(() => {
    if (selectedRequest) {
      detailsRef.current?.focus({ preventScroll: true });
      detailsRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedRequest]);

  function closeDetails() {
    setSelectedRequest(null);
    setEditing(false);
  }

  function openDetails(request) {
    if (savingRef.current) return;

    setSelectedRequest(request);
    setEditing(false);
    setActionError("");
    setSuccessMessage("");
  }

  function startEditing() {
    if (!selectedRequest || savingRef.current) return;

    setEditStatus(selectedRequest.status);
    setStaffNote(selectedRequest.staff_note || "");
    setActionError("");
    setSuccessMessage("");
    setEditing(true);
  }

  function refreshList() {
    closeDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    closeDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    closeDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setStatusFilter(event.target.value);
    setPage(1);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (savingRef.current || !selectedRequest || !editing) return;

    const requestId = selectedRequest.id;

    savingRef.current = true;
    setSaving(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await updateMaintenanceRequest(requestId, {
        status: editStatus,
        staff_note: staffNote.trim(),
      });

      if (
        updated?.id !== requestId ||
        !statusOptions.some((option) => option.value === updated.status)
      ) {
        throw new Error("The server returned an unexpected update.");
      }

      setSuccessMessage(
        `Maintenance request #${requestId} updated successfully.`,
      );

      // The updated status may no longer match the selected filter.
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
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Hostel management
          </p>

          <h1 className="page-title mt-2">Maintenance requests</h1>

          <p className="page-description">
            Review reported issues and keep residents informed about repairs.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshList}
          disabled={loading || saving}
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
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {actionError}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="w-full sm:max-w-xs">
          <label
            htmlFor="staff-maintenance-filter"
            className="form-label"
          >
            Filter by status
          </label>

          <select
            id="staff-maintenance-filter"
            value={statusFilter}
            onChange={changeFilter}
            disabled={loading || saving}
            className="form-input"
          >
            <option value="">All statuses</option>

            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <LoadingMessage
            label="Loading maintenance requests…"
            compact
          />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-5 text-sm text-red-800"
        >
          <p>{listError}</p>

          <button
            type="button"
            onClick={refreshList}
            disabled={saving}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No maintenance requests
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No requests match the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Maintenance requests by resident, room and status
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="w-[34%] px-4 py-3">
                    Request
                  </th>
                  <th scope="col" className="w-[20%] px-4 py-3">
                    Resident
                  </th>
                  <th scope="col" className="w-[12%] px-4 py-3">
                    Room
                  </th>
                  <th scope="col" className="w-[17%] px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="w-[17%] px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className={
                      selectedRequest?.id === request.id
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium text-slate-900"
                    >
                      <p className="truncate" title={request.title}>
                        {request.title}
                      </p>

                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Request #{request.id}
                      </p>
                    </th>

                    <td className="px-4 py-3 text-slate-600">
                      <p
                        className="truncate"
                        title={request.resident_username}
                      >
                        {request.resident_username || "Unavailable"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      <p className="truncate" title={request.room_number}>
                        {request.room_number}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={request.status} />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetails(request)}
                        disabled={saving}
                        aria-label={`View details for request ${request.id}`}
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
        aria-label="Staff maintenance pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || saving || page === 1}
          onClick={() => changePage(page - 1)}
          className="button-secondary"
        >
          Previous
        </button>

        <span className="text-sm text-slate-500">Page {page}</span>

        <button
          type="button"
          disabled={loading || saving || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {selectedRequest && !loading && !listError && (
        <section
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="maintenance-details-title"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">
                Request #{selectedRequest.id}
              </p>

              <h2
                id="maintenance-details-title"
                className="mt-2 break-words font-heading text-base font-semibold text-slate-900"
              >
                {selectedRequest.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeDetails}
              disabled={saving}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Resident</dt>
              <dd className="mt-1 break-words font-medium text-slate-900">
                {selectedRequest.resident_username || "Unavailable"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Room</dt>
              <dd className="mt-1 break-words font-medium text-slate-900">
                {selectedRequest.room_number}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={selectedRequest.status} />
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Last updated · Nairobi
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {formatDate(selectedRequest.updated_at)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Reported issue
            </h3>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
              {selectedRequest.description || "No description provided."}
            </p>
          </div>

          {editing ? (
            <form
              onSubmit={handleSave}
              className="mt-5 space-y-4 border-t border-slate-100 pt-5"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                Update request
              </h3>

              <div className="max-w-xs">
                <label
                  htmlFor="maintenance-edit-status"
                  className="form-label"
                >
                  Status
                </label>

                <select
                  id="maintenance-edit-status"
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value)}
                  disabled={saving}
                  className="form-input"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="maintenance-staff-note"
                  className="form-label"
                >
                  Note to resident
                </label>

                <textarea
                  id="maintenance-staff-note"
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  rows={4}
                  disabled={saving}
                  aria-describedby="maintenance-note-help"
                  placeholder="For example: A plumber will visit tomorrow morning."
                  className="form-input resize-y"
                />

                <p
                  id="maintenance-note-help"
                  className="mt-2 text-xs text-slate-500"
                >
                  The resident can read this note.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="button-primary"
                >
                  {saving ? "Saving…" : "Save update"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setActionError("");
                  }}
                  disabled={saving}
                  className="button-secondary"
                >
                  Cancel editing
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Current staff note
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {selectedRequest.staff_note || "No staff note added yet."}
              </p>

              <button
                type="button"
                onClick={startEditing}
                disabled={saving}
                className="button-primary mt-5"
              >
                Update request
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}