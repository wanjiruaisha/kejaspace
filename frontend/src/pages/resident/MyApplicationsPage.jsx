import { useEffect, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../../services/api";
import { cancelApplication } from "../../services/accommodationService";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Load the signed-in resident's applications.
  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(
          `/applications/?page=${page}&page_size=6`,
          { signal: controller.signal }
        );

        if (!Array.isArray(data?.results)) {
          throw new Error(
            "The server returned an unexpected application list."
          );
        }

        if (!controller.signal.aborted) {
          setApplications(data.results);
          setHasNext(Boolean(data.next));
          setNeedsRefresh(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection and try again."
              : err.message
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
  }, [page, retry]);

  // Cancel only after the resident confirms.
  async function handleCancel(applicationId) {
    if (cancellingId !== null || needsRefresh || loading) return;

    setActionError("");
    setActionMessage("");
    setCancellingId(applicationId);

    try {
      const updatedApplication = await cancelApplication(applicationId);

      if (
        updatedApplication?.id !== applicationId ||
        updatedApplication.status !== "cancelled"
      ) {
        throw new Error("Unexpected cancellation response.");
      }

      setApplications((previous) =>
        previous.map((application) =>
          application.id === applicationId
            ? updatedApplication
            : application
        )
      );

      setConfirmingId(null);
      setActionMessage("Your application has been cancelled.");
    } catch (err) {
      setConfirmingId(null);

      if (err.status === 400 || err.status === 404) {
        setActionError(err.message);
        setNeedsRefresh(true);
      } else if (err.status === 401 || err.status === 403) {
        setActionError(err.message);
      } else if (err.status === 429) {
        setActionError(
          "Too many requests. Please wait before trying again."
        );
      } else {
        setActionError(
          "We couldn’t confirm the cancellation. Refresh the list to check its current status before trying again."
        );
        setNeedsRefresh(true);
      }
    } finally {
      setCancellingId(null);
    }
  }

  function refreshApplications() {
    setConfirmingId(null);
    setActionError("");
    setActionMessage("");
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    setConfirmingId(null);
    setActionError("");
    setActionMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Your accommodation
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My applications
          </h1>

          <p className="mt-3 text-slate-500">
            Follow the progress of your room applications.
          </p>
        </div>

        <Link
          to="/rooms"
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Browse rooms
        </Link>
      </div>

      {actionMessage && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {actionMessage}
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
              onClick={refreshApplications}
              disabled={loading || cancellingId !== null}
              className="mt-3 font-semibold underline disabled:opacity-50"
            >
              Refresh applications
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p role="status" className="mt-8 text-slate-600">
          Loading your applications…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl bg-red-50 p-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshApplications}
            className="mt-4 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            No applications yet
          </h2>

          <p className="mt-3 text-slate-500">
            Start by exploring rooms to find a space that suits you.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {applications.map((application) => (
            <article
              key={application.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  Room {application.room_number}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    statusStyles[application.status] ||
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {application.status}
                </span>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <dt className="text-slate-500">Application number</dt>
                  <dd className="font-medium">#{application.id}</dd>
                </div>

                <div className="flex flex-wrap justify-between gap-3">
                  <dt className="text-slate-500">
                    Requested move-in date
                  </dt>
                  <dd className="font-medium">
                    {application.move_in_date}
                  </dd>
                </div>
              </dl>

              {application.status === "approved" && (
                <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  Your application was approved. Approval alone does not
                  confirm a reservation—check your stay and rent charge
                  for the current payment and reservation status.
                </p>
              )}

              {application.status === "pending" && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  {confirmingId === application.id ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Cancel this application?
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        It will no longer be available for staff approval.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          disabled={cancellingId !== null}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
                        >
                          Keep application
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancel(application.id)}
                          disabled={
                            loading ||
                            cancellingId !== null ||
                            needsRefresh
                          }
                          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                        >
                          {cancellingId === application.id
                            ? "Cancelling…"
                            : "Yes, cancel"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setActionMessage("");
                        setConfirmingId(application.id);
                      }}
                      disabled={
                        loading ||
                        cancellingId !== null ||
                        needsRefresh
                      }
                      className="text-sm font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel application
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Application pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || cancellingId !== null || page === 1}
          onClick={() => changePage(page - 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">Page {page}</span>

        <button
          type="button"
          disabled={
            loading ||
            cancellingId !== null ||
            Boolean(error) ||
            !hasNext
          }
          onClick={() => changePage(page + 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}