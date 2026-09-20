import { Link, Outlet } from "react-router";

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
        >
          <Link to="/" className="text-2xl font-bold text-blue-700">
            KejaSpace
          </Link>

          <Link
            to="/rooms"
            className="font-medium text-slate-600 hover:text-blue-700"
          >
            Rooms
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  );
}