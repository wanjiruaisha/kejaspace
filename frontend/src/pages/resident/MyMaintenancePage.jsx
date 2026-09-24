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

  if (error.data && typeof error.data === "object") {
    return Object.entries(error.data)
      .map(([field, messages]) => {
        const text = Array.isArray(messages)
          ? messages.join(" ")
          : String(messages);

        return `${field}: ${text}`;
      })
      .join(" ");
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

      // Show the newest requests, without a status filter.
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
            "Check the latest requests below before submitting again.",
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
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
        Resident support
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        Maintenance
      </h1>

      <p className="mt-3 max-w-2xl leading-7 text-slate-500">
        Report a problem in your room and follow updates from hostel staff.
        You must be checked in to submit a request.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-xl font-bold text-slate-900">
          Report a problem
        </h2>

        {successMessage && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {successMessage}
          </p>
        )}

        {formError && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            {formError}
          </p>
        )}

        <div className="mt-6">
          <label
            htmlFor="maintenance-title"
            className="block text-sm font-semibold text-slate-700"
          >
            Title
          </label>

          <input
            id="maintenance-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="For example: Leaking bathroom tap"
            required
            disabled={submitting || needsReview}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:opacity-60"
          />
        </div>

        <div className="mt-5">
          <label
            htmlFor="maintenance-description"
            className="block text-sm font-semibold text-slate-700"
          >
            Describe the problem
          </label>

          <textarea
            id="maintenance-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Tell us what is wrong and where it is happening."
            rows={4}
            required
            disabled={submitting || needsReview}
            className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm disabled:opacity-60"
          />
        </div>

        {needsReview && (
          <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={false}
              disabled={loading || Boolean(listError)}
              onChange={() => {
                setNeedsReview(false);
                setFormError("");
              }}
              className="mt-1"
            />

            <span>
              I have checked the latest requests below and confirmed
              this request was not saved.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={submitting || needsReview}
          className="mt-6 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </form>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">
          My requests
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="maintenance-status" className="sr-only">
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
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <button
            type="button"
            onClick={refreshList}
            disabled={loading || submitting}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingMessage label="Loading maintenance requests…" />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl bg-red-50 p-6 text-red-800"
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
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {status
            ? "No requests match this status."
            : "You haven’t submitted any maintenance requests yet."}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {requests.map((request) => {
            const details = statusDetails[request.status] || {
              label: request.status,
              classes: "bg-slate-100 text-slate-700",
            };

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    #{request.id} · Room {request.room_number}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${details.classes}`}
                  >
                    {details.label}
                  </span>
                </div>

                <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
                  {request.title}
                </h3>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {request.description}
                </p>

                {request.staff_note && (
                  <div className="mt-5 rounded-xl bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Update from staff
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-blue-800">
                      {request.staff_note}
                    </p>
                  </div>
                )}

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <p>
                    Submitted: {formatDate(request.created_at)}
                  </p>
                  <p>
                    Updated: {formatDate(request.updated_at)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Maintenance pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || submitting || page === 1}
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
            loading || submitting || Boolean(listError) || !hasNext
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