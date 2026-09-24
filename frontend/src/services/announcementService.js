import { apiRequest } from "./api";

export function listAnnouncements({ page, search, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
    ordering: "-created_at",
  });

  if (search) {
    params.set("search", search);
  }

  return apiRequest(`/announcements/?${params.toString()}`, {
    signal,
  });
}