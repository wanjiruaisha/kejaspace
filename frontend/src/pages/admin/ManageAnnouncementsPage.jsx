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

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "px-4 py-2 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  `${buttonBase} bg-[#245747] text-white hover:bg-[#173F35]`;

const secondaryButton =
  `${buttonBase} border border-[#245747]/20 bg-white ` +
  "text-[#245747] hover:bg-[#EDF3E8]";

const dangerButton =
  `${buttonBase} border border-red-200 bg-white ` +
  "text-red-700 hover:bg-red-50";

const inputStyle =
  "mt-2 min-h-11 w-full rounded-xl border border-[#245747]/20 " +
  "bg-white px-3.5 py-2.5 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelStyle = "block text-sm font-semibold text-[#173F35]";

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Nairobi",
});

function getErrorMessage(error) {
  if (typeof error?.data?.detail === "string") {
    return error.data.detail;
  }

  if (error?.data && typeof error.data === "object") {
    const messages = Object.entries(error.data).map(([field, value]) => {
      const message = Array.isArray(value)
        ? value.join(" ")
        : String(value);

      return field === "detail" || field === "non_field_errors"
        ? message
        : `${field.replaceAll("_", " ")}: ${message}`;
    });

    if (messages.length > 0) return messages.join(" ");
  }

  return error?.message || "The action could not be completed.";
}

function formatDate(value) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : dateFormatter.format(date);
}

function PublicationBadge({ published }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        published
          ? "bg-emerald-50 text-emerald-800"
          : "bg-[#F8EDE5] text-[#965038]"
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

  // null, "view", "create", or "edit"
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

  const selectedId = selected?.id;

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
              : getErrorMessage(error),
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
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, [panel, selectedId]);

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

  // Also used internally after a successful save or delete.
  function reloadList() {
    resetPanel();
    setReviewReloaded(false);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function refreshList() {
    if (mutationRef.current || loading) return;
    reloadList();
  }

  function showLatestList() {
    setPublished("");
    setPage(1);
    reloadList();
  }

  function startCreating(button) {
    if (mutationRef.current || loading || needsCheck) return;

    triggerRef.current = button;
    setSelected(null);
    setForm({ ...emptyForm });
    setConfirmDelete(false);
    setActionError("");
    setSuccessMessage("");
    setPanel("create");
  }

  function openDetails(announcement, button) {
    if (mutationRef.current || loading) return;

    triggerRef.current = button;
    setSelected(announcement);
    setConfirmDelete(false);
    setSuccessMessage("");

    if (!needsCheck) setActionError("");

    setPanel("view");
  }

  function startEditing() {
    if (!selected || mutationRef.current || loading || needsCheck) return;

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
    if (
      mutationRef.current ||
      loading ||
      nextPage < 1 ||
      nextPage === page
    ) {
      return;
    }

    resetPanel();
    setReviewReloaded(false);
    setLoading(true);
    setPage(nextPage);
  }

  function changeFilter(event) {
    if (mutationRef.current || loading) return;

    resetPanel();
    setReviewReloaded(false);
    setPublished(event.target.value);
    setPage(1);
    setLoading(true);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleMutationError(error) {
    if ([400, 401, 403, 404, 409, 429].includes(error?.status)) {
      setActionError(
        error.status === 429
          ? "Too many requests. Please wait before trying again."
          : getErrorMessage(error),
      );

      if (error.status === 404) {
        setPage(1);
        reloadList();
      }

      return;
    }

    setNeedsCheck(true);
    setReviewReloaded(false);
    setActionError(
      "We could not confirm whether the change was saved. " +
        "Check the refreshed list and notice details before making another change.",
    );

    showLatestList();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      mutationRef.current ||
      loading ||
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
        saved.is_published !== data.is_published ||
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
      loading ||
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
      reloadList();
    } catch (error) {
      setConfirmDelete(false);
      handleMutationError(error);
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  }

  const changesDisabled = loading || busy || needsCheck;

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
      {/* Page header */}
      <header className="rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
              Administration
            </p>

            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
              Manage announcements
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Draft notices, publish hostel updates and keep residents informed.
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => startCreating(event.currentTarget)}
            disabled={changesDisabled}
            className={primaryButton}
          >
            <span aria-hidden="true">+</span>
            Add announcement
          </button>
        </div>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          id="announcement-action-error"
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsCheck && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || busy}
                onClick={refreshList}
                className={secondaryButton}
              >
                Refresh announcements
              </button>

              <button
                type="button"
                disabled={
                  busy || loading || Boolean(listError) || !reviewReloaded
                }
                onClick={() => {
                  setNeedsCheck(false);
                  setActionError("");
                  closePanel();
                }}
                className={secondaryButton}
              >
                I have checked the list
              </button>
            </div>
          )}
        </div>
      )}

      {/* Publication filter */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[#245747]/15 bg-white p-4">
        <div className="w-full sm:w-60">
          <label
            htmlFor="announcement-publication-filter"
            className={labelStyle}
          >
            Publication status
          </label>

          <select
            id="announcement-publication-filter"
            value={published}
            disabled={loading || busy}
            onChange={changeFilter}
            className={inputStyle}
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
          className={secondaryButton}
        >
          Refresh
        </button>
      </div>

      {/* Compact announcement rows */}
      {loading ? (
        <div className="rounded-2xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage label="Loading announcements…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{listError}</p>

          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={refreshList}
              disabled={busy}
              className="min-h-11 font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={busy}
                className="min-h-11 font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#245747]/25 bg-white p-6 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No announcements found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            {published
              ? "No notices on this page match the selected publication status."
              : "Use Add announcement to write your first notice."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                selected?.id === announcement.id
                  ? "border-[#245747]/40 bg-[#EDF3E8]"
                  : "border-[#245747]/15 bg-white hover:border-[#245747]/30"
              }`}
            >
              <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="min-w-0">
                  <p className="text-xs text-[#78716C]">
                    Notice #{announcement.id}
                  </p>

                  <h2
                    title={announcement.title}
                    className="mt-1 line-clamp-2 break-words font-heading text-base font-semibold text-[#173F35]"
                  >
                    {announcement.title}
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#78716C]">
                    Updated: {formatDate(announcement.updated_at)} · Nairobi
                  </p>
                </div>

                <div>
                  <PublicationBadge
                    published={announcement.is_published}
                  />
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={(event) =>
                    openDetails(announcement, event.currentTarget)
                  }
                  aria-label={`View announcement ${announcement.id}`}
                  className={`${secondaryButton} w-full md:w-auto`}
                >
                  View details
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <nav
        aria-label="Admin announcement pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-[#78716C]">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>

      {/* Details / create / edit panel */}
      {panel && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="admin-notice-panel-title"
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              panel === "view" &&
              !confirmDelete &&
              !mutationRef.current
            ) {
              closePanel();
            }
          }}
          className="min-w-0 scroll-mt-24 rounded-2xl border border-[#245747]/20 bg-white p-4 focus-visible:outline-2 focus-visible:outline-[#245747] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#965038]">
                {panel === "create"
                  ? "New notice"
                  : `Announcement #${selected?.id}`}
              </p>

              <h2
                id="admin-notice-panel-title"
                className="mt-2 break-words font-heading text-lg font-semibold text-[#173F35]"
              >
                {panel === "create"
                  ? "Create announcement"
                  : panel === "edit"
                    ? "Edit announcement"
                    : selected?.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={closePanel}
              disabled={busy}
              className={`${secondaryButton} shrink-0`}
            >
              Close
            </button>
          </div>

          {panel === "create" || panel === "edit" ? (
            <form
              onSubmit={handleSubmit}
              aria-busy={busy}
              aria-describedby={
                actionError ? "announcement-action-error" : undefined
              }
              className="mt-5"
            >
              <fieldset
                disabled={changesDisabled}
                className="min-w-0 space-y-4"
              >
                <legend className="sr-only">Announcement content</legend>

                <div>
                  <label
                    htmlFor="announcement-title"
                    className={labelStyle}
                  >
                    Title
                  </label>

                  <input
                    ref={titleRef}
                    id="announcement-title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="For example, scheduled water maintenance"
                    required
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label
                    htmlFor="announcement-message"
                    className={labelStyle}
                  >
                    Message
                  </label>

                  <textarea
                    id="announcement-message"
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Include the relevant dates, times and what residents need to do."
                    required
                    className={`${inputStyle} resize-y leading-6`}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#FAF7F2] p-4">
                  <input
                    type="checkbox"
                    name="is_published"
                    checked={form.is_published}
                    onChange={handleChange}
                    className="mt-1 size-4 shrink-0 accent-[#245747]"
                  />

                  <span>
                    <span className="text-sm font-semibold text-[#173F35]">
                      Publish this announcement
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[#57534E]">
                      Published notices are visible to logged-in users.
                      Leave unchecked to save a draft.
                    </span>
                  </span>
                </label>

                {panel === "edit" &&
                  selected?.is_published &&
                  !form.is_published && (
                    <p
                      role="status"
                      className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                    >
                      Saving will move this notice back to drafts and
                      remove it from the reader noticeboard.
                    </p>
                  )}

                <div className="flex flex-wrap gap-2 border-t border-[#245747]/10 pt-4">
                  <button
                    type="submit"
                    disabled={changesDisabled}
                    className={primaryButton}
                  >
                    {busy
                      ? "Saving…"
                      : form.is_published
                        ? "Save and publish"
                        : "Save draft"}
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
                    className={secondaryButton}
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

              <dl className="mt-5 grid gap-4 rounded-xl bg-[#FAF7F2] p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#78716C]">
                    Created · Nairobi
                  </dt>
                  <dd className="mt-2 font-medium text-[#173F35]">
                    {formatDate(selected.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-[#78716C]">
                    Updated · Nairobi
                  </dt>
                  <dd className="mt-2 font-medium text-[#173F35]">
                    {formatDate(selected.updated_at)}
                  </dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-[#173F35]">
                Message
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#57534E]">
                {selected.message}
              </p>

              {confirmDelete ? (
                <div
                  role="group"
                  aria-labelledby="delete-notice-heading"
                  aria-busy={busy}
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                >
                  <h3 id="delete-notice-heading" className="font-semibold">
                    Delete this announcement permanently?
                  </h3>

                  <p className="mt-2 break-words leading-6">
                    “{selected.title}” will be deleted. To keep a copy
                    while hiding it from readers, edit it and uncheck
                    Publish instead.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className={secondaryButton}
                    >
                      Keep announcement
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={changesDisabled}
                      className={`${buttonBase} bg-red-700 text-white hover:bg-red-800`}
                    >
                      {busy ? "Deleting…" : "Confirm delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#245747]/10 pt-4">
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={changesDisabled}
                    className={primaryButton}
                  >
                    Edit announcement
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={changesDisabled}
                    className={dangerButton}
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