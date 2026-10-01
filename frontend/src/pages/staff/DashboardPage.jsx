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

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-xl border border-[#245747]/20 bg-white px-4 py-2 " +
  "text-sm font-semibold text-[#245747] transition-colors " +
  "hover:bg-[#E8EDE4] focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

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
    Number(total) >= 0 &&
    data?.payments?.currency === "KES"
  );
}

const statStyles = {
  forest: "bg-[#E8EDE4] text-[#245747]",
  clay: "bg-[#F5E8DE] text-[#965038]",
  olive: "bg-[#EEF0DC] text-[#626B35]",
  amber: "bg-amber-50 text-amber-800",
};

function StatCard({ label, value, description, icon, tone }) {
  return (
    <article
      className="flex min-w-0 flex-col rounded-2xl
        border border-[#245747]/15 bg-white p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-[#57534E]">
          {label}
        </h2>

        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center
            justify-center rounded-xl ${statStyles[tone]}`}
        >
          <ManagementIcon name={icon} className="size-4" />
        </span>
      </div>

      <p
        className="mt-3 break-words font-heading text-2xl
          font-bold tracking-tight text-[#173F35] tabular-nums"
      >
        {numberFormatter.format(value)}
      </p>

      <p className="mt-2 text-xs leading-5 text-[#78716C]">
        {description}
      </p>
    </article>
  );
}

// These are stay counts, not percentages of room capacity.
function StayOverview({ stays }) {
  const segments = [
    {
      label: "Checked in",
      value: stays.checked_in,
      colour: "#245747",
      description: "Residents currently staying",
    },
    {
      label: "Reserved",
      value: stays.reserved,
      colour: "#879567",
      description: "Confirmed, awaiting arrival",
    },
    {
      label: "Payment holds",
      value: stays.unexpired_payment_holds,
      colour: "#C0805D",
      description: "Unexpired holds awaiting payment",
    },
  ];

  const total = segments.reduce((sum, item) => sum + item.value, 0);

  let cumulative = 0;

  const stops = segments.map((item) => {
    const start = cumulative;
    cumulative += total > 0 ? (item.value / total) * 100 : 0;

    return `${item.colour} ${start}% ${cumulative}%`;
  });

  const chartBackground =
    total > 0
      ? `conic-gradient(${stops.join(", ")})`
      : "#E8EDE4";

  return (
    <section
      aria-labelledby="stay-overview-heading"
      className="min-w-0 rounded-2xl border
        border-[#245747]/15 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="stay-overview-heading"
            className="font-heading text-base font-semibold text-[#173F35]"
          >
            Stay overview
          </h2>

          <p className="mt-1 text-xs leading-5 text-[#78716C]">
            Checked-in stays, reservations and current payment holds.
          </p>
        </div>

        <Link
          to="/staff/stays"
          className="inline-flex min-h-11 items-center
            gap-2 rounded-lg text-sm font-semibold text-[#245747]
            underline-offset-4 hover:underline
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#245747]"
        >
          View stays <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div
        className="mt-5 grid items-center gap-6
          sm:grid-cols-[190px_minmax(0,1fr)]"
      >
        {/* The same chart values are available as text in the legend. */}
        <div
          aria-hidden="true"
          className="relative mx-auto flex size-44
            items-center justify-center rounded-full"
          style={{ background: chartBackground }}
        >
          <div
            className="flex size-32 flex-col items-center
              justify-center rounded-full bg-white px-3 text-center"
          >
            <span
              className="font-heading text-2xl font-bold
                text-[#173F35] tabular-nums"
            >
              {numberFormatter.format(total)}
            </span>

            <span className="mt-1 text-xs text-[#78716C]">
              Stays shown
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="sr-only">
            Total stays shown: {numberFormatter.format(total)}.
          </p>

          <dl className="space-y-4">
            {segments.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4"
              >
                <dt className="min-w-0">
                  <span
                    className="flex items-center gap-2
                      text-sm font-medium text-[#173F35]"
                  >
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.colour }}
                    />
                    {item.label}
                  </span>

                  <span
                    className="mt-1 block pl-[18px]
                      text-xs leading-5 text-[#78716C]"
                  >
                    {item.description}
                  </span>
                </dt>

                <dd
                  className="shrink-0 text-sm font-semibold
                    text-[#173F35] tabular-nums"
                >
                  {numberFormatter.format(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {total === 0 && (
        <p className="mt-4 text-sm leading-6 text-[#57534E]">
          No stays in these statuses yet.
        </p>
      )}

      <p
        className="mt-5 border-t border-[#245747]/10
          pt-3 text-xs leading-5 text-[#78716C]"
      >
        This chart shows the mix of stay statuses, not room occupancy.
      </p>
    </section>
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
          throw new Error(
            "The server returned an unexpected dashboard response.",
          );
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

  function refreshDashboard() {
    if (loading) return;

    setLoading(true);
    setRetry((value) => value + 1);
  }

  const tasks = dashboard
    ? [
        {
          label: "Accommodation applications",
          description: "Waiting for staff review",
          count: dashboard.applications.pending,
          icon: "applications",
          to: "/staff/applications",
          action: "Review applications",
          badge: "Pending",
        },
        {
          label: "Maintenance requests",
          description: "Pending or currently being handled",
          count: dashboard.maintenance.unresolved,
          icon: "maintenance",
          to: "/staff/maintenance",
          action: "View maintenance requests",
          badge: "Open",
        },
        {
          label: "Payment holds",
          description: "Awaiting payment before the deadline",
          count: dashboard.stays.unexpired_payment_holds,
          icon: "clock",
          to: "/staff/stays",
          action: "View resident stays",
          badge: "Unexpired",
        },
        {
          label: "M-Pesa attempts",
          description: "Payment outcome needs investigation",
          count: dashboard.payments.mpesa_attempts_needing_review,
          icon: "payments",
          to: null,
          action: null,
          badge: "Review",
        },
      ]
    : [];

  return (
    <section aria-labelledby="dashboard-heading" className="min-w-0">
      {/* Welcome */}
      <header
        className="flex flex-wrap items-center justify-between
          gap-4 rounded-2xl border border-[#245747]/10
          bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8]
          to-[#DCE9DD] p-5 sm:p-6"
      >
        <div className="min-w-0">
          <p
            lang="sw"
            className="text-xs font-semibold uppercase
              tracking-[0.14em] text-[#965038]"
          >
            Karibu tena
          </p>

          <h1
            id="dashboard-heading"
            className="mt-2 font-heading text-2xl
              font-bold tracking-tight text-[#173F35]"
          >
            Your hostel, at a glance.
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#57534E]">
            Welcome back{user?.username ? `, ${user.username}` : ""}.
            {" "}Check current stays, follow up on requests and keep
            things moving.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={refreshDashboard}
          className={secondaryButton}
        >
          <ManagementIcon name="refresh" className="size-4" />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      {loading ? (
        <div
          className="mt-5 rounded-2xl border
            border-[#245747]/15 bg-white p-5"
        >
          <LoadingMessage label="Loading hostel overview…" compact />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-red-100
            bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshDashboard}
            className="mt-3 inline-flex min-h-11 items-center
              rounded-lg font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : dashboard ? (
        <>
          {/* Summary figures */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active rooms"
              value={dashboard.rooms.active}
              description={`${numberFormatter.format(
                dashboard.rooms.total,
              )} rooms listed in total`}
              icon="rooms"
              tone="forest"
            />

            <StatCard
              label="Available spaces"
              value={dashboard.rooms.available_spaces}
              description="Spaces currently available in active rooms"
              icon="check"
              tone="olive"
            />

            <StatCard
              label="Checked-in residents"
              value={dashboard.stays.checked_in}
              description="Current checked-in stays across all rooms"
              icon="users"
              tone="clay"
            />

            <StatCard
              label="Pending applications"
              value={dashboard.applications.pending}
              description="Applications awaiting a decision"
              icon="applications"
              tone="amber"
            />
          </div>

          {/* Chart and payments */}
          <div
            className="mt-5 grid items-stretch gap-5
              xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          >
            <StayOverview stays={dashboard.stays} />

            <aside
              aria-labelledby="recorded-payments-heading"
              className="flex min-w-0 flex-col rounded-2xl
                border border-[#173F35] bg-gradient-to-br
                from-[#245747] to-[#173F35] p-5 text-white sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className="text-xs font-semibold uppercase
                      tracking-[0.12em] text-[#E9BC9F]"
                  >
                    Payment records
                  </p>

                  <h2
                    id="recorded-payments-heading"
                    className="mt-2 font-heading text-base font-semibold"
                  >
                    Total recorded payments
                  </h2>
                </div>

                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center
                    justify-center rounded-xl border
                    border-white/15 bg-white/10"
                >
                  <ManagementIcon name="payments" className="size-5" />
                </span>
              </div>

              <p
                className="mt-6 break-words font-heading
                  text-2xl font-bold tracking-tight tabular-nums"
              >
                {moneyFormatter.format(
                  Number(dashboard.payments.recorded_total_all_time),
                )}
              </p>

              <p className="mt-2 text-xs leading-6 text-[#D5E4DB]">
                All time · Cash, bank and recorded M-Pesa payments.
              </p>

              <p className="mt-4 text-sm leading-6 text-[#E2EBE4]">
                View individual records and rent charges to follow up
                on residents’ balances.
              </p>

              <div className="mt-auto pt-5">
                <Link
                  to="/staff/rent-payments"
                  className="flex min-h-11 items-center
                    justify-between gap-3 rounded-xl
                    bg-[#E8EDE4] px-4 py-3 text-sm
                    font-semibold text-[#173F35]
                    transition-colors hover:bg-white
                    focus-visible:outline-2
                    focus-visible:outline-offset-4
                    focus-visible:outline-[#E9BC9F]"
                >
                  Open rent & payments
                  <span aria-hidden="true">→</span>
                </Link>

                <Link
                  to="/staff/reports/payments"
                  className="mt-2 inline-flex min-h-11 items-center
                    rounded-lg text-xs font-semibold text-[#E2EBE4]
                    underline-offset-4 hover:underline
                    focus-visible:outline-2
                    focus-visible:outline-offset-2
                    focus-visible:outline-[#E9BC9F]"
                >
                  View payment report
                </Link>
              </div>
            </aside>
          </div>

          {/* Work queue */}
          <section
            aria-labelledby="attention-heading"
            className="mt-5 min-w-0 overflow-hidden
              rounded-2xl border border-[#245747]/15 bg-white"
          >
            <div
              className="flex flex-wrap items-center justify-between
                gap-3 border-b border-[#245747]/10 p-4 sm:px-5"
            >
              <div>
                <h2
                  id="attention-heading"
                  className="font-heading text-base
                    font-semibold text-[#173F35]"
                >
                  Keep an eye on
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#78716C]">
                  Requests and records that may need follow-up.
                </p>
              </div>

              <span
                className="rounded-full bg-[#FAF7F2]
                  px-3 py-1.5 text-xs text-[#57534E]"
              >
                Current activity
              </span>
            </div>

            <ul className="divide-y divide-[#245747]/10">
              {tasks.map((task) => (
                <li
                  key={task.label}
                  className="flex flex-wrap items-center
                    gap-3 p-4 transition-colors
                    hover:bg-[#FAF7F2]/70 sm:px-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center
                      justify-center rounded-xl
                      bg-[#E8EDE4] text-[#245747]"
                  >
                    <ManagementIcon name={task.icon} className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1 basis-40">
                    <h3 className="text-sm font-semibold text-[#173F35]">
                      {task.label}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[#78716C]">
                      {task.description}
                    </p>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1
                        text-xs font-medium ${
                          task.count > 0
                            ? "bg-[#F5E8DE] text-[#965038]"
                            : "bg-[#E8EDE4] text-[#245747]"
                        }`}
                    >
                      {task.badge}
                    </span>

                    <span
                      className="min-w-7 text-center text-sm
                        font-semibold text-[#173F35] tabular-nums"
                    >
                      {numberFormatter.format(task.count)}
                    </span>

                    {task.to ? (
                      <Link
                        to={task.to}
                        aria-label={task.action}
                        className="inline-flex size-11 items-center
                          justify-center rounded-xl text-[#245747]
                          transition-colors hover:bg-[#E8EDE4]
                          focus-visible:outline-2
                          focus-visible:outline-offset-2
                          focus-visible:outline-[#245747]"
                      >
                        <span aria-hidden="true">→</span>
                      </Link>
                    ) : (
                      <span className="size-11" aria-hidden="true" />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {dashboard.payments.mpesa_attempts_needing_review > 0 && (
              <p
                className="mx-4 mb-4 rounded-xl bg-amber-50
                  p-3 text-xs leading-6 text-amber-900 sm:mx-5"
              >
                M-Pesa attempts marked for review are not proof of
                successful payment. Confirm their outcome before
                recording another payment for the same transaction.
              </p>
            )}
          </section>

          {/* Snapshot time */}
          <p className="mt-4 text-xs leading-5 text-[#78716C]">
            Last loaded{" "}
            {loadedAt?.toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Africa/Nairobi",
            })}{" "}
            EAT. Use Refresh to load the latest figures.
          </p>

          <details
            className="mt-3 rounded-xl border
              border-[#245747]/10 bg-white/60 px-4 py-2"
          >
            <summary
              className="w-fit cursor-pointer rounded-lg
                py-2 text-xs font-semibold text-[#245747]
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-[#245747]"
            >
              What these figures mean
            </summary>

            <div className="max-w-3xl space-y-2 pb-3 text-xs leading-6 text-[#57534E]">
              <p>
                Available spaces cover active rooms. Checked-in stays,
                reservations and unexpired payment holds use those spaces.
              </p>

              <p>
                Checked-in stays and the stay-status chart cover all rooms.
                Use the occupancy report for room-by-room allocations.
              </p>

              <p>
                Recorded payments are an all-time total, not outstanding
                rent or payments received today.
              </p>

              <p>
                The M-Pesa review count identifies attempts requiring
                investigation. This dashboard does not include their
                review screen.
              </p>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}