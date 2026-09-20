import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">Page not found</h1>

      <Link to="/" className="mt-4 inline-block text-blue-700 underline">
        Return home
      </Link>
    </section>
  );
}