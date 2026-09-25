import { Outlet } from "react-router";

import useAuth from "../hooks/useAuth";
import Navbar from "../components/navigation/Navbar";
import Footer from "../components/navigation/Footer";

export default function PublicLayout() {
  const { authError } = useAuth();

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-[#f5f7fb]">
      <Navbar />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8"
      >
        {authError && (
          <p
            role="alert"
            className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
          >
            {authError}
          </p>
        )}

        <Outlet />
      </main>

      <Footer />
    </div>
  );
}