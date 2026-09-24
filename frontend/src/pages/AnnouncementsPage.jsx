import { useEffect, useState } from "react";

import LoadingMessage from "../components/common/LoadingMessage";
import { listAnnouncements } from "../services/announcementService";

function formatDate(value) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnnouncements() {
      setLoading(true);
      setError("");

      try {
        const data = await listAnnouncements({
          page,
          search,
          signal: controller.signal,
        });

        if (!Array.isArray(data?.results)) {
          throw new Error(
            "The server returned an unexpected announcement list.",
          );
        }

        if (!controller.signal.aborted) {
          setAnnouncements(data.results);
          setHasNext(Boolean(data.next));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "Could not connect. Please check your connection."
              : err.message || "Could not load announcements.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAnnouncements();

    return () => controller.abort();
  }, [page, search, retry]);

  function refreshAnnouncements() {
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleSearch(event) {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
    refreshAnnouncements();
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
    refreshAnnouncements();
  }

  function changePage(nextPage) {
    setLoading(true);
    setPage(nextPage);
  }

  return (
    <section>
      <div className="rounded-3xl bg-slate-900 px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
          Hostel noticeboard
        </p>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Announcements
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Stay informed about hostel updates, scheduled maintenance
          and notices from management.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <label
          htmlFor="announcement-search"
          className="block text-sm font-semibold text-slate-700"
        >
          Search announcements
        </label>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="announcement-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="For example: water or cleaning"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Search
          </button>

          {search && (
            <button
              type="button"
              onClick={clearSearch}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">
          {search ? `Results for “${search}”` : "Latest notices"}
        </h2>

        <button
          type="button"
          onClick={refreshAnnouncements}
          disabled={loading}
          className="text-sm font-semibold text-blue-700 hover:underline disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-6">
          <LoadingMessage label="Loading announcements…" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl bg-red-50 p-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshAnnouncements}
            className="mt-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h3 className="text-lg font-bold text-slate-900">
            {search ? "No matching announcements" : "No announcements yet"}
          </h3>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            {search
              ? "Try a different search term or clear your search."
              : "Published notices from hostel management will appear here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Hostel notice
              </span>

              <h3 className="mt-4 break-words text-xl font-bold text-slate-900">
                {announcement.title}
              </h3>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                {announcement.message}
              </p>

              <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <p>
                  Created: {formatDate(announcement.created_at)}
                </p>

                {announcement.updated_at &&
                  announcement.updated_at !== announcement.created_at && (
                    <p>
                      Updated: {formatDate(announcement.updated_at)}
                    </p>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Announcement pages"
        className="mt-8 flex items-center justify-center gap-4"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {page}
        </span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </section>
  );
}