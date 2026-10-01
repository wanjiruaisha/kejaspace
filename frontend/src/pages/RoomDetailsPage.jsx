import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { fetchWithTimeout } from "../services/fetchWithTimeout";
import useAuth from "../hooks/useAuth";
import { getRoomCoverImage } from "../utils/roomImages";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const roomTypes = {
  1: "Single occupancy",
  2: "Twin sharing",
  3: "Triple sharing",
  4: "Quad sharing",
};

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const buttonStyle =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 " +
  "rounded-xl bg-[#245747] px-4 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747]";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Price unavailable";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? currency.format(amount)
    : "Price unavailable";
}

function RoomPhoto({ room }) {
  const image = getRoomCoverImage(room);
  const [failedSource, setFailedSource] = useState(null);

  const showImage = Boolean(image) && failedSource !== image;

  return (
    <figure>
      <div className="overflow-hidden rounded-xl border border-[#245747]/10 bg-[#E8EDE4]">
        {showImage ? (
          <img
            src={image}
            alt={`Illustrative photo for room ${room.room_number}`}
            decoding="async"
            onError={() => setFailedSource(image)}
            className="h-56 w-full object-cover sm:h-64 lg:h-72"
          />
        ) : (
          <div className="flex h-56 items-center justify-center p-5 text-center sm:h-64 lg:h-72">
            <div>
              <p className="font-heading text-xl font-bold text-[#173F35]">
                Room {room.room_number}
              </p>

              <p className="mt-2 text-sm text-[#57534E]">
                Photo unavailable.
              </p>
            </div>
          </div>
        )}
      </div>

      {showImage && (
        <figcaption className="mt-2 text-xs leading-5 text-[#78716C]">
          Illustrative photo. Actual room appearance may differ.
        </figcaption>
      )}
    </figure>
  );
}

export default function RoomDetailsPage() {
  const { id } = useParams();
  const { user, authLoading } = useAuth();

  const isResident =
    Boolean(user) && !user.is_staff && !user.is_superuser;

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
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This room could not be found or is no longer listed."
              : response.status === 429
                ? "Too many requests. Please wait before trying again."
                : "Could not load this room. Please try again.",
          );
        }

        const data = await response.json();

        if (!data?.id) {
          throw new Error("The server returned unexpected room details.");
        }

        if (!controller.signal.aborted) {
          setRoom(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect to the server. Please try again."
              : err.message || "Could not load this room.",
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
    <section className="mx-auto w-full min-w-0 max-w-5xl">
      <Link
        to="/rooms"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg
          text-sm font-semibold text-[#245747] underline-offset-4
          hover:underline focus-visible:outline-2
          focus-visible:outline-offset-4 focus-visible:outline-[#245747]"
      >
        <span aria-hidden="true">←</span>
        Back to rooms
      </Link>

      {loading ? (
        <div className="mt-4">
          <p role="status" className="text-sm text-[#57534E]">
            Loading room details…
          </p>

          <div
            aria-hidden="true"
            className="mt-4 grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]"
          >
            <div className="h-64 rounded-2xl bg-[#E8EDE4] motion-safe:animate-pulse" />
            <div className="h-56 rounded-2xl bg-[#E8EDE4] motion-safe:animate-pulse" />
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-2 min-h-11 font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : room ? (
        <>
          {/* Compact room heading */}
          <header className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#245747]/15 pb-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#965038]">
                {roomTypes[room.capacity] ||
                  `${room.capacity}-person room`}
              </p>

              <h1 className="mt-1 break-words font-heading text-2xl font-bold tracking-tight text-[#173F35]">
                Room {room.room_number}
              </h1>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full
                px-3 py-1.5 text-xs font-semibold ${
                  Number(room.available_spaces) > 0
                    ? "bg-[#E8EDE4] text-[#245747]"
                    : "bg-stone-100 text-stone-600"
                }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${
                  Number(room.available_spaces) > 0
                    ? "bg-[#39735D]"
                    : "bg-stone-400"
                }`}
              />

              {Number(room.available_spaces) > 0
                ? "Spaces available"
                : "Currently full"}
            </span>
          </header>

          <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
            {/* Photo and room information */}
            <article className="min-w-0 rounded-2xl border border-[#245747]/10 bg-white p-4 sm:p-5">
              <RoomPhoto key={room.id} room={room} />

              <div className="mt-5">
                <h2 className="font-heading text-sm font-bold text-[#173F35]">
                  About this room
                </h2>

                <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[#57534E]">
                  {room.description || "No description has been added yet."}
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#245747]/10 pt-4">
                <div>
                  <dt className="text-xs text-[#57534E]">
                    Room capacity
                  </dt>

                  <dd className="mt-1 text-base font-semibold text-[#173F35]">
                    {room.capacity}{" "}
                    <span className="text-xs font-normal text-[#57534E]">
                      {Number(room.capacity) === 1 ? "person" : "people"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-[#57534E]">
                    Available spaces
                  </dt>

                  <dd className="mt-1 text-base font-semibold text-[#173F35]">
                    {room.available_spaces}
                  </dd>
                </div>
              </dl>
            </article>

            {/* Compact rent and application card */}
            <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#245747]/15 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#D6E7DD] p-4 sm:p-5">
                <h2 className="text-xs font-semibold text-[#245747]">
                  Monthly rent
                </h2>

                <p className="mt-2 break-words font-heading text-2xl font-bold tracking-tight text-[#173F35]">
                  {formatPrice(room.monthly_price)}
                </p>

                <p className="mt-1 text-xs text-[#57534E]">
                  Per resident, per month
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <h3 className="font-heading text-sm font-bold text-[#173F35]">
                  How to reserve
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#57534E]">
                  Submit your application for staff review. After approval,
                  pay the first month’s full rent before the deadline to
                  confirm your reservation.
                </p>

                <div className="mt-4">
                  {authLoading ? (
                    <p role="status" className="text-sm text-[#57534E]">
                      Checking your session…
                    </p>
                  ) : isResident ? (
                    <Link
                      to={`/rooms/${room.id}/apply`}
                      className={buttonStyle}
                    >
                      Apply for this room
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : !user ? (
                    <>
                      <Link to="/login" className={buttonStyle}>
                        Log in to apply
                        <span aria-hidden="true">→</span>
                      </Link>

                      <p className="mt-2 text-xs leading-5 text-[#57534E]">
                        After logging in, return to this room to submit
                        your application.
                      </p>
                    </>
                  ) : null}
                </div>

                <p className="mt-4 border-t border-[#245747]/10 pt-3 text-xs leading-5 text-[#78716C]">
                  Staff check availability when reviewing your application.
                  Applying does not guarantee a space.
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}