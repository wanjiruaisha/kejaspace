import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/rooms/?page=${page}&page_size=6`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Could not load rooms. Server returned ${response.status}.`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.results)) {
          throw new Error("The server returned an unexpected room list.");
        }

        setRooms(data.results);
        setHasNext(Boolean(data.next));
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection and try again."
              : err.message
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
  }, [page, retry]);

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
        Find your space
      </p>

      <h1 className="mt-2 text-3xl font-bold">Our rooms</h1>

      <p className="mt-3 text-slate-600">
        Explore room options and check available spaces.
      </p>

      {loading ? (
        <p role="status" className="mt-8 text-slate-600">
          Loading rooms…
        </p>
      ) : error ? (
        <div role="alert" className="mt-8 rounded-xl bg-red-50 p-5">
          <p className="text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-3 font-semibold text-red-800 underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {rooms.length === 0 ? (
            <p className="mt-8 rounded-xl bg-white p-6 text-slate-600">
              No rooms to show right now.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <article
                  key={room.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h2 className="text-xl font-bold">
                    Room {room.room_number}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {room.description || "No description available."}
                  </p>

                  <p className="mt-5 text-2xl font-bold text-blue-700">
                    KES{" "}
                    {Number(room.monthly_price).toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>

                  <p className="text-sm text-slate-500">
                    per resident / month
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      Capacity: {room.capacity}
                    </span>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
                      {room.available_spaces > 0
                        ? `${room.available_spaces} spaces available`
                        : "Currently full"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => setPage((value) => value - 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span>Page {page}</span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => setPage((value) => value + 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}