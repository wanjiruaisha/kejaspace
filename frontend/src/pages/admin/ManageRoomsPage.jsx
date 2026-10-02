import { useEffect, useRef, useState } from "react";

import {
  listAdminRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../../services/adminRoomService";

const emptyForm = {
  room_number: "",
  capacity: "1",
  monthly_price: "",
  description: "",
  is_active: true,
};

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60";

const labelStyle = "block text-sm font-semibold text-[#173F35]";

function getErrorMessage(error) {
  if (error?.data && typeof error.data === "object") {
    const messages = Object.entries(error.data).map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(" ") : String(value);

      return field === "detail" || field === "non_field_errors"
        ? text
        : `${field.replaceAll("_", " ")}: ${text}`;
    });

    if (messages.length > 0) return messages.join(" ");
  }

  return error?.message || "Something went wrong. Please try again.";
}

function formatMoney(value) {
  const amount = Number(value);

  return value == null || !Number.isFinite(amount)
    ? "Unavailable"
    : moneyFormatter.format(amount);
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "bg-stone-100 text-stone-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  // null, "view", "create", or "edit"
  const [panel, setPanel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewReloaded, setReviewReloaded] = useState(false);

  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const mutationInProgress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      setLoading(true);
      setError("");

      try {
        const data = await listAdminRooms(page, controller.signal);

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected room list.");
        }

        if (!controller.signal.aborted) {
          setRooms(data.results);
          setHasNext(Boolean(data.next));
          setReviewReloaded(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRooms();

    return () => controller.abort();
  }, [page, reload]);

  useEffect(() => {
    if (!panel) return;

    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: "nearest" });
  }, [panel, selectedRoom?.id]);

  function resetPanel() {
    setPanel(null);
    setSelectedRoom(null);
    setConfirmDelete(false);
    setForm({ ...emptyForm });
  }

  function closePanel() {
    if (mutationInProgress.current) return;

    resetPanel();
    triggerRef.current?.focus();
  }

  function openCreate(event) {
    if (mutationInProgress.current || loading || needsReview) return;

    triggerRef.current = event.currentTarget;
    setSelectedRoom(null);
    setForm({ ...emptyForm });
    setConfirmDelete(false);
    setActionError("");
    setActionMessage("");
    setPanel("create");
  }

  function openRoom(room, event) {
    if (mutationInProgress.current || loading) return;

    triggerRef.current = event.currentTarget;
    setSelectedRoom(room);
    setConfirmDelete(false);
    setActionMessage("");

    if (!needsReview) setActionError("");

    setPanel("view");
  }

  function startEditing() {
    if (
      !selectedRoom ||
      mutationInProgress.current ||
      loading ||
      needsReview
    ) {
      return;
    }

    setForm({
      room_number: selectedRoom.room_number,
      capacity: String(selectedRoom.capacity),
      monthly_price: String(selectedRoom.monthly_price),
      description: selectedRoom.description || "",
      is_active: selectedRoom.is_active,
    });

    setConfirmDelete(false);
    setActionError("");
    setActionMessage("");
    setPanel("edit");
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function reloadRooms() {
    resetPanel();
    setLoading(true);
    setReviewReloaded(false);
    setReload((value) => value + 1);
  }

  function refreshRooms() {
    if (mutationInProgress.current || loading) return;
    reloadRooms();
  }

  function changePage(nextPage) {
    if (mutationInProgress.current || loading || nextPage < 1) return;

    resetPanel();
    setLoading(true);
    setReviewReloaded(false);
    setPage(nextPage);
  }

  function handleMutationError(err) {
    if ([400, 401, 403, 404, 409, 429].includes(err?.status)) {
      setActionError(
        err.status === 429
          ? "Too many requests. Please wait before trying again."
          : getErrorMessage(err),
      );
      return;
    }

    setNeedsReview(true);
    setReviewReloaded(false);
    setActionError(
      "We could not confirm whether the change was saved. Refresh and check the room list before trying again.",
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      mutationInProgress.current ||
      needsReview ||
      loading ||
      !["create", "edit"].includes(panel)
    ) {
      return;
    }

    setActionError("");
    setActionMessage("");

    const roomNumber = form.room_number.trim();
    const capacity = Number(form.capacity);
    const price = String(form.monthly_price).trim();
    const isEditing = panel === "edit";

    if (!roomNumber) {
      setActionError("Enter a room number.");
      return;
    }

    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      setActionError("Capacity must be a positive whole number.");
      return;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(price) ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      setActionError(
        "Enter a positive rent amount with up to two decimal places.",
      );
      return;
    }

    if (isEditing && !selectedRoom) return;

    const payload = {
      room_number: roomNumber,
      monthly_price: price,
      description: form.description.trim(),
      is_active: form.is_active,
    };

    // Capacity stays fixed when editing an existing room.
    if (!isEditing) payload.capacity = capacity;

    mutationInProgress.current = true;
    setBusy(true);

    try {
      if (isEditing) {
        await updateRoom(selectedRoom.id, payload);
        setActionMessage("Room updated successfully.");
      } else {
        await createRoom(payload);
        setActionMessage(
          "Room created successfully. It may appear on another page in the room list.",
        );
        setPage(1);
      }

      reloadRooms();
    } catch (err) {
      handleMutationError(err);
    } finally {
      mutationInProgress.current = false;
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !selectedRoom ||
      !confirmDelete ||
      mutationInProgress.current ||
      needsReview ||
      loading
    ) {
      return;
    }

    mutationInProgress.current = true;
    setBusy(true);
    setActionError("");
    setActionMessage("");

    try {
      await deleteRoom(selectedRoom.id);

      setActionMessage(`Room ${selectedRoom.room_number} deleted.`);

      if (rooms.length === 1 && page > 1) {
        setPage((value) => value - 1);
      }

      reloadRooms();
    } catch (err) {
      setConfirmDelete(false);
      handleMutationError(err);
    } finally {
      mutationInProgress.current = false;
      setBusy(false);
    }
  }

  const changesDisabled = loading || busy || needsReview;

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl">
      {/* Page header */}
      <header className="rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
              Administration
            </p>

            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
              Manage rooms
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Keep room information, monthly rent and listing status up to date.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshRooms}
              disabled={loading || busy}
              className={secondaryButton}
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              disabled={changesDisabled}
              className={primaryButton}
            >
              <span aria-hidden="true">+</span>
              Add room
            </button>
          </div>
        </div>
      </header>

      {actionMessage && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
        >
          {actionMessage}
        </p>
      )}

      {actionError && (
        <div
          id="room-action-error"
          role="alert"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsReview && (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={refreshRooms}
                disabled={loading || busy}
                className={secondaryButton}
              >
                Refresh rooms
              </button>

              <button
                type="button"
                disabled={
                  loading || busy || Boolean(error) || !reviewReloaded
                }
                onClick={() => {
                  setNeedsReview(false);
                  setActionError("");
                  closePanel();
                }}
                className={secondaryButton}
              >
                I have checked the room list
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compact room list */}
      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            Room listings
          </h2>

          <p className="text-xs text-[#78716C]">
            Select a room to view or edit its details.
          </p>
        </div>

        {loading ? (
          <p role="status" className="py-8 text-sm text-[#57534E]">
            Loading rooms…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <p>{error}</p>

            <div className="mt-3 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={refreshRooms}
                className="min-h-11 font-semibold underline"
              >
                Try again
              </button>

              {page > 1 && (
                <button
                  type="button"
                  onClick={() => changePage(1)}
                  className="min-h-11 font-semibold underline"
                >
                  Return to page 1
                </button>
              )}
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#245747]/25 bg-white p-6 text-center">
            <h3 className="font-heading text-base font-semibold text-[#173F35]">
              No rooms on this page
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Use Add room to create a listing.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rooms.map((room) => (
              <li
                key={room.id}
                className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                  selectedRoom?.id === room.id
                    ? "border-[#245747]/40 bg-[#EDF3E8]"
                    : "border-[#245747]/15 bg-white hover:border-[#245747]/30"
                }`}
              >
                <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-heading text-base font-semibold text-[#173F35]">
                        Room {room.room_number}
                      </h3>

                      <StatusBadge active={room.is_active} />
                    </div>

                    <p className="mt-2 text-xs text-[#78716C]">
                      Room record #{room.id}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-[#78716C]">Capacity</dt>
                      <dd className="mt-1 font-medium text-[#173F35]">
                        {room.capacity}{" "}
                        {Number(room.capacity) === 1 ? "resident" : "residents"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-[#78716C]">
                        Rent per resident
                      </dt>
                      <dd className="mt-1 font-semibold tabular-nums text-[#173F35]">
                        {formatMoney(room.monthly_price)}
                      </dd>
                      <dd className="mt-0.5 text-xs text-[#78716C]">
                        Per month
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={(event) => openRoom(room, event)}
                    disabled={busy}
                    aria-label={`View details for room ${room.room_number}`}
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
      </div>

      <nav
        aria-label="Room pages"
        className="mt-5 flex items-center justify-between gap-3"
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
          disabled={loading || busy || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>

      {/* Details and editing panel */}
      {panel && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="room-panel-title"
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              panel === "view" &&
              !confirmDelete &&
              !mutationInProgress.current
            ) {
              closePanel();
            }
          }}
          className="mt-6 scroll-mt-24 rounded-2xl border border-[#245747]/20 bg-white p-4 focus-visible:outline-2 focus-visible:outline-[#245747] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#965038]">
                {panel === "create" ? "New listing" : "Room information"}
              </p>

              <h2
                id="room-panel-title"
                className="mt-2 break-words font-heading text-lg font-semibold text-[#173F35]"
              >
                {panel === "create"
                  ? "Add a room"
                  : panel === "edit"
                    ? `Edit room ${selectedRoom.room_number}`
                    : `Room ${selectedRoom.room_number}`}
              </h2>
            </div>

            <button
              type="button"
              onClick={closePanel}
              disabled={busy}
              className={secondaryButton}
            >
              Close
            </button>
          </div>

          {panel === "view" ? (
            <>
              <dl className="mt-5 grid gap-5 rounded-xl bg-[#FAF7F2] p-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-[#78716C]">Capacity</dt>
                  <dd className="mt-2 font-semibold text-[#173F35]">
                    {selectedRoom.capacity}{" "}
                    {Number(selectedRoom.capacity) === 1
                      ? "resident"
                      : "residents"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-[#78716C]">
                    Monthly rent per resident
                  </dt>
                  <dd className="mt-2 font-semibold tabular-nums text-[#173F35]">
                    {formatMoney(selectedRoom.monthly_price)}
                  </dd>
                </div>

                <div>
                  <dt className="mb-2 text-xs text-[#78716C]">
                    Listing status
                  </dt>
                  <dd>
                    <StatusBadge active={selectedRoom.is_active} />
                  </dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-[#173F35]">
                Description
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
                {selectedRoom.description || "No description added."}
              </p>

              {!confirmDelete ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#245747]/10 pt-4">
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={changesDisabled}
                    className={primaryButton}
                  >
                    Edit room
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={changesDisabled}
                    className={dangerButton}
                  >
                    Delete room
                  </button>
                </div>
              ) : (
                <div
                  role="group"
                  aria-labelledby="delete-room-heading"
                  aria-busy={busy}
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                >
                  <h3 id="delete-room-heading" className="font-semibold">
                    Delete room {selectedRoom.room_number} permanently?
                  </h3>

                  <p className="mt-2 leading-6">
                    Rooms with protected related records cannot be deleted.
                    You can edit the room and deactivate it instead.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className={secondaryButton}
                    >
                      Keep room
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
              )}
            </>
          ) : (
            <form
              onSubmit={handleSubmit}
              aria-busy={busy}
              aria-describedby={actionError ? "room-action-error" : undefined}
              className="mt-5"
            >
              <fieldset
                disabled={changesDisabled}
                className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <legend className="sr-only">Room details</legend>

                <div>
                  <label htmlFor="room-number" className={labelStyle}>
                    Room number
                  </label>

                  <input
                    id="room-number"
                    name="room_number"
                    type="text"
                    required
                    value={form.room_number}
                    onChange={handleChange}
                    placeholder="For example, A105"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="room-capacity" className={labelStyle}>
                    Capacity
                  </label>

                  <input
                    id="room-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    disabled={panel === "edit"}
                    value={form.capacity}
                    onChange={handleChange}
                    aria-describedby={
                      panel === "edit" ? "capacity-help" : undefined
                    }
                    className={inputStyle}
                  />

                  {panel === "edit" && (
                    <p
                      id="capacity-help"
                      className="mt-2 text-xs leading-5 text-[#78716C]"
                    >
                      Capacity is fixed after creation.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="room-price" className={labelStyle}>
                    Monthly rent per resident (KES)
                  </label>

                  <input
                    id="room-price"
                    name="monthly_price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.monthly_price}
                    onChange={handleChange}
                    placeholder="For example, 8500"
                    className={inputStyle}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="room-description" className={labelStyle}>
                    Description
                  </label>

                  <textarea
                    id="room-description"
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the room and its facilities."
                    className={`${inputStyle} resize-y leading-6`}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#FAF7F2] p-4 sm:col-span-2 lg:col-span-3">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="mt-1 size-4 shrink-0 accent-[#245747]"
                  />

                  <span>
                    <span className="text-sm font-semibold text-[#173F35]">
                      Active room
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-[#57534E]">
                      Show this room in the public listing. Deactivating it
                      does not check out existing residents.
                    </span>
                  </span>
                </label>

                <div className="flex flex-wrap gap-2 border-t border-[#245747]/10 pt-4 sm:col-span-2 lg:col-span-3">
                  <button
                    type="submit"
                    disabled={changesDisabled}
                    className={primaryButton}
                  >
                    {busy
                      ? "Saving…"
                      : panel === "edit"
                        ? "Save changes"
                        : "Create room"}
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
          )}
        </section>
      )}
    </section>
  );
}