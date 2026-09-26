import { apiRequest } from "./api";

export function listStaffCharges(page = 1, signal) {
  return apiRequest(`/staff/charges/?page=${page}&page_size=6`, {
    signal,
  });
}

export function createRentCharge(data) {
  return apiRequest("/staff/charges/", {
    method: "POST",
    body: data,
  });
}

export function recordManualPayment(data) {
  return apiRequest("/staff/payments/record/", {
    method: "POST",
    body: data,
  });
}