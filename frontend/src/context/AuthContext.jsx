import { createContext, useEffect, useState } from "react";

import {
  getCurrentUser,
  loginRequest,
  logoutRequest,
} from "../services/authService";

import { clearSession, saveSession } from "../services/api";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    function handleSessionExpired() {
      setUser(null);
      setAuthError("Your session has expired. Please log in again.");
    }

    window.addEventListener(
      "kejaspace:session-expired",
      handleSessionExpired
    );

    async function restoreSession() {
      const access = sessionStorage.getItem("access_token");
      const refresh = sessionStorage.getItem("refresh_token");

      if (!access && !refresh) {
        setAuthLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(controller.signal);

        if (!controller.signal.aborted) {
          setUser(currentUser);
          setAuthError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAuthError(
            error.status === 401
              ? "Your session has expired. Please log in again."
              : "We couldn’t check your session. Please reload or log in again."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setAuthLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      controller.abort();

      window.removeEventListener(
        "kejaspace:session-expired",
        handleSessionExpired
      );
    };
  }, []);

  async function login(username, password) {
    const tokens = await loginRequest(username, password);

    saveSession(tokens);
    setUser(null);

    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);
      setAuthError("");

      return currentUser;
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function logout() {
    await logoutRequest();

    clearSession();
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