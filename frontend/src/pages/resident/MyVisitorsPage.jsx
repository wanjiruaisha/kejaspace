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
    classes: "bg-slate-100 text-slate-700",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-50 text-red-800",
  },
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm";

const secondaryButton =
  "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";

function formatTimestamp(value) {
  if (!value) return "Not yet";

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
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return `${field}: ${message}`;
      })
      .join(" ");
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
    if (mutationRef.current || needsCheck) return;

    mutationRef.current = true;
    setBusy("cancel");
    setActionError("");
    setSuccessMessage("");

    try {
      const updated = await cancelVisitor(visitorId);

      if (
        updated?.id !== visitorId ||
        updated.status !== "cancelled"
      ) {
        throw new Error("Unexpected cancellation response.");
      }

      setVisitors((previous) =>
        previous.map((visitor) =>
          visitor.id === visitorId ? updated : visitor,
        ),
      );

      setConfirmingId(null);
      setSuccessMessage("The visit has been cancelled.");
    } catch (error) {
      setConfirmingId(null);
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy("");
    }
  }

  function changePage(nextPage) {
    setConfirmingId(null);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
        Your accommodation
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        My visitors
      </h1>

      <p className="mt-3 max-w-2xl leading-7 text-slate-500">
        Register expected visitors and follow their visit status.
        You must have a checked-in stay to register someone.
      </p>

      {successMessage && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{actionError}</p>

          {needsCheck && (
            <button
              type="button"
              disabled={loading || Boolean(listError)}
              onClick={() => {
                setNeedsCheck(false);
                setActionError("");
              }}
              className="mt-3 font-semibold underline disabled:opacity-50"
            >
              I have checked the list — continue
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleRegister}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-xl font-bold text-slate-900">
          Register a visitor
        </h2>

        <fieldset
          disabled={Boolean(busy) || needsCheck}
          className="mt-6 grid gap-5 sm:grid-cols-2"
        >
          <div>
            <label
              htmlFor="visitor-name"
              className="text-sm font-semibold text-slate-700"
            >
              Full name
            </label>

            <input
              id="visitor-name"
              name="full_name"
              value={form.full_name}
              onChange={updateField}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="visitor-phone"
              className="text-sm font-semibold text-slate-700"
            >
              Phone number
            </label>

            <input
              id="visitor-phone"
              name="phone_number"
              type="tel"
              value={form.phone_number}
              onChange={updateField}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="visitor-date"
              className="text-sm font-semibold text-slate-700"
            >
              Visit date
            </label>

            <input
              id="visitor-date"
              name="visit_date"
              type="date"
              value={form.visit_date}
              onChange={updateField}
              required
              className={inputClass}
            />

            <p className="mt-2 text-xs text-slate-500">
              Choose today or a future date.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="visitor-purpose"
              className="text-sm font-semibold text-slate-700"
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
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {busy === "register" ? "Registering…" : "Register visitor"}
            </button>
          </div>
        </fieldset>
      </form>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">
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
        <div className="mt-6">
          <LoadingMessage label="Loading your visitors…" />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-5 text-red-800"
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
      ) : visitors.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          You haven’t registered any visitors yet.
        </p>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          {visitors.map((visitor) => {
            const details = statusDetails[visitor.status] || {
              label: visitor.status,
              classes: "bg-slate-100 text-slate-700",
            };

            return (
              <article
                key={visitor.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Visit #{visitor.id}
                  </p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${details.classes}`}
                  >
                    {details.label}
                  </span>
                </div>

                <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
                  {visitor.full_name}
                </h3>

                <dl className="mt-5 space-y-3 text-sm">
                  {[
                    ["Room", visitor.room_number],
                    ["Phone", visitor.phone_number || "Not provided"],
                    ["Visit date", visitor.visit_date],
                    ["Checked in", formatTimestamp(visitor.check_in_at)],
                    ["Checked out", formatTimestamp(visitor.check_out_at)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4"
                    >
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="break-words text-right font-medium text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {visitor.purpose && (
                  <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                    {visitor.purpose}
                  </p>
                )}

                {visitor.status === "expected" && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    {confirmingId === visitor.id ? (
                      <div>
                        <p className="text-sm text-slate-700">
                          Cancel this planned visit?
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleCancel(visitor.id)}
                            disabled={Boolean(busy) || needsCheck}
                            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {busy === "cancel"
                              ? "Cancelling…"
                              : "Yes, cancel visit"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={Boolean(busy)}
                            className={secondaryButton}
                          >
                            Keep visit
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
                        className="text-sm font-semibold text-red-700 disabled:opacity-50"
                      >
                        Cancel visit
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Visitor pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || Boolean(busy) || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
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
    </section>
  );
}