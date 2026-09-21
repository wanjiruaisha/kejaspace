const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function loginRequest(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail || "Login failed. Please check your details and try again."
    );
  }

  if (!data?.access || !data?.refresh) {
    throw new Error("The server did not return the expected login tokens.");
  }

  return data;
}

export async function getCurrentUser(accessToken, signal) {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      data?.detail || "Could not load your account."
    );

    error.status = response.status;
    throw error;
  }

  if (!data || !data.username) {
    throw new Error("The server returned unexpected account information.");
  }

  return data;
}

export async function logoutRequest(accessToken, refreshToken) {
  const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      refresh: refreshToken,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.detail || "Could not complete logout. Please try again."
    );
  }
}