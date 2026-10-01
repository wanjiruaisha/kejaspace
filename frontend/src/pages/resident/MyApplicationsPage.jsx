import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { apiRequest } from "../../services/api";
import { cancelApplication } from "../../services/accommodationService";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-red-50 text-red-800",
  cancelled: "bg-stone-100 text-stone-600",
};

const statusDescriptions = {
  pending:
    "Your application is waiting for staff review. Submitting an application does not reserve a space.",
  approved:
    "Your application was approved. Check My stay and My charges for your current reservation, payment status and any payment deadline.",
  rejected:
    "This application was not approved. You can browse other rooms or contact hostel staff for clarification.",
  cancelled:
    "This application has been cancelled and is no longer available for staff approval.",
};

const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "border border-[#245747]/20 bg-white px-4 py-2 text-sm " +
  "font-semibold text-[#245747] transition-colors hover:bg-[#E8EDE4] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "bg-[#245747] px-4 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747]";

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

  const cancellationRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(
          `/applications/?page=${page}&page_size=6`,
          { signal: controller.signal },
        );

        if (!Array.isArray(data?.results)) {
          throw new Error(
            "The server returned an unexpected application list.",
          );
        }

        if (!controller.signal.aborted) {
          setApplications(data.results);
          setHasNext(Boolean(data.next));

          // Unlock cancellation only after a successful refresh.
          setNeedsRefresh(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection and try again."
              : err.message || "Could not load your applications.",
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

  async function handleCancel(applicationId) {
    if (
      cancellationRef.current ||
      needsRefresh ||
      loading ||
      confirmingId !== applicationId
    ) {
      return;
    }

    cancellationRef.current = true;
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
            ? { ...application, ...updatedApplication }
            : application,
        ),
      );

      setConfirmingId(null);
      setActionMessage(
        `Application #${applicationId} has been cancelled.`,
      );
    } catch (err) {
      setConfirmingId(null);

      if (err.status === 400 || err.status === 404) {
        setActionError(
          err.message ||
            "This application may have changed. Refresh the list.",
        );
        setNeedsRefresh(true);
      } else if (err.status === 401 || err.status === 403) {
        setActionError(
          err.message || "You don’t have permission to cancel this application.",
        );
      } else if (err.status === 429) {
        setActionError(
          "Too many requests. Please wait before trying again.",
        );
      } else {
        setActionError(
          "We couldn’t confirm the cancellation. Refresh the list to check its current status before trying again.",
        );
        setNeedsRefresh(true);
      }
    } finally {
      cancellationRef.current = false;
      setCancellingId(null);
    }
  }

  function refreshApplications() {
    if (cancellationRef.current || loading) return;

    setConfirmingId(null);
    setActionError("");
    setActionMessage("");
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changePage(nextPage) {
    if (cancellationRef.current || loading || needsRefresh) return;

    setConfirmingId(null);
    setActionError("");
    setActionMessage("");
    setLoading(true);
    setPage(nextPage);
  }

  const busy = loading || cancellingId !== null;

  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl">
      {/* Compact page header */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Your accommodation
          </p>

          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
            My applications
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Follow your requests and see what happens next.
          </p>
        </div>

        <Link to="/rooms" className={primaryButton}>
          Browse rooms
          <span aria-hidden="true">↗</span>
        </Link>
      </header>

      {actionMessage && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
        >
          {actionMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsRefresh && (
            <button
              type="button"
              onClick={refreshApplications}
              disabled={busy}
              className="mt-2 min-h-11 font-semibold underline underline-offset-4 disabled:opacity-50"
            >
              Refresh applications
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-[#173F35]">
          Your requests
        </h2>

        <button
          type="button"
          onClick={refreshApplications}
          disabled={busy}
          className="min-h-11 rounded-lg px-3 text-sm font-semibold
            text-[#245747] underline-offset-4 hover:underline
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status" className="mt-4 py-6 text-sm text-[#57534E]">
          Loading your applications…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshApplications}
            className="mt-2 min-h-11 font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-[#245747]/25 bg-[#FAF7F2] px-5 py-9 text-center">
          <h3 className="font-heading text-base font-semibold text-[#173F35]">
            No applications to show
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Explore the rooms and find a space that suits you.
          </p>

          <Link to="/rooms" className={`mt-4 ${primaryButton}`}>
            Explore rooms
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {applications.map((application) => (
            <article
              key={application.id}
              className="min-w-0 rounded-2xl border border-[#245747]/15
                bg-white p-4 transition-colors
                hover:border-[#245747]/35 sm:p-5"
            >
              {/* Always-visible summary */}
              <div className="grid items-center gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="min-w-0">
                  <p className="text-xs text-[#78716C]">
                    Application #{application.id}
                  </p>

                  <h3 className="mt-1 break-words font-heading text-base font-bold text-[#173F35]">
                    Room {application.room_number}
                  </h3>
                </div>

                <div>
                  <p className="text-xs text-[#78716C]">
                    Requested move-in
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#173F35]">
                    {application.move_in_date || "Not provided"}
                  </p>
                </div>

                <span
                  className={`justify-self-start rounded-full px-3 py-1.5
                    text-xs font-semibold capitalize sm:justify-self-end ${
                      statusStyles[application.status] ||
                      "bg-stone-100 text-stone-600"
                    }`}
                >
                  {application.status}
                </span>
              </div>

              {/* Native expandable details */}
              <details className="mt-3 border-t border-[#245747]/10 pt-2">
                <summary
                  className="w-fit cursor-pointer rounded-lg py-2
                    text-xs font-semibold text-[#245747]
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-[#245747]"
                >
                  Details and actions
                </summary>

                <div className="pt-2">
                  <p className="max-w-2xl text-sm leading-6 text-[#57534E]">
                    {statusDescriptions[application.status] ||
                      "Check with hostel staff for more information about this application."}
                  </p>

                  {application.status === "approved" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to="/my-stay" className={outlineButton}>
                        My stay
                      </Link>

                      <Link to="/my-charges" className={outlineButton}>
                        My charges
                      </Link>
                    </div>
                  )}

                  {application.status === "pending" && (
                    <div className="mt-3">
                      {confirmingId === application.id ? (
                        <div
                          role="group"
                          aria-labelledby={`cancel-heading-${application.id}`}
                          className="rounded-xl border border-red-100 bg-red-50/60 p-3 sm:p-4"
                        >
                          <h4
                            id={`cancel-heading-${application.id}`}
                            className="text-sm font-semibold text-stone-900"
                          >
                            Cancel application #{application.id}?
                          </h4>

                          <p className="mt-1 text-sm leading-6 text-stone-600">
                            It will no longer be available for staff approval.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              disabled={cancellingId !== null}
                              className={outlineButton}
                            >
                              Keep application
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCancel(application.id)}
                              disabled={busy || needsRefresh}
                              className="min-h-11 rounded-xl bg-red-700
                                px-4 py-2 text-sm font-semibold text-white
                                hover:bg-red-800 focus-visible:outline-2
                                focus-visible:outline-offset-2
                                focus-visible:outline-red-700
                                disabled:cursor-not-allowed disabled:opacity-50"
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
                          disabled={busy || needsRefresh}
                          className="min-h-11 rounded-lg text-sm font-semibold
                            text-red-700 underline-offset-4 hover:underline
                            disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel application
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Application pages"
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          disabled={busy || needsRefresh || page === 1}
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
          disabled={busy || needsRefresh || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={outlineButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}