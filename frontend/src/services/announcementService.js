import { apiRequest } from "./api";

// Published announcements for any logged-in user.
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

// All announcements, including drafts, for admins.
export function listAdminAnnouncements({ page, published, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (published !== "" && published !== undefined) {
    params.set("is_published", published);
  }

  return apiRequest(`/admin/announcements/?${params.toString()}`, {
    signal,
  });
}

// Create an announcement.
export function createAnnouncement(data) {
  return apiRequest("/admin/announcements/", {
    method: "POST",
    body: data,
  });
}

// Edit, publish, or unpublish an announcement.
export function updateAnnouncement(id, data) {
  return apiRequest(`/admin/announcements/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

// Delete an announcement.
export function deleteAnnouncement(id) {
  return apiRequest(`/admin/announcements/${id}/`, {
    method: "DELETE",
  });
}