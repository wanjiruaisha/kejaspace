import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../../components/common/LoadingMessage";
import {
  listAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../services/announcementService";

const emptyForm = {
  title: "",
  message: "",
  is_published: false,
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm";

const secondaryButton =
  "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";

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

  return error.message || "The action could not be completed.";
}

export default function ManageAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [published, setPublished] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [needsCheck, setNeedsCheck] = useState(false);

  const mutationRef = useRef(false);
  const titleRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnnouncements() {
      setLoading(true);
      setListError("");

      try {
        const data = await listAdminAnnouncements({
          page,
          published,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error("Unexpected announcement list.");
        }

        if (!controller.signal.aborted) {
          setAnnouncements(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(
            error instanceof TypeError
              ? "Could not connect. Please check your connection."
              : error.message || "Could not load announcements.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAnnouncements();

    return () => controller.abort();
  }, [page, published, retry]);

  function refreshList() {
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
  }

  function startEditing(announcement) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      message: announcement.message,
      is_published: announcement.is_published,
    });
    setDeleteId(null);
    setActionError("");
    setSuccessMessage("");

    titleRef.current?.focus();
  }

  function showLatestList() {
    setPublished("");
    setPage(1);
    refreshList();
  }

  function handleMutationError(error) {
    if ([400, 401, 403, 404, 429].includes(error.status)) {
      setActionError(
        error.status === 429
          ? "Too many requests. Please wait before trying again."
          : getErrorMessage(error),
      );

      if (error.status === 404) {
        setDeleteId(null);
        resetForm();
        refreshList();
      }
    } else {
      setNeedsCheck(true);
      setDeleteId(null);
      setActionError(
        "We could not confirm whether the change was saved. " +
          "Check the refreshed list before making another change.",
      );
      showLatestList();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (mutationRef.current || needsCheck) return;

    const data = {
      title: form.title.trim(),
      message: form.message.trim(),
      is_published: form.is_published,
    };

    setActionError("");
    setSuccessMessage("");

    if (!data.title || !data.message) {
      setActionError("Please enter a title and message.");
      return;
    }

    mutationRef.current = true;
    setBusy(true);

    try {
      const saved =
        editingId === null
          ? await createAnnouncement(data)
          : await updateAnnouncement(editingId, data);

      if (!saved?.id) {
        throw new Error("Unexpected save response.");
      }

      setSuccessMessage(
        saved.is_published
          ? "Announcement saved and published."
          : "Announcement saved as a draft.",
      );

      resetForm();
      setDeleteId(null);
      showLatestList();
    } catch (error) {
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (mutationRef.current || needsCheck || deleteId === null) return;

    const id = deleteId;

    mutationRef.current = true;
    setBusy(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteAnnouncement(id);

      if (editingId === id) resetForm();

      setDeleteId(null);
      setSuccessMessage(`Announcement #${id} deleted.`);
      setPage(1);
      refreshList();
    } catch (error) {
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
        Administration
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        Manage announcements
      </h1>

      <p className="mt-3 leading-7 text-slate-500">
        Create hostel notices and choose when they become visible.
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
                resetForm();
              }}
              className="mt-3 font-semibold underline disabled:opacity-50"
            >
              I have checked the list — continue
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-xl font-bold text-slate-900">
          {editingId === null
            ? "Create announcement"
            : `Edit announcement #${editingId}`}
        </h2>

        <fieldset disabled={busy || needsCheck} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="announcement-title"
              className="text-sm font-semibold text-slate-700"
            >
              Title
            </label>

            <input
              ref={titleRef}
              id="announcement-title"
              value={form.title}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="announcement-message"
              className="text-sm font-semibold text-slate-700"
            >
              Message
            </label>

            <textarea
              id="announcement-message"
              rows={5}
              value={form.message}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  message: event.target.value,
                }))
              }
              required
              className={inputClass}
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  is_published: event.target.checked,
                }))
              }
              className="mt-1"
            />

            <span>
              Publish this announcement
              <span className="mt-1 block text-xs text-slate-500">
                Published notices are visible to logged-in users.
                Untick to keep it as a draft.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {busy ? "Please wait…" : "Save announcement"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className={secondaryButton}
              >
                Cancel editing
              </button>
            )}
          </div>
        </fieldset>
      </form>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">
          Existing announcements
        </h2>

        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Filter announcements by publication status"
            value={published}
            disabled={loading || busy}
            onChange={(event) => {
              setPublished(event.target.value);
              setPage(1);
              setDeleteId(null);
              setLoading(true);
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
          >
            <option value="">All announcements</option>
            <option value="true">Published</option>
            <option value="false">Drafts</option>
          </select>

          <button
            type="button"
            disabled={loading || busy}
            onClick={refreshList}
            className={secondaryButton}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingMessage label="Loading announcements…" />
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
      ) : announcements.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No announcements match this view.
        </p>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  announcement.is_published
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {announcement.is_published ? "Published" : "Draft"}
              </span>

              <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
                {announcement.title}
              </h3>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                {announcement.message}
              </p>

              {deleteId === announcement.id ? (
                <div className="mt-6 rounded-xl bg-red-50 p-4">
                  <p className="text-sm text-red-900">
                    Permanently delete this announcement? To hide it
                    while keeping a copy, edit it and untick Publish.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy || needsCheck}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Deleting…" : "Confirm delete"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteId(null)}
                      disabled={busy}
                      className={secondaryButton}
                    >
                      Keep announcement
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startEditing(announcement)}
                    disabled={busy || needsCheck}
                    className={secondaryButton}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteId(announcement.id)}
                    disabled={busy || needsCheck}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Admin announcement pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => {
            setDeleteId(null);
            setLoading(true);
            setPage((value) => value - 1);
          }}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || busy || Boolean(listError) || !hasNext}
          onClick={() => {
            setDeleteId(null);
            setLoading(true);
            setPage((value) => value + 1);
          }}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}