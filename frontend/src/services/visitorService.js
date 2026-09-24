import { apiRequest } from "./api";

export function listMyVisitors({ page, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  return apiRequest(`/visitors/?${params.toString()}`, {
    signal,
  });
}

export function registerVisitor(data) {
  return apiRequest("/visitors/", {
    method: "POST",
    body: data,
  });
}

export function cancelVisitor(visitorId) {
  return apiRequest(`/visitors/${visitorId}/cancel/`, {
    method: "POST",
  });
}