import { apiRequest } from "./api";

export function listAdminRooms(page = 1, signal) {
  return apiRequest(`/admin/rooms/?page=${page}&page_size=6`, {
    signal,
  });
}

export function createRoom(data) {
  return apiRequest("/admin/rooms/", {
    method: "POST",
    body: data,
  });
}

export function updateRoom(id, data) {
  return apiRequest(`/admin/rooms/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteRoom(id) {
  return apiRequest(`/admin/rooms/${id}/`, {
    method: "DELETE",
  });
}