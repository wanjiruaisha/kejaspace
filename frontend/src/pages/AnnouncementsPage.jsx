import { useEffect, useRef, useState } from "react";

import LoadingMessage from "../components/common/LoadingMessage";
import { listAnnouncements } from "../services/announcementService";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl " +
  "border border-[#245747]/20 bg-white px-4 py-2 text-sm " +
  "font-semibold text-[#245747] transition-colors hover:bg-[#E8EDE4] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

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
    if (!selectedAnnouncement) return;

    detailsRef.current?.focus({ preventScroll: true });

    detailsRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [selectedAnnouncement]);

  function refreshAnnouncements() {
    setSelectedAnnouncement(null);
    setLoading(true);
    setRetry((value) => value + 1);
  }

  function handleSearch(event) {
    event.preventDefault();

    if (loading) return;

    setPage(1);
    setSearch(searchInput.trim());
    refreshAnnouncements();
  }

  function clearSearch() {
    if (loading) return;

    setSearchInput("");
    setSearch("");
    setPage(1);
    refreshAnnouncements();
  }

  function changePage(nextPage) {
    if (loading || nextPage < 1) return;

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
    <section
      aria-labelledby="announcements-heading"
      className="mx-auto w-full min-w-0 max-w-5xl space-y-5"
    >
      {/* Page introduction */}
      <header
        className="relative overflow-hidden rounded-2xl
          border border-[#245747]/10 bg-gradient-to-br
          from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              lang="sw"
              className="text-xs font-semibold uppercase
                tracking-[0.14em] text-[#965038]"
            >
              Habari za hostel
            </p>

            <h1
              id="announcements-heading"
              className="mt-2 font-heading text-2xl
                font-bold tracking-tight text-[#173F35]"
            >
              Your hostel noticeboard.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#57534E]">
              Water updates, scheduled repairs and messages from management.
              Catch up on what’s happening around your hostel.
            </p>
          </div>

          <span
            aria-hidden="true"
            className="hidden size-11 shrink-0 items-center
              justify-center rounded-xl border border-white/70
              bg-white/60 text-[#245747] sm:inline-flex"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <rect x="5" y="4" width="14" height="17" rx="2" />
              <path d="M9 4V2M15 4V2M9 9h6M9 13h6M9 17h3" />
            </svg>
          </span>
        </div>
      </header>

      {/* Search */}
      <form
        role="search"
        aria-label="Search hostel announcements"
        onSubmit={handleSearch}
        className="rounded-2xl border border-[#245747]/15
          bg-white p-4 sm:p-5"
      >
        <label
          htmlFor="announcement-search"
          className="block text-sm font-semibold text-[#173F35]"
        >
          Looking for a notice?
        </label>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="announcement-search"
            name="search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Try water, cleaning or repairs"
            className="min-h-11 min-w-0 flex-1 rounded-xl
              border border-[#245747]/20 bg-[#FAF7F2]/60
              px-3.5 py-2.5 text-sm text-[#173F35]
              placeholder:text-[#78716C]
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-[#245747]"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-11 flex-1 items-center
                justify-center rounded-xl bg-[#245747] px-5 py-2.5
                text-sm font-semibold text-white transition-colors
                hover:bg-[#173F35]
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-[#245747]
                disabled:cursor-not-allowed disabled:opacity-50
                sm:flex-none"
            >
              Search
            </button>

            {(search || searchInput) && (
              <button
                type="button"
                onClick={clearSearch}
                disabled={loading}
                className={secondaryButton}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {/* List heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          className="min-w-0 break-words font-heading
            text-base font-semibold text-[#173F35]"
        >
          {search ? `Results for “${search}”` : "Latest notices"}
        </h2>

        <button
          type="button"
          onClick={refreshAnnouncements}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2
            rounded-lg px-3 text-sm font-semibold text-[#245747]
            transition-colors hover:bg-[#E8EDE4]
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#245747]
            disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">↻</span>
          Refresh
        </button>
      </div>

      {/* Loading, error, empty state or notices */}
      {loading ? (
        <div
          className="rounded-2xl border border-[#245747]/15
            bg-white p-5"
        >
          <LoadingMessage label="Loading announcements…" compact />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-100
            bg-red-50 p-5 text-sm leading-6 text-red-800"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={refreshAnnouncements}
            className="mt-3 inline-flex min-h-11 items-center
              rounded-lg font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed
            border-[#245747]/25 bg-[#FAF7F2] px-5 py-9 text-center"
        >
          <h3 className="font-heading text-base font-semibold text-[#173F35]">
            {search ? "No matching notices" : "All quiet for now."}
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#57534E]">
            {search
              ? "Try another word or clear your search to see all notices."
              : "Published updates from hostel management will appear here."}
          </p>
        </div>
      ) : (
        <div
          className="grid auto-rows-fr items-stretch
            gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {announcements.map((announcement) => {
            const isSelected =
              selectedAnnouncement?.id === announcement.id;

            return (
              <article
                key={announcement.id}
                className={`flex min-w-0 flex-col rounded-2xl
                  border bg-white p-4 transition-shadow
                  hover:shadow-md focus-within:shadow-md
                  motion-safe:transition-[transform,box-shadow]
                  motion-safe:duration-200
                  motion-safe:hover:-translate-y-0.5 sm:p-5 ${
                    isSelected
                      ? "border-[#245747] ring-1 ring-[#245747]/15"
                      : "border-[#245747]/15"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-[#965038]"
                  />

                  <span
                    className="text-xs font-semibold
                      uppercase tracking-wide text-[#965038]"
                  >
                    Hostel notice
                  </span>
                </div>

                <h3
                  className="mt-3 line-clamp-2 break-words
                    font-heading text-base font-semibold
                    leading-6 text-[#173F35]"
                >
                  {announcement.title}
                </h3>

                <p
                  className="mt-2 line-clamp-3 break-words
                    text-sm leading-6 text-[#57534E]"
                >
                  {announcement.message}
                </p>

                <div className="mt-auto pt-4">
                  <div className="border-t border-[#245747]/10 pt-3">
                    <p className="text-xs leading-5 text-[#78716C]">
                      Posted {formatDate(announcement.created_at)}
                    </p>

                    <button
                      type="button"
                      onClick={(event) =>
                        openAnnouncement(announcement, event.currentTarget)
                      }
                      aria-label={`Read full notice: ${announcement.title}`}
                      aria-expanded={isSelected}
                      aria-controls={
                        isSelected ? "announcement-details" : undefined
                      }
                      className="mt-2 inline-flex min-h-11
                        items-center gap-2 rounded-lg text-sm
                        font-semibold text-[#245747]
                        underline-offset-4 hover:underline
                        focus-visible:outline-2
                        focus-visible:outline-offset-2
                        focus-visible:outline-[#245747]"
                    >
                      Read full notice
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Full notice stays separate so cards remain equal in height. */}
      {selectedAnnouncement && !loading && !error && (
        <section
          id="announcement-details"
          ref={detailsRef}
          tabIndex={-1}
          aria-labelledby="announcement-details-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              closeAnnouncement();
            }
          }}
          className="min-w-0 scroll-mt-28 rounded-2xl
            border border-[#245747]/25 bg-[#FAF7F2] p-5
            focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-[#245747] sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase
                  tracking-wider text-[#965038]"
              >
                From management
              </p>

              <h2
                id="announcement-details-title"
                className="mt-2 break-words font-heading
                  text-lg font-semibold leading-7 text-[#173F35]"
              >
                {selectedAnnouncement.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeAnnouncement}
              className={`${secondaryButton} shrink-0`}
            >
              Close
            </button>
          </div>

          <div className="mt-3 space-y-1 text-xs leading-5 text-[#78716C]">
            <p>Posted: {formatDate(selectedAnnouncement.created_at)}</p>

            {selectedAnnouncement.updated_at &&
              selectedAnnouncement.updated_at !==
                selectedAnnouncement.created_at && (
                <p>
                  Updated: {formatDate(selectedAnnouncement.updated_at)}
                </p>
              )}
          </div>

          <p
            className="mt-5 whitespace-pre-wrap break-words
              border-t border-[#245747]/15 pt-5
              text-sm leading-7 text-[#57534E]"
          >
            {selectedAnnouncement.message}
          </p>
        </section>
      )}

      {/* Pagination */}
      <nav
        aria-label="Announcement pages"
        className="flex items-center justify-between gap-3 pt-1"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
          className={secondaryButton}
        >
          Previous
        </button>

        <span className="text-sm text-[#57534E]">Page {page}</span>

        <button
          type="button"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
          className={secondaryButton}
        >
          Next
        </button>
      </nav>

      <p className="text-center text-xs leading-5 text-[#78716C]">
        Times shown in Nairobi time.
      </p>
    </section>
  );
} 