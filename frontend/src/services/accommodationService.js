import { apiRequest } from "./api";

export function createApplication(roomId, moveInDate) {
  return apiRequest("/applications/", {
    method: "POST",
    body: {
      room: Number(roomId),
      move_in_date: moveInDate,
    },
  });
}

export function cancelApplication(applicationId) {
  return apiRequest(`/applications/${applicationId}/cancel/`, {
    method: "POST",
  });
}

export function listStaffApplications(page, status, signal) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (status) {
    params.set("status", status);
  }

  return apiRequest(`/staff/applications/?${params.toString()}`, {
    signal,
  });
}

export function approveApplication(applicationId) {
  return apiRequest(`/staff/applications/${applicationId}/approve/`, {
    method: "POST",
  });
}

export function rejectApplication(applicationId) {
  return apiRequest(`/staff/applications/${applicationId}/reject/`, {
    method: "POST",
  });
}