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
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60";

const labelStyle = "block text-xs font-semibold text-[#173F35]";

const rowGrid =
  "grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-3 " +
  "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_120px]";

function getErrorMessage(error) {
  if (
    error?.data &&
    typeof error.data === "object" &&
    !Array.isArray(error.data)
  ) {
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

  return value == null || value === "" || !Number.isFinite(amount)
    ? "Unavailable"
    : moneyFormatter.format(amount);
}

function getAvailability(room) {
  const value = room.available_spaces;

  if (value == null || value === "") return "Unavailable";

  const spaces = Number(value);

  if (!Number.isInteger(spaces) || spaces < 0) return "Unavailable";

  return `${spaces} ${spaces === 1 ? "space" : "spaces"}`;
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
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
    panelRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
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

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
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

  function openRoom(room, button) {
    if (mutationInProgress.current || loading) return;

    triggerRef.current = button;
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
    if (
      mutationInProgress.current ||
      loading ||
      nextPage < 1 ||
      nextPage === page
    ) {
      return;
    }

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

    // Preserve the existing rule: capacity is set during creation.
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

  // Used above the list for creation and inside a row for viewing/editing.
  function renderPanel() {
    const isCreating = panel === "create";
    const isEditing = panel === "edit";

    return (
      <section
        id={isCreating ? "create-room-panel" : `room-panel-${selectedRoom.id}`}
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
              {isCreating ? "New listing" : "Room information"}
            </p>

            <h2
              id="room-panel-title"
              className="mt-2 break-words font-heading text-base font-semibold text-[#173F35]"
            >
              {isCreating
                ? "Add a room"
                : isEditing
                  ? `Edit room ${selectedRoom.room_number}`
                  : `Room ${selectedRoom.room_number}`}
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

        {panel === "view" ? (
          <>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-[#78716C]">Capacity</dt>
                <dd className="mt-1 text-sm font-medium text-[#173F35]">
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
                <dd className="mt-1 text-sm font-semibold tabular-nums text-[#173F35]">
                  {formatMoney(selectedRoom.monthly_price)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-[#78716C]">
                  Available spaces
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#173F35]">
                  {getAvailability(selectedRoom)}
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

            <div className="mt-5 border-t border-[#245747]/10 pt-4">
              <h3 className="text-sm font-semibold text-[#173F35]">
                Description
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#57534E]">
                {selectedRoom.description || "No description added."}
              </p>

              <p className="mt-3 text-xs text-[#78716C]">
                Internal room reference: {selectedRoom.id}
              </p>
            </div>

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
                <h3
                  id="delete-room-heading"
                  className="break-words font-semibold"
                >
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
                  disabled={isEditing}
                  value={form.capacity}
                  onChange={handleChange}
                  aria-describedby={isEditing ? "capacity-help" : undefined}
                  className={inputStyle}
                />

                {isEditing && (
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

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#245747]/10 bg-white p-3 sm:col-span-2 lg:col-span-3">
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
                    : isEditing
                      ? "Save changes"
                      : "Create room"}
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
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="manage-rooms-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Administration
          </p>

          <h1
            id="manage-rooms-heading"
            className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]"
          >
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
            <span aria-hidden="true">↻</span>
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={changesDisabled}
            aria-expanded={panel === "create"}
            aria-controls={
              panel === "create" ? "create-room-panel" : undefined
            }
            className={primaryButton}
          >
            <span aria-hidden="true">+</span>
            Add room
          </button>
        </div>
      </header>

      {actionMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
        >
          {actionMessage}
        </p>
      )}

      {actionError && (
        <div
          id="room-action-error"
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsReview && (
            <div className="mt-3 flex flex-wrap gap-2">
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

      {panel === "create" && renderPanel()}

      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-[#245747]/15 bg-white p-5 text-sm text-[#57534E]"
        >
          Loading rooms…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={refreshRooms}
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
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#245747]/25 bg-white px-5 py-8 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No rooms on this page
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Use Add room to create a listing.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10 bg-[#F5F7F3] px-4 py-3 text-xs font-semibold text-[#57534E] lg:grid`}
          >
            <span>Room</span>
            <span>Capacity</span>
            <span>Monthly rent</span>
            <span>Available</span>
            <span>Status</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {rooms.map((room) => {
              const isSelected =
                selectedRoom?.id === room.id &&
                (panel === "view" || panel === "edit");

              return (
                <li key={room.id} className="min-w-0">
                  <article aria-labelledby={`room-title-${room.id}`}>
                    <div
                      className={`${rowGrid} px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-[#EDF3E8]"
                          : "hover:bg-[#FAFBF8]"
                      }`}
                    >
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <h2
                          id={`room-title-${room.id}`}
                          title={`Room ${room.room_number}`}
                          className="truncate text-sm font-semibold text-[#173F35]"
                        >
                          Room {room.room_number}
                        </h2>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Capacity
                        </p>
                        <p className="text-sm text-[#57534E]">
                          {room.capacity}{" "}
                          {Number(room.capacity) === 1
                            ? "resident"
                            : "residents"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Monthly rent
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-[#173F35]">
                          {formatMoney(room.monthly_price)}
                        </p>
                        <p className="mt-1 text-xs text-[#78716C]">
                          Per resident
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Available
                        </p>
                        <p className="text-sm text-[#57534E]">
                          {getAvailability(room)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Status
                        </p>
                        <StatusBadge active={room.is_active} />
                      </div>

                      <div className="col-span-2 justify-self-end lg:col-span-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            if (isSelected) {
                              closePanel();
                            } else {
                              openRoom(room, event.currentTarget);
                            }
                          }}
                          disabled={busy}
                          aria-label={`${
                            isSelected ? "Hide" : "View"
                          } details for room ${room.room_number}`}
                          aria-expanded={isSelected}
                          aria-controls={
                            isSelected ? `room-panel-${room.id}` : undefined
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
        aria-label="Room pages"
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
          disabled={loading || busy || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}