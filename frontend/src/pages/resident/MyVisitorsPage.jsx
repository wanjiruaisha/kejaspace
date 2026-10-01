import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../../components/common/LoadingMessage";
import {
  listMyVisitors,
  registerVisitor,
  cancelVisitor,
} from "../../services/visitorService";

const emptyForm = {
  full_name: "",
  phone_number: "",
  visit_date: "",
  purpose: "",
};

const statusDetails = {
  expected: {
    label: "Expected",
    classes: "bg-amber-50 text-amber-800",
  },
  checked_in: {
    label: "Checked in",
    classes: "bg-emerald-50 text-emerald-800",
  },
  checked_out: {
    label: "Checked out",
    classes: "bg-stone-100 text-stone-700",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-800",
  },
};

const inputClass =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#245747]/20 " +
  "bg-white px-3 py-2.5 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl " +
  "border border-[#245747]/20 bg-white px-4 py-2 text-sm " +
  "font-semibold text-[#245747] transition-colors hover:bg-[#E8EDE4] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

export default function MyVisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [form, setForm] = useState({ ...emptyForm });
  const [confirmingId, setConfirmingId] = useState(null);

  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [needsCheck, setNeedsCheck] = useState(false);

  const mutationRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadVisitors() {
      setLoading(true);
      setListError("");

      try {
        const data = await listMyVisitors({
          page,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected visitor list.");
        }

        if (!controller.signal.aborted) {
          setVisitors(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(
            error instanceof TypeError
              ? "Could not connect. Please check your connection."
              : error.message || "Could not load your visitors.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadVisitors();

    return () => controller.abort();
  }, [page, retry]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function refreshList() {
    setConfirmingId(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleMutationError(error) {
    if ([400, 401, 403, 404, 429].includes(error.status)) {
      setActionError(
        error.status === 429
          ? "Too many requests. Please wait before trying again."
          : getErrorMessage(error),
      );

      if (error.status === 400 || error.status === 404) {
        refreshList();
      }
    } else {
      setNeedsCheck(true);
      setActionError(
        "We could not confirm whether the change was saved. " +
          "Check the refreshed visitor list before trying again.",
      );

      setPage(1);
      refreshList();
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    if (mutationRef.current || needsCheck) return;

    setActionError("");
    setSuccessMessage("");

    if (!form.full_name.trim() || !form.visit_date) {
      setActionError("Enter the visitor’s name and visit date.");
      return;
    }

    if (form.visit_date < getToday()) {
      setActionError("Choose today or a future visit date.");
      return;
    }

    mutationRef.current = true;
    setBusy("register");

    try {
      const created = await registerVisitor({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        visit_date: form.visit_date,
        purpose: form.purpose.trim(),
      });

      if (!created?.id) {
        throw new Error("Unexpected registration response.");
      }

      setForm({ ...emptyForm });
      setSuccessMessage(
        `Visitor ${created.full_name} registered successfully.`,
      );

      setPage(1);
      refreshList();
    } catch (error) {
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy("");
    }
  }

  async function handleCancel(visitorId) {
    if (
      mutationRef.current ||
      needsCheck ||
      loading ||
      confirmingId !== visitorId
    ) {
      return;
    }

    mutationRef.current = true;
    setBusy("cancel");
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await cancelVisitor(visitorId);

      if (updated?.id !== visitorId || updated.status !== "cancelled") {
        throw new Error("Unexpected cancellation response.");
      }

      setVisitors((previous) =>
        previous.map((visitor) =>
          visitor.id === visitorId
            ? { ...visitor, ...updated }
            : visitor,
        ),
      );

      setConfirmingId(null);
      setSuccessMessage(`Visit #${visitorId} has been cancelled.`);
    } catch (error) {
      setConfirmingId(null);
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy("");
    }
  }

  function changePage(nextPage) {
    if (loading || mutationRef.current) return;

    setConfirmingId(null);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-5xl">
      <header className="rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
          Your accommodation
        </p>

        <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
          Expecting someone?
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
          Register your visitors and keep track of their visits.
          Hostel staff record their arrival and departure.
        </p>
      </header>

      {successMessage && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          id="visitor-action-error"
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsCheck && (
            <>
              <p className="mt-2 text-xs leading-6">
                If the registration or cancellation already appears in
                the list, do not repeat it.
              </p>

              <button
                type="button"
                disabled={loading || Boolean(busy) || Boolean(listError)}
                onClick={() => {
                  setNeedsCheck(false);
                  setActionError("");
                }}
                className="mt-2 min-h-11 font-semibold underline
                  underline-offset-4 disabled:cursor-not-allowed
                  disabled:opacity-50"
              >
                I have checked the list — continue
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Registration form */}
        <form
          onSubmit={handleRegister}
          aria-busy={busy === "register"}
          className="min-w-0 rounded-2xl border border-[#245747]/15 bg-white p-4 sm:p-5"
        >
          <h2 className="font-heading text-base font-bold text-[#173F35]">
            Register a visitor
          </h2>

          <p className="mt-2 text-xs leading-6 text-[#57534E]">
            You must have a checked-in stay. Your visitor is linked
            to your room automatically.
          </p>

          <fieldset
            disabled={Boolean(busy) || needsCheck}
            className="mt-4 min-w-0 space-y-4"
          >
            <legend className="sr-only">Visitor details</legend>

            <div>
              <label
                htmlFor="visitor-name"
                className="block text-sm font-semibold text-[#173F35]"
              >
                Full name
              </label>

              <input
                id="visitor-name"
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={updateField}
                placeholder="Visitor’s full name"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="visitor-phone"
                className="block text-sm font-semibold text-[#173F35]"
              >
                Phone number
              </label>

              <input
                id="visitor-phone"
                name="phone_number"
                type="tel"
                value={form.phone_number}
                onChange={updateField}
                placeholder="Visitor’s phone number"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="visitor-date"
                className="block text-sm font-semibold text-[#173F35]"
              >
                Visit date
              </label>

              <input
                id="visitor-date"
                name="visit_date"
                type="date"
                min={getToday()}
                value={form.visit_date}
                onChange={updateField}
                required
                aria-describedby="visitor-date-hint"
                className={inputClass}
              />

              <p
                id="visitor-date-hint"
                className="mt-1.5 text-xs leading-5 text-[#78716C]"
              >
                Choose today or a future date.
              </p>
            </div>

            <div>
              <label
                htmlFor="visitor-purpose"
                className="block text-sm font-semibold text-[#173F35]"
              >
                Purpose of visit
              </label>

              <textarea
                id="visitor-purpose"
                name="purpose"
                value={form.purpose}
                onChange={updateField}
                rows={3}
                placeholder="For example: Visiting to study together."
                className={`${inputClass} resize-y leading-6`}
              />
            </div>

            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center
                justify-center gap-2 rounded-xl bg-[#245747]
                px-4 py-3 text-sm font-semibold text-white
                transition-colors hover:bg-[#173F35]
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[#245747]
                disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "register" ? "Registering…" : "Register visitor"}
              {busy !== "register" && <span aria-hidden="true">→</span>}
            </button>
          </fieldset>
        </form>

        {/* Visitor records */}
        <section aria-labelledby="visitor-history-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="visitor-history-heading"
              className="font-heading text-base font-bold text-[#173F35]"
            >
              Visitor history
            </h2>

            <button
              type="button"
              onClick={refreshList}
              disabled={loading || Boolean(busy)}
              className={secondaryButton}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="mt-5">
              <LoadingMessage label="Loading your visitors…" />
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
                disabled={Boolean(busy)}
                className="mt-2 min-h-11 font-semibold underline
                  underline-offset-4 disabled:opacity-50"
              >
                Try again
              </button>
            </div>
          ) : visitors.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#245747]/25 bg-[#FAF7F2] px-4 py-8 text-center">
              <h3 className="text-sm font-semibold text-[#173F35]">
                No visits to show
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                Registered visitors and their visit statuses will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visitors.map((visitor) => {
                const details = statusDetails[visitor.status] || {
                  label: visitor.status || "Unknown",
                  classes: "bg-stone-100 text-stone-700",
                };

                return (
                  <article
                    key={visitor.id}
                    className="min-w-0 rounded-2xl border
                      border-[#245747]/15 bg-white p-4
                      transition-colors hover:border-[#245747]/35"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[#78716C]">
                        Visit #{visitor.id} · Room {visitor.room_number}
                      </p>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs
                          font-semibold ${details.classes}`}
                      >
                        {details.label}
                      </span>
                    </div>

                    <h3 className="mt-3 break-words font-heading text-base font-bold text-[#173F35]">
                      {visitor.full_name}
                    </h3>

                    <p className="mt-1 text-xs leading-6 text-[#57534E]">
                      Visit date:{" "}
                      <span className="font-medium text-[#173F35]">
                        {visitor.visit_date}
                      </span>
                    </p>

                    <details className="mt-3 border-t border-[#245747]/10 pt-1">
                      <summary
                        className="w-fit cursor-pointer rounded-lg py-2
                          text-xs font-semibold text-[#245747]
                          focus-visible:outline-2 focus-visible:outline-offset-2
                          focus-visible:outline-[#245747]"
                      >
                        Details and actions
                      </summary>

                      <div className="pt-2">
                        <dl className="grid gap-3 sm:grid-cols-2">
                          {[
                            ["Phone", visitor.phone_number || "Not provided"],
                            ["Room", visitor.room_number],
                            ["Checked in", formatTimestamp(visitor.check_in_at)],
                            ["Checked out", formatTimestamp(visitor.check_out_at)],
                          ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <dt className="text-xs text-[#78716C]">
                                {label}
                              </dt>
                              <dd className="mt-1 break-words text-sm font-medium text-[#173F35]">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        {visitor.purpose && (
                          <div className="mt-4 rounded-xl bg-[#FAF7F2] p-3">
                            <h4 className="text-xs font-semibold text-[#173F35]">
                              Purpose of visit
                            </h4>

                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
                              {visitor.purpose}
                            </p>
                          </div>
                        )}

                        {visitor.status === "expected" && (
                          <div className="mt-3">
                            {confirmingId === visitor.id ? (
                              <div
                                role="group"
                                aria-labelledby={`cancel-visit-${visitor.id}`}
                                className="rounded-xl border border-red-100 bg-red-50/60 p-3"
                              >
                                <h4
                                  id={`cancel-visit-${visitor.id}`}
                                  className="text-sm font-semibold text-stone-900"
                                >
                                  Cancel this planned visit?
                                </h4>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingId(null)}
                                    disabled={Boolean(busy)}
                                    className={secondaryButton}
                                  >
                                    Keep visit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCancel(visitor.id)}
                                    disabled={
                                      loading || Boolean(busy) || needsCheck
                                    }
                                    className="min-h-11 rounded-xl bg-red-700
                                      px-4 py-2 text-sm font-semibold text-white
                                      hover:bg-red-800 focus-visible:outline-2
                                      focus-visible:outline-offset-2
                                      focus-visible:outline-red-700
                                      disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {busy === "cancel"
                                      ? "Cancelling…"
                                      : "Yes, cancel visit"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingId(visitor.id);
                                  setActionError("");
                                  setSuccessMessage("");
                                }}
                                disabled={Boolean(busy) || needsCheck}
                                className="min-h-11 rounded-lg text-sm
                                  font-semibold text-red-700
                                  underline-offset-4 hover:underline
                                  disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel visit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}

          <nav
            aria-label="Visitor pages"
            className="mt-5 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              type="button"
              disabled={loading || Boolean(busy) || page === 1}
              onClick={() => changePage(page - 1)}
              className={secondaryButton}
            >
              Previous
            </button>

            <span aria-current="page" className="text-sm text-[#57534E]">
              Page {page}
            </span>

            <button
              type="button"
              disabled={
                loading || Boolean(busy) || Boolean(listError) || !hasNext
              }
              onClick={() => changePage(page + 1)}
              className={secondaryButton}
            >
              Next
            </button>
          </nav>

          <p className="mt-3 text-center text-xs leading-5 text-[#78716C]">
            Check-in and check-out times are shown in East Africa Time.
          </p>
        </section>
      </div>
    </section>
  );
}