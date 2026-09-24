import { Outlet } from "react-router";

import useAuth from "../hooks/useAuth";
import Navbar from "../components/navigation/Navbar";
import Footer from "../components/navigation/Footer";

export default function PublicLayout() {
  const { authError } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7fb]">
      <Navbar />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12"
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