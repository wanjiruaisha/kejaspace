import { useEffect, useRef, useState } from "react";

import {
  listStaffApplications,
  approveApplication,
  rejectApplication,
} from "../../services/accommodationService";

import LoadingMessage from "../../components/common/LoadingMessage";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-800",
  cancelled: "bg-stone-100 text-stone-600",
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton = `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#E8EDE4]";

const rejectButton =
  `${buttonBase} border border-red-200 bg-white ` +
  "text-red-700 hover:bg-red-50";

const rowGrid =
  "grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)_220px] " +
  "lg:items-center lg:gap-4";

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

function getApplicantName(application) {
  return application.applicant_name || "Name unavailable";
}

function getErrorMessage(error) {
  if (
    error.data &&
    typeof error.data === "object" &&
    !Array.isArray(error.data)
  ) {
    const message = Object.entries(error.data)
      .map(([field, messages]) => {
        const text = Array.isArray(messages)
          ? messages.join(" ")
          : String(messages);

        return field === "detail" || field === "non_field_errors"
          ? text
          : `${field.replaceAll("_", " ")}: ${text}`;
      })
      .join(" ");

    if (message) return message;
  }

  return error.message || "The action could not be completed.";
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const mutationRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      setLoading(true);
      setError("");

      try {
        const data = await listStaffApplications(
          page,
          status,
          controller.signal,
        );

        if (!Array.isArray(data?.results)) {
          throw new Error("Unexpected application list from the server.");
        }

        if (!controller.signal.aborted) {
          setApplications(data.results);
          setHasNext(Boolean(data.next));
          setTotalCount(Number.isInteger(data.count) ? data.count : null);

          // Unlock actions only after a successful reload.
          setNeedsRefresh(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please try again."
              : err.message || "Could not load applications.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => controller.abort();
  }, [page, status, search, retry]);

  function reloadList() {
    if (mutationRef.current || loading) return;

    setConfirmation(null);
    setExpandedId(null);
    setActionError("");
    setLoading(true);
    setPage(1);
    setRetry((value) => value + 1);
  }

  function changeStatus(nextStatus) {
    if (
      mutationRef.current ||
      loading ||
      needsRefresh ||
      nextStatus === status
    ) {
      return;
    }

    setStatus(nextStatus);
    setPage(1);
    setConfirmation(null);
    setExpandedId(null);
    setMessage("");
    setActionError("");
    setLoading(true);
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

    setConfirmation(null);
    setExpandedId(null);
    setLoading(true);
    setPage(nextPage);
  }

  function openConfirmation(application, action) {
    if (
      mutationRef.current ||
      loading ||
      needsRefresh ||
      application.status !== "pending"
    ) {
      return;
    }

    setMessage("");
    setActionError("");

    setConfirmation({
      id: application.id,
      action,
    });
  }

  async function handleConfirm() {
    if (!confirmation || mutationRef.current || loading || needsRefresh) {
      return;
    }

    const { id, action } = confirmation;

    if (!["approve", "reject"].includes(action)) return;

    mutationRef.current = true;
    setActing(true);
    setActionError("");
    setMessage("");

    try {
      if (action === "approve") {
        const stay = await approveApplication(id);

        if (!stay?.id) {
          throw new Error("Unexpected approval response.");
        }

        setMessage(
          `Application ${id} approved. Stay ${stay.id} was created. ` +
            "Check the stay and initial rent charge for payment details.",
        );
      } else {
        const application = await rejectApplication(id);

        if (application?.id !== id || application.status !== "rejected") {
          throw new Error("Unexpected rejection response.");
        }

        setMessage(`Application ${id} rejected.`);
      }

      setConfirmation(null);
      setExpandedId(null);
      setNeedsRefresh(true);
      setLoading(true);
      setPage(1);
      setRetry((value) => value + 1);
    } catch (err) {
      setConfirmation(null);

      if ([400, 401, 403, 404].includes(err.status)) {
        setActionError(getErrorMessage(err));
      } else if (err.status === 429) {
        setActionError("Too many requests. Please wait before trying again.");
      } else {
        setActionError(
          "We couldn’t confirm the result. Refresh the list to check " +
            "the application before trying again.",
        );
      }

      setNeedsRefresh(true);
    } finally {
      mutationRef.current = false;
      setActing(false);
    }
  }
  function handleSearch(event) {
    event.preventDefault();

    if (mutationRef.current || loading || needsRefresh) return;

    setSearch(searchInput.trim());
    setPage(1);
    setExpandedId(null);
    setConfirmation(null);
    setMessage("");
    setActionError("");
    setLoading(true);

    // Also reloads when submitting the same search again.
    setRetry((value) => value + 1);
  }

  function clearSearch() {
    if (mutationRef.current || loading || needsRefresh) return;

    setSearchInput("");
    setSearch("");
    setPage(1);
    setExpandedId(null);
    setConfirmation(null);
    setMessage("");
    setActionError("");
    setLoading(true);
    setRetry((value) => value + 1);
  }

  const actionsDisabled = acting || loading || needsRefresh;

  return (
    <section
      aria-labelledby="applications-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      {/* Compact page heading */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#965038]">
            Accommodation
          </p>

          <h1
            id="applications-heading"
            className="mt-2 font-heading text-2xl font-bold
              tracking-tight text-[#173F35]"
          >
            Applications
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Review room requests and manage application decisions.
          </p>
        </div>

        <button
          type="button"
          onClick={reloadList}
          disabled={loading || acting}
          className={secondaryButton}
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </header>
      {/* Search and status filter */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-[#245747]/15 bg-white p-4"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="application-search"
              className="block text-xs font-semibold text-[#173F35]"
            >
              Search applications
            </label>

            <input
              id="application-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Applicant name, username or room"
              disabled={actionsDisabled}
              className="mt-2 min-h-11 w-full rounded-lg
          border border-[#245747]/20 bg-[#FAF7F2]/60
          px-3 py-2 text-sm text-[#173F35]
          placeholder:text-[#78716C]
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-[#245747]
          disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="w-full xl:w-48">
            <label
              htmlFor="application-status"
              className="block text-xs font-semibold text-[#173F35]"
            >
              Application status
            </label>

            <select
              id="application-status"
              value={status}
              disabled={actionsDisabled}
              onChange={(event) => changeStatus(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg
          border border-[#245747]/20 bg-[#FAF7F2]/60
          px-3 py-2 text-sm text-[#173F35]
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-[#245747]
          disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="">All applications</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={actionsDisabled}
              className={primaryButton}
            >
              Search
            </button>

            {(searchInput || search) && (
              <button
                type="button"
                onClick={clearSearch}
                disabled={actionsDisabled}
                className={secondaryButton}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!loading && !error && (
          <p
            role="status"
            className="mt-3 break-words text-xs leading-6 text-[#78716C]"
          >
            {totalCount !== null
              ? `${totalCount} matching ${
                  totalCount === 1 ? "application" : "applications"
                }`
              : `${applications.length} on this page`}
            {search ? ` for “${search}”` : ""}
          </p>
        )}
      </form>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100
            bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
        >
          {message}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200
            bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          <button
            type="button"
            onClick={reloadList}
            disabled={loading || acting}
            className="mt-2 min-h-11 rounded-lg font-semibold
              underline underline-offset-4 disabled:opacity-50"
          >
            Refresh applications
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage label="Loading applications…" compact />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100
            bg-red-50 p-5 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={reloadList}
            disabled={acting}
            className="mt-2 min-h-11 rounded-lg font-semibold
              underline underline-offset-4 disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div
          className="rounded-xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-10 text-center"
        >
          <h2 className="text-base font-semibold text-[#173F35]">
            {status === "pending"
              ? "No pending applications"
              : "No applications found"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            {status
              ? "No applications match this status on this page."
              : "Residents’ room applications will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          {/* Visual column headings; mobile rows include their own labels. */}
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10
              bg-[#F5F7F2] px-4 py-3 text-xs font-semibold
              text-[#57534E] lg:grid`}
          >
            <span>Applicant</span>
            <span>Room</span>
            <span>Move-in date</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {applications.map((application) => {
              const applicantName = getApplicantName(application);
              const isExpanded = expandedId === application.id;
              const isConfirming = confirmation?.id === application.id;

              return (
                <li key={application.id} className="min-w-0">
                  <article
                    aria-labelledby={`application-${application.id}-heading`}
                  >
                    <div
                      className={`${rowGrid} px-4 py-4
                        transition-colors hover:bg-[#FAF7F2]/70`}
                    >
                      {/* Applicant */}
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center
                            justify-center rounded-lg bg-[#E8EDE4]
                            text-sm font-semibold text-[#245747]"
                        >
                          {applicantName.charAt(0).toUpperCase()}
                        </span>

                        <div className="min-w-0">
                          <h2
                            id={`application-${application.id}-heading`}
                            className="break-words text-sm font-semibold text-[#173F35]"
                          >
                            {applicantName}
                          </h2>
                        </div>
                      </div>

                      {/* Room */}
                      <p className="text-sm text-[#173F35]">
                        <span className="mr-2 text-xs text-[#78716C] lg:sr-only">
                          Room:
                        </span>
                        {application.room_number || "Unavailable"}
                      </p>

                      {/* Move-in date */}
                      <p className="text-sm text-[#57534E]">
                        <span className="mr-2 text-xs text-[#78716C] lg:sr-only">
                          Move-in:
                        </span>
                        {application.move_in_date || "Not provided"}
                      </p>

                      {/* Status */}
                      <div>
                        <span className="sr-only">Status: </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1
                            text-xs font-semibold capitalize ${
                              statusStyles[application.status] ||
                              "bg-stone-100 text-stone-600"
                            }`}
                        >
                          {application.status}
                        </span>
                      </div>

                      {/* Row actions */}
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`application-details-${application.id}`}
                          aria-label={`${
                            isExpanded ? "Hide" : "View"
                          } details for application ${application.id}`}
                          onClick={() =>
                            setExpandedId(isExpanded ? null : application.id)
                          }
                          className={`${buttonBase} px-2
                            text-[#245747] hover:bg-[#E8EDE4]`}
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </button>

                        {application.status === "pending" && !isConfirming && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openConfirmation(application, "approve")
                              }
                              disabled={actionsDisabled}
                              aria-label={`Approve application ${application.id}`}
                              className={primaryButton}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openConfirmation(application, "reject")
                              }
                              disabled={actionsDisabled}
                              aria-label={`Reject application ${application.id}`}
                              className={rejectButton}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expandable details */}
                    <div
                      id={`application-details-${application.id}`}
                      hidden={!isExpanded}
                      className="border-t border-[#245747]/10
                        bg-[#FAF7F2]/70 px-4 py-4 sm:px-6"
                    >
                      <dl className="grid gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-[#78716C]">
                            Application reference
                          </dt>
                          <dd className="mt-1 font-medium text-[#173F35]">
                            Application {application.id}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs text-[#78716C]">
                            Submitted · Nairobi time
                          </dt>
                          <dd className="mt-1 font-medium text-[#173F35]">
                            {formatTimestamp(application.created_at)}
                          </dd>
                        </div>
                      </dl>

                      {application.status === "approved" && (
                        <p className="mt-4 text-xs leading-6 text-[#57534E]">
                          Check the resident’s stay and initial rent charge for
                          payment and reservation status.
                        </p>
                      )}
                    </div>

                    {/* Inline confirmation */}
                    {application.status === "pending" && isConfirming && (
                      <div
                        role="group"
                        aria-labelledby={`confirmation-${application.id}`}
                        aria-busy={acting}
                        className="border-t border-[#245747]/15
                          bg-[#F2F5EE] px-4 py-4 sm:px-6"
                      >
                        <h3
                          id={`confirmation-${application.id}`}
                          className="text-sm font-semibold text-[#173F35]"
                        >
                          {confirmation.action === "approve"
                            ? `Approve application ${application.id}?`
                            : `Reject application ${application.id}?`}
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#57534E]">
                          {confirmation.action === "approve"
                            ? "Approval creates a stay awaiting payment and its initial rent charge. The resident must pay before the deadline to confirm the reservation."
                            : "The resident will see this application as rejected."}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmation(null)}
                            disabled={acting}
                            className={secondaryButton}
                          >
                            Go back
                          </button>

                          <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={actionsDisabled}
                            className={
                              confirmation.action === "approve"
                                ? primaryButton
                                : `${buttonBase} bg-red-700 text-white hover:bg-red-800`
                            }
                          >
                            {acting
                              ? "Processing…"
                              : confirmation.action === "approve"
                                ? "Confirm approval"
                                : "Confirm rejection"}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Pagination */}
      <nav
        aria-label="Application pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={actionsDisabled || Boolean(error) || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-xs text-[#57534E]">Page {page}</span>

        <button
          type="button"
          disabled={actionsDisabled || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}
