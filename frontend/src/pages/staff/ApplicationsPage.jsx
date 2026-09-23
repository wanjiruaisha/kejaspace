import { useEffect, useState } from "react";

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
  cancelled: "bg-slate-100 text-slate-600",
};

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      setLoading(true);
      setError("");

      try {
        const data = await listStaffApplications(
          page,
          status,
          controller.signal
        );

        if (!Array.isArray(data?.results)) {
          throw new Error("Unexpected application list from the server.");
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
              ? "Could not connect. Please try again."
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
  }, [page, status, retry]);

  function reloadList() {
    setConfirmation(null);
    setActionError("");
    setLoading(true);
    setPage(1);
    setRetry((value) => value + 1);
  }

  function openConfirmation(application, action) {
    setMessage("");
    setActionError("");
    setConfirmation({
      id: application.id,
      roomNumber: application.room_number,
      action,
    });
  }

  async function handleConfirm() {
    if (!confirmation || acting || needsRefresh) return;

    const { id, action } = confirmation;

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
          `Application #${id} approved. Stay #${stay.id} was created. Check the stay and initial rent charge for payment details.`
        );
      } else {
        const application = await rejectApplication(id);

        if (application?.status !== "rejected") {
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
        setActionError(err.message);
      } else if (err.status === 429) {
        setActionError("Too many requests. Please wait before trying again.");
      } else {
        setActionError(
          "We couldn’t confirm the result. Refresh the list to check the application before trying again."
        );
      }

      setNeedsRefresh(true);
    } finally {
      setActing(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Hostel management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Accommodation applications
          </h1>

          <p className="mt-3 text-slate-500">
            Review residents’ accommodation requests.
          </p>
        </div>

        <div>
          <label
            htmlFor="application-status"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Application status
          </label>

          <select
            id="application-status"
            value={status}
            disabled={acting || loading}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
              setConfirmation(null);
              setMessage("");
              setActionError("");
              setLoading(true);
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm disabled:opacity-50"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="">All applications</option>
          </select>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{actionError}</p>

          <button
            type="button"
            onClick={reloadList}
            disabled={loading || acting}
            className="mt-3 font-semibold underline disabled:opacity-50"
          >
            Refresh applications
          </button>
        </div>
      )}

      <div className="mt-8">
        {loading ? (
          <LoadingMessage label="Loading applications…" />
        ) : error ? (
          <div role="alert" className="rounded-xl bg-red-50 p-6 text-red-800">
            <p>{error}</p>

            <button
              type="button"
              onClick={reloadList}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              No applications found
            </h2>

            <p className="mt-3 text-slate-500">
              No applications currently match this status.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
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
                    <dt className="text-slate-500">Application</dt>
                    <dd className="font-medium">#{application.id}</dd>
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-slate-500">Applicant ID</dt>
                    <dd className="font-medium">#{application.applicant}</dd>
                  </div>

                  <div className="flex flex-wrap justify-between gap-3">
                    <dt className="text-slate-500">Requested move-in</dt>
                    <dd className="font-medium">{application.move_in_date}</dd>
                  </div>
                </dl>

                {application.status === "pending" && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    {confirmation?.id === application.id ? (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">
                          {confirmation.action === "approve"
                            ? "Approve this application?"
                            : "Reject this application?"}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {confirmation.action === "approve"
                            ? "Approval creates a stay awaiting payment and its initial rent charge."
                            : "The resident will see this application as rejected."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setConfirmation(null)}
                            disabled={acting}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            Go back
                          </button>

                          <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={acting || needsRefresh}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {acting
                              ? "Processing…"
                              : `Confirm ${confirmation.action}`}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => openConfirmation(application, "approve")}
                          disabled={acting || needsRefresh}
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => openConfirmation(application, "reject")}
                          disabled={acting || needsRefresh}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <nav
        aria-label="Application pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || acting || page === 1}
          onClick={() => {
            setConfirmation(null);
            setLoading(true);
            setPage((value) => value - 1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">Page {page}</span>

        <button
          type="button"
          disabled={loading || acting || Boolean(error) || !hasNext}
          onClick={() => {
            setConfirmation(null);
            setLoading(true);
            setPage((value) => value + 1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}