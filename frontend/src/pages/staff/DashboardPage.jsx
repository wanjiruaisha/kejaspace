import { useEffect, useState } from "react";
import { Link } from "react-router";

import useAuth from "../../hooks/useAuth";
import LoadingMessage from "../../components/common/LoadingMessage";
import ManagementIcon from "../../components/common/ManagementIcon";
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

const colourStyles = {
  blue: {
    text: "text-blue-600",
    icon: "bg-blue-50 text-blue-600",
  },
  green: {
    text: "text-emerald-600",
    icon: "bg-emerald-50 text-emerald-600",
  },
  teal: {
    text: "text-teal-600",
    icon: "bg-teal-50 text-teal-600",
  },
  amber: {
    text: "text-amber-600",
    icon: "bg-amber-50 text-amber-600",
  },
};

function StatCard({ label, value, icon, colour }) {
  const style = colourStyles[colour];

  return (
    <article className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm">
      <div className="min-w-0">
        <h2 className="font-sans text-xs font-medium text-slate-500">
          {label}
        </h2>
        <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${style.text}`}>
          {numberFormatter.format(value)}
        </p>
      </div>

      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
      >
        <ManagementIcon name={icon} className="size-5" />
      </span>
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

  const tasks = dashboard
    ? [
        {
          label: "Accommodation applications",
          description: "Waiting for staff review",
          count: dashboard.applications.pending,
          icon: "applications",
          badge: "Pending",
          to: "/staff/applications",
          action: "Review",
        },
        {
          label: "Maintenance requests",
          description: "Pending or in progress",
          count: dashboard.maintenance.unresolved,
          icon: "maintenance",
          badge: "Open",
          to: "/staff/maintenance",
          action: "View requests",
        },
        {
          label: "Payment holds",
          description: "Awaiting payment before the deadline",
          count: dashboard.stays.unexpired_payment_holds,
          icon: "clock",
          badge: "Unexpired",
          to: "/staff/stays",
          action: "View stays",
        },
        {
          label: "M-Pesa attempts",
          description: "Payment outcome requires investigation",
          count: dashboard.payments.mpesa_attempts_needing_review,
          icon: "payments",
          badge: "Review",
          to: null,
          action: null,
        },
      ]
    : [];

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              Hostel overview
            </span>
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Welcome back, {user?.username}. Here’s what needs your attention.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => setRetry((value) => value + 1)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-teal-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
        >
          <ManagementIcon name="refresh" />
          {loading ? "Refreshing…" : "Refresh"}
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
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active rooms"
              value={dashboard.rooms.active}
              icon="rooms"
              colour="blue"
            />
            <StatCard
              label="Available spaces"
              value={dashboard.rooms.available_spaces}
              icon="check"
              colour="green"
            />
            <StatCard
              label="Checked-in residents"
              value={dashboard.stays.checked_in}
              icon="users"
              colour="teal"
            />
            <StatCard
              label="Pending applications"
              value={dashboard.applications.pending}
              icon="applications"
              colour="amber"
            />
          </div>

          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main list */}
            <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4">
                <h2 className="font-heading text-base font-semibold text-slate-800">
                  Needs attention
                </h2>

                <span className="text-xs text-slate-400">
                  Current activity
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <li
                    key={task.label}
                    className="flex flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-slate-50/70"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 text-white">
                      <ManagementIcon name={task.icon} className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1 basis-40">
                      <h3 className="font-sans text-sm font-semibold text-slate-700">
                        {task.label}
                      </h3>
                      <p className="mt-0.5 text-xs leading-5 text-slate-400">
                        {task.description}
                      </p>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                        {task.badge}
                      </span>

                      <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-slate-800">
                        {numberFormatter.format(task.count)}
                      </span>

                      {task.to ? (
                        <Link
                          to={task.to}
                          aria-label={`${task.action}: ${task.label}`}
                          className="flex size-8 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                        >
                          <ManagementIcon name="arrow" />
                        </Link>
                      ) : (
                        <span className="size-8" aria-hidden="true" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-400">
                  Loaded{" "}
                  {loadedAt?.toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Nairobi",
                  })}{" "}
                  EAT · Refresh for the latest figures
                </p>
              </div>
            </section>

            {/* Small financial panel */}
            <aside className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-sm font-semibold text-slate-700">
                  Recorded payments
                </h2>
                <span className="rounded-lg bg-teal-50 p-2 text-teal-600">
                  <ManagementIcon name="payments" />
                </span>
              </div>

              <p className="mt-4 break-words text-xl font-semibold tracking-tight text-slate-900">
                {moneyFormatter.format(
                  Number(dashboard.payments.recorded_total_all_time),
                )}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                All time · Cash, bank and recorded M-Pesa payments
              </p>

              <Link
                to="/staff/rent-payments"
                className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                Open rent & payments
                <ManagementIcon name="arrow" />
              </Link>
            </aside>
          </div>

          <details className="mt-4 text-xs text-slate-500">
            <summary className="w-fit cursor-pointer rounded py-1 font-medium">
              About these figures
            </summary>
            <div className="mt-2 max-w-2xl space-y-2 leading-6">
              <p>
                Available spaces cover active rooms and exclude spaces used
                by checked-in stays, reservations, and unexpired payment holds.
              </p>
              <p>
                Checked-in residents are counted across all rooms. Recorded
                payments are an all-time total, not outstanding rent.
              </p>
              <p>
                M-Pesa attempts marked for review are not automatically
                successful payments. Their review screen is not connected here yet.
              </p>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}