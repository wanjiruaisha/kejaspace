import { apiRequest } from "./api";

export async function loginRequest(username, password) {
  const data = await apiRequest("/auth/login/", {
    method: "POST",
    auth: false,
    body: { username, password },
  });

  if (!data?.access || !data?.refresh) {
    throw new Error("The server did not return the expected login tokens.");
  }

  return data;
}

export async function getCurrentUser(signal) {
  const data = await apiRequest("/auth/me/", { signal });

  if (!data?.username) {
    throw new Error("The server returned unexpected account information.");
  }

  return data;
}

export async function logoutRequest() {
  await apiRequest("/auth/logout/", {
    method: "POST",
    body: () => ({
      refresh: sessionStorage.getItem("refresh_token"),
    }),
  });
}