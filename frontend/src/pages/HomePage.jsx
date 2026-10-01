import { Link } from "react-router";

import useAuth from "../hooks/useAuth";

const roomTypes = [
  {
    name: "Single",
    occupancy: "One resident",
    image: "/images/rooms/single-1.jpeg",
    description: "An option for those who prefer their own room.",
  },
  {
    name: "Twin",
    occupancy: "Two residents",
    image: "/images/rooms/twin-2.jpeg",
    description: "A shared room with space for two residents.",
  },
  {
    name: "Triple",
    occupancy: "Three residents",
    image: "/images/rooms/triple.jpeg",
    description: "A shared room arranged for three residents.",
  },
  {
    name: "Quad",
    occupancy: "Four residents",
    image: "/images/rooms/quad-2.jpeg",
    description: "A room option for four residents sharing.",
  },
];

const steps = [
  {
    title: "Choose your room",
    description:
      "Compare monthly rent and available spaces, then apply with your preferred move-in date.",
  },
  {
    title: "Receive your decision",
    description:
      "Staff review your application. Approval creates a temporary allocation and your first rent charge.",
  },
  {
    title: "Confirm and move in",
    description:
      "Pay the first month’s full rent before the deadline. Once payment is confirmed, staff can check you in when you arrive.",
  },
];

const questions = [
  {
    question: "Can I browse rooms before creating an account?",
    answer:
      "Yes. Room listings are public. You only need to log in when you are ready to submit an accommodation application.",
  },
  {
    question: "Does approval confirm my reservation?",
    answer:
      "Approval creates a temporary room hold. Your reservation is confirmed once the first month’s full rent is recorded successfully before your payment deadline.",
  },
  {
    question: "Where can I check my application and rent?",
    answer:
      "Log in as a resident and open My applications to follow your application. My stay shows your allocation, while My charges shows rent charges and payment summaries.",
  },
  {
    question: "When can I register visitors or report a repair?",
    answer:
      "Once staff have checked you in, you can register expected visitors and submit maintenance requests from your account.",
  },
];

const container = "mx-auto w-full max-w-7xl px-5 sm:px-8";

const headingStyle =
  "font-heading text-xl font-semibold tracking-tight text-[#173F35] sm:text-2xl";

const textLink =
  "inline-flex items-center gap-2 text-sm font-semibold text-[#245747] underline-offset-4 hover:underline";

const primaryButton =
  "inline-flex items-center justify-center gap-3 rounded-lg bg-[#245747] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#173F35]";

export default function HomePage() {
  const { user, authLoading } = useAuth();

  const isManagement = Boolean(
    user && (user.is_staff || user.is_superuser),
  );

  const accountLink = isManagement
    ? "/staff/dashboard"
    : "/my-applications";

  return (
    <div className="min-w-0 bg-[#FAF7F2] text-[#173F35]">
      {/* Hero: full photo on mobile, narrower photo on desktop */}
      <section
        aria-labelledby="home-heading"
        className="relative isolate overflow-hidden bg-[#173F35]"
      >
        <div className="absolute inset-0 lg:left-[48%]">
          <img
            src="/images/home-hero.jpg"
            alt=""
            fetchPriority="high"
            width={736}
            height={1349}
            className="h-full w-full object-cover object-[center_60%]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/25 lg:bg-black/10"
          />
        </div>

        <div
          className={`${container} relative flex min-h-[540px] items-center py-12 sm:min-h-[600px] sm:py-16`}
        >
          <div className="w-full max-w-xl rounded-2xl border border-white/25 bg-[#102C25]/85 p-6 text-white shadow-2xl supports-[backdrop-filter:blur(1px)]:bg-[#102C25]/65 supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E6D2B5]">
              Welcome to KejaSpace
            </p>

            <h1
              id="home-heading"
              className="mt-5 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
            >
              A place to
              <br />
              <span className="underline decoration-[#DEAB83] decoration-2 underline-offset-8">
                settle in.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/90">
              Find your room, plan your move and keep your stay
              organised. Your accommodation journey starts here.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to="/rooms"
                className="inline-flex items-center justify-center gap-3 rounded-lg bg-[#FAF7F2] px-5 py-3 text-sm font-semibold text-[#173F35] transition-colors hover:bg-[#E8EDE4]"
              >
                Explore rooms
                <span aria-hidden="true">→</span>
              </Link>

              {!authLoading && (
                <Link
                  to={user ? accountLink : "/login"}
                  className="rounded-sm py-2 text-sm font-medium text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
                >
                  {user
                    ? isManagement
                      ? "Open dashboard"
                      : "My applications"
                    : "Log in"}
                </Link>
              )}
            </div>

            <p className="mt-6 border-t border-white/20 pt-4 text-xs leading-5 text-white/80">
              Browse rooms freely. Create an account when you’re
              ready to apply.
            </p>
          </div>
        </div>

        <p className="absolute bottom-3 right-4 rounded bg-black/60 px-2 py-1 text-[10px] text-white sm:right-8">
          Illustrative shared lounge
        </p>
      </section>

      {/* Introduction */}
      <section
        aria-labelledby="introduction-heading"
        className={`${container} py-10 sm:py-14`}
      >
        <div className="grid gap-5 border-b border-[#173F35]/15 pb-10 md:grid-cols-2 md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B45336]">
              More than a room listing
            </p>

            <h2
              id="introduction-heading"
              className={`mt-3 max-w-md ${headingStyle}`}
            >
              From your first application
              to everyday hostel life.
            </h2>
          </div>

          <div className="max-w-xl">
            <p className="text-sm leading-7 text-[#57534E]">
              Keep track of your application, see what rent is due
              and follow hostel updates. Once you move in, your account
              also gives you a place to register visitors and report
              maintenance issues.
            </p>

            <Link to="/about" className={`mt-4 ${textLink}`}>
              Get to know KejaSpace
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Room collection */}
      <section
        aria-labelledby="room-types-heading"
        className={`${container} pb-12 sm:pb-16`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B45336]">
              Find your fit
            </p>

            <h2
              id="room-types-heading"
              className={`mt-2 ${headingStyle}`}
            >
              Your own room, or room to share.
            </h2>
          </div>

          <Link to="/rooms" className={textLink}>
            View all rooms
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {roomTypes.map((room) => (
            <article key={room.name} className="min-w-0">
              <Link
                to="/rooms"
                aria-label={`Browse room listings, including ${room.name.toLowerCase()} rooms`}
                className="group block rounded-xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#E8EDE4]">
                  <img
                    src={room.image}
                    alt={`Illustrative ${room.name.toLowerCase()} room`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
                  />

                  <span className="absolute bottom-3 left-3 rounded-md border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-[#173F35] backdrop-blur-md">
                    {room.occupancy}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <h3 className="font-heading text-base font-semibold group-hover:underline group-focus-visible:underline">
                    {room.name}
                  </h3>

                  <span
                    aria-hidden="true"
                    className="text-[#B45336]"
                  >
                    ↗
                  </span>
                </div>
              </Link>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                {room.description}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-5 text-xs leading-5 text-[#57534E]">
          Photos illustrate room types. View listings for current
          prices and available spaces.
        </p>
      </section>

      {/* Application guide */}
      <section
        aria-labelledby="process-heading"
        className="border-y border-[#173F35]/10 bg-[#E8EDE4]"
      >
        <div className={`${container} py-10 sm:py-14`}>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#B45336]">
                Planning your move
              </p>

              <h2
                id="process-heading"
                className={`mt-3 ${headingStyle}`}
              >
                A few steps.
                <br />
                A clear way forward.
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-7 text-[#57534E]">
                Follow your progress from your account. After approval,
                check your payment deadline before confirming your
                reservation.
              </p>

              <Link to="/rooms" className={`mt-5 ${textLink}`}>
                Start by choosing a room
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ol className="divide-y divide-[#173F35]/15">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0 sm:gap-6"
                >
                  <span
                    aria-hidden="true"
                    className="pt-0.5 text-sm font-semibold text-[#B45336]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3 className="font-heading text-base font-semibold">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-[#57534E]">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section
        aria-labelledby="questions-heading"
        className={`${container} py-10 sm:py-14`}
      >
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B45336]">
              Good to know
            </p>

            <h2
              id="questions-heading"
              className={`mt-3 ${headingStyle}`}
            >
              Before you apply.
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-[#57534E]">
              A few answers to help you get started.
            </p>
          </div>

          <div className="divide-y divide-[#173F35]/15 border-y border-[#173F35]/15">
            {questions.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-sm font-semibold leading-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#245747] [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>

                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#173F35]/20 text-lg font-normal text-[#245747] motion-safe:transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>

                <p className="mt-3 pr-8 text-sm leading-7 text-[#57534E]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing invitation */}
      <section className="border-t border-[#173F35]/10 bg-white/60">
        <div
          className={`${container} flex flex-col items-start justify-between gap-5 py-8 sm:flex-row sm:items-center sm:py-10`}
        >
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Take a look. Find your fit.
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              Compare your options before deciding where to apply.
            </p>
          </div>

          <Link to="/rooms" className={`${primaryButton} shrink-0`}>
            Browse rooms
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}