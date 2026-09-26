import { useEffect, useState } from "react";

import { getOccupancyReport } from "../../services/reportService";

const stayLabels = {
  checked_in: "Checked in",
  reserved: "Reserved",
  awaiting_payment: "Awaiting payment",
};

const stayStyles = {
  checked_in: "bg-emerald-50 text-emerald-700",
  reserved: "bg-blue-50 text-blue-700",
  awaiting_payment: "bg-amber-50 text-amber-800",
};

export default function OccupancyReportPage() {
  const [rooms, setRooms] = useState([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [page, setPage] = useState(1);
  const [active, setActive] = useState("");
  const [retry, setRetry] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const data = await getOccupancyReport({
          page,
          active,
          signal: controller.signal,
        });

        if (
          !Array.isArray(data?.results) ||
          !Number.isInteger(data?.count) ||
          data.count < 0
        ) {
          throw new Error("The server returned an unexpected room report.");
        }

        const validRooms = data.results.every(
          (room) =>
            room &&
            room.id != null &&
            Array.isArray(room.residents) &&
            [
              room.capacity,
              room.checked_in,
              room.reserved,
              room.payment_holds,
              room.available_spaces,
            ].every((value) => Number.isInteger(value) && value >= 0),
        );

        if (!validRooms) {
          throw new Error("Some room report information is incomplete.");
        }

        if (!controller.signal.aborted) {
          setRooms(data.results);
          setCount(data.count);
          setHasNext(Boolean(data.next));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect to the server. Please try again."
              : err.message || "Could not load the occupancy report.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => controller.abort();
  }, [page, active, retry]);

  function refreshReport() {
    setExpandedRoomId(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changeFilter(event) {
    setActive(event.target.value);
    setPage(1);
    setExpandedRoomId(null);
    setLoading(true);
  }

  function changePage(nextPage) {
    setExpandedRoomId(null);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Reports
          </p>

          <h1 className="page-title mt-2">Room occupancy</h1>

          <p className="page-description">
            See room capacity, current allocations and available spaces.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshReport}
          disabled={loading}
          className="button-secondary"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="w-full sm:w-52">
          <label htmlFor="occupancy-active" className="form-label">
            Room status
          </label>

          <select
            id="occupancy-active"
            value={active}
            onChange={changeFilter}
            className="form-input"
          >
            <option value="">All rooms</option>
            <option value="true">Active rooms</option>
            <option value="false">Inactive rooms</option>
          </select>
        </div>

        {!loading && !error && (
          <p role="status" className="text-sm text-slate-500">
            {count} matching {count === 1 ? "room" : "rooms"}
          </p>
        )}
      </div>

      {loading ? (
        <div
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600"
        >
          Loading the occupancy report…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshReport}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No rooms found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No rooms match the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">
                Room capacity, allocations and residents
              </caption>

              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Room
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Capacity
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Checked in
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Reserved
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Holds
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Available
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>

              {rooms.map((room) => {
                const expanded = expandedRoomId === room.id;

                return (
                  <tbody
                    key={room.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <tr className="hover:bg-slate-50/70">
                      <th
                        scope="row"
                        className="px-4 py-3 font-semibold text-slate-900"
                      >
                        {room.room_number}
                      </th>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            room.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {room.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {room.capacity}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {room.checked_in}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {room.reserved}
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        {room.payment_holds}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-blue-700">
                        {room.available_spaces}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`room-residents-${room.id}`}
                          aria-label={`${
                            expanded ? "Hide" : "View"
                          } residents for room ${room.room_number}`}
                          onClick={() =>
                            setExpandedRoomId(expanded ? null : room.id)
                          }
                          className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          {expanded ? "Hide residents" : "View residents"}
                        </button>
                      </td>
                    </tr>

                    <tr hidden={!expanded}>
                      <td colSpan={8} className="bg-slate-50 px-4 py-4">
                        <div id={`room-residents-${room.id}`}>
                          <h2 className="text-sm font-semibold text-slate-900">
                            Current allocations · Room {room.room_number}
                          </h2>

                          {room.residents.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">
                              No current residents, reservations or unexpired
                              payment holds.
                            </p>
                          ) : (
                            <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                              {room.residents.map((resident) => (
                                <li
                                  key={`${room.id}-${resident.resident_id}-${resident.stay_status}`}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-medium text-slate-900">
                                      {resident.name}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                      Resident #{resident.resident_id}
                                    </p>
                                  </div>

                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                      stayStyles[resident.stay_status] ||
                                      "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {stayLabels[resident.stay_status] ||
                                      resident.stay_status}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                );
              })}
            </table>
          </div>
        </div>
      )}

      {!error && (
        <nav
          aria-label="Occupancy report pages"
          className="flex items-center justify-between gap-3"
        >
          <button
            type="button"
            disabled={loading || page === 1}
            onClick={() => changePage(page - 1)}
            className="button-secondary"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">Page {page}</span>

          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => changePage(page + 1)}
            className="button-secondary"
          >
            Next
          </button>
        </nav>
      )}

      <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-800">
          What do these numbers mean?
        </summary>

        <ul className="mt-3 space-y-2 leading-6">
          <li>
            <strong>Checked in:</strong> residents who have moved in.
          </li>
          <li>
            <strong>Reserved:</strong> confirmed stays awaiting check-in.
          </li>
          <li>
            <strong>Holds:</strong> spaces temporarily allocated while residents
            await payment, before their deadlines expire.
          </li>
          <li>
            <strong>Available:</strong> capacity minus checked-in residents,
            reservations and unexpired holds. Inactive rooms show zero available
            spaces.
          </li>
        </ul>

        <p className="mt-3 leading-6">
          This report is a snapshot. Use Refresh after changing a stay or when a
          payment hold expires.
        </p>
      </details>
    </section>
  );
}