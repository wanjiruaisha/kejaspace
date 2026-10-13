import { useEffect, useRef, useState } from "react";

import {
  listAdminUsers,
  updateUserAccess,
} from "../../services/adminUserService";

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

const inputStyle =
  "mt-2 min-h-11 w-full rounded-lg border border-[#245747]/20 " +
  "bg-white px-3 py-2 text-sm text-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const rowGrid =
  "grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-3 " +
  "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_120px]";

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

function RoleBadge({ isStaff }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        isStaff
          ? "bg-[#F8EDE5] text-[#965038]"
          : "bg-[#E8EDE4] text-[#245747]"
      }`}
    >
      {isStaff ? "Staff" : "Resident"}
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
  const triggerRef = useRef(null);
  const saveInProgress = useRef(false);

  const selectedUserId = selectedUser?.id;

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

  useEffect(() => {
    if (selectedUserId == null) return;

    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedUserId, editing]);

  function resetPanel() {
    setSelectedUser(null);
    setEditing(false);
  }

  function closePanel() {
    if (saveInProgress.current) return;

    resetPanel();

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  function viewUser(user, button) {
    if (saveInProgress.current || loading) return;

    triggerRef.current = button;
    setSelectedUser(user);
    setEditing(false);
    setActionMessage("");

    if (!needsReview) {
      setActionError("");
    }
  }

  function startEditing() {
    if (
      !selectedUser ||
      saveInProgress.current ||
      loading ||
      needsReview
    ) {
      return;
    }

    setForm({
      is_staff: selectedUser.is_staff,
      is_active: selectedUser.is_active,
    });

    setActionError("");
    setActionMessage("");
    setEditing(true);
  }

  function refreshUsers() {
    if (saveInProgress.current || loading) return;

    resetPanel();
    setLoading(true);
    setReviewReloaded(false);
    setReload((value) => value + 1);
  }

  function changePage(nextPage) {
    if (
      saveInProgress.current ||
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

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !selectedUser ||
      !editing ||
      saveInProgress.current ||
      needsReview ||
      loading
    ) {
      return;
    }

    setActionError("");
    setActionMessage("");

    // Send only settings that actually changed.
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

    try {
      const updatedUser = await updateUserAccess(
        selectedUser.id,
        changes,
      );

      if (
        updatedUser?.id !== selectedUser.id ||
        typeof updatedUser.is_staff !== "boolean" ||
        typeof updatedUser.is_active !== "boolean" ||
        Object.entries(changes).some(
          ([field, value]) => updatedUser[field] !== value,
        )
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
      if ([400, 401, 403, 404, 409, 429].includes(err?.status)) {
        setActionError(
          err.status === 429
            ? "Too many requests. Please wait before trying again."
            : getErrorMessage(err),
        );
      } else {
        setActionError(
          "We could not confirm whether the update was saved. Refresh and check this account before making another change.",
        );
        setNeedsReview(true);
        setReviewReloaded(false);
        resetPanel();
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

  const changesDisabled = loading || saving || needsReview;

  return (
    <section
      aria-labelledby="manage-users-heading"
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
    >
      {/* Page heading */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
            Administration
          </p>

          <h1
            id="manage-users-heading"
            className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]"
          >
            Manage users
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            View resident and staff accounts and manage their access.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshUsers}
          disabled={loading || saving}
          className={secondaryButton}
        >
          <span aria-hidden="true">↻</span>
          Refresh users
        </button>
      </header>

      <p className="text-xs leading-5 text-[#78716C]">
        Administrator accounts are managed separately and do not appear here.
        Changing access keeps accommodation and payment records intact.
      </p>

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
          id="user-action-error"
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
        >
          <p>{actionError}</p>

          {needsReview && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshUsers}
                disabled={loading || saving}
                className={secondaryButton}
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
                className={secondaryButton}
              >
                I have checked the account
              </button>
            </div>
          )}
        </div>
      )}

      {/* Account list */}
      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-[#245747]/15 bg-white p-5 text-sm text-[#57534E]"
        >
          Loading users…
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
              onClick={refreshUsers}
              disabled={saving}
              className="min-h-11 rounded-lg font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => changePage(1)}
                disabled={saving}
                className="min-h-11 rounded-lg font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#245747]/25 bg-white px-5 py-8 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No users on this page
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            Registered residents and staff will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#245747]/15 bg-white">
          {/* Desktop headings */}
          <div
            aria-hidden="true"
            className={`${rowGrid} hidden border-b border-[#245747]/10 bg-[#F5F7F3] px-4 py-3 text-xs font-semibold text-[#57534E] lg:grid`}
          >
            <span>Username</span>
            <span>Email address</span>
            <span>Role</span>
            <span>Status</span>
            <span className="text-right">Details</span>
          </div>

          <ul className="divide-y divide-[#245747]/10">
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              const username = user.username || "Unnamed user";

              return (
                <li key={user.id} className="min-w-0">
                  <article
                    aria-labelledby={`user-title-${user.id}`}
                    className="min-w-0"
                  >
                    <div
                      className={`${rowGrid} px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-[#EDF3E8]"
                          : "hover:bg-[#FAFBF8]"
                      }`}
                    >
                      {/* Username */}
                      <div className="col-span-2 flex min-w-0 items-center gap-2.5 lg:col-span-1">
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E8EDE4] text-xs font-bold text-[#245747]"
                        >
                          {username.charAt(0).toUpperCase()}
                        </span>

                        <h2
                          id={`user-title-${user.id}`}
                          title={username}
                          className="min-w-0 truncate text-sm font-semibold text-[#173F35]"
                        >
                          {username}
                        </h2>
                      </div>

                      {/* Email */}
                      <div className="col-span-2 min-w-0 lg:col-span-1">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Email address
                        </p>

                        <p
                          title={user.email || ""}
                          className="truncate text-sm text-[#57534E]"
                        >
                          {user.email || "Not provided"}
                        </p>
                      </div>

                      {/* Role */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Role
                        </p>

                        <RoleBadge isStaff={user.is_staff} />
                      </div>

                      {/* Account status */}
                      <div className="min-w-0">
                        <p className="mb-1 text-xs text-[#78716C] lg:hidden">
                          Status
                        </p>

                        <StatusBadge active={user.is_active} />
                      </div>

                      {/* Details button */}
                      <div className="col-span-2 justify-self-end lg:col-span-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            if (isSelected) {
                              closePanel();
                            } else {
                              viewUser(user, event.currentTarget);
                            }
                          }}
                          disabled={saving}
                          aria-label={`${
                            isSelected ? "Hide" : "View"
                          } details for ${username}`}
                          aria-expanded={isSelected}
                          aria-controls={
                            isSelected
                              ? `user-details-${user.id}`
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

                    {/* Details open directly below the selected row */}
                    {isSelected && (
                      <section
                        id={`user-details-${user.id}`}
                        ref={panelRef}
                        tabIndex={-1}
                        aria-labelledby={`user-details-title-${user.id}`}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Escape" &&
                            !editing &&
                            !saveInProgress.current
                          ) {
                            event.stopPropagation();
                            closePanel();
                          }
                        }}
                        className="min-w-0 scroll-mt-24 border-t border-[#245747]/10 bg-[#FAF7F2] p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#245747] sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#965038]">
                              Account information
                            </p>

                            <h3
                              id={`user-details-title-${user.id}`}
                              className="mt-2 break-words font-heading text-base font-semibold text-[#173F35]"
                            >
                              {selectedUser.username}
                            </h3>

                            <p className="mt-2 text-xs text-[#78716C]">
                              Internal account reference: {selectedUser.id}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={closePanel}
                            disabled={saving}
                            className={`${secondaryButton} shrink-0`}
                          >
                            Close
                          </button>
                        </div>

                        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="min-w-0">
                            <dt className="text-xs text-[#78716C]">
                              Email address
                            </dt>

                            <dd className="mt-1 break-words text-sm font-medium text-[#173F35]">
                              {selectedUser.email || "Not provided"}
                            </dd>
                          </div>

                          <div className="min-w-0">
                            <dt className="text-xs text-[#78716C]">
                              Phone number
                            </dt>

                            <dd className="mt-1 break-words text-sm font-medium text-[#173F35]">
                              {selectedUser.phone_number || "Not provided"}
                            </dd>
                          </div>

                          <div>
                            <dt className="mb-2 text-xs text-[#78716C]">
                              Current role
                            </dt>

                            <dd>
                              <RoleBadge isStaff={selectedUser.is_staff} />
                            </dd>
                          </div>

                          <div>
                            <dt className="mb-2 text-xs text-[#78716C]">
                              Account status
                            </dt>

                            <dd>
                              <StatusBadge active={selectedUser.is_active} />
                            </dd>
                          </div>
                        </dl>

                        {editing ? (
                          <form
                            onSubmit={handleSubmit}
                            aria-busy={saving}
                            aria-describedby={
                              actionError ? "user-action-error" : undefined
                            }
                            className="mt-5 border-t border-[#245747]/10 pt-4"
                          >
                            <h4 className="text-sm font-semibold text-[#173F35]">
                              Edit account access
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-[#57534E]">
                              Choose the user’s role and whether their
                              account is active.
                            </p>

                            <fieldset
                              disabled={changesDisabled}
                              className="mt-4 min-w-0 space-y-4"
                            >
                              <legend className="sr-only">
                                Account access settings
                              </legend>

                              <div className="grid items-start gap-4 sm:grid-cols-2">
                                <div>
                                  <label
                                    htmlFor="user-role"
                                    className="block text-xs font-semibold text-[#173F35]"
                                  >
                                    Role
                                  </label>

                                  <select
                                    id="user-role"
                                    name="role"
                                    value={
                                      form.is_staff ? "staff" : "resident"
                                    }
                                    onChange={(event) =>
                                      setForm((previous) => ({
                                        ...previous,
                                        is_staff:
                                          event.target.value === "staff",
                                      }))
                                    }
                                    aria-describedby="user-role-help"
                                    className={inputStyle}
                                  >
                                    <option value="resident">Resident</option>
                                    <option value="staff">Staff</option>
                                  </select>

                                  <p
                                    id="user-role-help"
                                    className="mt-2 text-xs leading-5 text-[#78716C]"
                                  >
                                    Staff can manage daily hostel operations.
                                    This does not grant administrator access.
                                  </p>
                                </div>

                                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#245747]/10 bg-white p-3 sm:mt-6">
                                  <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={form.is_active}
                                    onChange={(event) =>
                                      setForm((previous) => ({
                                        ...previous,
                                        is_active: event.target.checked,
                                      }))
                                    }
                                    className="mt-1 size-4 shrink-0 accent-[#245747]"
                                  />

                                  <span>
                                    <span className="text-sm font-semibold text-[#173F35]">
                                      Account active
                                    </span>

                                    <span className="mt-1 block text-xs leading-5 text-[#57534E]">
                                      Uncheck to deactivate this account
                                      while keeping its records.
                                    </span>
                                  </span>
                                </label>
                              </div>

                              {form.is_staff !== selectedUser.is_staff && (
                                <p
                                  role="status"
                                  className="rounded-lg border border-[#245747]/15 bg-[#EDF3E8] p-3 text-sm leading-6 text-[#173F35]"
                                >
                                  {form.is_staff
                                    ? "Saving will give this user staff permissions."
                                    : "Saving will remove this user’s staff permissions."}
                                </p>
                              )}

                              {!form.is_active && selectedUser.is_active && (
                                <p
                                  role="status"
                                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                                >
                                  This will deactivate the account. It does
                                  not cancel the resident’s stay or settle
                                  outstanding charges.
                                </p>
                              )}

                              {form.is_active && !selectedUser.is_active && (
                                <p
                                  role="status"
                                  className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
                                >
                                  Saving will reactivate this account.
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2 border-t border-[#245747]/10 pt-4">
                                <button
                                  type="submit"
                                  disabled={changesDisabled || !hasChanges}
                                  className={primaryButton}
                                >
                                  {saving ? "Saving…" : "Save access"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(false);
                                    setActionError("");
                                  }}
                                  className={secondaryButton}
                                >
                                  Cancel edit
                                </button>
                              </div>
                            </fieldset>
                          </form>
                        ) : (
                          <div className="mt-5 border-t border-[#245747]/10 pt-4">
                            <button
                              type="button"
                              onClick={startEditing}
                              disabled={changesDisabled}
                              className={primaryButton}
                            >
                              Edit access
                            </button>
                          </div>
                        )}
                      </section>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <nav
        aria-label="User pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || saving || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-xs text-[#78716C]">Page {page}</span>

        <button
          type="button"
          disabled={loading || saving || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}