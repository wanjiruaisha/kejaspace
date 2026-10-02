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
  in_progress: "bg-[#F5E8DE] text-[#965038]",
  resolved: "bg-emerald-50 text-emerald-800",
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

const inputClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl " +
  "border border-[#245747]/20 bg-white px-3 py-2.5 " +
  "text-sm text-[#173F35] placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClass = "block text-sm font-semibold text-[#173F35]";

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

  if (
    error.data &&
    typeof error.data === "object" &&
    !Array.isArray(error.data)
  ) {
    const message = Object.entries(error.data)
      .map(([field, value]) => {
        const text = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return field === "non_field_errors"
          ? text
          : `${field.replaceAll("_", " ")}: ${text}`;
      })
      .join(" ");

    if (message) return message;
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
      className={`inline-flex whitespace-nowrap rounded-full
        px-2.5 py-1.5 text-xs font-medium ${
          statusStyles[status] || "bg-stone-100 text-stone-700"
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
  const triggerRef = useRef(null);

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
    if (!selectedRequest) return;

    detailsRef.current?.focus({ preventScroll: true });
    detailsRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedRequest]);

  function resetDetails() {
    setSelectedRequest(null);
    setEditing(false);
  }

  function closeDetails() {
    if (savingRef.current) return;

    resetDetails();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function openDetails(request, button) {
    if (savingRef.current || loading) return;

    triggerRef.current = button;
    setSelectedRequest(request);
    setEditing(false);
    setActionError("");
    setSuccessMessage("");
  }

  function startEditing() {
    if (!selectedRequest || savingRef.current || loading) return;

    setEditStatus(selectedRequest.status);
    setStaffNote(selectedRequest.staff_note || "");
    setActionError("");
    setSuccessMessage("");
    setEditing(true);
  }

  // Can also run internally after an update.
  function reloadRequests() {
    resetDetails();
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleRefresh() {
    if (savingRef.current || loading) return;
    reloadRequests();
  }

  function changePage(nextPage) {
    if (savingRef.current || loading || nextPage < 1) return;

    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    if (savingRef.current || loading) return;

    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setStatusFilter(event.target.value);
    setPage(1);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (
      savingRef.current ||
      !selectedRequest ||
      !editing ||
      loading
    ) {
      return;
    }

    if (!statusOptions.some((option) => option.value === editStatus)) {
      setActionError("Choose a valid maintenance status.");
      return;
    }

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

      // A changed status may no longer match the selected filter.
      setPage(1);
      reloadRequests();
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

        reloadRequests();
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="maintenance-heading"
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
          Repairs & upkeep
        </p>

        <h1
          id="maintenance-heading"
          className="mt-2 font-heading text-2xl
            font-bold tracking-tight text-[#173F35]"
        >
          Maintenance requests
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
          Review reported problems, track repairs and let residents
          know what happens next.
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
        <p
          role="alert"
          className="rounded-xl border border-amber-200
            bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          {actionError}
        </p>
      )}

      {/* Filter */}
      <div
        className="flex flex-wrap items-end justify-between
          gap-4 rounded-2xl border border-[#245747]/15
          bg-white p-4 sm:p-5"
      >
        <div className="w-full sm:w-64">
          <label
            htmlFor="staff-maintenance-filter"
            className={labelClass}
          >
            Request status
          </label>

          <select
            id="staff-maintenance-filter"
            value={statusFilter}
            onChange={changeFilter}
            disabled={loading || saving}
            className={inputClass}
          >
            <option value="">All statuses</option>

            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || saving}
          className={secondaryButton}
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

      {/* Request list */}
      {loading ? (
        <div
          className="rounded-2xl border border-[#245747]/15
            bg-white p-5"
        >
          <LoadingMessage
            label="Loading maintenance requests…"
            compact
          />
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
            disabled={saving}
            className="mt-2 inline-flex min-h-11 items-center
              rounded-lg font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-9 text-center"
        >
          <h2
            className="font-heading text-base
              font-semibold text-[#173F35]"
          >
            No maintenance requests found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No requests match the selected status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const isSelected = selectedRequest?.id === request.id;

            return (
              <article
                key={request.id}
                aria-labelledby={`request-title-${request.id}`}
                className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${
                  isSelected
                    ? "border-[#245747]/40 bg-[#EDF3E8]"
                    : "border-[#245747]/15 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="text-xs text-[#78716C]">
                      Request #{request.id} · Room {request.room_number}
                    </p>

                    <h2
                      id={`request-title-${request.id}`}
                      className="mt-1 line-clamp-2 break-words
                        font-heading text-base font-semibold
                        leading-6 text-[#173F35]"
                    >
                      {request.title}
                    </h2>
                  </div>

                  <StatusBadge status={request.status} />
                </div>

                <div
                  className="mt-4 flex flex-wrap items-end
                    justify-between gap-4"
                >
                  <dl className="flex min-w-0 flex-wrap gap-x-8 gap-y-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-[#78716C]">
                        Reported by
                      </dt>
                      <dd
                        className="mt-1 break-words text-sm
                          font-medium text-[#173F35]"
                      >
                        {request.resident_username || "Unavailable"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#78716C]">
                        Last updated
                      </dt>
                      <dd className="mt-1 text-xs leading-6 text-[#57534E]">
                        {formatDate(request.updated_at)}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={(event) =>
                      openDetails(request, event.currentTarget)
                    }
                    disabled={saving}
                    aria-label={`View details for maintenance request #${request.id}`}
                    aria-expanded={isSelected}
                    aria-controls={
                      isSelected ? "maintenance-details" : undefined
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

      {/* Details and editing */}
      {selectedRequest && !loading && !listError && (
        <section
          id="maintenance-details"
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="maintenance-details-title"
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              !savingRef.current &&
              !editing
            ) {
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
                Request #{selectedRequest.id}
              </p>

              <h2
                id="maintenance-details-title"
                className="mt-2 break-words font-heading
                  text-lg font-semibold leading-7 text-[#173F35]"
              >
                {selectedRequest.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeDetails}
              disabled={saving}
              className={`${secondaryButton} shrink-0`}
            >
              Close
            </button>
          </div>

          <dl
            className="mt-5 grid gap-4 rounded-xl
              bg-[#FAF7F2] p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="min-w-0">
              <dt className="text-xs text-[#78716C]">Resident</dt>
              <dd
                className="mt-1 break-words text-sm
                  font-medium text-[#173F35]"
              >
                {selectedRequest.resident_username || "Unavailable"}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="text-xs text-[#78716C]">Room</dt>
              <dd
                className="mt-1 break-words text-sm
                  font-medium text-[#173F35]"
              >
                {selectedRequest.room_number}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-[#78716C]">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={selectedRequest.status} />
              </dd>
            </div>

            <div>
              <dt className="text-xs text-[#78716C]">Last updated</dt>
              <dd className="mt-1 text-xs leading-6 text-[#57534E]">
                {formatDate(selectedRequest.updated_at)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-[#245747]/10 pt-4">
            <h3 className="text-sm font-semibold text-[#173F35]">
              Reported issue
            </h3>

            <p
              className="mt-2 whitespace-pre-wrap break-words
                text-sm leading-7 text-[#57534E]"
            >
              {selectedRequest.description || "No description provided."}
            </p>

            <p className="mt-3 text-xs leading-5 text-[#78716C]">
              Reported: {formatDate(selectedRequest.created_at)}
            </p>
          </div>

          {editing ? (
            <form
              onSubmit={handleSave}
              aria-busy={saving}
              className="mt-5 rounded-xl border
                border-[#245747]/15 bg-[#FAF7F2] p-4"
            >
              <h3
                className="font-heading text-base
                  font-semibold text-[#173F35]"
              >
                Update request
              </h3>

              <fieldset
                disabled={saving}
                className="mt-4 min-w-0 space-y-4"
              >
                <legend className="sr-only">
                  Maintenance update details
                </legend>

                <div className="max-w-xs">
                  <label
                    htmlFor="maintenance-edit-status"
                    className={labelClass}
                  >
                    Status
                  </label>

                  <select
                    id="maintenance-edit-status"
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                    className={inputClass}
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
                    className={labelClass}
                  >
                    Note to resident
                  </label>

                  <textarea
                    id="maintenance-staff-note"
                    value={staffNote}
                    onChange={(event) => setStaffNote(event.target.value)}
                    rows={4}
                    aria-describedby="maintenance-note-help"
                    placeholder="For example: The plumber is scheduled for tomorrow morning."
                    className={`${inputClass} resize-y`}
                  />

                  <p
                    id="maintenance-note-help"
                    className="mt-2 text-xs leading-5 text-[#78716C]"
                  >
                    The resident can read this note. Include a clear
                    update about the repair or next step.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className={primaryButton}>
                    {saving ? "Saving…" : "Save update"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setActionError("");
                    }}
                    className={secondaryButton}
                  >
                    Cancel editing
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="mt-5 border-t border-[#245747]/10 pt-4">
              <h3 className="text-sm font-semibold text-[#173F35]">
                Current staff note
              </h3>

              <p
                className="mt-2 whitespace-pre-wrap break-words
                  text-sm leading-7 text-[#57534E]"
              >
                {selectedRequest.staff_note || "No staff note added yet."}
              </p>

              <button
                type="button"
                onClick={startEditing}
                disabled={saving}
                className={`${primaryButton} mt-4`}
              >
                Update request
              </button>
            </div>
          )}
        </section>
      )}

      <nav
        aria-label="Staff maintenance pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || saving || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-[#57534E]">Page {page}</span>

        <button
          type="button"
          disabled={loading || saving || Boolean(listError) || !hasNext}
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