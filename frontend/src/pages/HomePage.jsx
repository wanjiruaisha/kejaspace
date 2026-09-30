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
      "Compare room types, monthly rent and available spaces, then apply with your preferred move-in date.",
  },
  {
    title: "Receive your decision",
    description:
      "Staff review your application. If approved, your account shows a temporary allocation and the first rent charge.",
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
    question: "Does application approval confirm my reservation?",
    answer:
      "Approval creates a temporary room hold. Your reservation is confirmed once the first month’s full rent is recorded successfully before your payment deadline.",
  },
  {
    question: "Where do I check my application and rent?",
    answer:
      "After logging in as a resident, open My applications to follow your application. My stay shows your allocation, and My charges shows rent charges and payment summaries.",
  },
  {
    question: "When can I register visitors or report a repair?",
    answer:
      "These services become available once staff have checked you in. You can then register expected visitors and submit maintenance requests from your account.",
  },
];

const container = "mx-auto w-full max-w-7xl px-5 sm:px-8";

export default function HomePage() {
  const { user, authLoading } = useAuth();

  const isManagement = Boolean(user && (user.is_staff || user.is_superuser));

  const accountLink = isManagement ? "/staff/dashboard" : "/my-applications";

  return (
    <div className="min-w-0 bg-[#faf9f6] text-slate-900">
      {/* Full-width photograph */}
      <section
        aria-labelledby="home-heading"
        className="relative isolate flex min-h-[480px] items-center overflow-hidden bg-slate-900 sm:min-h-[560px]"
      >
        <img
          src="/images/home-hero.jpg"
          alt=""
          fetchPriority="high"
          width={736}
          height={1349}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_60%] sm:object-[center_65%]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.65) 45%, rgba(15,23,42,0.2) 100%)",
          }}
        />

        <div className={`${container} py-16 sm:py-20`}>
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Welcome to KejaSpace
            </p>

            <h1
              id="home-heading"
              className="mt-5 font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Find your room.
              <br />
              Settle into hostel life.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/90 sm:text-base">
              Explore your accommodation options, apply for a space and keep
              track of your stay from one account.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to="/rooms"
                className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-blue-50"
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
                    : "Already registered? Log in"}
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="absolute bottom-4 right-5 text-[11px] text-white/75 sm:right-8">
          Illustrative room photograph
        </p>
      </section>

      {/* Short introduction */}
      <section
        aria-labelledby="introduction-heading"
        className={`${container} py-10 sm:py-14`}
      >
        <div className="grid gap-5 border-b border-slate-200 pb-10 md:grid-cols-2 md:gap-12">
          <h2
            id="introduction-heading"
            className="max-w-md font-heading text-xl font-semibold leading-snug tracking-tight sm:text-2xl"
          >
            Your accommodation,
            <br />
            from the first application onwards.
          </h2>

          <div className="max-w-xl">
            <p className="text-sm leading-7 text-slate-600">
              Choosing a room is the first step. KejaSpace also helps you follow
              your application, see your rent charges and keep up with hostel
              notices throughout your stay.
            </p>

            <Link
              to="/about"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              Get to know KejaSpace
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Room photographs without boxed cards */}
      <section
        aria-labelledby="room-types-heading"
        className={`${container} pb-12 sm:pb-16`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
              The room collection
            </p>

            <h2
              id="room-types-heading"
              className="mt-2 font-heading text-xl font-semibold tracking-tight sm:text-2xl"
            >
              A little space of your own. Or room to share.
            </h2>
          </div>

          <Link
            to="/rooms"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            View all rooms →
          </Link>
        </div>

        <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {roomTypes.map((room) => (
            <article key={room.name} className="min-w-0">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-200">
                <img
                  src={room.image}
                  alt={`Illustrative ${room.name.toLowerCase()} room`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-base font-semibold">
                  {room.name}
                </h3>

                <span className="text-xs text-slate-500">{room.occupancy}</span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {room.description}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Photos illustrate room types. Check individual listings for current
          prices and available spaces.
        </p>
      </section>

      {/* Application guide */}
      <section
        aria-labelledby="process-heading"
        className="border-y border-slate-200 bg-white"
      >
        <div className={`${container} py-10 sm:py-14`}>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Before you move in
              </p>

              <h2
                id="process-heading"
                className="mt-3 font-heading text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Know what happens next.
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                Your account shows each stage of your application and
                reservation, including the payment deadline after approval.
              </p>
            </div>

            <ol className="divide-y divide-slate-200">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0 sm:gap-6"
                >
                  <span
                    aria-hidden="true"
                    className="pt-0.5 text-sm font-semibold text-blue-700"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h3 className="font-heading text-base font-semibold">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Expandable questions */}
      <section
        aria-labelledby="questions-heading"
        className={`${container} py-10 sm:py-14`}
      >
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h2
              id="questions-heading"
              className="font-heading text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Before you apply.
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
              A few useful things to know about getting started.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {questions.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="cursor-pointer text-sm font-semibold leading-6 text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
                  {item.question}
                </summary>

                <p className="mt-3 pl-4 text-sm leading-7 text-slate-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Simple closing invitation */}
      <section className="bg-[#eaeef2]">
        <div
          className={`${container} flex flex-col items-start justify-between gap-5 py-8 sm:flex-row sm:items-center sm:py-10`}
        >
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              Start with a look around.
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Compare rooms before deciding where to apply.
            </p>
          </div>

          <Link
            to="/rooms"
            className="inline-flex shrink-0 items-center justify-center gap-3 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Browse rooms
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
