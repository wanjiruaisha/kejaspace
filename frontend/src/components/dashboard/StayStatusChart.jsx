import { Link } from "react-router";

const numberFormatter = new Intl.NumberFormat("en-KE");

export default function StayStatusChart({ stays }) {
  const items = [
    {
      label: "Checked in",
      description: "Residents who have moved in",
      value: stays.checked_in,
      barClass: "bg-teal-500",
      dotClass: "bg-teal-500",
    },
    {
      label: "Reserved",
      description: "Confirmed stays awaiting arrival",
      value: stays.reserved,
      barClass: "bg-blue-500",
      dotClass: "bg-blue-500",
    },
    {
      label: "Payment holds",
      description: "Awaiting payment within the deadline",
      value: stays.unexpired_payment_holds,
      barClass: "bg-amber-400",
      dotClass: "bg-amber-400",
    },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const largestValue = Math.max(...items.map((item) => item.value));

  // Four equal intervals, with whole-number labels.
  const tickSize = Math.max(1, Math.ceil(largestValue / 4));
  const scaleMaximum = tickSize * 4;

  const ticks = Array.from(
    { length: 5 },
    (_, index) => index * tickSize,
  );

  return (
    <section
      aria-labelledby="stay-chart-title"
      className="min-w-0 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">
            Current stays
          </p>

          <h2
            id="stay-chart-title"
            className="mt-1 font-heading text-base font-semibold text-slate-900"
          >
            Stay status overview
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Compare arrivals, reservations and active payment holds.
          </p>
        </div>

        <Link
          to="/staff/stays"
          className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
        >
          View stays <span aria-hidden="true">→</span>
        </Link>
      </div>

      {total === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            No current stays in these categories
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            The chart will show values when there are checked-in residents,
            reservations or unexpired payment holds.
          </p>
        </div>
      ) : (
        <>
          {/* Visible labels and counts also make the chart readable
              without relying on bar colours or bar lengths. */}
          <dl className="mt-6 space-y-5">
            {items.map((item) => {
              const width = (item.value / scaleMaximum) * 100;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-sm text-slate-700">
                      <span
                        aria-hidden="true"
                        className={`size-2.5 shrink-0 rounded-full ${item.dotClass}`}
                      />
                      {item.label}
                    </dt>

                    <dd className="text-sm font-semibold tabular-nums text-slate-900">
                      {numberFormatter.format(item.value)}
                    </dd>
                  </div>

                  <div
                    aria-hidden="true"
                    className="relative h-7 overflow-hidden rounded-lg bg-slate-50"
                  >
                    <div className="absolute inset-0 flex justify-between">
                      {ticks.map((tick) => (
                        <span
                          key={tick}
                          className="h-full w-px bg-slate-200/80"
                        />
                      ))}
                    </div>

                    <div
                      className={`relative h-full rounded-r-lg ${item.barClass}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </dl>

          <div
            aria-hidden="true"
            className="mt-4 flex justify-between border-t border-slate-100 pt-2 text-[11px] tabular-nums text-slate-500"
          >
            {ticks.map((tick) => (
              <span key={tick}>
                {numberFormatter.format(tick)}
              </span>
            ))}
          </div>

          <p className="mt-1 text-center text-xs text-slate-500">
            Number of stays
          </p>
        </>
      )}

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        Counts cover all rooms. This compares stay statuses, not the
        percentage of room capacity occupied.
      </p>
    </section>
  );
}