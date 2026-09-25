import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchWithTimeout } from "../services/fetchWithTimeout";
import LoadingMessage from "../components/common/LoadingMessage";
import { getRoomImage } from "../utils/roomImages";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const roomTypes = {
  1: "Single occupancy",
  2: "Twin sharing",
  3: "Triple sharing",
  4: "Four-person sharing",
};

const cardColors = {
  1: "from-blue-100 to-indigo-50",
  2: "from-teal-100 to-cyan-50",
  3: "from-amber-100 to-orange-50",
  4: "from-violet-100 to-purple-50",
};

const controlStyle =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

      const params = new URLSearchParams({
        page: String(page),
        page_size: "6",
        ordering,
      });

      if (search) params.set("search", search);
      if (capacity) params.set("capacity", capacity);

      try {
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/rooms/?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "Too many requests. Please wait a moment before trying again."
              : `Rooms could not be loaded (${response.status}). Please try again.`,
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.results)) {
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
              ? "We couldn’t connect. Check your connection and try again."
              : err.message,
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
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCapacity("");
    setOrdering("room_number");
    setPage(1);
  }

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-7 py-12 text-white sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border-[45px] border-white/5"
        />

        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
            Make yourself at home
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            A space for your
            <span className="block text-blue-300">next chapter.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            From a space of your own to a room you share. Explore your options
            and find a stay that suits you.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label
            htmlFor="room-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Room number
          </label>

          <input
            id="room-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="For example, A101"
            className={controlStyle}
          />
        </div>

        <div>
          <label
            htmlFor="room-capacity"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Sharing preference
          </label>

          <select
            id="room-capacity"
            value={capacity}
            onChange={(event) => {
              setCapacity(event.target.value);
              setPage(1);
            }}
            className={controlStyle}
          >
            <option value="">All room sizes</option>
            <option value="1">Single occupancy</option>
            <option value="2">Twin sharing</option>
            <option value="3">Triple sharing</option>
            <option value="4">Four-person sharing</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="room-ordering"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Sort by
          </label>

          <select
            id="room-ordering"
            value={ordering}
            onChange={(event) => {
              setOrdering(event.target.value);
              setPage(1);
            }}
            className={controlStyle}
          >
            <option value="room_number">Room number</option>
            <option value="monthly_price">Price: low to high</option>
            <option value="-monthly_price">Price: high to low</option>
          </select>
        </div>

        <button
          type="submit"
          className="self-end rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Search rooms
        </button>
      </form>

      <div className="my-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Explore our rooms
          </h2>

          <p aria-live="polite" className="mt-1 text-sm text-slate-500">
            {loading
              ? "Finding rooms…"
              : error
                ? "Room listings are unavailable."
                : `${count} ${count === 1 ? "room" : "rooms"} found`}
          </p>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Reset filters
        </button>
      </div>

      {loading ? (
        <div role="status">
          <div className="mb-5">
            <LoadingMessage label="Loading rooms…" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className="h-80 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100 bg-red-50 p-8"
        >
          <p className="text-red-800">{error}</p>

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-4 font-semibold text-red-800 underline"
          >
            Try again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h3 className="text-xl font-bold text-slate-900">
            No matching rooms
          </h3>
          <p className="mt-2 text-slate-500">
            Try another room number or reset your filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <div
                className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-linear-to-br ${
                  cardColors[room.capacity] || "from-slate-100 to-blue-50"
                }`}
              >
                {/* Fallback label if the photo is missing or fails to load */}
                <span
                  aria-hidden="true"
                  className="text-6xl font-black tracking-tight text-slate-900/15"
                >
                  {room.room_number}
                </span>

                {getRoomImage(room.capacity) && (
                  <img
                    src={getRoomImage(room.capacity)}
                    alt={`Illustrative photo of a ${
                      roomTypes[room.capacity] || `${room.capacity}-person room`
                    }`}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <span
                  className={`absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm ${
                    room.available_spaces > 0
                      ? "text-emerald-800"
                      : "text-slate-600"
                  }`}
                >
                  {room.available_spaces > 0 ? "Available" : "Currently full"}
                </span>

                {getRoomImage(room.capacity) && (
                  <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/75 px-2.5 py-1 text-xs text-white">
                    Illustrative room photo
                  </span>
                )}
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  {roomTypes[room.capacity] || `${room.capacity}-person room`}
                </p>

                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  Room {room.room_number}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {room.description || "Contact management for room details."}
                </p>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {currency.format(Number(room.monthly_price))}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    per resident / month
                  </p>

                  <p className="mt-4 text-sm font-medium text-slate-600">
                    {room.available_spaces} of {room.capacity} spaces available
                  </p>
                  <Link
                    to={`/rooms/${room.id}`}
                    className="mt-5 block rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Room pages"
        className="mt-10 flex items-center justify-center gap-5"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => setPage((value) => value - 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">Page {page}</span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => setPage((value) => value + 1)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}
