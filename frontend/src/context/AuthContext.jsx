import { createContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  loginRequest,
  logoutRequest,
} from "../services/authService";
export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      const accessToken = sessionStorage.getItem("access_token");

      if (!accessToken) {
        setAuthLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(
          accessToken,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error.status === 401) {
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          setAuthError("Your session has expired. Please log in again.");
        } else {
          setAuthError(
            "We couldn’t check your saved session. Please reload or log in again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => controller.abort();
  }, []);

  async function login(username, password) {
    const tokens = await loginRequest(username, password);

    const currentUser = await getCurrentUser(tokens.access);

    sessionStorage.setItem("access_token", tokens.access);
    sessionStorage.setItem("refresh_token", tokens.refresh);

    setUser(currentUser);
    setAuthError("");

    return currentUser;
  }
  async function logout() {
    const accessToken = sessionStorage.getItem("access_token");
    const refreshToken = sessionStorage.getItem("refresh_token");

    if (!accessToken || !refreshToken) {
      throw new Error(
        "Your session is incomplete. Reload the page and log in again.",
      );
    }

    await logoutRequest(accessToken, refreshToken);

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");

    setUser(null);
    setAuthError("");
  }

  return (
  <AuthContext.Provider
    value={{ user, login, logout, authLoading, authError }}
  >
    {children}
  </AuthContext.Provider>
);
}
