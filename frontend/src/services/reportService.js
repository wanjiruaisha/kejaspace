import { apiRequest } from "./api";

export function getOccupancyReport({
  page = 1,
  active = "",
  signal,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "10",
  });

  if (active !== "") {
    params.set("is_active", active);
  }

  return apiRequest(`/staff/reports/occupancy/?${params}`, {
    signal,
  });
}
export function getPaymentReport({
  page = 1,
  method = "",
  startDate = "",
  endDate = "",
  search = "",
  signal,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "10",
  });

  if (method) params.set("method", method);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (search.trim()) params.set("search", search.trim());

  return apiRequest(`/staff/reports/payments/?${params}`, {
    signal,
  });
}