import { apiRequest } from "./api";

export function initiateMpesaPayment(chargeId, phoneNumber) {
  return apiRequest("/payments/mpesa/initiate/", {
    method: "POST",
    body: {
      charge: Number(chargeId),
      phone_number: phoneNumber.trim(),
    },
  });
}

export function verifyMpesaPayment(attemptId) {
  return apiRequest(
    `/payments/mpesa/attempts/${attemptId}/verify/`,
    {
      method: "POST",
    },
  );
}