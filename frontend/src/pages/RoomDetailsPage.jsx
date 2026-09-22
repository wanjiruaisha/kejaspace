import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { fetchWithTimeout } from "../services/fetchWithTimeout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function RoomDetailsPage() {
  const { id } = useParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoom() {
      setLoading(true);
      setError("");
      setRoom(null);

      try {
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/rooms/${id}/`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This room could not be found or is no longer listed."
              : "Could not load this room. Please try again."
          );
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setRoom(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect to the server. Please try again."
              : err.message
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRoom();

    return () => controller.abort();
  }, [id, retry]);

  return (
    <section>
      <Link
        to="/rooms"
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← Back to rooms
      </Link>

      {loading ? (
        <p role="status" className="mt-8 text-slate-600">
          Loading room details…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl bg-red-50 p-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-4 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : room ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Your next space
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              Room {room.room_number}
            </h1>

            <span
              className={`mt-5 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                room.available_spaces > 0
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {room.available_spaces > 0
                ? "Spaces available"
                : "Currently full"}
            </span>

            <h2 className="mt-9 text-lg font-bold text-slate-900">
              About this room
            </h2>

            <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
              {room.description || "No description has been added yet."}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="text-sm text-slate-500">Room capacity</dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">
                  {room.capacity}
                </dd>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="text-sm text-slate-500">
                  Available spaces
                </dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">
                  {room.available_spaces}
                </dd>
              </div>
            </dl>
          </article>

          <aside className="self-start rounded-3xl border border-slate-200 bg-white p-7">
            <h2 className="text-sm font-semibold text-slate-500">
              Monthly rent
            </h2>

            <p className="mt-3 text-3xl font-bold tracking-tight text-blue-700">
              {new Intl.NumberFormat("en-KE", {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0,
              }).format(Number(room.monthly_price))}
            </p>

            <p className="mt-2 text-sm text-slate-500">Per resident</p>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900">
                How the reservation works
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Submit an accommodation application for staff review.
                After approval, pay the first month’s full rent before
                your payment deadline to confirm your reservation.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}