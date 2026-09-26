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

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    is_staff: false,
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewReloaded, setReviewReloaded] = useState(false);

  const panelRef = useRef(null);
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

    loadUsers();

    return () => controller.abort();
  }, [page, reload]);

  // Move to the details panel after it appears.
  useEffect(() => {
    if (!selectedUser) return;

    panelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    panelRef.current?.focus({ preventScroll: true });
  }, [selectedUser?.id, editing]);

  function closePanel() {
    setSelectedUser(null);
    setEditing(false);
  }

  function viewUser(user) {
    setSelectedUser(user);
    setEditing(false);
  }

  function startEditing() {
    if (!selectedUser) return;

    setForm({
      is_staff: selectedUser.is_staff,
      is_active: selectedUser.is_active,
    });

    setActionError("");
    setActionMessage("");
    setEditing(true);
  }

  function refreshUsers() {
    closePanel();
    setReviewReloaded(false);
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

      setSelectedUser(updatedUser);
      setEditing(false);
      setActionMessage(
        `Access settings updated for ${updatedUser.username}.`,
      );
    } catch (err) {
      if ([400, 401, 403, 404, 409, 429].includes(err.status)) {
        setActionError(getErrorMessage(err));
      } else {
        setActionError(
          "We could not confirm whether the update was saved. Refresh and check this account before making another change.",
        );
        setNeedsReview(true);
        setReviewReloaded(false);
        closePanel();
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
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Manage users</h1>

          <p className="page-description">
            Manage resident and staff account access.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshUsers}
          disabled={loading || saving}
          className="button-secondary"
        >
          Refresh users
        </button>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Administrator accounts are managed separately and do not appear here.
        Access changes preserve accommodation and payment records.
      </p>

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
                onClick={refreshUsers}
                disabled={loading || saving}
                className="font-semibold underline disabled:opacity-50"
              >
                Refresh users
              </button>

              <button
                type="button"
                disabled={
                  loading || saving || Boolean(error) || !reviewReloaded
                }
                onClick={() => {
                  setNeedsReview(false);
                  setActionError("");
                  closePanel();
                }}
                className="font-semibold underline disabled:opacity-50"
              >
                I have checked the account
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p role="status" className="py-6 text-sm text-slate-600">
            Loading users…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={refreshUsers}
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
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <h2 className="section-title">No users on this page</h2>
            <p className="card-description">
              Registered residents and staff will appear here.
            </p>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Users table"
            tabIndex={0}
            className="max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white"
          >
            <table className="w-full min-w-[680px] table-fixed text-left text-sm">
              <caption className="sr-only">
                Residents and staff, their email addresses, roles,
                and account statuses
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="w-[22%] px-4 py-3 font-semibold">
                    Username
                  </th>
                  <th scope="col" className="w-[28%] px-4 py-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="w-[14%] px-4 py-3 font-semibold">
                    Role
                  </th>
                  <th scope="col" className="w-[16%] px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-4 py-3 text-right font-semibold"
                  >
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={
                      selectedUser?.id === user.id
                        ? "bg-blue-50/60"
                        : "hover:bg-slate-50"
                    }
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 font-semibold text-slate-900"
                    >
                      <span className="block truncate" title={user.username}>
                        {user.username}
                      </span>
                    </th>

                    <td className="px-4 py-3 text-slate-600">
                      <span className="block truncate" title={user.email || ""}>
                        {user.email || "Not provided"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {user.is_staff ? "Staff" : "Resident"}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge active={user.is_active} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => viewUser(user)}
                        disabled={saving}
                        aria-label={`View details for ${user.username}`}
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
        aria-label="User pages"
        className="mt-5 flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || saving || page === 1}
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
          disabled={loading || saving || Boolean(error) || !hasNext}
          onClick={() => {
            closePanel();
            setPage((value) => value + 1);
          }}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {selectedUser && (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby="user-details-title"
          className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="user-details-title"
                className="section-title break-words"
              >
                {selectedUser.username}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Account #{selectedUser.id}
              </p>
            </div>

            <button
              type="button"
              onClick={closePanel}
              disabled={saving}
              className="button-secondary shrink-0"
            >
              Close
            </button>
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 break-words font-medium">
                {selectedUser.email || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Phone number</dt>
              <dd className="mt-1 break-words font-medium">
                {selectedUser.phone_number || "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Current role</dt>
              <dd className="mt-1 font-medium">
                {selectedUser.is_staff ? "Staff" : "Resident"}
              </dd>
            </div>

            <div>
              <dt className="mb-1 text-slate-500">Account status</dt>
              <dd>
                <StatusBadge active={selectedUser.is_active} />
              </dd>
            </div>
          </dl>

          {editing ? (
            <form
              onSubmit={handleSubmit}
              className="mt-5 border-t border-slate-100 pt-5"
            >
              <h3 className="card-title">Edit access</h3>

              <fieldset
                disabled={saving || needsReview}
                className="mt-4 space-y-4"
              >
                <div className="grid items-start gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="user-role" className="form-label">
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
                      className="form-input"
                    >
                      <option value="resident">Resident</option>
                      <option value="staff">Staff</option>
                    </select>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Staff can manage daily hostel operations.
                      This does not grant administrator access.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 sm:pt-7">
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
                      <span className="text-sm font-medium">
                        Account active
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Uncheck to deactivate the account while keeping
                        its records.
                      </span>
                    </span>
                  </label>
                </div>

                {form.is_staff !== selectedUser.is_staff && (
                  <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                    {form.is_staff
                      ? "Saving will give this user staff permissions."
                      : "Saving will remove this user’s staff permissions."}
                  </p>
                )}

                {!form.is_active && selectedUser.is_active && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    This will deactivate the account. It does not cancel
                    the resident’s stay or settle outstanding charges.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={!hasChanges}
                    className="button-primary"
                  >
                    {saving ? "Saving…" : "Save access"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="button-secondary"
                  >
                    Cancel edit
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={startEditing}
                disabled={saving || needsReview}
                className="button-primary"
              >
                Edit access
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}