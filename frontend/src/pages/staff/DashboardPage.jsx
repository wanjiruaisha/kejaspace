import { useEffect, useState } from "react";
import { Link } from "react-router";

import useAuth from "../../hooks/useAuth";
import LoadingMessage from "../../components/common/LoadingMessage";
import { getStaffDashboard } from "../../services/dashboardService";

const numberFormatter = new Intl.NumberFormat("en-KE");

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function hasValidDashboard(data) {
  const counts = [
    data?.rooms?.total,
    data?.rooms?.active,
    data?.rooms?.active_room_capacity,
    data?.rooms?.available_spaces,
    data?.stays?.checked_in,
    data?.stays?.reserved,
    data?.stays?.unexpired_payment_holds,
    data?.applications?.pending,
    data?.maintenance?.unresolved,
    data?.payments?.mpesa_attempts_needing_review,
  ];

  const total = data?.payments?.recorded_total_all_time;

  return (
    counts.every((value) => Number.isInteger(value) && value >= 0) &&
    typeof total === "string" &&
    total.trim() !== "" &&
    Number.isFinite(Number(total)) &&
    data?.payments?.currency === "KES"
  );
}

function SummaryCard({ label, value, description, symbol, tone }) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${tone}`}
        >
          {symbol}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {numberFormatter.format(value)}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loadedAt, setLoadedAt] = useState(null);

  const isAdmin = Boolean(user?.is_superuser);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const data = await getStaffDashboard(controller.signal);

        if (!hasValidDashboard(data)) {
          throw new Error("The server returned an unexpected dashboard response.");
        }

        if (!controller.signal.aborted) {
          setDashboard(data);
          setLoadedAt(new Date());
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect to the server. Please try again."
              : err.message || "Could not load the dashboard.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [retry]);

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>

          <p className="page-description">
            Welcome, {user?.username}. Here is your hostel overview.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          disabled={loading}
          className="button-secondary"
        >
          {loading ? "Refreshing…" : "Refresh overview"}
        </button>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingMessage label="Loading hostel overview…" compact />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : dashboard ? (
        <>
          <p className="mt-4 text-xs text-slate-500">
            Last loaded{" "}
            {loadedAt?.toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Nairobi",
            })}{" "}
            EAT. Refresh to see new activity.
          </p>

          {/* Main summary */}
          <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Active rooms"
              value={dashboard.rooms.active}
              description={`${numberFormatter.format(
                dashboard.rooms.total,
              )} rooms in total`}
              symbol="R"
              tone="bg-blue-50 text-blue-700"
            />

            <SummaryCard
              label="Available spaces"
              value={dashboard.rooms.available_spaces}
              description="In active rooms, after reservations and valid payment holds."
              symbol="A"
              tone="bg-emerald-50 text-emerald-700"
            />

            <SummaryCard
              label="Checked-in residents"
              value={dashboard.stays.checked_in}
              description="Residents with a checked-in stay."
              symbol="C"
              tone="bg-violet-50 text-violet-700"
            />

            <SummaryCard
              label="Pending applications"
              value={dashboard.applications.pending}
              description="Applications waiting for staff review."
              symbol="P"
              tone="bg-amber-50 text-amber-700"
            />
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
            {/* Work needing attention */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white xl:col-span-2">
              <div className="border-b border-slate-100 p-4 sm:p-5">
                <h2 className="section-title">Needs attention</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review requests and follow up on outstanding issues.
                </p>
              </div>

              <ul className="divide-y divide-slate-100">
                <li className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Pending applications
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {numberFormatter.format(dashboard.applications.pending)}{" "}
                      awaiting a decision
                    </p>
                  </div>

                  <Link
                    to="/staff/applications"
                    className="button-secondary"
                  >
                    Review
                  </Link>
                </li>

                <li className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Unresolved maintenance
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {numberFormatter.format(dashboard.maintenance.unresolved)}{" "}
                      pending or in progress
                    </p>
                  </div>

                  <Link
                    to="/staff/maintenance"
                    className="button-secondary"
                  >
                    View requests
                  </Link>
                </li>

                <li className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Valid payment holds
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {numberFormatter.format(
                        dashboard.stays.unexpired_payment_holds,
                      )}{" "}
                      stays awaiting payment before their deadline
                    </p>
                  </div>

                  <Link to="/staff/stays" className="button-secondary">
                    View stays
                  </Link>
                </li>

                <li className="p-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        M-Pesa attempts needing review
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        These attempts require investigation before their
                        outcome can be treated as resolved.
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                      {numberFormatter.format(
                        dashboard.payments.mpesa_attempts_needing_review,
                      )}
                    </span>
                  </div>
                </li>
              </ul>
            </section>

            {/* Financial summary */}
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="section-title">Recorded payments</h2>

              <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-blue-700">
                {moneyFormatter.format(
                  Number(dashboard.payments.recorded_total_all_time),
                )}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                All-time total of payment records in the system. This is
                not the outstanding rent balance.
              </p>

              <Link
                to="/staff/rent-payments"
                className="button-secondary mt-5"
              >
                Rent & payments
              </Link>
            </section>
          </div>

          {/* Additional figures */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="section-title">Rooms and stays</h2>

            <dl className="mt-4 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Total rooms", dashboard.rooms.total],
                ["Active-room capacity", dashboard.rooms.active_room_capacity],
                ["Reserved stays", dashboard.stays.reserved],
                ["Checked-in stays", dashboard.stays.checked_in],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">
                    {numberFormatter.format(value)}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Capacity and available spaces cover active rooms only.
              Stay counts cover all rooms.
            </p>
          </section>

          {/* Links to existing pages */}
          <section className="mt-6">
            <h2 className="section-title">Quick access</h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/staff/stays" className="button-secondary">
                Resident stays
              </Link>
              <Link to="/staff/visitors" className="button-secondary">
                Visitors
              </Link>
              <Link to="/staff/notices" className="button-secondary">
                Hostel notices
              </Link>

              {isAdmin && (
                <>
                  <Link to="/admin/rooms" className="button-secondary">
                    Manage rooms
                  </Link>
                  <Link to="/admin/users" className="button-secondary">
                    Manage users
                  </Link>
                  <Link
                    to="/admin/announcements"
                    className="button-secondary"
                  >
                    Manage announcements
                  </Link>
                </>
              )}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}