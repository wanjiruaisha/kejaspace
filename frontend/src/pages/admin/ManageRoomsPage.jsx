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

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

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

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return error.message || "Something went wrong. Please try again.";
}

export default function ManageRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [needsReview, setNeedsReview] = useState(false);

  const formRef = useRef(null);
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

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function startEditing(room) {
    setEditingId(room.id);
    setDeleteTarget(null);
    setActionError("");
    setActionMessage("");

    setForm({
      room_number: room.room_number,
      capacity: String(room.capacity),
      monthly_price: room.monthly_price,
      description: room.description || "",
      is_active: room.is_active,
    });

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    formRef.current
      ?.querySelector('input[name="room_number"]')
      ?.focus({ preventScroll: true });
  }

  function handleMutationError(err) {
    const knownRejection = [400, 401, 403, 404, 409, 429].includes(
      err.status,
    );

    if (knownRejection) {
      setActionError(getErrorMessage(err));
      return;
    }

    setActionError(
      "We could not confirm whether the change was saved. Refresh and check the room list before trying again.",
    );
    setNeedsReview(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (mutationInProgress.current || needsReview) {
      return;
    }

    setActionError("");
    setActionMessage("");

    const roomNumber = form.room_number.trim();
    const price = form.monthly_price.trim();
    const capacity = Number(form.capacity);

    if (!roomNumber) {
      setActionError("Enter a room number.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setActionError("Capacity must be a positive whole number.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      setActionError("Enter a positive rent amount with up to two decimal places.");
      return;
    }

    const payload = {
      room_number: roomNumber,
      monthly_price: price,
      description: form.description.trim(),
      is_active: form.is_active,
    };

    // Capacity is only sent when creating a room.
    if (editingId === null) {
      payload.capacity = capacity;
    }

    mutationInProgress.current = true;
    setBusy(true);

    try {
      if (editingId !== null) {
        await updateRoom(editingId, payload);
        setActionMessage("Room updated successfully.");
      } else {
        await createRoom(payload);
        setActionMessage(
          "Room created successfully. Rooms are listed by room number, so it may appear on another page.",
        );
        setPage(1);
      }

      resetForm();
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
      !deleteTarget ||
      mutationInProgress.current ||
      needsReview
    ) {
      return;
    }

    const roomToDelete = deleteTarget;

    mutationInProgress.current = true;
    setBusy(true);
    setActionError("");
    setActionMessage("");

    try {
      await deleteRoom(roomToDelete.id);

      if (editingId === roomToDelete.id) {
        resetForm();
      }

      setActionMessage(`Room ${roomToDelete.room_number} deleted.`);
      setDeleteTarget(null);

      // Avoid remaining on an empty final page after deletion.
      if (rooms.length === 1 && page > 1) {
        setPage((value) => value - 1);
      } else {
        setReload((value) => value + 1);
      }
    } catch (err) {
      setDeleteTarget(null);
      handleMutationError(err);
    } finally {
      mutationInProgress.current = false;
      setBusy(false);
    }
  }

  function refreshRooms() {
    setDeleteTarget(null);
    setReload((value) => value + 1);
  }

  const actionsDisabled = busy || loading || needsReview || Boolean(error);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Manage rooms
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Add rooms, update rent and descriptions, and choose which rooms
            appear in the public listing.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshRooms}
          disabled={loading || busy}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          Refresh rooms
        </button>
      </div>

      {actionMessage && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {actionMessage}
        </p>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
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
                disabled={loading || busy || Boolean(error)}
                onClick={() => {
                  setNeedsReview(false);
                  setActionError("");
                  resetForm();
                }}
                className="font-semibold underline disabled:opacity-50"
              >
                I have checked the room list
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-1"
        >
          <h2 className="text-xl font-bold text-slate-900">
            {editingId !== null ? "Edit room" : "Add a room"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {editingId !== null
              ? "Update this room’s details. Capacity is fixed after creation."
              : "Enter the room details and monthly rent per resident."}
          </p>

          <fieldset
            disabled={busy || needsReview}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="room-number"
                className="text-sm font-semibold text-slate-700"
              >
                Room number
              </label>

              <input
                id="room-number"
                name="room_number"
                value={form.room_number}
                onChange={handleChange}
                placeholder="For example, A105"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="room-capacity"
                className="text-sm font-semibold text-slate-700"
              >
                Capacity
              </label>

              <input
                id="room-capacity"
                name="capacity"
                type="number"
                min="1"
                step="1"
                value={form.capacity}
                onChange={handleChange}
                disabled={editingId !== null}
                required
                className={inputClass}
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                The maximum number of residents in this room.
              </p>
            </div>

            <div>
              <label
                htmlFor="room-price"
                className="text-sm font-semibold text-slate-700"
              >
                Monthly rent per resident (KES)
              </label>

              <input
                id="room-price"
                name="monthly_price"
                type="number"
                min="0.01"
                step="0.01"
                value={form.monthly_price}
                onChange={handleChange}
                placeholder="8500.00"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="room-description"
                className="text-sm font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="room-description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the room."
                className={inputClass}
              />
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="mt-1 size-4 accent-blue-700"
              />

              <span>
                <span className="text-sm font-semibold text-slate-700">
                  Active room
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Active rooms appear in the public room listing.
                  Deactivating a room does not check out its residents.
                </span>
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {busy
                  ? "Please wait…"
                  : editingId !== null
                    ? "Save changes"
                    : "Create room"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </fieldset>
        </form>

        <div className="lg:col-span-2">
          {deleteTarget && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5"
            >
              <h2 className="font-bold text-red-900">
                Delete room {deleteTarget.room_number}?
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-800">
                This permanently removes the room. If it has related records,
                the server will prevent deletion. You can deactivate it instead.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionsDisabled}
                  className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Deleting…" : "Confirm delete"}
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={busy}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-900 disabled:opacity-50"
                >
                  Keep room
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p role="status" className="p-6 text-slate-600">
              Loading rooms…
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 p-6 text-red-800"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={refreshRooms}
                className="mt-4 font-semibold underline"
              >
                Try again
              </button>

              {page > 1 && (
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="ml-4 mt-4 font-semibold underline"
                >
                  Return to page 1
                </button>
              )}
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                No rooms on this page
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Use the form to create a room.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {rooms.map((room) => (
                <article
                  key={room.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900">
                      {room.room_number}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        room.is_active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {room.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Capacity</dt>
                      <dd className="font-semibold">{room.capacity}</dd>
                    </div>

                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Monthly rent</dt>
                      <dd className="font-semibold text-blue-700">
                        {moneyFormatter.format(Number(room.monthly_price))}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-5 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                    {room.description || "No description added."}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => startEditing(room)}
                      disabled={actionsDisabled}
                      className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(room);
                        setActionError("");
                        setActionMessage("");
                      }}
                      disabled={actionsDisabled}
                      className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <nav
            aria-label="Room pages"
            className="mt-8 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              disabled={loading || busy || page === 1}
              onClick={() => {
                setDeleteTarget(null);
                setPage((value) => value - 1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">Page {page}</span>

            <button
              type="button"
              disabled={loading || busy || Boolean(error) || !hasNext}
              onClick={() => {
                setDeleteTarget(null);
                setPage((value) => value + 1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
}