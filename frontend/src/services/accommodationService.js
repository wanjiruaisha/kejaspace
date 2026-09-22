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