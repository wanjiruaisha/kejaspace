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
  "rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#E8EDE4]";

const inputClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-lg " +
  "border border-[#245747]/20 bg-white px-3 py-2.5 " +
  "text-sm text-[#173F35] placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelClass =
  "block text-xs font-semibold text-[#173F35]";

const rowGrid =
  "grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-3 " +
  "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_120px]";

function getStatusLabel(status) {
  return (
    statusOptions.find((option) => option.value === status)?.label ||
    status ||
    "Unavailable"
  );
}

function residentLabel(request) {
  return (
    request.resident_name ||
    request.resident_username ||
    "Resident unavailable"
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

function formatDate(value, includeTime = true) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1
        text-xs font-medium ${
          statusStyles[status] || "bg-stone-100 text-stone-700"
        }`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function DetailItem({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#78716C]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[#173F35]">
        {children}
      </dd>
    </div>
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
    if (
      savingRef.current ||
      loading ||
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
      savingRef.current ||
      loading ||
      nextStatus === statusFilter
    ) {
      return;
    }

    resetDetails();
    setActionError("");
    setSuccessMessage("");
    setLoading(true);
    setStatusFilter(nextStatus);
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

      setSuccessMessage("Maintenance request updated successfully.");

      // The updated request may no longer match the current filter.
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

  function renderDetails(request) {
    return (
      <section
        id={`maintenance-details-${request.id}`}
        ref={detailsRef}
        tabIndex={-1}
        aria-labelledby={`maintenance-details-title-${request.id}`}
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
        className="min-w-0 scroll-mt-24 border-t border-[#245747]/15
          bg-[#FAF7F2] p-4 sm:p-5
          focus-visible:outline-2 focus-visible:outline-[#245747]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#965038]">
              Request details
            </p>

            <h3
              id={`maintenance-details-title-${request.id}`}
              className="mt-1 break-words text-base font-semibold
                leading-6 text-[#173F35]"
            >
              {request.title || "Untitled request"}
            </h3>
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

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Resident">
            {residentLabel(request)}
          </DetailItem>

          <DetailItem label="Room">
            {request.room_number || "Unavailable"}
          </DetailItem>

          <DetailItem label="Reported">
            {formatDate(request.created_at)}
          </DetailItem>

          <DetailItem label="Last updated">
            {formatDate(request.updated_at)}
          </DetailItem>
        </dl>

        <div className="mt-4 border-t border-[#245747]/10 pt-4">
          <h4 className="text-sm font-semibold text-[#173F35]">
            Reported issue
          </h4>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
            {request.description || "No description provided."}
          </p>

          <p className="mt-3 text-xs text-[#78716C]">
            Internal request reference: {request.id}
          </p>
        </div>

        {editing ? (
          <form
            onSubmit={handleSave}
            aria-busy={saving}
            className="mt-5 border-t border-[#245747]/15 pt-4"
          >
            <h4 className="text-sm font-semibold text-[#173F35]">
              Update request
            </h4>

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
            <h4 className="text-sm font-semibold text-[#173F35]">
              Current staff note
            </h4>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
              {request.staff_note || "No staff note added yet."}
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
    );
  }

  return (
    <section
      aria-labelledby="maintenance-heading"
      className="min-w-0 space-y-5"
    >
      <header>
        <h1
          id="maintenance-heading"
          className="font-heading text-2xl font-bold tracking-tight text-[#173F35]"
        >
          Maintenance requests
        </h1>

        <p className="mt-1 text-sm leading-6 text-[#57534E]">
          Review reported issues and keep residents updated on repairs.
        </p>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100
            bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200
            bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          {actionError}
        </p>
      )}

      {/* Existing status filter */}
      <div
        className="flex flex-wrap items-end justify-between
          gap-3 rounded-xl border border-[#245747]/15 bg-white p-4"
      >
        <div className="w-full sm:w-56">
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
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage
            label="Loading maintenance requests…"
            compact
          />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100
            bg-red-50 p-4 text-sm leading-6 text-red-800"
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
          className="rounded-xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-9 text-center"
        >
          <h2 className="text-base font-semibold text-[#173F35]">
            No maintenance requests found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No requests match the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          {/* Desktop column headings */}
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10
              bg-[#F3F5F0] px-4 py-3 text-xs font-semibold
              text-[#57534E] lg:grid`}
          >
            <span>Reported issue</span>
            <span>Resident / room</span>
            <span>Status</span>
            <span>Reported on</span>
            <span className="text-right">Details</span>
          </div>

          <ul
            aria-label="Maintenance requests"
            className="divide-y divide-[#245747]/10"
          >
            {requests.map((request) => {
              const isSelected = selectedRequest?.id === request.id;
              const title = request.title || "Untitled request";
              const resident = residentLabel(request);

              return (
                <li key={request.id} className="min-w-0">
                  <article
                    aria-labelledby={`request-title-${request.id}`}
                  >
                    <div
                      className={`${rowGrid} px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-[#EDF3E8]"
                          : "hover:bg-[#FAFBF8]"
                      }`}
                    >
                      {/* Issue */}
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <h2
                          id={`request-title-${request.id}`}
                          title={title}
                          className="truncate text-sm font-semibold text-[#173F35]"
                        >
                          {title}
                        </h2>

                        <p className="mt-0.5 text-xs text-[#78716C]">
                          Maintenance request
                        </p>
                      </div>

                      {/* Resident and room */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Reported by
                        </p>

                        <p
                          title={resident}
                          className="truncate text-sm text-[#173F35]"
                        >
                          {resident}
                        </p>

                        <p className="mt-0.5 text-xs text-[#78716C]">
                          Room {request.room_number || "unavailable"}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Status
                        </p>

                        <StatusBadge status={request.status} />
                      </div>

                      {/* Date */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Reported on
                        </p>

                        <p className="text-xs leading-5 text-[#57534E]">
                          {formatDate(request.created_at, false)}
                        </p>
                      </div>

                      {/* Details toggle */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={(event) =>
                            isSelected
                              ? closeDetails()
                              : openDetails(request, event.currentTarget)
                          }
                          aria-label={`${
                            isSelected ? "Hide" : "View"
                          } details for ${title}, room ${
                            request.room_number || "unavailable"
                          }`}
                          aria-expanded={isSelected}
                          aria-controls={
                            isSelected
                              ? `maintenance-details-${request.id}`
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

                    {isSelected && renderDetails(request)}
                  </article>
                </li>
              );
            })}
          </ul>
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
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-xs text-[#57534E]">
          Page {page}
        </span>

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
        All dates and times use Nairobi time.
      </p>
    </section>
  );
}