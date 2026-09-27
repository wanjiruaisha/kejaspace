import { useEffect, useRef, useState } from "react";

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

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const detailsRef = useRef(null);
  const triggerRef = useRef(null);

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

  useEffect(() => {
    if (selectedAnnouncement) {
      detailsRef.current?.focus({ preventScroll: true });
      detailsRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedAnnouncement]);

  function refreshAnnouncements() {
    setSelectedAnnouncement(null);
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
    setSelectedAnnouncement(null);
    setLoading(true);
    setPage(nextPage);
  }

  function openAnnouncement(announcement, button) {
    triggerRef.current = button;
    setSelectedAnnouncement(announcement);
  }

  function closeAnnouncement() {
    setSelectedAnnouncement(null);

    if (triggerRef.current?.isConnected) {
      triggerRef.current.focus();
    }
  }

  return (
    <section className="min-w-0 space-y-5">
      <header className="rounded-2xl bg-slate-900 p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
          Hostel noticeboard
        </p>

        <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Announcements
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Hostel updates, scheduled maintenance and notices from management.
        </p>
      </header>

      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <label htmlFor="announcement-search" className="form-label">
          Search announcements
        </label>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="announcement-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="For example: water or cleaning"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          />

          <button
            type="submit"
            disabled={loading}
            className="button-primary"
          >
            Search
          </button>

          {(search || searchInput) && (
            <button
              type="button"
              onClick={clearSearch}
              disabled={loading}
              className="button-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 break-words font-heading text-base font-semibold text-slate-900">
          {search ? `Results for “${search}”` : "Latest notices"}
        </h2>

        <button
          type="button"
          onClick={refreshAnnouncements}
          disabled={loading}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <LoadingMessage label="Loading announcements…" compact />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-5 text-sm text-red-800"
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h3 className="text-base font-semibold text-slate-900">
            {search ? "No matching announcements" : "No announcements yet"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {search
              ? "Try a different search term or clear your search."
              : "Published notices from hostel management will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className={`flex min-w-0 flex-col rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
                selectedAnnouncement?.id === announcement.id
                  ? "border-blue-400"
                  : "border-slate-200"
              }`}
            >
              <span className="inline-flex self-start rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Hostel notice
              </span>

              <h3 className="mt-3 line-clamp-2 break-words font-heading text-base font-semibold leading-6 text-slate-900">
                {announcement.title}
              </h3>

              <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600">
                {announcement.message}
              </p>

              <div className="mt-auto pt-4">
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs leading-5 text-slate-500">
                    Created: {formatDate(announcement.created_at)}
                  </p>

                  <button
                    type="button"
                    onClick={(event) =>
                      openAnnouncement(announcement, event.currentTarget)
                    }
                    aria-label={`Read full notice: ${announcement.title}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Read full notice
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <nav
        aria-label="Announcement pages"
        className="flex items-center justify-between gap-3"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className="button-secondary"
        >
          Previous
        </button>

        <span className="text-sm text-slate-500">Page {page}</span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className="button-secondary"
        >
          Next
        </button>
      </nav>

      {selectedAnnouncement && !loading && !error && (
        <section
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="announcement-details-title"
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Full notice
              </p>

              <h2
                id="announcement-details-title"
                className="mt-2 break-words font-heading text-lg font-semibold leading-7 text-slate-900"
              >
                {selectedAnnouncement.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeAnnouncement}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
            <p>
              Created: {formatDate(selectedAnnouncement.created_at)}
            </p>

            {selectedAnnouncement.updated_at &&
              selectedAnnouncement.updated_at !==
                selectedAnnouncement.created_at && (
                <p>
                  Updated: {formatDate(selectedAnnouncement.updated_at)}
                </p>
              )}

            <p>Times shown in Nairobi time.</p>
          </div>

          <p className="mt-5 whitespace-pre-wrap break-words border-t border-slate-100 pt-5 text-sm leading-7 text-slate-700">
            {selectedAnnouncement.message}
          </p>
        </section>
      )}
    </section>
  );
}