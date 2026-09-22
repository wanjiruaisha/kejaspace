import { Link } from "react-router";

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-semibold text-blue-700">
        Access restricted
      </p>

      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        This page isn’t available for your role
      </h1>

      <p className="mt-4 leading-7 text-slate-600">
        You’re logged in, but your account doesn’t have access to this page.
      </p>

      <Link
        to="/"
        className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
      >
        Return home
      </Link>
    </section>
  );
}