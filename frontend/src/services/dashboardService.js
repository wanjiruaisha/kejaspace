import { apiRequest } from "./api";

export function getStaffDashboard(signal) {
  return apiRequest("/staff/dashboard/", {
    signal,
  });
}