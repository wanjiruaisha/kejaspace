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
  "rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#E8EDE4]";

const rejectButton =
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
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmation, setConfirmation] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Blocks repeated clicks immediately, before React renders again.
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

          // Only a successful reload unlocks further actions.
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
  }, [page, status, retry]);

  function reloadList() {
    if (mutationRef.current || loading) return;

    setConfirmation(null);
    setActionError("");
    setLoading(true);
    setPage(1);
    setRetry((value) => value + 1);
  }

  function changeStatus(nextStatus) {
    if (mutationRef.current || loading || needsRefresh) return;

    setStatus(nextStatus);
    setPage(1);
    setConfirmation(null);
    setMessage("");
    setActionError("");
    setLoading(true);
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

    setConfirmation(null);
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
      roomNumber: application.room_number,
      action,
    });
  }

  async function handleConfirm() {
    if (
      !confirmation ||
      mutationRef.current ||
      loading ||
      needsRefresh
    ) {
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
          `Application #${id} approved. Stay #${stay.id} was created. ` +
            "Check the stay and initial rent charge for payment details.",
        );
      } else {
        const application = await rejectApplication(id);

        if (
          application?.id !== id ||
          application.status !== "rejected"
        ) {
          throw new Error("Unexpected rejection response.");
        }

        setMessage(`Application #${id} rejected.`);
      }

      setConfirmation(null);
      setNeedsRefresh(true);
      setLoading(true);
      setPage(1);
      setRetry((value) => value + 1);
    } catch (err) {
      setConfirmation(null);

      if ([400, 401, 403, 404].includes(err.status)) {
        setActionError(getErrorMessage(err));
      } else if (err.status === 429) {
        setActionError(
          "Too many requests. Please wait before trying again.",
        );
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

  const actionsDisabled = acting || loading || needsRefresh;

  return (
    <section
      aria-labelledby="applications-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      {/* Page introduction */}
      <header
        className="rounded-2xl border border-[#245747]/10
          bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8]
          to-[#DCE9DD] p-5 sm:p-6"
      >
        <p
          className="text-xs font-semibold uppercase
            tracking-[0.14em] text-[#965038]"
        >
          Accommodation requests
        </p>

        <h1
          id="applications-heading"
          className="mt-2 font-heading text-2xl
            font-bold tracking-tight text-[#173F35]"
        >
          Applications
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
          Review room requests, check move-in dates and give residents
          their next step.
        </p>
      </header>

      {/* Filter and refresh */}
      <div
        className="flex flex-wrap items-end justify-between
          gap-4 rounded-2xl border border-[#245747]/15
          bg-white p-4 sm:p-5"
      >
        <div className="w-full sm:w-auto sm:min-w-56">
          <label
            htmlFor="application-status"
            className="block text-sm font-semibold text-[#173F35]"
          >
            Application status
          </label>

          <select
            id="application-status"
            value={status}
            disabled={actionsDisabled}
            onChange={(event) => changeStatus(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl
              border border-[#245747]/20 bg-[#FAF7F2]/60
              px-3 py-2.5 text-sm text-[#173F35]
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

        <button
          type="button"
          onClick={reloadList}
          disabled={loading || acting}
          className={secondaryButton}
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

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
            className="mt-2 inline-flex min-h-11 items-center
              rounded-lg font-semibold underline underline-offset-4
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh applications
          </button>
        </div>
      )}

      {loading ? (
        <div
          className="rounded-2xl border
            border-[#245747]/15 bg-white p-5"
        >
          <LoadingMessage label="Loading applications…" compact />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100
            bg-red-50 p-5 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={reloadList}
            disabled={acting}
            className="mt-2 inline-flex min-h-11 items-center
              rounded-lg font-semibold underline underline-offset-4
              disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed
            border-[#245747]/25 bg-white px-5 py-9 text-center"
        >
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            {status === "pending"
              ? "No pending applications."
              : "No applications found."}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            {status
              ? "No applications currently match this status."
              : "Residents’ room applications will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((application) => {
            const isConfirming = confirmation?.id === application.id;

            return (
              <article
                key={application.id}
                aria-labelledby={`application-${application.id}-heading`}
                className="min-w-0 rounded-2xl border
                  border-[#245747]/15 bg-white p-4 sm:p-5"
              >
                {/* Compact summary row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-[#78716C]">
                      Application #{application.id}
                    </p>

                    <h2
                      id={`application-${application.id}-heading`}
                      className="mt-1 break-words font-heading
                        text-base font-semibold text-[#173F35]"
                    >
                      Room {application.room_number}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5
                      text-xs font-semibold capitalize ${
                        statusStyles[application.status] ||
                        "bg-stone-100 text-stone-600"
                      }`}
                  >
                    {application.status}
                  </span>
                </div>

                <div
                  className="mt-4 flex flex-wrap items-end
                    justify-between gap-4"
                >
                  <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-[#78716C]">
                        Applicant ID
                      </dt>
                      <dd className="mt-1 font-medium text-[#173F35]">
                        #{application.applicant}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#78716C]">
                        Requested move-in
                      </dt>
                      <dd className="mt-1 font-medium text-[#173F35]">
                        {application.move_in_date || "Not provided"}
                      </dd>
                    </div>
                  </dl>

                  {application.status === "pending" && !isConfirming && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openConfirmation(application, "approve")
                        }
                        disabled={actionsDisabled}
                        aria-label={`Approve application #${application.id}`}
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
                        aria-label={`Reject application #${application.id}`}
                        className={rejectButton}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <details className="mt-4 border-t border-[#245747]/10 pt-2">
                  <summary
                    className="w-fit cursor-pointer rounded-lg
                      py-2 text-xs font-semibold text-[#245747]
                      focus-visible:outline-2
                      focus-visible:outline-offset-2
                      focus-visible:outline-[#245747]"
                  >
                    Application details
                  </summary>

                  <div className="mt-2 space-y-2 pb-1 text-xs leading-6 text-[#57534E]">
                    <p>
                      Submitted: {formatTimestamp(application.created_at)}
                    </p>

                    <p>Submission time is shown in Nairobi time.</p>

                    {application.status === "approved" && (
                      <p>
                        Check the resident’s stay and initial rent charge
                        for payment and reservation status.
                      </p>
                    )}
                  </div>
                </details>

                {/* Confirmation stays beside the application being changed. */}
                {application.status === "pending" && isConfirming && (
                  <div
                    role="group"
                    aria-labelledby={`confirmation-${application.id}`}
                    aria-busy={acting}
                    className="mt-4 rounded-xl border
                      border-[#245747]/15 bg-[#FAF7F2] p-4"
                  >
                    <h3
                      id={`confirmation-${application.id}`}
                      className="text-sm font-semibold text-[#173F35]"
                    >
                      {confirmation.action === "approve"
                        ? `Approve application #${application.id}?`
                        : `Reject application #${application.id}?`}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#57534E]">
                      {confirmation.action === "approve"
                        ? "Approval creates a stay awaiting payment and its initial rent charge. The resident must pay before the deadline to confirm the reservation."
                        : "The resident will see this application as rejected."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
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
            );
          })}
        </div>
      )}

      <nav
        aria-label="Application pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={actionsDisabled || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-[#57534E]">
          Page {page}
        </span>

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