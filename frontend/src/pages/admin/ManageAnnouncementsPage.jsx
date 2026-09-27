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

function PublicationBadge({ published }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        published
          ? "bg-emerald-50 text-emerald-800"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export default function ManageAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [published, setPublished] = useState("");
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  // Panel can be null, "view", "create" or "edit".
  const [panel, setPanel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [needsCheck, setNeedsCheck] = useState(false);
  const [reviewReloaded, setReviewReloaded] = useState(false);

  const mutationRef = useRef(false);
  const panelRef = useRef(null);
  const titleRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnnouncements() {
      setLoading(true);
      setListError("");
      setReviewReloaded(false);

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
          setReviewReloaded(true);
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

  useEffect(() => {
    if (!panel) return;

    const target =
      panel === "create" || panel === "edit"
        ? titleRef.current
        : panelRef.current;

    target?.focus({ preventScroll: true });

    panelRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [panel, selected?.id]);

  function resetPanel() {
    setPanel(null);
    setSelected(null);
    setConfirmDelete(false);
    setForm({ ...emptyForm });
  }

  function closePanel() {
    if (mutationRef.current) return;

    resetPanel();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function refreshList() {
    resetPanel();
    setReviewReloaded(false);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function showLatestList() {
    setPublished("");
    setPage(1);
    refreshList();
  }

  function startCreating(button) {
    if (mutationRef.current || needsCheck) return;

    triggerRef.current = button;
    setSelected(null);
    setForm({ ...emptyForm });
    setConfirmDelete(false);
    setActionError("");
    setSuccessMessage("");
    setPanel("create");
  }

  function openDetails(announcement, button) {
    if (mutationRef.current) return;

    triggerRef.current = button;
    setSelected(announcement);
    setConfirmDelete(false);
    setSuccessMessage("");

    if (!needsCheck) setActionError("");

    setPanel("view");
  }

  function startEditing() {
    if (!selected || mutationRef.current || needsCheck) return;

    setForm({
      title: selected.title,
      message: selected.message,
      is_published: selected.is_published,
    });

    setConfirmDelete(false);
    setActionError("");
    setSuccessMessage("");
    setPanel("edit");
  }

  function changePage(nextPage) {
    resetPanel();
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    resetPanel();
    setPublished(event.target.value);
    setPage(1);
    setLoading(true);
  }

  function handleMutationError(error) {
    if ([400, 401, 403, 404, 429].includes(error.status)) {
      setActionError(
        error.status === 429
          ? "Too many requests. Please wait before trying again."
          : getErrorMessage(error),
      );

      if (error.status === 404) {
        setPage(1);
        refreshList();
      }
    } else {
      setNeedsCheck(true);
      setReviewReloaded(false);

      setActionError(
        "We could not confirm whether the change was saved. " +
          "Check the refreshed list and notice details before making another change.",
      );

      showLatestList();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      mutationRef.current ||
      needsCheck ||
      !["create", "edit"].includes(panel)
    ) {
      return;
    }

    const editingId = panel === "edit" ? selected?.id : null;

    if (panel === "edit" && editingId == null) return;

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

      if (
        saved?.id == null ||
        typeof saved.is_published !== "boolean" ||
        (editingId !== null && saved.id !== editingId)
      ) {
        throw new Error("Unexpected save response.");
      }

      setSuccessMessage(
        saved.is_published
          ? "Announcement saved and published."
          : "Announcement saved as a draft.",
      );

      showLatestList();
    } catch (error) {
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      mutationRef.current ||
      needsCheck ||
      !confirmDelete ||
      !selected
    ) {
      return;
    }

    const id = selected.id;

    mutationRef.current = true;
    setBusy(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await deleteAnnouncement(id);

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
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Administration
          </p>

          <h1 className="page-title mt-2">Manage announcements</h1>

          <p className="page-description">
            Create notices, manage drafts and publish hostel updates.
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => startCreating(event.currentTarget)}
          disabled={loading || busy || needsCheck}
          className="button-primary"
        >
          Add announcement
        </button>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>{actionError}</p>

          {needsCheck && (
            <button
              type="button"
              disabled={
                busy || loading || Boolean(listError) || !reviewReloaded
              }
              onClick={() => {
                setNeedsCheck(false);
                setActionError("");
                resetPanel();
              }}
              className="mt-3 font-semibold underline disabled:opacity-50"
            >
              I have checked the list — continue
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="w-full sm:w-56">
          <label
            htmlFor="announcement-publication-filter"
            className="form-label"
          >
            Publication status
          </label>

          <select
            id="announcement-publication-filter"
            value={published}
            disabled={loading || busy}
            onChange={changeFilter}
            className="form-input"
          >
            <option value="">All announcements</option>
            <option value="true">Published</option>
            <option value="false">Drafts</option>
          </select>
        </div>

        <button
          type="button"
          disabled={loading || busy}
          onClick={refreshList}
          className="button-secondary"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <LoadingMessage label="Loading announcements…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-5 text-sm text-red-800"
        >
          <p>{listError}</p>

          <button
            type="button"
            onClick={refreshList}
            disabled={busy}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No announcements found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No announcements match the selected publication status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Announcement titles, publication status and update dates
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="w-[40%] px-4 py-3">
                    Title
                  </th>
                  <th scope="col" className="w-[18%] px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="w-[25%] px-4 py-3">
                    Updated
                  </th>
                  <th scope="col" className="w-[17%] px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {announcements.map((announcement) => (
                  <tr
                    key={announcement.id}
                    className={
                      selected?.id === announcement.id
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-medium text-slate-900"
                    >
                      <p className="truncate" title={announcement.title}>
                        {announcement.title}
                      </p>

                      <p className="mt-1 text-xs font-normal text-slate-500">
                        Notice #{announcement.id}
                      </p>
                    </th>

                    <td className="px-4 py-3">
                      <PublicationBadge
                        published={announcement.is_published}
                      />
                    </td>

                    <td className="px-4 py-3 text-xs leading-5 text-slate-500">
                      {formatDate(announcement.updated_at)}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(event) =>
                          openDetails(announcement, event.currentTarget)
                        }
                        aria-label={`View announcement ${announcement.id}`}
                        className="rounded-lg px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <nav
        aria-label="Admin announcement pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => changePage(page - 1)}
          className="button-secondary"
        >
          Previous
        </button>

        <span className="text-sm text-slate-500">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {panel && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="admin-notice-panel-title"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <h2
              id="admin-notice-panel-title"
              className="min-w-0 break-words font-heading text-base font-semibold text-slate-900"
            >
              {panel === "create"
                ? "Create announcement"
                : panel === "edit"
                  ? `Edit announcement #${selected?.id}`
                  : selected?.title}
            </h2>

            <button
              type="button"
              onClick={closePanel}
              disabled={busy}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          {panel === "create" || panel === "edit" ? (
            <form onSubmit={handleSubmit}>
              <fieldset
                disabled={busy || needsCheck}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="announcement-title"
                    className="form-label"
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
                    className="form-input"
                  />
                </div>

                <div>
                  <label
                    htmlFor="announcement-message"
                    className="form-label"
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
                    className="form-input resize-y"
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
                    className="mt-1 size-4 accent-blue-700"
                  />

                  <span>
                    Publish this announcement
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Published notices are visible to logged-in users.
                      Leave unchecked to save a draft.
                    </span>
                  </span>
                </label>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="button-primary">
                    {busy ? "Saving…" : "Save announcement"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (panel === "edit") {
                        setPanel("view");
                        setActionError("");
                      } else {
                        closePanel();
                      }
                    }}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          ) : selected ? (
            <>
              <div className="mt-3">
                <PublicationBadge published={selected.is_published} />
              </div>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Created · Nairobi</dt>
                  <dd className="mt-1 text-slate-700">
                    {formatDate(selected.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Updated · Nairobi</dt>
                  <dd className="mt-1 text-slate-700">
                    {formatDate(selected.updated_at)}
                  </dd>
                </div>
              </dl>

              <p className="mt-5 whitespace-pre-wrap break-words border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
                {selected.message}
              </p>

              {confirmDelete ? (
                <div className="mt-5 rounded-xl bg-red-50 p-4">
                  <p className="text-sm leading-6 text-red-900">
                    Permanently delete “{selected.title}”? To keep a copy
                    while hiding it from readers, edit it and untick Publish.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy || needsCheck}
                      className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                    >
                      {busy ? "Deleting…" : "Confirm delete"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="button-secondary"
                    >
                      Keep announcement
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={busy || needsCheck}
                    className="button-primary"
                  >
                    Edit announcement
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy || needsCheck}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}
    </section>
  );
}