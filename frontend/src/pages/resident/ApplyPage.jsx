import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { apiRequest } from "../../services/api";
import { createApplication } from "../../services/accommodationService";
import LoadingMessage from "../../components/common/LoadingMessage";

function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ApplyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);

  const [moveInDate, setMoveInDate] = useState("");
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
        const data = await apiRequest(`/rooms/${id}/`, {
          auth: false,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setRoom(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error.status === 404
              ? "This room could not be found or is no longer listed."
              : "Could not load the room. Please try again."
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

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    if (!moveInDate || moveInDate < getToday()) {
      setSubmitError("Choose today or a future move-in date.");
      return;
    }

    setSubmitting(true);

    try {
      await createApplication(id, moveInDate);

      navigate("/my-applications", { replace: true });
    } catch (error) {
      if (error.status === 400 && error.data) {
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
        setSubmitError(error.message);
      } else if (error.status === 429) {
        setSubmitError("Too many requests. Please wait before trying again.");
      } else {
        setNeedsChecking(true);
        setSubmitError(
          "We couldn’t confirm whether your application was saved. Check My applications before submitting again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingMessage label="Loading room information…" />;
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 p-6 text-red-800"
      >
        <p>{loadError}</p>

        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mt-4 font-semibold underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!room) return null;

  return (
    <section className="mx-auto max-w-2xl">
      <Link
        to={`/rooms/${id}`}
        className="text-sm font-semibold text-blue-700 hover:underline"
      >
        ← Back to room details
      </Link>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
          Your accommodation
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Apply for Room {room.room_number}
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Select your preferred move-in date. Hostel staff will review
          your application.
        </p>

        <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Monthly rent per resident</dt>
            <dd className="mt-2 font-bold text-slate-900">
              {new Intl.NumberFormat("en-KE", {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0,
              }).format(Number(room.monthly_price))}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-slate-500">Current available spaces</dt>
            <dd className="mt-2 font-bold text-slate-900">
              {room.available_spaces}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          Submitting an application does not reserve a space. Availability
          is checked again when staff approve your application.
        </p>

        {submitError && (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          >
            <p>{submitError}</p>

            {needsChecking && (
              <Link
                to="/my-applications"
                className="mt-3 inline-block font-semibold underline"
              >
                Check My applications
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7">
          <label
            htmlFor="move-in-date"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Preferred move-in date
          </label>

          <input
            id="move-in-date"
            type="date"
            min={getToday()}
            value={moveInDate}
            onChange={(event) => setMoveInDate(event.target.value)}
            required
            disabled={submitting || needsChecking}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={submitting || needsChecking}
            className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting application…" : "Submit application"}
          </button>
        </form>
      </div>
    </section>
  );
}