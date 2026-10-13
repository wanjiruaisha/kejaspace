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
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-lg px-3 py-2 text-xs font-semibold transition-colors " +
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
  "mt-2 min-h-11 w-full rounded-lg border border-[#245747]/20 " +
  "bg-white px-3 py-2 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const labelStyle = "block text-xs font-semibold text-[#173F35]";

const rowGrid =
  "grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-3 " +
  "lg:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,1fr)_120px]";

const dateFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Nairobi",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeZone: "Africa/Nairobi",
});

function getErrorMessage(error) {
  if (typeof error?.data?.detail === "string") {
    return error.data.detail;
  }

  if (
    error?.data &&
    typeof error.data === "object" &&
    !Array.isArray(error.data)
  ) {
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

function formatDate(value, includeTime = true) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return includeTime
    ? dateFormatter.format(date)
    : shortDateFormatter.format(date);
}

function PublicationBadge({ published }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
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
    panelRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
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
    const nextPublished = event.target.value;

    if (
      mutationRef.current ||
      loading ||
      nextPublished === published
    ) {
      return;
    }

    resetPanel();
    setReviewReloaded(false);
    setPublished(nextPublished);
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

      setSuccessMessage("Announcement deleted successfully.");
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

  function renderPanel() {
    const isCreating = panel === "create";
    const isEditing = panel === "edit";

    return (
      <section
        id={
          isCreating
            ? "create-announcement-panel"
            : `announcement-panel-${selected.id}`
        }
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
            event.stopPropagation();
            closePanel();
          }
        }}
        className={`min-w-0 scroll-mt-24 bg-[#FAF7F2] p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#245747] sm:p-5 ${
          isCreating
            ? "rounded-xl border border-[#245747]/15"
            : "border-t border-[#245747]/10"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#965038]">
              {isCreating ? "New notice" : "Announcement details"}
            </p>

            <h2
              id="admin-notice-panel-title"
              className="mt-2 break-words font-heading text-base font-semibold text-[#173F35]"
            >
              {isCreating
                ? "Create announcement"
                : isEditing
                  ? "Edit announcement"
                  : selected.title}
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

        {isCreating || isEditing ? (
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
                  placeholder="Include dates, times and what residents need to do."
                  required
                  className={`${inputStyle} resize-y leading-6`}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#245747]/10 bg-white p-3">
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

              {isEditing &&
                selected.is_published &&
                !form.is_published && (
                  <p
                    role="status"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
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
                    if (isEditing) {
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
        ) : (
          <>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="mb-2 text-xs text-[#78716C]">
                  Publication status
                </dt>
                <dd>
                  <PublicationBadge published={selected.is_published} />
                </dd>
              </div>

              <div>
                <dt className="text-xs text-[#78716C]">
                  Created · Nairobi
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#173F35]">
                  {formatDate(selected.created_at)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-[#78716C]">
                  Updated · Nairobi
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#173F35]">
                  {formatDate(selected.updated_at)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-[#245747]/10 pt-4">
              <h3 className="text-sm font-semibold text-[#173F35]">
                Message
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
                {selected.message}
              </p>

              <p className="mt-3 text-xs text-[#78716C]">
                Internal notice reference: {selected.id}
              </p>
            </div>

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
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="manage-announcements-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Administration
          </p>

          <h1
            id="manage-announcements-heading"
            className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]"
          >
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
          aria-expanded={panel === "create"}
          aria-controls={
            panel === "create" ? "create-announcement-panel" : undefined
          }
          className={primaryButton}
        >
          <span aria-hidden="true">+</span>
          Add announcement
        </button>
      </header>

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <div
          id="announcement-action-error"
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
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

      {panel === "create" && renderPanel()}

      {/* Existing publication filter */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#245747]/15 bg-white p-4">
        <div className="w-full sm:w-56">
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
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#245747]/15 bg-white p-5">
          <LoadingMessage label="Loading announcements…" compact />
        </div>
      ) : listError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{listError}</p>

          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={refreshList}
              disabled={busy}
              className="min-h-11 rounded-lg font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={busy}
                className="min-h-11 rounded-lg font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#245747]/25 bg-white px-5 py-8 text-center">
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
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          {/* Desktop column headings */}
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10 bg-[#F5F7F3] px-4 py-3 text-xs font-semibold text-[#57534E] lg:grid`}
          >
            <span>Announcement</span>
            <span>Status</span>
            <span>Last updated</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {announcements.map((announcement) => {
              const isSelected =
                selected?.id === announcement.id &&
                (panel === "view" || panel === "edit");

              return (
                <li key={announcement.id} className="min-w-0">
                  <article
                    aria-labelledby={`notice-title-${announcement.id}`}
                    className="min-w-0"
                  >
                    <div
                      className={`${rowGrid} px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-[#EDF3E8]"
                          : "hover:bg-[#FAFBF8]"
                      }`}
                    >
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <h2
                          id={`notice-title-${announcement.id}`}
                          title={announcement.title}
                          className="truncate text-sm font-semibold text-[#173F35]"
                        >
                          {announcement.title}
                        </h2>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Status
                        </p>

                        <PublicationBadge
                          published={announcement.is_published}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Last updated
                        </p>

                        <p className="text-sm text-[#57534E]">
                          {formatDate(
                            announcement.updated_at ||
                              announcement.created_at,
                            false,
                          )}
                        </p>
                      </div>

                      <div className="col-span-2 justify-self-end lg:col-span-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(event) => {
                            if (isSelected) {
                              closePanel();
                            } else {
                              openDetails(
                                announcement,
                                event.currentTarget,
                              );
                            }
                          }}
                          aria-label={`${
                            isSelected ? "Hide" : "View"
                          } details for ${announcement.title}`}
                          aria-expanded={isSelected}
                          aria-controls={
                            isSelected
                              ? `announcement-panel-${announcement.id}`
                              : undefined
                          }
                          className={secondaryButton}
                        >
                          {isSelected ? "Hide details" : "View details"}
                          <span aria-hidden="true">
                            {isSelected ? "−" : "+"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {isSelected && renderPanel()}
                  </article>
                </li>
              );
            })}
          </ul>
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
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-xs text-[#78716C]">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(listError) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}