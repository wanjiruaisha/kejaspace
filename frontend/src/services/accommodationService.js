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

export function listAdminAnnouncements({ page, published, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (published !== "") {
    params.set("is_published", published);
  }

  return apiRequest(`/admin/announcements/?${params.toString()}`, {
    signal,
  });
}

export function createAnnouncement(data) {
  return apiRequest("/admin/announcements/", {
    method: "POST",
    body: data,
  });
}

export function updateAnnouncement(id, data) {
  return apiRequest(`/admin/announcements/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteAnnouncement(id) {
  return apiRequest(`/admin/announcements/${id}/`, {
    method: "DELETE",
  });
}

export function listStaffStays({ page, status, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (status) {
    params.set("status", status);
  }

  return apiRequest(`/staff/stays/?${params.toString()}`, {
    signal,
  });
}

export function performStayAction(stayId, action) {
  const allowedActions = ["check-in", "check-out", "cancel"];

  if (!allowedActions.includes(action)) {
    throw new Error("Unsupported stay action.");
  }

  return apiRequest(`/staff/stays/${stayId}/${action}/`, {
    method: "POST",
  });
}