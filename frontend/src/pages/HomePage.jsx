import { Link } from "react-router";

export default function HomePage() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
        Welcome to KejaSpace
      </p>

      <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Find your space. Feel at home.
      </h1>

      <p className="mt-5 max-w-xl leading-7 text-slate-600">
        Browse hostel rooms, apply for accommodation and manage your stay
        in one place.
      </p>

      <Link
        to="/rooms"
        className="mt-8 inline-block rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
      >
        Explore rooms
      </Link>
    </section>
  );
}