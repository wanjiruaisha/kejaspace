import { useEffect, useRef, useState } from "react";

import {
  listAdminUsers,
  updateUserAccess,
} from "../../services/adminUserService";

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

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    is_staff: false,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [needsReview, setNeedsReview] = useState(false);

  const editorRef = useRef(null);
  const saveInProgress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError("");

      try {
        const data = await listAdminUsers(page, controller.signal);

        if (!Array.isArray(data?.results)) {
          throw new Error("The server returned an unexpected user list.");
        }

        if (!controller.signal.aborted) {
          setUsers(data.results);
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

    loadUsers();

    return () => controller.abort();
  }, [page, reload]);

  function startEditing(user) {
    setSelectedUser(user);

    setForm({
      is_staff: user.is_staff,
      is_active: user.is_active,
    });

    setActionError("");
    setActionMessage("");

    editorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    editorRef.current?.focus({ preventScroll: true });
  }

  function refreshUsers() {
    setSelectedUser(null);
    setReload((value) => value + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedUser || saveInProgress.current || needsReview) {
      return;
    }

    const changes = {};

    if (form.is_staff !== selectedUser.is_staff) {
      changes.is_staff = form.is_staff;
    }

    if (form.is_active !== selectedUser.is_active) {
      changes.is_active = form.is_active;
    }

    if (Object.keys(changes).length === 0) {
      setActionError("You have not changed any access settings.");
      return;
    }

    saveInProgress.current = true;
    setSaving(true);
    setActionError("");
    setActionMessage("");

    try {
      const updatedUser = await updateUserAccess(
        selectedUser.id,
        changes,
      );

      if (
        updatedUser?.id !== selectedUser.id ||
        typeof updatedUser.is_staff !== "boolean" ||
        typeof updatedUser.is_active !== "boolean"
      ) {
        throw new Error("The server returned an unexpected update response.");
      }

      setUsers((previous) =>
        previous.map((user) =>
          user.id === updatedUser.id ? updatedUser : user,
        ),
      );

      setSelectedUser(null);
      setActionMessage(
        `Access settings updated for ${updatedUser.username}.`,
      );
    } catch (err) {
      const knownRejection = [400, 401, 403, 404, 409, 429].includes(
        err.status,
      );

      if (knownRejection) {
        setActionError(getErrorMessage(err));
      } else {
        setActionError(
          "We could not confirm whether the update was saved. Refresh the user list and check this account before making another change.",
        );
        setNeedsReview(true);
        setSelectedUser(null);
      }
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }

  const hasChanges =
    selectedUser !== null &&
    (form.is_staff !== selectedUser.is_staff ||
      form.is_active !== selectedUser.is_active);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Manage users
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Manage staff access and account activity for residents and staff.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshUsers}
          disabled={loading || saving}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          Refresh users
        </button>
      </div>

      <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        Administrator accounts are managed separately and do not appear here.
        Changing account access does not remove accommodation or payment records.
      </p>

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
                onClick={refreshUsers}
                disabled={loading || saving}
                className="font-semibold underline disabled:opacity-50"
              >
                Refresh users
              </button>

              <button
                type="button"
                disabled={loading || saving || Boolean(error)}
                onClick={() => {
                  setNeedsReview(false);
                  setActionError("");
                }}
                className="font-semibold underline disabled:opacity-50"
              >
                I have checked the account
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <aside
          ref={editorRef}
          tabIndex={-1}
          aria-label="Edit user access"
          className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-1"
        >
          {selectedUser ? (
            <form onSubmit={handleSubmit}>
              <h2 className="break-words text-xl font-bold text-slate-900">
                Edit {selectedUser.username}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose this user’s role and account status, then save.
              </p>

              <fieldset disabled={saving} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="user-role"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Role
                  </label>

                  <select
                    id="user-role"
                    value={form.is_staff ? "staff" : "resident"}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        is_staff: event.target.value === "staff",
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="resident">Resident</option>
                    <option value="staff">Staff</option>
                  </select>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Staff can access operational features such as application
                    approvals, stays, visitors, and maintenance.
                  </p>
                </div>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        is_active: event.target.checked,
                      }))
                    }
                    className="mt-1 size-4 accent-blue-700"
                  />

                  <span>
                    <span className="text-sm font-semibold text-slate-700">
                      Account active
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Uncheck to deactivate this account while keeping its records.
                    </span>
                  </span>
                </label>

                {form.is_staff !== selectedUser.is_staff && (
                  <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                    {form.is_staff
                      ? "Saving will give this user staff permissions."
                      : "Saving will remove this user’s staff permissions."}
                  </p>
                )}

                {!form.is_active && selectedUser.is_active && (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    You are about to deactivate this account. This does not
                    cancel the user’s stay or settle outstanding charges.
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={!hasChanges || needsReview}
                    className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save access"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">
                Account access
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Select “Edit access” on a user card to manage their role and
                account status.
              </p>
            </>
          )}
        </aside>

        <div className="lg:col-span-2">
          {loading ? (
            <p role="status" className="p-6 text-slate-600">
              Loading users…
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 p-6 text-red-800"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={refreshUsers}
                className="mt-4 font-semibold underline"
              >
                Try again
              </button>

              {page > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setPage(1);
                  }}
                  className="ml-4 mt-4 font-semibold underline"
                >
                  Return to page 1
                </button>
              )}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h2 className="text-lg font-bold text-slate-900">
                No users on this page
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Registered residents and staff will appear here.
                Superusers are excluded.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700"
                    >
                      {user.username?.charAt(0).toUpperCase() || "U"}
                    </span>

                    <h2 className="break-words text-lg font-bold text-slate-900">
                      {user.username}
                    </h2>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                      {user.is_staff ? "Staff" : "Resident"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-slate-500">Email</dt>
                      <dd className="mt-1 break-words font-medium text-slate-800">
                        {user.email || "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Phone number</dt>
                      <dd className="mt-1 break-words font-medium text-slate-800">
                        {user.phone_number || "Not provided"}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={() => startEditing(user)}
                    disabled={saving || needsReview}
                    className="mt-6 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    Edit access
                  </button>
                </article>
              ))}
            </div>
          )}

          <nav
            aria-label="User pages"
            className="mt-8 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              disabled={loading || saving || page === 1}
              onClick={() => {
                setSelectedUser(null);
                setPage((value) => value - 1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">Page {page}</span>

            <button
              type="button"
              disabled={loading || saving || Boolean(error) || !hasNext}
              onClick={() => {
                setSelectedUser(null);
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