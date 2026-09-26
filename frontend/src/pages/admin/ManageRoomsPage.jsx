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

function getErrorMessage(error) {
  if (error.data && typeof error.data === "object") {
    const messages = Object.entries(error.data).map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(" ") : String(value);

      return field === "detail" || field === "non_field_errors"
        ? text
        : `${field.replaceAll("_", " ")}: ${text}`;
    });

    if (messages.length > 0) return messages.join(" ");
  }

  return error.message || "Something went wrong. Please try again.";
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "bg-slate-100 text-slate-600"
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

    panelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    panelRef.current?.focus({ preventScroll: true });
  }, [panel, selectedRoom?.id]);

  function closePanel() {
    setPanel(null);
    setSelectedRoom(null);
    setConfirmDelete(false);
    setForm({ ...emptyForm });
  }

  function openCreate() {
    setSelectedRoom(null);
    setForm({ ...emptyForm });
    setConfirmDelete(false);
    setActionError("");
    setActionMessage("");
    setPanel("create");
  }

  function openRoom(room) {
    setSelectedRoom(room);
    setConfirmDelete(false);
    setPanel("view");
  }

  function startEditing() {
    if (!selectedRoom) return;

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

  function refreshRooms() {
    closePanel();
    setReviewReloaded(false);
    setReload((value) => value + 1);
  }

  function handleMutationError(err) {
    if ([400, 401, 403, 404, 409, 429].includes(err.status)) {
      setActionError(getErrorMessage(err));
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

    if (mutationInProgress.current || needsReview) return;

    setActionError("");
    setActionMessage("");

    const roomNumber = form.room_number.trim();
    const capacity = Number(form.capacity);
    const price = String(form.monthly_price).trim();

    if (!roomNumber) {
      setActionError("Enter a room number.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setActionError("Capacity must be a positive whole number.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      setActionError(
        "Enter a positive rent amount with up to two decimal places.",
      );
      return;
    }

    const payload = {
      room_number: roomNumber,
      monthly_price: price,
      description: form.description.trim(),
      is_active: form.is_active,
    };

    const isEditing = panel === "edit";

    if (!isEditing) {
      payload.capacity = capacity;
    }

    mutationInProgress.current = true;
    setBusy(true);

    try {
      if (isEditing) {
        await updateRoom(selectedRoom.id, payload);
        setActionMessage("Room updated successfully.");
      } else {
        await createRoom(payload);
        setActionMessage(
          "Room created successfully. Rooms are ordered by room number and may appear on another page.",
        );
        setPage(1);
      }

      closePanel();
      setReload((value) => value + 1);
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
      needsReview
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
      closePanel();

      if (rooms.length === 1 && page > 1) {
        setPage((value) => value - 1);
      } else {
        setReload((value) => value + 1);
      }
    } catch (err) {
      setConfirmDelete(false);
      handleMutationError(err);
    } finally {
      mutationInProgress.current = false;
      setBusy(false);
    }
  }

  const changesDisabled = busy || needsReview;

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Manage rooms</h1>
          <p className="page-description">
            Manage room listings, monthly rent, and availability for allocation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshRooms}
            disabled={loading || busy}
            className="button-secondary"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={changesDisabled}
            className="button-primary"
          >
            Add room
          </button>
        </div>
      </div>

      {actionMessage && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {actionMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{actionError}</p>

          {needsReview && (
            <div className="mt-3 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={refreshRooms}
                disabled={loading || busy}
                className="font-semibold underline disabled:opacity-50"
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
                className="font-semibold underline disabled:opacity-50"
              >
                I have checked the room list
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p role="status" className="py-6 text-sm text-slate-600">
            Loading rooms…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={refreshRooms}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => {
                  closePanel();
                  setPage(1);
                }}
                className="ml-4 mt-3 font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <h2 className="section-title">No rooms on this page</h2>
            <p className="card-description">
              Use “Add room” to create a room.
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Rooms table"
            tabIndex={0}
            className="max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white"
          >
            <table className="w-full min-w-[620px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Hostel rooms, capacity, monthly rent, and listing status
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="w-[18%] px-4 py-3 font-semibold">
                    Room
                  </th>
                  <th scope="col" className="w-[14%] px-4 py-3 font-semibold">
                    Capacity
                  </th>
                  <th scope="col" className="w-[26%] px-4 py-3 font-semibold">
                    Monthly rent
                  </th>
                  <th scope="col" className="w-[18%] px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="w-[24%] px-4 py-3 text-right font-semibold"
                  >
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className={
                      selectedRoom?.id === room.id
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-semibold text-slate-900"
                    >
                      <span className="block truncate" title={room.room_number}>
                        {room.room_number}
                      </span>
                    </th>

                    <td className="px-4 py-3 text-slate-600">
                      {room.capacity}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                      {moneyFormatter.format(Number(room.monthly_price))}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge active={room.is_active} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openRoom(room)}
                        disabled={busy}
                        aria-label={`View details for room ${room.room_number}`}
                        className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <nav
        aria-label="Room pages"
        className="mt-5 flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || busy || page === 1}
          onClick={() => {
            closePanel();
            setPage((value) => value - 1);
          }}
          className="button-secondary"
        >
          Previous
        </button>

        <span className="text-sm text-slate-500">Page {page}</span>

        <button
          type="button"
          disabled={loading || busy || Boolean(error) || !hasNext}
          onClick={() => {
            closePanel();
            setPage((value) => value + 1);
          }}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {panel && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="room-panel-title"
          className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="room-panel-title" className="section-title">
              {panel === "create"
                ? "Add room"
                : panel === "edit"
                  ? `Edit room ${selectedRoom.room_number}`
                  : `Room ${selectedRoom.room_number}`}
            </h2>

            <button
              type="button"
              onClick={closePanel}
              disabled={busy}
              className="button-secondary"
            >
              Close
            </button>
          </div>

          {panel === "view" ? (
            <>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Capacity</dt>
                  <dd className="mt-1 font-semibold">
                    {selectedRoom.capacity} residents
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Monthly rent per resident</dt>
                  <dd className="mt-1 font-semibold">
                    {moneyFormatter.format(Number(selectedRoom.monthly_price))}
                  </dd>
                </div>

                <div>
                  <dt className="mb-1 text-slate-500">Listing status</dt>
                  <dd>
                    <StatusBadge active={selectedRoom.is_active} />
                  </dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-semibold text-slate-900">
                Description
              </h3>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {selectedRoom.description || "No description added."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={startEditing}
                  disabled={changesDisabled}
                  className="button-primary"
                >
                  Edit room
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={changesDisabled}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete room
                </button>
              </div>

              {confirmDelete && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-900"
                >
                  <p className="font-semibold">
                    Delete room {selectedRoom.room_number} permanently?
                  </p>
                  <p className="mt-2 leading-6">
                    Rooms with protected related records cannot be deleted.
                    You can edit the room and deactivate it instead.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={changesDisabled}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="button-secondary"
                    >
                      Keep room
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5">
              <fieldset
                disabled={changesDisabled}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label htmlFor="room-number" className="form-label">
                    Room number
                  </label>
                  <input
                    id="room-number"
                    name="room_number"
                    required
                    value={form.room_number}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="room-capacity" className="form-label">
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
                    className="form-input disabled:bg-slate-100"
                  />
                  {panel === "edit" && (
                    <p className="mt-1 text-xs text-slate-500">
                      Capacity is fixed after creation.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="room-price" className="form-label">
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
                    className="form-input"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="room-description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="room-description"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <label className="flex items-start gap-3 sm:col-span-2 lg:col-span-3">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="mt-1 size-4 accent-blue-700"
                  />
                  <span>
                    <span className="text-sm font-medium">Active room</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Show this room in the public listing. Deactivating it
                      does not check out existing residents.
                    </span>
                  </span>
                </label>

                <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
                  <button type="submit" className="button-primary">
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
          )}
        </section>
      )}
    </section>
  );
}