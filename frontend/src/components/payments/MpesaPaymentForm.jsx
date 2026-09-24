import { useRef, useState } from "react";

import {
  initiateMpesaPayment,
  verifyMpesaPayment,
} from "../../services/paymentService";

function readSavedAttempt(storageKey) {
  try {
    const saved = sessionStorage.getItem(storageKey);

    if (!saved) return null;

    const data = JSON.parse(saved);

    if (!data || typeof data.phase !== "string") {
      throw new Error("Invalid saved attempt.");
    }

    return data;
  } catch {
    return {
      phase: "unknown",
      attemptId: null,
      message:
        "Could not restore the previous payment request. Ask staff to check before starting another.",
    };
  }
}

function getErrorMessage(error) {
  if (typeof error.data?.detail === "string") {
    return error.data.detail;
  }

  if (error.data && typeof error.data === "object") {
    const messages = Object.entries(error.data)
      .filter(([key]) => key !== "attempt_id")
      .map(([key, value]) => {
        const text = Array.isArray(value)
          ? value.join(" ")
          : String(value);

        return `${key}: ${text}`;
      });

    if (messages.length) return messages.join(" ");
  }

  return error.message || "The request could not be completed.";
}

export default function MpesaPaymentForm({ chargeId, userId }) {
  const storageKey = `kejaspace:mpesa:${userId}:${chargeId}`;

  const [attempt, setAttempt] = useState(() =>
    readSavedAttempt(storageKey),
  );
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const requestInProgress = useRef(false);

  const canStart =
    !attempt ||
    attempt.phase === "failed";

  const canVerify =
    attempt?.attemptId &&
    !["successful", "failed", "review"].includes(attempt.phase);

  function rememberAttempt(value) {
    setAttempt(value);

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      setError(
        "This tab could not save the payment reference. Keep this page open and note the attempt number.",
      );
    }
  }

  async function handleInitiate(event) {
    event.preventDefault();

    if (requestInProgress.current || !canStart) return;

    const phoneNumber = phone.trim();

    if (!/^254[17]\d{8}$/.test(phoneNumber)) {
      setError("Enter your number in the format 2547XXXXXXXX or 2541XXXXXXXX.");
      return;
    }

    const startingAttempt = {
      phase: "unknown",
      attemptId: null,
      message:
        "A payment request was started. Its result has not been confirmed.",
    };

    // Save a marker BEFORE sending, in case the page is refreshed.
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify(startingAttempt),
      );
    } catch {
      setError(
        "Your browser could not save the payment request. Enable site storage before continuing.",
      );
      return;
    }

    requestInProgress.current = true;
    setBusy("initiate");
    setError("");
    setAttempt(startingAttempt);

    try {
      const data = await initiateMpesaPayment(
        chargeId,
        phoneNumber,
      );

      if (!data?.attempt_id || data.status !== "pending") {
        rememberAttempt({
          phase: "unknown",
          attemptId: data?.attempt_id || null,
          message:
            "The request returned an unexpected response. Check its status before trying another payment.",
        });
        return;
      }

      rememberAttempt({
        phase: "pending",
        attemptId: data.attempt_id,
        message:
          "Request accepted. Payment has not been confirmed yet. Use Check payment status to get the result.",
      });
    } catch (err) {
      const attemptId = err.data?.attempt_id;
      const message = getErrorMessage(err);

      if (attemptId) {
        rememberAttempt({
          phase: "review",
          attemptId,
          message,
        });
      } else if (
        [400, 401, 403, 404, 429].includes(err.status) &&
        !message.toLowerCase().includes("unresolved")
      ) {
        // These responses reject the request before a new attempt.
        setAttempt(null);

        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          // The existing marker remains conservative on a later reload.
        }

        setError(message);
      } else {
        rememberAttempt({
          phase: "unknown",
          attemptId: null,
          message:
            `${message} The payment outcome is not confirmed. ` +
            "Ask staff to check before starting another request.",
        });
      }
    } finally {
      requestInProgress.current = false;
      setBusy("");
    }
  }

  async function handleVerify() {
    if (requestInProgress.current || !canVerify) return;

    requestInProgress.current = true;
    setBusy("verify");
    setError("");

    try {
      const data = await verifyMpesaPayment(attempt.attemptId);

      if (
        data?.status === "successful" &&
        data.payment_recorded === true &&
        data.payment_id
      ) {
        rememberAttempt({
          phase: "successful",
          attemptId: attempt.attemptId,
          message:
            "Payment recorded successfully. Refresh your charges to see the updated balance, and check My stay for your reservation status.",
        });
      } else if (data?.status === "review") {
        rememberAttempt({
          phase: "review",
          attemptId: attempt.attemptId,
          message:
            data.detail || "This payment requires staff review.",
        });
      } else if (
        data?.status === "failed" &&
        data.payment_recorded === false
      ) {
        rememberAttempt({
          phase: "failed",
          attemptId: attempt.attemptId,
          message:
            data.detail || "The payment was unsuccessful.",
        });
      } else {
        rememberAttempt({
          phase: "pending",
          attemptId: attempt.attemptId,
          message:
            data?.detail ||
            "A final payment result is not available. Check again shortly.",
        });
      }
    } catch (err) {
      const message = getErrorMessage(err);

      if (err.status === 409) {
        rememberAttempt({
          phase: "review",
          attemptId: attempt.attemptId,
          message,
        });
      } else {
        setError(
          `${message} This does not confirm that the payment failed. ` +
          "Check this same attempt again later.",
        );
      }
    } finally {
      requestInProgress.current = false;
      setBusy("");
    }
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h3 className="font-semibold text-slate-900">
        Pay with M-Pesa
      </h3>

      <p className="mt-2 text-xs leading-6 text-slate-500">
        Sandbox testing only. This integration is not configured
        for live payments.
      </p>

      {attempt && (
        <div
          role="status"
          className={`mt-4 rounded-xl p-4 text-sm leading-6 ${
            attempt.phase === "successful"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          {attempt.attemptId && (
            <p className="mb-1 font-semibold">
              Payment attempt #{attempt.attemptId}
            </p>
          )}

          <p>{attempt.message}</p>

          {attempt.phase === "review" && (
            <p className="mt-2 font-medium">
              Contact hostel staff with this attempt number.
              Do not start another payment yet.
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {canStart && (
        <form onSubmit={handleInitiate} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={`mpesa-phone-${chargeId}`}
              className="block text-sm font-medium text-slate-700"
            >
              M-Pesa phone number
            </label>

            <input
              id={`mpesa-phone-${chargeId}`}
              type="tel"
              autoComplete="tel"
              placeholder="2547XXXXXXXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={Boolean(busy)}
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
          </div>

          <p className="text-xs leading-6 text-slate-500">
            The request uses this charge’s outstanding balance.
          </p>

          <button
            type="submit"
            disabled={Boolean(busy)}
            className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Send sandbox payment request
          </button>
        </form>
      )}

      {busy === "initiate" && (
        <p role="status" className="mt-4 text-sm text-slate-600">
          Sending payment request…
        </p>
      )}

      {canVerify && (
        <button
          type="button"
          onClick={handleVerify}
          disabled={Boolean(busy)}
          className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {busy === "verify"
            ? "Checking payment…"
            : "Check payment status"}
        </button>
      )}
    </div>
  );
}