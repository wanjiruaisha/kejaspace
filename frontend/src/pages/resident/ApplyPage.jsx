import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { apiRequest } from "../../services/api";
import { createApplication } from "../../services/accommodationService";
import LoadingMessage from "../../components/common/LoadingMessage";
import { getRoomCoverImage } from "../../utils/roomImages";

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

function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Price unavailable";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? currency.format(amount)
    : "Price unavailable";
}

function RoomSummary({ room }) {
  const image = getRoomCoverImage(room);
  const [failedSource, setFailedSource] = useState(null);

  const showImage = Boolean(image) && failedSource !== image;
  const hasSpace = Number(room.available_spaces) > 0;

  return (
    <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#245747]/15 bg-white">
      <figure>
        <div className="relative h-44 overflow-hidden bg-[#E8EDE4] sm:h-48">
          {showImage ? (
            <img
              src={image}
              alt={`Illustrative photo for room ${room.room_number}`}
              decoding="async"
              onError={() => setFailedSource(image)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <p className="font-heading text-lg font-bold text-[#173F35]">
                Room {room.room_number}
              </p>
            </div>
          )}

          <span
            className={`absolute left-3 top-3 rounded-full px-2.5
              py-1.5 text-xs font-semibold ${
                hasSpace
                  ? "bg-[#FAF7F2] text-[#245747]"
                  : "bg-stone-800 text-white"
              }`}
          >
            {hasSpace ? "Spaces available" : "Currently full"}
          </span>
        </div>

        {showImage && (
          <figcaption className="px-4 pt-2 text-[11px] leading-5 text-[#78716C]">
            Illustrative photo. Actual room appearance may differ.
          </figcaption>
        )}
      </figure>

      <div className="p-4">
        <p className="text-xs font-semibold text-[#965038]">
          {roomTypes[room.capacity] || `${room.capacity}-person room`}
        </p>

        <h2 className="mt-1.5 break-words font-heading text-lg font-bold text-[#173F35]">
          Room {room.room_number}
        </h2>

        <dl className="mt-4 space-y-3 border-t border-[#245747]/10 pt-4">
          <div>
            <dt className="text-xs text-[#57534E]">
              Monthly rent per resident
            </dt>

            <dd className="mt-1 break-words text-lg font-bold text-[#173F35]">
              {formatPrice(room.monthly_price)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-[#57534E]">Room capacity</dt>
            <dd className="text-sm font-semibold text-[#173F35]">
              {room.capacity}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-[#57534E]">Available spaces</dt>
            <dd className="text-sm font-semibold text-[#173F35]">
              {room.available_spaces}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

export default function ApplyPage() {
  const { id } = useParams();

  // Reset form state if the user opens another room's application page.
  return <ApplicationForm key={id} roomId={id} />;
}

function ApplicationForm({ roomId }) {
  const navigate = useNavigate();
  const submissionRef = useRef(false);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);

  const [moveInDate, setMoveInDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [needsChecking, setNeedsChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoom() {
      setLoading(true);
      setLoadError("");
      setRoom(null);

      try {
        const data = await apiRequest(`/rooms/${roomId}/`, {
          auth: false,
          signal: controller.signal,
        });

        if (!data?.id) {
          throw new Error("The server returned unexpected room details.");
        }

        if (!controller.signal.aborted) {
          setRoom(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error.status === 404
              ? "This room could not be found or is no longer listed."
              : error.status === 429
                ? "Too many requests. Please wait before trying again."
                : "Could not load the room. Please try again.",
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
  }, [roomId, retry]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submissionRef.current || needsChecking || !room) return;

    setSubmitError("");
    setDateError("");

    if (!moveInDate || moveInDate < getToday()) {
      setDateError("Choose today or a future move-in date.");
      return;
    }

    submissionRef.current = true;
    setSubmitting(true);

    try {
      await createApplication(roomId, moveInDate);

      navigate("/my-applications", { replace: true });
    } catch (error) {
      if (
        error.status === 400 &&
        error.data &&
        typeof error.data === "object" &&
        !Array.isArray(error.data)
      ) {
        const message = Object.entries(error.data)
          .map(([field, messages]) => {
            const text = Array.isArray(messages)
              ? messages.join(" ")
              : String(messages);

            if (field === "detail" || field === "non_field_errors") {
              return text;
            }

            return `${field.replaceAll("_", " ")}: ${text}`;
          })
          .join(" ");

        setSubmitError(message || "Please check your application details.");
      } else if (error.status === 401 || error.status === 403) {
        setSubmitError(
          error.message || "You don’t have permission to submit this application.",
        );
      } else if (error.status === 429) {
        setSubmitError("Too many requests. Please wait before trying again.");
      } else {
        setNeedsChecking(true);
        setSubmitError(
          "We couldn’t confirm whether your application was saved. Check My applications before submitting again.",
        );
      }
    } finally {
      submissionRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-4xl">
      <Link
        to={`/rooms/${roomId}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg
          text-sm font-semibold text-[#245747] underline-offset-4
          hover:underline focus-visible:outline-2
          focus-visible:outline-offset-4 focus-visible:outline-[#245747]"
      >
        <span aria-hidden="true">←</span>
        Back to room details
      </Link>

      {loading ? (
        <div className="mt-4">
          <LoadingMessage label="Loading room information…" />
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{loadError}</p>

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
          <header className="mt-3 mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#965038]">
              Your next chapter
            </p>

            <h1 className="mt-2 break-words font-heading text-2xl font-bold tracking-tight text-[#173F35]">
              Apply for Room {room.room_number}
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Found your space? Choose when you’d like to move in.
            </p>
          </header>

          <div className="grid items-start gap-5 md:grid-cols-[0.85fr_1.15fr]">
            <RoomSummary room={room} />

            <div className="min-w-0 overflow-hidden rounded-2xl border border-[#245747]/15 bg-white">
              <div className="bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-4 sm:p-5">
                <h2 className="font-heading text-base font-semibold text-[#173F35]">
                  Plan your move
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#57534E]">
                  Hostel staff will review your application and check
                  whether a space can be allocated.
                </p>
              </div>

              <div className="p-4 sm:p-5">
                {submitError && (
                  <div
                    id="application-error"
                    role="alert"
                    className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                  >
                    <p>{submitError}</p>

                    {needsChecking && (
                      <Link
                        to="/my-applications"
                        className="mt-2 inline-flex min-h-11 items-center
                          font-semibold underline underline-offset-4"
                      >
                        Check My applications
                        <span aria-hidden="true" className="ml-2">
                          →
                        </span>
                      </Link>
                    )}
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  aria-busy={submitting}
                  aria-describedby={
                    submitError ? "application-error" : undefined
                  }
                >
                  <label
                    htmlFor="move-in-date"
                    className="block text-sm font-semibold text-[#173F35]"
                  >
                    Preferred move-in date
                  </label>

                  <p
                    id="move-in-hint"
                    className="mt-1 text-xs leading-5 text-[#57534E]"
                  >
                    Choose today or a future date.
                  </p>

                  <input
                    id="move-in-date"
                    name="move_in_date"
                    type="date"
                    min={getToday()}
                    value={moveInDate}
                    onChange={(event) => {
                      setMoveInDate(event.target.value);
                      setDateError("");
                    }}
                    required
                    disabled={submitting || needsChecking}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={
                      dateError
                        ? "move-in-hint move-in-error"
                        : "move-in-hint"
                    }
                    className={`mt-2 min-h-11 w-full min-w-0
                      rounded-xl border bg-white px-3 py-3
                      text-sm text-[#173F35]
                      focus-visible:outline-2 focus-visible:outline-offset-2
                      focus-visible:outline-[#245747]
                      disabled:cursor-not-allowed disabled:opacity-60 ${
                        dateError
                          ? "border-red-400"
                          : "border-[#245747]/25"
                      }`}
                  />

                  {dateError && (
                    <p
                      id="move-in-error"
                      role="alert"
                      className="mt-2 text-xs leading-5 text-red-800"
                    >
                      {dateError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || needsChecking}
                    className="mt-5 inline-flex min-h-11 w-full
                      items-center justify-center gap-2 rounded-xl
                      bg-[#245747] px-4 py-3 text-sm font-semibold
                      text-white transition-colors hover:bg-[#173F35]
                      focus-visible:outline-2 focus-visible:outline-offset-4
                      focus-visible:outline-[#245747]
                      disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting application…"
                      : "Submit application"}

                    {!submitting && <span aria-hidden="true">→</span>}
                  </button>
                </form>

                <div className="mt-5 border-t border-[#245747]/10 pt-4">
                  <h3 className="text-xs font-semibold text-[#173F35]">
                    What happens next?
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-[#57534E]">
                    Follow the decision in My applications. Submitting
                    does not reserve a space. After approval, the first
                    month’s full rent must be paid and confirmed before
                    the payment deadline.
                  </p>

                  <Link
                    to="/my-applications"
                    className="mt-2 inline-flex min-h-11 items-center
                      text-xs font-semibold text-[#245747]
                      underline-offset-4 hover:underline"
                  >
                    View my applications
                    <span aria-hidden="true" className="ml-2">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}