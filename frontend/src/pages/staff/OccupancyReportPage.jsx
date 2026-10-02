import { useEffect, useState } from "react";

import { getOccupancyReport } from "../../services/reportService";

const stayLabels = {
  checked_in: "Checked in",
  reserved: "Reserved",
  awaiting_payment: "Awaiting payment",
};

const stayStyles = {
  checked_in: "bg-emerald-50 text-emerald-800",
  reserved: "bg-[#E8EDE4] text-[#245747]",
  awaiting_payment: "bg-amber-50 text-amber-800",
};

const buttonStyle =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "border border-[#245747]/20 bg-white px-4 py-2 text-sm font-semibold " +
  "text-[#245747] transition-colors hover:bg-[#EDF3E8] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const inputStyle =
  "mt-2 min-h-11 w-full rounded-xl border border-[#245747]/20 " +
  "bg-white px-3.5 py-2.5 text-sm text-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] disabled:opacity-60";

function RoomStatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "bg-stone-100 text-stone-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RoomFigures({ room }) {
  const figures = [
    { label: "Capacity", value: room.capacity },
    { label: "Checked in", value: room.checked_in },
    { label: "Reserved", value: room.reserved },
    { label: "Payment holds", value: room.payment_holds },
    { label: "Available", value: room.available_spaces, highlighted: true },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {figures.map((figure) => (
        <div
          key={figure.label}
          className={
            figure.highlighted
              ? "rounded-xl bg-[#EDF3E8] px-3 py-2.5"
              : "px-3 py-2.5"
          }
        >
          <dt className="text-xs leading-5 text-[#57534E]">
            {figure.label}
          </dt>

          <dd className="mt-1 text-lg font-semibold tabular-nums text-[#173F35]">
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
            typeof room.is_active === "boolean" &&
            Array.isArray(room.residents) &&
            [
              room.capacity,
              room.checked_in,
              room.reserved,
              room.payment_holds,
              room.available_spaces,
            ].every((value) => Number.isInteger(value) && value >= 0) &&
            room.residents.every(
              (resident) =>
                resident &&
                resident.resident_id != null &&
                typeof resident.stay_status === "string",
            ),
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
    if (loading) return;

    setExpandedRoomId(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changeFilter(event) {
    if (loading) return;

    setActive(event.target.value);
    setPage(1);
    setExpandedRoomId(null);
    setLoading(true);
  }

  function changePage(nextPage) {
    if (loading || nextPage < 1 || nextPage === page) return;

    setExpandedRoomId(null);
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
      {/* Page header */}
      <header className="rounded-2xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
              Reports
            </p>

            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#173F35]">
              Room occupancy
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              See who has moved in, which spaces are reserved and what
              is still available.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className={buttonStyle}
          >
            {loading ? "Loading…" : "Refresh report"}
          </button>
        </div>
      </header>

      {/* Room-status filter */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#245747]/15 bg-white p-4">
        <div className="w-full sm:w-60">
          <label
            htmlFor="occupancy-active"
            className="block text-sm font-semibold text-[#173F35]"
          >
            Room status
          </label>

          <select
            id="occupancy-active"
            value={active}
            onChange={changeFilter}
            disabled={loading}
            className={inputStyle}
          >
            <option value="">All rooms</option>
            <option value="true">Active rooms</option>
            <option value="false">Inactive rooms</option>
          </select>
        </div>

        {!loading && !error && (
          <p role="status" className="text-sm text-[#57534E]">
            <span className="font-semibold text-[#173F35]">{count}</span>{" "}
            matching {count === 1 ? "room" : "rooms"}
            <span className="mt-1 block text-xs text-[#78716C]">
              {rooms.length} shown on this page
            </span>
          </p>
        )}
      </div>

      {/* Room report */}
      {loading ? (
        <div
          role="status"
          className="rounded-2xl border border-[#245747]/15 bg-white p-6 text-sm text-[#57534E]"
        >
          Loading the occupancy report…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={refreshReport}
              className="min-h-11 font-semibold underline"
            >
              Try again
            </button>

            {page > 1 && (
              <button
                type="button"
                onClick={() => changePage(1)}
                className="min-h-11 font-semibold underline"
              >
                Return to page 1
              </button>
            )}
          </div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#245747]/25 bg-white p-6 text-center">
          <h2 className="font-heading text-base font-semibold text-[#173F35]">
            No rooms found
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            No rooms on this page match the selected status.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => {
            const expanded = expandedRoomId === room.id;
            const residentsPanelId = `room-residents-${room.id}`;

            return (
              <li
                key={room.id}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  expanded
                    ? "border-[#245747]/40"
                    : "border-[#245747]/15"
                }`}
              >
                <article aria-labelledby={`room-heading-${room.id}`}>
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2
                          id={`room-heading-${room.id}`}
                          className="break-words font-heading text-base font-semibold text-[#173F35]"
                        >
                          Room {room.room_number}
                        </h2>

                        <RoomStatusBadge active={room.is_active} />
                      </div>

                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={residentsPanelId}
                        aria-label={`${
                          expanded ? "Hide" : "View"
                        } allocations for room ${room.room_number}`}
                        onClick={() =>
                          setExpandedRoomId((current) =>
                            current === room.id ? null : room.id,
                          )
                        }
                        className={buttonStyle}
                      >
                        {expanded ? "Hide allocations" : "View allocations"}
                        <span aria-hidden="true">
                          {expanded ? "−" : "+"}
                        </span>
                      </button>
                    </div>

                    <div className="mt-3 border-t border-[#245747]/10 pt-3">
                      <RoomFigures room={room} />
                    </div>

                    {!room.is_active && (
                      <p className="mt-3 text-xs leading-5 text-[#78716C]">
                        This room is inactive, so no spaces are shown as
                        available for new allocations.
                      </p>
                    )}
                  </div>

                  {/* Expanded allocation list */}
                  <div
                    id={residentsPanelId}
                    hidden={!expanded}
                    className="border-t border-[#245747]/10 bg-[#FAF7F2] p-4 sm:p-5"
                  >
                    <h3 className="text-sm font-semibold text-[#173F35]">
                      Current allocations
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[#78716C]">
                      Includes checked-in residents, reservations and
                      unexpired payment holds.
                    </p>

                    {room.residents.length === 0 ? (
                      <p className="mt-3 text-sm leading-6 text-[#57534E]">
                        No current residents, reservations or unexpired
                        payment holds for this room.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {room.residents.map((resident, index) => (
                          <li
                            key={`${room.id}-${resident.resident_id}-${resident.stay_status}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#245747]/10 bg-white px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold text-[#173F35]">
                                {resident.name ||
                                  `Resident #${resident.resident_id}`}
                              </p>

                              <p className="mt-1 text-xs text-[#78716C]">
                                Resident #{resident.resident_id}
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                stayStyles[resident.stay_status] ||
                                "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {stayLabels[resident.stay_status] ||
                                resident.stay_status.replaceAll("_", " ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {!error && (
        <nav
          aria-label="Occupancy report pages"
          className="flex items-center justify-between gap-3"
        >
          <button
            type="button"
            disabled={loading || page === 1}
            onClick={() => changePage(page - 1)}
            className={buttonStyle}
          >
            Previous
          </button>

          <span className="text-sm text-[#78716C]">Page {page}</span>

          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => changePage(page + 1)}
            className={buttonStyle}
          >
            Next
          </button>
        </nav>
      )}

      {/* Report explanation */}
      <details className="rounded-2xl border border-[#245747]/15 bg-white p-4 text-sm text-[#57534E]">
        <summary className="cursor-pointer rounded-lg font-semibold text-[#173F35] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#245747]">
          What do these numbers mean?
        </summary>

        <dl className="mt-4 grid gap-4 leading-6 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[#173F35]">Capacity</dt>
            <dd>The total number of residents the room can accommodate.</dd>
          </div>

          <div>
            <dt className="font-semibold text-[#173F35]">Checked in</dt>
            <dd>Residents who have moved in.</dd>
          </div>

          <div>
            <dt className="font-semibold text-[#173F35]">Reserved</dt>
            <dd>Confirmed stays awaiting check-in.</dd>
          </div>

          <div>
            <dt className="font-semibold text-[#173F35]">Payment holds</dt>
            <dd>
              Spaces temporarily allocated while residents await payment,
              before their deadlines expire.
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="font-semibold text-[#173F35]">Available</dt>
            <dd>
              Capacity minus checked-in residents, reservations and
              unexpired payment holds, with a minimum of zero.
              Inactive rooms show zero available spaces.
            </dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-[#245747]/10 pt-4 text-xs leading-6 text-[#78716C]">
          This report is a snapshot. Refresh after changing a stay or
          when a payment hold expires.
        </p>
      </details>
    </section>
  );
}