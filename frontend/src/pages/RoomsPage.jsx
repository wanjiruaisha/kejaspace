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

const cardColors = {
  1: "from-blue-100 to-slate-100",
  2: "from-teal-100 to-blue-100",
  3: "from-indigo-100 to-slate-100",
  4: "from-amber-100 to-orange-100",
};

const inputStyle =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700";

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
    <div
      className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${
        cardColors[room.capacity] || "from-slate-100 to-slate-200"
      }`}
    >
      {showPhoto ? (
        <img
          src={src}
          alt={`${roomTypes[room.capacity] || "Hostel room"} illustration`}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(src)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-4">
          <span className="text-3xl font-bold tracking-tight text-slate-700">
            {room.room_number}
          </span>

          <span className="mt-2 text-xs text-slate-600">
            Photo unavailable
          </span>
        </div>
      )}

      <span
        className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
          hasSpace
            ? "bg-white text-emerald-700"
            : "bg-slate-900 text-white"
        }`}
      >
        {hasSpace ? "Spaces available" : "Currently full"}
      </span>

      {showPhoto && (
        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
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
    <section>
      <header className="rounded-2xl bg-slate-900 p-5 text-white sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
          Find your space
        </p>

        <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Explore our rooms
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Compare room types, monthly rent and available spaces to find
          a room that suits you.
        </p>
      </header>

      <form
        onSubmit={handleSearch}
        className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="room-search"
              className="block text-sm font-medium text-slate-700"
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

          <div>
            <label
              htmlFor="room-capacity"
              className="block text-sm font-medium text-slate-700"
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

          <div>
            <label
              htmlFor="room-ordering"
              className="block text-sm font-medium text-slate-700"
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
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search rooms
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            {hasFilters ? "Matching rooms" : "Our rooms"}
          </h2>

          {!loading && !error && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {count} {count === 1 ? "room" : "rooms"}
            </span>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            disabled={loading}
            className="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50"
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
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 rounded-2xl border border-slate-200 bg-slate-100 motion-safe:animate-pulse"
              />
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
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {hasFilters ? "No matching rooms" : "No rooms listed yet"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {hasFilters
              ? "Try another room number or choose a different room type."
              : "Available room listings will appear here."}
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 text-sm font-semibold text-blue-700 hover:underline"
            >
              Show all rooms
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <RoomPhoto room={room} />

              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <p className="text-xs font-medium text-blue-700">
                  {roomTypes[room.capacity] ||
                    `${room.capacity}-person room`}
                </p>

                <h3 className="mt-1.5 break-words font-heading text-base font-bold text-slate-900">
                  Room {room.room_number}
                </h3>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {room.description ||
                    "View this room for accommodation and reservation details."}
                </p>

                <div className="mt-auto pt-4">
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-lg font-bold tracking-tight text-slate-900">
                      {formatPrice(room.monthly_price)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Per resident, per month
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>
                        Capacity: {room.capacity}
                      </span>

                      <span
                        className={
                          Number(room.available_spaces) > 0
                            ? "font-medium text-emerald-700"
                            : "font-medium text-slate-500"
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
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
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
        className="mt-7 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span
          aria-current="page"
          className="text-sm text-slate-600"
        >
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}