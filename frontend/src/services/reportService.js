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