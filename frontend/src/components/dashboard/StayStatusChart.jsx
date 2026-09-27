import { Link } from "react-router";

const numberFormatter = new Intl.NumberFormat("en-KE");

export default function StayStatusChart({ stays }) {
  const items = [
    {
      label: "Checked in",
      value: stays.checked_in,
      colour: "#14b8a6",
      dotClass: "bg-teal-500",
    },
    {
      label: "Reserved",
      value: stays.reserved,
      colour: "#3b82f6",
      dotClass: "bg-blue-500",
    },
    {
      label: "Payment holds",
      value: stays.unexpired_payment_holds,
      colour: "#fbbf24",
      dotClass: "bg-amber-400",
    },
  ];

  const total = items.reduce((sum, item) => sum + item.value, 0);

  let position = 0;

  const segments = items.map((item) => {
    const start = position;
    const percentage = total > 0 ? (item.value / total) * 100 : 0;

    position += percentage;

    return `${item.colour} ${start}% ${position}%`;
  });

  const background =
    total > 0
      ? `conic-gradient(${segments.join(", ")})`
      : "#e2e8f0";

  return (
    <section
      aria-labelledby="stay-chart-title"
      className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5"
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
            Stay status
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Checked-in residents, reservations and unexpired holds.
          </p>
        </div>

        <Link
          to="/staff/stays"
          className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
        >
          View stays <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="mt-6 grid items-center gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
        {/* The text legend below provides the accessible chart values. */}
        <div
          aria-hidden="true"
          className="relative mx-auto flex size-48 items-center justify-center rounded-full sm:size-52"
          style={{ background }}
        >
          <div className="flex size-36 flex-col items-center justify-center rounded-full bg-white sm:size-40">
            <span className="text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
              {numberFormatter.format(total)}
            </span>

            <span className="mt-1 text-xs text-slate-500">
              Current stays
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="sr-only">
            Total current stays: {numberFormatter.format(total)}.
          </p>

          <dl className="space-y-3">
            {items.map((item) => {
              const percentage =
                total > 0 ? (item.value / total) * 100 : 0;

              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-3"
                >
                  <dt className="flex items-center gap-2 text-sm text-slate-700">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 shrink-0 rounded-full ${item.dotClass}`}
                    />

                    {item.label}
                  </dt>

                  <dd className="shrink-0 text-right">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {numberFormatter.format(item.value)}
                    </span>

                    <span className="ml-2 text-xs tabular-nums text-slate-500">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>

          {total === 0 && (
            <p className="mt-3 text-xs leading-5 text-slate-500">
              No stays currently fall into these categories. The ring will
              show coloured segments when there is data.
            </p>
          )}
        </div>
      </div>

      <p className="mt-5 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        Percentages show each category’s share of these current stays
        across all rooms. They do not represent room occupancy.
      </p>
    </section>
  );
}