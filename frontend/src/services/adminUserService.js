import { apiRequest } from "./api";

export function listAdminUsers(page = 1, signal) {
  return apiRequest(`/admin/users/?page=${page}&page_size=6`, {
    signal,
  });
}

export function updateUserAccess(id, data) {
  return apiRequest(`/admin/users/${id}/access/`, {
    method: "PATCH",
    body: data,
  });
}