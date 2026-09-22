import { fetchWithTimeout } from "./fetchWithTimeout"; 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let refreshPromise = null;
let sessionVersion = 0;

export function saveSession(tokens) {
  sessionVersion += 1;
  sessionStorage.setItem("access_token", tokens.access);
  sessionStorage.setItem("refresh_token", tokens.refresh);
}

export function clearSession() {
  sessionVersion += 1;
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
}

function expireSession() {
  clearSession();
  window.dispatchEvent(new Event("kejaspace:session-expired"));
}

function sessionExpiredError() {
  const error = new Error("Your session has expired. Please log in again.");
  error.status = 401;
  return error;
}

async function readResponse(response) {
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `Request failed (${response.status}). Please try again.`
    );

    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function refreshAccessToken() {
  // Share an existing refresh request instead of starting another.
  if (refreshPromise) return refreshPromise;

  const version = sessionVersion;
  const refreshToken = sessionStorage.getItem("refresh_token");

  if (!refreshToken) {
    expireSession();
    throw sessionExpiredError();
  }

  const task = (async () => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    // Do not restore a session that was changed while waiting.
    if (version !== sessionVersion) {
      throw new Error("Your session changed. Please try again.");
    }

    if (response.status === 401) {
      expireSession();
      throw sessionExpiredError();
    }

    const data = await readResponse(response);

    if (version !== sessionVersion) {
      throw new Error("Your session changed. Please try again.");
    }

    if (!data?.access) {
      throw new Error("The server did not return a new access token.");
    }

    sessionStorage.setItem("access_token", data.access);

    // Some backend configurations also return a new refresh token.
    if (data.refresh) {
      sessionStorage.setItem("refresh_token", data.refresh);
    }

    return data.access;
  })();

  refreshPromise = task;

  try {
    return await task;
  } finally {
    if (refreshPromise === task) {
      refreshPromise = null;
    }
  }
}

export async function apiRequest(
  path,
  { method = "GET", body, auth = true, signal } = {}
) {
  const version = sessionVersion;

  async function send(accessToken) {
    const headers = {};

    if (auth && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // A function lets logout read the latest refresh token on a retry.
    const payload = typeof body === "function" ? body() : body;

    if (payload !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    return fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal,
    });
  }

  const originalAccess = sessionStorage.getItem("access_token");
  let response = await send(originalAccess);

  if (auth && version !== sessionVersion) {
    throw new Error("Your session changed. Please try again.");
  }

  if (auth && response.status === 401) {
    signal?.throwIfAborted();

    const latestAccess = sessionStorage.getItem("access_token");

    // Another request may already have refreshed the token.
    if (!latestAccess || latestAccess === originalAccess) {
      await refreshAccessToken();
    }

    signal?.throwIfAborted();

    if (version !== sessionVersion) {
      throw new Error("Your session changed. Please try again.");
    }

    response = await send(sessionStorage.getItem("access_token"));

    if (version !== sessionVersion) {
      throw new Error("Your session changed. Please try again.");
    }

    if (response.status === 401) {
      expireSession();
      throw sessionExpiredError();
    }
  }

  return readResponse(response);
}