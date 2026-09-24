import { apiRequest } from "./api";

export function listMyMaintenance({ page, status, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (status) {
    params.set("status", status);
  }

  return apiRequest(`/maintenance/?${params.toString()}`, {
    signal,
  });
}

export function createMaintenanceRequest(title, description) {
  return apiRequest("/maintenance/", {
    method: "POST",
    body: {
      title,
      description,
    },
  });
}