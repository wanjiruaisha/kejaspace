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

export function listStaffVisitors({ page, status, signal }) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: "6",
  });

  if (status) {
    params.set("status", status);
  }

  return apiRequest(`/staff/visitors/?${params.toString()}`, {
    signal,
  });
}

export function checkInVisitor(visitorId) {
  return apiRequest(`/staff/visitors/${visitorId}/check-in/`, {
    method: "POST",
  });
}

export function checkOutVisitor(visitorId) {
  return apiRequest(`/staff/visitors/${visitorId}/check-out/`, {
    method: "POST",
  });
}