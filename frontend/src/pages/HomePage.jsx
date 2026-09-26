import { Link } from "react-router";
import useAuth from "../hooks/useAuth";

const steps = [
  {
    number: "01",
    title: "Find your room",
    description:
      "Explore room options, compare monthly prices and check available spaces.",
  },
  {
    number: "02",
    title: "Send an application",
    description:
      "Choose your room and move-in date. Hostel staff will review your request.",
  },
  {
    number: "03",
    title: "Confirm your reservation",
    description:
      "After approval, pay the first month’s full rent before your payment deadline.",
  },
  {
    number: "04",
    title: "Move in",
    description:
      "Staff check you in when you arrive. Then manage your stay from your account.",
  },
];

const features = [
  {
    title: "Your accommodation",
    description:
      "Follow your application, view your assigned room and keep track of your stay.",
    tag: "Stay organised",
  },
  {
    title: "Rent, clearly displayed",
    description:
      "See your rent charges, payment summaries and outstanding balances.",
    tag: "Know what you owe",
  },
  {
    title: "Help when you need it",
    description:
      "Report maintenance issues and follow updates on their progress.",
    tag: "Get support",
  },
  {
    title: "Visitors and notices",
    description:
      "Register expected visitors and read published hostel announcements.",
    tag: "Stay connected",
  },
];

export default function HomePage() {
  const { user, authLoading } = useAuth();

  const isResident =
    !authLoading && user && !user.is_staff && !user.is_superuser;

  const isManagement =
    !authLoading && user && (user.is_staff || user.is_superuser);

  const accountLink = isManagement
    ? "/staff/applications"
    : "/my-applications";

  return (
    <div className="min-w-0 space-y-10 sm:space-y-12">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-blue-50 blur-3xl"
        />

        <div className="relative grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-2 lg:gap-8">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-blue-600"
              />
              Welcome to KejaSpace
            </span>

            <h1 className="mt-4 max-w-lg font-heading text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Your next chapter.
              <span className="block text-blue-700">
                Your own space.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              Find a hostel room that suits you, apply for accommodation
              and keep your stay organised—all in one place.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/rooms" className="button-primary gap-2">
                Browse rooms
                <span aria-hidden="true">↗</span>
              </Link>

              {!authLoading &&
                (user ? (
                  <Link
                    to={accountLink}
                    className="button-secondary"
                  >
                    {isManagement
                      ? "Manage applications"
                      : "My applications"}
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="button-secondary"
                  >
                    Create an account
                  </Link>
                ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Explore room options before creating an account.
            </p>
          </div>

          <figure className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/rooms/triple.jpeg"
              alt="Shared bedroom with three single beds and a central window"
              width={1200}
              height={900}
              className="aspect-[16/10] w-full object-cover"
            />

            <figcaption className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                A look inside
              </p>

              <h2 className="mt-2 font-heading text-base font-semibold text-slate-900">
                Picture your next space.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Compare room options and check availability before applying.
              </p>

              <Link
                to="/rooms"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                View rooms
                <span aria-hidden="true">→</span>
              </Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Accommodation process */}
      <section aria-labelledby="how-it-works-heading">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            How it works
          </p>

          <h2
            id="how-it-works-heading"
            className="mt-2 font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            From browsing to moving in.
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Four steps to getting settled, with your account keeping
            you updated along the way.
          </p>
        </div>

        <ol className="mt-5 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.number}
              className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                {step.number}
              </span>

              <h3 className="mt-4 font-heading text-base font-semibold leading-6 text-slate-900">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Resident features */}
      <section
        aria-labelledby="features-heading"
        className="rounded-2xl bg-slate-100 p-5 sm:p-6"
      >
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            More than finding a room
          </p>

          <h2
            id="features-heading"
            className="mt-2 font-heading text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Keep your stay in order.
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            A clear place to manage everyday hostel tasks.
          </p>
        </div>

        <div className="mt-5 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <p className="text-xs font-medium text-blue-700">
                {feature.tag}
              </p>

              <h3 className="mt-2 font-heading text-base font-semibold text-slate-900">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Final invitation */}
      <section className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-blue-700 p-5 text-white sm:p-6 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {isManagement
              ? "Keep your hostel organised."
              : isResident
                ? "Already planning your move?"
                : "Find a space for your next chapter."}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
            {isManagement
              ? "Review accommodation applications and follow up on requests."
              : isResident
                ? "Check your application progress or explore available rooms."
                : "Explore room options and take the first step towards your stay."}
          </p>
        </div>

        <Link
          to={
            isManagement
              ? "/staff/applications"
              : isResident
                ? "/my-applications"
                : "/rooms"
          }
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
        >
          {isManagement
            ? "Manage applications"
            : isResident
              ? "My applications"
              : "Explore rooms"}
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}