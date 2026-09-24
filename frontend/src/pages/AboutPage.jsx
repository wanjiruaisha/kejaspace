import { Link } from "react-router";

const audiences = [
  {
    number: "01",
    title: "For residents",
    description:
      "Find a room, follow your application and keep track of your accommodation. Once checked in, register visitors and report maintenance issues.",
  },
  {
    number: "02",
    title: "For hostel staff",
    description:
      "Review applications, manage resident arrivals and departures, handle visitor records and keep residents updated on repairs.",
  },
  {
    number: "03",
    title: "For administrators",
    description:
      "Oversee hostel operations and control management access, room information and published announcements.",
  },
];

const principles = [
  {
    title: "Clear next steps",
    description:
      "Application, payment and stay statuses help residents understand where they are in the accommodation process.",
  },
  {
    title: "Connected information",
    description:
      "Applications, stays and rent charges are linked so the relevant information stays together.",
  },
  {
    title: "Access that fits your role",
    description:
      "Residents manage their own records, while staff and administrators access the tools their work requires.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-14 sm:space-y-20">
      {/* Introduction */}
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full border-[40px] border-white/5"
        />

        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            About KejaSpace
          </p>

          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            A clearer way to manage
            <span className="block text-blue-300">
              hostel life.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            KejaSpace brings room applications, resident stays and
            everyday hostel services into one place—helping residents
            and management keep track of what matters.
          </p>
        </div>
      </section>

      {/* Purpose */}
      <section
        aria-labelledby="purpose-heading"
        className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Why KejaSpace exists
          </p>

          <h2
            id="purpose-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Less confusion.
            <br />
            More clarity.
          </h2>
        </div>

        <div className="space-y-5 text-base leading-8 text-slate-600">
          <p>
            Finding a room is only the beginning. Residents also need
            to know whether their application was approved, what rent
            is due and who is handling a reported problem.
          </p>

          <p>
            Hostel management needs a clear record of room allocations,
            resident arrivals, visitors and maintenance requests.
            When that information is scattered, keeping everyone
            informed becomes harder.
          </p>

          <p>
            KejaSpace is designed to bring these activities together,
            with clear statuses and separate tools for residents,
            staff and administrators.
          </p>
        </div>
      </section>

      {/* Users */}
      <section aria-labelledby="audiences-heading">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Who it serves
          </p>

          <h2
            id="audiences-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900"
          >
            One system. Different responsibilities.
          </h2>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {audiences.map((audience) => (
            <article
              key={audience.number}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                {audience.number}
              </span>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {audience.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {audience.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Accommodation process */}
      <section
        aria-labelledby="process-heading"
        className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            Understanding your stay
          </p>

          <h2
            id="process-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900"
          >
            From application to arrival.
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Each stage has a different meaning, so you know what
            has been confirmed and what comes next.
          </p>
        </div>

        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          <li className="border-t-2 border-blue-600 pt-5">
            <h3 className="font-bold text-slate-900">
              1. Apply and receive a decision
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Choose a room and move-in date. Staff review your
              application and check whether a space can be allocated.
            </p>
          </li>

          <li className="border-t-2 border-blue-400 pt-5">
            <h3 className="font-bold text-slate-900">
              2. Confirm with payment
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Approval creates a temporary room hold and the initial
              rent charge. Pay the first month’s full rent before
              the deadline to confirm your reservation.
            </p>
          </li>

          <li className="border-t-2 border-blue-200 pt-5">
            <h3 className="font-bold text-slate-900">
              3. Arrive and check in
            </h3>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Staff check you in when you arrive. Your account then
              helps you manage your stay, report issues and register
              expected visitors.
            </p>
          </li>
        </ol>
      </section>

      {/* Design principles */}
      <section aria-labelledby="principles-heading">
        <h2
          id="principles-heading"
          className="text-3xl font-bold tracking-tight text-slate-900"
        >
          Built around everyday needs.
        </h2>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {principles.map((principle) => (
            <article key={principle.title}>
              <h3 className="text-lg font-bold text-slate-900">
                {principle.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Honest project context */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-blue-950">
          About this project
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-900">
          KejaSpace is a student-built demonstration project exploring
          how a hostel management system can work. Features are being
          developed and tested, and the M-Pesa integration currently
          uses a sandbox environment rather than live payments.
        </p>
      </section>

      {/* Navigation */}
      <section className="flex flex-col items-start justify-between gap-6 border-t border-slate-200 pt-8 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Take a look around.
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-600">
            Explore the room options and see how KejaSpace works.
          </p>
        </div>

        <Link
          to="/rooms"
          className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          Browse rooms
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}