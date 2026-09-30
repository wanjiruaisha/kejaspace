import { Outlet, useLocation } from "react-router";

import useAuth from "../hooks/useAuth";
import Navbar from "../components/navigation/Navbar";
import Footer from "../components/navigation/Footer";

export default function PublicLayout() {
  const { authError } = useAuth();
  const { pathname } = useLocation();

  const isHomePage = pathname === "/";

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-[#f8fafc]">
      <Navbar />

      <main
        id="main-content"
        tabIndex={-1}
        className={
          isHomePage
            ? "w-full min-w-0 flex-1"
            : "mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10"
        }
      >
        {authError && (
          <div
            className={
              isHomePage
                ? "mx-auto max-w-7xl px-5 py-4 sm:px-8"
                : "mb-5"
            }
          >
            <p
              role="alert"
              className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
            >
              {authError}
            </p>
          </div>
        )}

        <Outlet />
      </main>

      <Footer />
    </div>
  );
}