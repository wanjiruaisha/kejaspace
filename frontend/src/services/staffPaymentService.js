import { apiRequest } from "./api";

export function listStaffCharges(page = 1, signal, filters = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
    ordering: filters.ordering || "-billing_month,-id",
  });

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.billing_month) {
    params.set("billing_month", `${filters.billing_month}-01`);
  }

  if (filters.due_date) {
    params.set("due_date", filters.due_date);
  }

  return apiRequest(`/staff/charges/?${params.toString()}`, {
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