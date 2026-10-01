import { useEffect, useState } from "react";
import { Link } from "react-router";

import LoadingMessage from "../components/common/LoadingMessage";
import { fetchWithTimeout } from "../services/fetchWithTimeout";
import { getRoomCoverImage } from "../utils/roomImages";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const roomTypes = {
  1: "Single occupancy",
  2: "Twin sharing",
  3: "Triple sharing",
  4: "Quad sharing",
};

const inputStyle =
  "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#245747]/20 " +
  "bg-white px-3 py-2.5 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] focus:border-[#245747] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747]";

const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "bg-[#245747] px-4 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const paginationButton =
  "min-h-11 rounded-xl border border-[#245747]/20 bg-white " +
  "px-4 py-2 text-sm font-medium text-[#173F35] " +
  "transition-colors hover:bg-[#E8EDE4] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Price unavailable";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? currencyFormatter.format(amount)
    : "Price unavailable";
}

function RoomPhoto({ room }) {
  const src = getRoomCoverImage(room);
  const [failedSource, setFailedSource] = useState(null);

  const showPhoto = Boolean(src) && failedSource !== src;
  const hasSpace = Number(room.available_spaces) > 0;

  return (
    <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-gradient-to-br from-[#E8EDE4] to-[#D6E3D8]">
      {showPhoto ? (
        <img
          src={src}
          alt={`Illustrative ${roomTypes[room.capacity] || "hostel room"} photo`}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(src)}
          className="absolute inset-0 h-full w-full object-cover
            motion-safe:transition-transform motion-safe:duration-500
            motion-safe:ease-out motion-safe:group-hover:scale-105
            motion-safe:group-focus-within:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <span className="font-heading text-2xl font-bold text-[#173F35]">
            {room.room_number}
          </span>

          <span className="mt-2 text-xs text-[#57534E]">
            Photo unavailable
          </span>
        </div>
      )}

      <span
        className={`absolute left-3 top-3 inline-flex items-center gap-1.5
          rounded-full px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
            hasSpace
              ? "bg-[#FAF7F2] text-[#173F35]"
              : "bg-[#292524] text-white"
          }`}
      >
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${
            hasSpace ? "bg-[#39735D]" : "bg-[#D6D3D1]"
          }`}
        />

        {hasSpace ? "Spaces available" : "Currently full"}
      </span>

      {showPhoto && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-1 text-[10px] text-white">
          Illustrative photo
        </span>
      )}
    </div>
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ordering, setOrdering] = useState("room_number");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: "6",
          ordering: `${ordering},id`,
        });

        if (search) {
          params.set("search", search);
        }

        if (capacity) {
          params.set("capacity", capacity);
        }

        const response = await fetchWithTimeout(
          `${API_BASE_URL}/rooms/?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "Too many requests. Please wait a moment before trying again."
              : "Could not load rooms. Please try again.",
          );
        }

        const data = await response.json();

        if (
          !Array.isArray(data?.results) ||
          !Number.isInteger(data.count) ||
          data.count < 0
        ) {
          throw new Error("The server returned an unexpected room list.");
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
              ? "Could not connect to the server. Please check your connection and try again."
              : err.message || "Could not load rooms.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRooms();

    return () => controller.abort();
  }, [page, search, capacity, ordering, retry]);

  function handleSearch(event) {
    event.preventDefault();

    setLoading(true);
    setPage(1);
    setSearch(searchInput.trim());
    setRetry((value) => value + 1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setCapacity("");
    setOrdering("room_number");
    setPage(1);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function changeCapacity(event) {
    setCapacity(event.target.value);
    setPage(1);
    setLoading(true);
  }

  function changeOrdering(event) {
    setOrdering(event.target.value);
    setPage(1);
    setLoading(true);
  }

  function changePage(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  function retryLoading() {
    setLoading(true);
    setRetry((value) => value + 1);
  }

  const hasFilters =
    Boolean(search) ||
    Boolean(capacity) ||
    ordering !== "room_number";

  return (
    <section className="min-w-0">
      {/* Introduction and glass filter panel */}
      <div className="relative isolate rounded-3xl border border-[#245747]/10 bg-gradient-to-br from-[#FAF7F2] via-[#F1F3E9] to-[#DCE9DD] p-5 sm:p-7">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#965038]">
            Find your space
          </p>

          <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-[#173F35] sm:text-3xl">
            A room that feels like you.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#57534E]">
            A space of your own or a room to share. Compare monthly
            rent, explore your options and see what’s available.
          </p>
        </header>

        <form
          onSubmit={handleSearch}
          className="mt-6 rounded-2xl border border-white/80
            bg-white/80 p-4 shadow-[0_6px_24px_rgba(23,63,53,0.04)]
            backdrop-blur-md sm:p-5"
        >
          <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label
                htmlFor="room-search"
                className="block text-xs font-semibold text-[#173F35]"
              >
                Room number
              </label>

              <input
                id="room-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="For example: A101"
                className={inputStyle}
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="room-capacity"
                className="block text-xs font-semibold text-[#173F35]"
              >
                Room type
              </label>

              <select
                id="room-capacity"
                value={capacity}
                onChange={changeCapacity}
                className={inputStyle}
              >
                <option value="">All room types</option>
                <option value="1">Single occupancy</option>
                <option value="2">Twin sharing</option>
                <option value="3">Triple sharing</option>
                <option value="4">Quad sharing</option>
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="room-ordering"
                className="block text-xs font-semibold text-[#173F35]"
              >
                Sort by
              </label>

              <select
                id="room-ordering"
                value={ordering}
                onChange={changeOrdering}
                className={inputStyle}
              >
                <option value="room_number">Room number: A–Z</option>
                <option value="-room_number">Room number: Z–A</option>
                <option value="monthly_price">Price: low to high</option>
                <option value="-monthly_price">Price: high to low</option>
                <option value="capacity">Capacity: low to high</option>
                <option value="-capacity">Capacity: high to low</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={primaryButton}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>

              Search rooms
            </button>
          </div>
        </form>
      </div>

      {/* Results heading */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-lg font-semibold text-[#173F35]">
            {hasFilters ? "Matching rooms" : "Find your next room"}
          </h2>

          {!loading && !error && (
            <span
              role="status"
              className="rounded-full bg-[#E8EDE4] px-3 py-1 text-xs font-medium text-[#245747]"
            >
              {count} {count === 1 ? "room" : "rooms"}
            </span>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            disabled={loading}
            className="min-h-11 rounded-lg px-2 text-sm font-semibold
              text-[#245747] underline-offset-4 hover:underline
              disabled:opacity-50"
          >
            Reset filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-5">
          <LoadingMessage label="Loading rooms…" compact />

          <div
            aria-hidden="true"
            className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border
                  border-[#245747]/10 bg-white motion-safe:animate-pulse"
              >
                <div className="aspect-[16/10] bg-[#E3EADF]" />

                <div className="space-y-3 p-5">
                  <div className="h-3 w-24 rounded bg-[#E8EDE4]" />
                  <div className="h-5 w-36 rounded bg-[#E8EDE4]" />
                  <div className="h-3 w-full rounded bg-[#F0F2EB]" />
                  <div className="h-3 w-3/4 rounded bg-[#F0F2EB]" />
                  <div className="mt-5 h-11 rounded-xl bg-[#E8EDE4]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={retryLoading}
            className="mt-3 min-h-11 font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#245747]/25 bg-[#FAF7F2] px-5 py-12 text-center">
          <h3 className="font-heading text-base font-semibold text-[#173F35]">
            {hasFilters ? "No matching rooms" : "No rooms listed yet"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#57534E]">
            {hasFilters
              ? "Try another room number or choose a different room type."
              : "Available room listings will appear here."}
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className={`mt-5 ${primaryButton}`}
            >
              Show all rooms
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid auto-rows-fr items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="group flex min-w-0 flex-col overflow-hidden
                rounded-2xl border border-[#245747]/15 bg-white
                shadow-[0_3px_12px_rgba(23,63,53,0.04)]
                hover:border-[#245747]/40
                hover:shadow-[0_14px_32px_rgba(23,63,53,0.12)]
                focus-within:border-[#245747]/50
                focus-within:shadow-[0_14px_32px_rgba(23,63,53,0.12)]
                motion-safe:transition-[transform,box-shadow,border-color]
                motion-safe:duration-300 motion-safe:ease-out
                motion-safe:hover:-translate-y-1
                motion-safe:focus-within:-translate-y-1"
            >
              <RoomPhoto room={room} />

              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <p className="text-xs font-semibold text-[#965038]">
                  {roomTypes[room.capacity] ||
                    `${room.capacity}-person room`}
                </p>

                <h3 className="mt-1.5 break-words font-heading text-base font-bold text-[#173F35]">
                  Room {room.room_number}
                </h3>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#57534E]">
                  {room.description ||
                    "View this room for accommodation and reservation details."}
                </p>

                <div className="mt-auto pt-4">
                  <div className="border-t border-[#245747]/10 pt-4">
                    <p className="break-words text-lg font-bold tracking-tight text-[#173F35]">
                      {formatPrice(room.monthly_price)}
                    </p>

                    <p className="mt-1 text-xs text-[#78716C]">
                      Per resident, per month
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
                      <span>Capacity: {room.capacity}</span>

                      <span
                        className={
                          Number(room.available_spaces) > 0
                            ? "font-semibold text-[#245747]"
                            : "font-medium text-[#78716C]"
                        }
                      >
                        {room.available_spaces}{" "}
                        {Number(room.available_spaces) === 1
                          ? "space"
                          : "spaces"}{" "}
                        available
                      </span>
                    </div>

                    <Link
                      to={`/rooms/${room.id}`}
                      aria-label={`View details for room ${room.room_number}`}
                      className={`mt-4 w-full ${primaryButton}`}
                    >
                      View room
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Room pages"
        className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className={paginationButton}
        >
          Previous
        </button>

        <span
          aria-current="page"
          className="text-sm text-[#57534E]"
        >
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={paginationButton}
        >
          Next
        </button>
      </nav>
    </section>
  );
}