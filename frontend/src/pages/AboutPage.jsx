import { Link } from "react-router";

const audiences = [
  {
    number: "01",
    title: "For residents",
    description:
      "Browse rooms, follow your application and track rent charges. Once checked in, register visitors and report maintenance issues.",
    label: "Your stay, organised",
  },
  {
    number: "02",
    title: "For hostel staff",
    description:
      "Review applications, manage arrivals and departures, record payments and follow up on visitors and maintenance requests.",
    label: "Everyday operations",
  },
  {
    number: "03",
    title: "For administrators",
    description:
      "Oversee hostel operations, manage user access, maintain room information and publish announcements.",
    label: "Management and oversight",
  },
];

const steps = [
  {
    number: "01",
    title: "Apply for a room",
    description:
      "Choose a room and your move-in date. Staff review your application and check whether a space can be allocated.",
  },
  {
    number: "02",
    title: "Confirm your reservation",
    description:
      "Approval creates a temporary hold and an initial rent charge. The first month’s full rent must be paid and confirmed before the payment deadline.",
  },
  {
    number: "03",
    title: "Arrive and check in",
    description:
      "Staff check you in when you arrive. You can then register expected visitors and submit maintenance requests from your account.",
  },
];

const principles = [
  {
    title: "Clear next steps",
    description:
      "Follow application, payment and stay statuses to understand what has been completed and what needs your attention.",
  },
  {
    title: "Information together",
    description:
      "Applications, stays and rent charges are connected, making your accommodation records easier to follow.",
  },
  {
    title: "Tools for each role",
    description:
      "Residents access their own records. Staff and administrators have separate tools for their responsibilities.",
  },
];

const eyebrowStyle =
  "text-xs font-semibold uppercase tracking-widest text-blue-700";

const headingStyle =
  "font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl";

export default function AboutPage() {
  return (
    <div className="min-w-0 space-y-8 sm:space-y-10">
      {/* Introduction */}
      <section
        aria-labelledby="about-heading"
        className="relative isolate overflow-hidden rounded-2xl bg-slate-900 p-5 text-white sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[32px] border-white/5"
        />

        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
            About KejaSpace
          </p>

          <h1
            id="about-heading"
            className="mt-3 font-heading text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          >
            A clearer way to manage
            <span className="block text-blue-300">hostel life.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            From finding a room to managing your stay, KejaSpace brings
            accommodation applications, rent records and everyday hostel
            services into one place.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {["Room applications", "Resident services", "Hostel management"].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                >
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Purpose */}
      <section
        aria-labelledby="purpose-heading"
        className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10"
      >
        <div>
          <p className={eyebrowStyle}>Why we built it</p>

          <h2 id="purpose-heading" className={`mt-2 ${headingStyle}`}>
            Keep track of your stay.
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            A clear place for the information you need throughout your
            accommodation journey.
          </p>
        </div>

        <div className="space-y-3 text-sm leading-6 text-slate-600">
          <p>
            Finding a room is only the beginning. Residents also need to
            know whether their application was approved, what rent is due
            and the progress of a reported maintenance issue.
          </p>

          <p>
            Hostel teams need organised records of room allocations,
            arrivals, payments and visitors. KejaSpace brings these
            activities together so residents and management can follow
            what is happening.
          </p>
        </div>
      </section>

      {/* Users */}
      <section aria-labelledby="audiences-heading">
        <p className={eyebrowStyle}>Who it serves</p>

        <h2 id="audiences-heading" className={`mt-2 ${headingStyle}`}>
          A shared system for hostel life.
        </h2>

        <div className="mt-5 grid items-stretch gap-4 md:grid-cols-3">
          {audiences.map((audience) => (
            <article
              key={audience.number}
              className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700"
              >
                {audience.number}
              </span>

              <h3 className="mt-4 font-heading text-base font-semibold text-slate-900">
                {audience.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {audience.description}
              </p>

              <div className="mt-auto pt-5">
                <p className="border-t border-slate-100 pt-3 text-xs font-medium text-blue-700">
                  {audience.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Accommodation process */}
      <section
        aria-labelledby="process-heading"
        className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6"
      >
        <p className={eyebrowStyle}>Understanding your stay</p>

        <h2 id="process-heading" className={`mt-2 ${headingStyle}`}>
          From application to arrival.
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Each stage tells you what has been confirmed and what to do next.
        </p>

        <ol className="mt-6 grid gap-5 md:grid-cols-3 md:gap-6">
          {steps.map((step) => (
            <li
              key={step.number}
              className="min-w-0 border-t border-blue-200 pt-4"
            >
              <span
                aria-hidden="true"
                className="text-xs font-bold tracking-wider text-blue-700"
              >
                STEP {step.number}
              </span>

              <h3 className="mt-2 font-heading text-base font-semibold text-slate-900">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-5 border-t border-blue-100 pt-4 text-xs leading-5 text-blue-900">
          Application approval is a temporary allocation. Your reservation
          is confirmed after the required first month’s rent is recorded
          successfully within the payment deadline.
        </p>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-heading">
        <p className={eyebrowStyle}>What matters</p>

        <h2 id="principles-heading" className={`mt-2 ${headingStyle}`}>
          Built around everyday needs.
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {principles.map((principle) => (
            <article
              key={principle.title}
              className="min-w-0 border-l-2 border-blue-200 py-1 pl-4"
            >
              <h3 className="font-heading text-base font-semibold text-slate-900">
                {principle.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Project context */}
      <section
        aria-labelledby="project-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="project-heading"
            className="font-heading text-base font-semibold text-slate-900"
          >
            About this project
          </h2>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Student demonstration
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          KejaSpace is a student-built hostel management project.
          Features are being developed and tested. M-Pesa payments
          currently use a test environment and do not process live payments.
        </p>
      </section>

      {/* Navigation */}
      <section
        aria-labelledby="explore-heading"
        className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-blue-700 p-5 text-white sm:flex-row sm:items-center sm:p-6"
      >
        <div>
          <h2
            id="explore-heading"
            className="font-heading text-lg font-semibold"
          >
            Find a space that suits you.
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-100">
            Browse room types, compare rent and check available spaces.
          </p>
        </div>

        <Link
          to="/rooms"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 sm:w-auto"
        >
          Browse rooms
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}