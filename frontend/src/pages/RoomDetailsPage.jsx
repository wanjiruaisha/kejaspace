import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { fetchWithTimeout } from "../services/fetchWithTimeout";
import useAuth from "../hooks/useAuth";
import { getRoomImages } from "../utils/roomImages";

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

function RoomGallery({ capacity, roomNumber }) {
  const images = getRoomImages(capacity);

  const [selectedImage, setSelectedImage] = useState(images[0] || null);
  const [failedImages, setFailedImages] = useState([]);

  const availableImages = images.filter(
    (image) => !failedImages.includes(image),
  );

  const activeImage = availableImages.includes(selectedImage)
    ? selectedImage
    : availableImages[0];

  const roomType = roomTypes[capacity] || `${capacity}-person room`;

  function handleImageError(image) {
    setFailedImages((previous) =>
      previous.includes(image) ? previous : [...previous, image],
    );
  }

  if (!activeImage) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-blue-50 p-6 text-center">
        <div>
          <p className="text-3xl font-bold text-blue-700">
            Room {roomNumber}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Room photos are currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  const activeIndex = availableImages.indexOf(activeImage);

  return (
    <div>
      <figure>
        <div className="relative overflow-hidden rounded-2xl bg-slate-100">
          <img
            key={activeImage}
            src={activeImage}
            alt={`${roomType} example, photo ${images.indexOf(activeImage) + 1}`}
            onError={() => handleImageError(activeImage)}
            className="aspect-[4/3] w-full object-cover"
          />

          <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white">
            {activeIndex + 1} / {availableImages.length}
          </span>
        </div>

        <figcaption className="mt-3 text-xs leading-6 text-slate-500">
          Illustrative photos of this room type. Individual rooms may differ.
        </figcaption>
      </figure>

      {availableImages.length > 1 && (
        <div
          role="group"
          aria-label="Choose a room photo"
          className="mt-4 flex flex-wrap gap-3"
        >
          {availableImages.map((image) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedImage(image)}
              aria-label={`Show room photo ${images.indexOf(image) + 1}`}
              aria-pressed={activeImage === image}
              className={`w-20 overflow-hidden rounded-xl border-2 p-1 transition sm:w-24 ${
                activeImage === image
                  ? "border-blue-700 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-400"
              }`}
            >
              <img
                src={image}
                alt=""
                loading="lazy"
                onError={() => handleImageError(image)}
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
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
              : err.message,
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
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              {roomTypes[room.capacity] ||
                `${room.capacity}-person room`}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Room {room.room_number}
              </h1>

              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  room.available_spaces > 0
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {room.available_spaces > 0
                  ? "Spaces available"
                  : "Currently full"}
              </span>
            </div>

            <div className="mt-7">
              <RoomGallery
                key={`${room.id}-${room.capacity}`}
                capacity={room.capacity}
                roomNumber={room.room_number}
              />
            </div>

            <h2 className="mt-9 text-lg font-bold text-slate-900">
              About this room
            </h2>

            <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
              {room.description || "No description has been added yet."}
            </p>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="text-sm text-slate-500">
                  Room capacity
                </dt>

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

          <aside className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7">
            <h2 className="text-sm font-semibold text-slate-500">
              Monthly rent
            </h2>

            <p className="mt-3 break-words text-3xl font-bold tracking-tight text-blue-700">
              {currency.format(Number(room.monthly_price))}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Per resident
            </p>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-900">
                How the reservation works
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Submit an accommodation application for staff review.
                After approval, pay the first month’s full rent before
                your payment deadline to confirm your reservation.
              </p>

              {!authLoading && (
                <div className="mt-6">
                  {isResident ? (
                    <Link
                      to={`/rooms/${room.id}/apply`}
                      className="block rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Apply for this room
                    </Link>
                  ) : !user ? (
                    <>
                      <Link
                        to="/login"
                        className="block rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Log in to apply
                      </Link>

                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        After logging in, return to this room to submit
                        your application.
                      </p>
                    </>
                  ) : null}
                </div>
              )}

              <p className="mt-5 text-xs leading-6 text-slate-500">
                Availability is checked again when staff review your
                application. Applying does not guarantee a space.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}