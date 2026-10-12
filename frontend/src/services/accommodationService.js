import { apiRequest } from "./api";

// Resident applications
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

// Staff applications
export function listStaffApplications(
  page = 1,
  status = "",
  signal,
  search = "",
) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (status) {
    params.set("status", status);
  }

  if (search.trim()) {
    params.set("search", search.trim());
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

// Admin announcements
export function listAdminAnnouncements({
  page = 1,
  published = "",
  search = "",
  signal,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (published !== "" && published !== null && published !== undefined) {
    params.set("is_published", String(published));
  }

  if (search.trim()) {
    params.set("search", search.trim());
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

// Staff resident stays
export function listStaffStays({
  page = 1,
  status = "",
  search = "",
  signal,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (status) {
    params.set("status", status);
  }

  if (search.trim()) {
    params.set("search", search.trim());
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