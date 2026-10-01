import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../../components/common/LoadingMessage";
import {
  createMaintenanceRequest,
  listMyMaintenance,
} from "../../services/maintenanceService";

const statusDetails = {
  pending: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-800",
  },
  in_progress: {
    label: "In progress",
    classes: "bg-blue-50 text-blue-800",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-emerald-50 text-emerald-800",
  },
};

const inputStyle =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#245747]/20 " +
  "bg-white px-3 py-2.5 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const outlineButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl " +
  "border border-[#245747]/20 bg-white px-4 py-2 text-sm " +
  "font-semibold text-[#245747] transition-colors hover:bg-[#E8EDE4] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

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
      .map(([field, messages]) => {
        const text = Array.isArray(messages)
          ? messages.join(" ")
          : String(messages);

        if (field === "detail" || field === "non_field_errors") {
          return text;
        }

        return `${field.replaceAll("_", " ")}: ${text}`;
      })
      .join(" ");

    if (message) return message;
  }

  return error.message || "The request could not be completed.";
}

export default function MyMaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [needsReview, setNeedsReview] = useState(false);

  const submittingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests() {
      setLoading(true);
      setListError("");

      try {
        const data = await listMyMaintenance({
          page,
          status,
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
              : error.message || "Could not load your requests.",
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
  }, [page, status, retry]);

  function refreshList() {
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    if (loading || submittingRef.current) return;

    setLoading(true);
    setPage(nextPage);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current || needsReview) return;

    setFormError("");
    setSuccessMessage("");

    if (!title.trim() || !description.trim()) {
      setFormError("Please enter a title and description.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const created = await createMaintenanceRequest(
        title.trim(),
        description.trim(),
      );

      if (!created?.id) {
        throw new Error("The server returned an unexpected response.");
      }

      setTitle("");
      setDescription("");
      setSuccessMessage(
        `Maintenance request #${created.id} submitted successfully.`,
      );

      setStatus("");
      setPage(1);
      refreshList();
    } catch (error) {
      if ([400, 401, 403, 404, 429].includes(error.status)) {
        setFormError(
          error.status === 429
            ? "Too many requests. Please wait before trying again."
            : getErrorMessage(error),
        );
      } else {
        setNeedsReview(true);
        setFormError(
          "We could not confirm whether your request was saved. " +
            "Check the latest requests before submitting again.",
        );

        setStatus("");
        setPage(1);
        refreshList();
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl">
      <header className="rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
          Resident support
        </p>

        <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
          Something needs fixing?
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
          Report a problem in your room and follow updates from hostel staff.
        </p>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Report form */}
        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          aria-describedby={formError ? "maintenance-form-error" : undefined}
          className="min-w-0 rounded-2xl border border-[#245747]/15 bg-white p-4 sm:p-5"
        >
          <h2 className="font-heading text-base font-bold text-[#173F35]">
            Report a problem
          </h2>

          <p className="mt-2 text-xs leading-6 text-[#57534E]">
            You must have a checked-in stay to submit a request.
            Your room is linked automatically.
          </p>

          {successMessage && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
            >
              {successMessage}
            </p>
          )}

          {formError && (
            <p
              id="maintenance-form-error"
              role="alert"
              className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-800"
            >
              {formError}
            </p>
          )}

          <div className="mt-4">
            <label
              htmlFor="maintenance-title"
              className="block text-sm font-semibold text-[#173F35]"
            >
              Title
            </label>

            <input
              id="maintenance-title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="For example: Leaking bathroom tap"
              required
              disabled={submitting || needsReview}
              className={inputStyle}
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="maintenance-description"
              className="block text-sm font-semibold text-[#173F35]"
            >
              Describe the problem
            </label>

            <textarea
              id="maintenance-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is wrong, and where is it happening?"
              rows={4}
              required
              disabled={submitting || needsReview}
              className={`${inputStyle} resize-y leading-6`}
            />
          </div>

          {needsReview && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs leading-6 text-amber-900">
                Review the request list first. If your request appears,
                don’t submit it again.
              </p>

              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6 text-amber-900">
                <input
                  type="checkbox"
                  checked={false}
                  disabled={loading || submitting || Boolean(listError)}
                  onChange={(event) => {
                    if (!event.target.checked) return;

                    setNeedsReview(false);
                    setFormError("");
                  }}
                  className="mt-1 size-4 shrink-0 accent-[#245747]"
                />

                <span>
                  I checked the latest requests and confirmed this
                  request was not saved.
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || needsReview}
            className="mt-5 inline-flex min-h-11 w-full items-center
              justify-center gap-2 rounded-xl bg-[#245747]
              px-4 py-3 text-sm font-semibold text-white
              transition-colors hover:bg-[#173F35]
              focus-visible:outline-2 focus-visible:outline-offset-4
              focus-visible:outline-[#245747]
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit request"}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        {/* Request list */}
        <section aria-labelledby="requests-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="requests-heading"
              className="font-heading text-base font-bold text-[#173F35]"
            >
              My requests
            </h2>

            <button
              type="button"
              onClick={refreshList}
              disabled={loading || submitting}
              className={outlineButton}
            >
              Refresh
            </button>
          </div>

          <div className="mt-3">
            <label
              htmlFor="maintenance-status"
              className="block text-xs font-semibold text-[#57534E]"
            >
              Filter by status
            </label>

            <select
              id="maintenance-status"
              value={status}
              disabled={loading || submitting}
              onChange={(event) => {
                setLoading(true);
                setStatus(event.target.value);
                setPage(1);
              }}
              className={`${inputStyle} sm:max-w-56`}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {loading ? (
            <div className="mt-5">
              <LoadingMessage label="Loading maintenance requests…" />
            </div>
          ) : listError ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
            >
              <p>{listError}</p>

              <button
                type="button"
                onClick={refreshList}
                disabled={submitting}
                className="mt-2 min-h-11 font-semibold underline
                  underline-offset-4 disabled:opacity-50"
              >
                Try again
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#245747]/25 bg-[#FAF7F2] px-4 py-8 text-center">
              <h3 className="text-sm font-semibold text-[#173F35]">
                {status ? "No matching requests" : "No requests yet"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                {status
                  ? "Choose another status to see more requests."
                  : "Requests you submit will appear here with updates from staff."}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {requests.map((request) => {
                const details = statusDetails[request.status] || {
                  label: request.status || "Unknown",
                  classes: "bg-stone-100 text-stone-700",
                };

                return (
                  <article
                    key={request.id}
                    className="min-w-0 rounded-2xl border
                      border-[#245747]/15 bg-white p-4
                      transition-colors hover:border-[#245747]/35"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[#78716C]">
                        #{request.id} · Room {request.room_number}
                      </p>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs
                          font-semibold ${details.classes}`}
                      >
                        {details.label}
                      </span>
                    </div>

                    <h3 className="mt-3 break-words font-heading text-sm font-bold text-[#173F35]">
                      {request.title}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-[#78716C]">
                      Submitted: {formatDate(request.created_at)}
                    </p>

                    <details className="mt-3 border-t border-[#245747]/10 pt-1">
                      <summary
                        className="w-fit cursor-pointer rounded-lg
                          py-2 text-xs font-semibold text-[#245747]
                          focus-visible:outline-2
                          focus-visible:outline-offset-2
                          focus-visible:outline-[#245747]"
                      >
                        {request.staff_note
                          ? "Details and staff update"
                          : "View details"}
                      </summary>

                      <div className="pt-2">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
                          {request.description}
                        </p>

                        {request.staff_note ? (
                          <div className="mt-3 rounded-xl bg-[#E8EDE4] p-3">
                            <h4 className="text-xs font-semibold text-[#173F35]">
                              Update from staff
                            </h4>

                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#245747]">
                              {request.staff_note}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-[#78716C]">
                            No staff note has been added yet.
                          </p>
                        )}

                        <p className="mt-3 text-xs leading-5 text-[#78716C]">
                          Updated: {formatDate(request.updated_at)}
                        </p>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}

          <nav
            aria-label="Maintenance pages"
            className="mt-5 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              type="button"
              disabled={loading || submitting || page === 1}
              onClick={() => changePage(page - 1)}
              className={outlineButton}
            >
              Previous
            </button>

            <span aria-current="page" className="text-sm text-[#57534E]">
              Page {page}
            </span>

            <button
              type="button"
              disabled={
                loading || submitting || Boolean(listError) || !hasNext
              }
              onClick={() => changePage(page + 1)}
              className={outlineButton}
            >
              Next
            </button>
          </nav>

          <p className="mt-3 text-center text-xs leading-5 text-[#78716C]">
            Dates and times are shown in East Africa Time.
          </p>
        </section>
      </div>
    </section>
  );
}