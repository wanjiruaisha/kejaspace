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
      "See your rent charges, recorded payments and outstanding balances.",
    tag: "Know what you owe",
  },
  {
    title: "Help when you need it",
    description:
      "Report maintenance issues and read updates from hostel staff.",
    tag: "Stay informed",
  },
  {
    title: "Visitors and notices",
    description:
      "Register expected visitors and catch up on published hostel announcements.",
    tag: "Stay connected",
  },
];

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800";

const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

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
    <div className="space-y-16 sm:space-y-20">
      {/* Introduction and room photo */}
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-blue-50 blur-3xl"
        />

        <div className="relative grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:p-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-blue-600"
              />
              Welcome to KejaSpace
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Your next chapter.
              <span className="block text-blue-700">
                Your own space.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Find a hostel room that suits you, apply for accommodation
              and keep your stay organised—all in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/rooms" className={primaryButton}>
                Browse rooms
                <span aria-hidden="true">↗</span>
              </Link>

              {!authLoading &&
                (user ? (
                  <Link to={accountLink} className={secondaryButton}>
                    {isManagement
                      ? "Manage applications"
                      : "My applications"}
                  </Link>
                ) : (
                  <Link to="/register" className={secondaryButton}>
                    Create an account
                  </Link>
                ))}
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Explore room options before creating an account.
            </p>
          </div>

          <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <img
              src="/images/rooms/triple.jpeg"
              alt="Shared bedroom with three single beds and a central window"
              width={1200}
              height={900}
              className="aspect-[4/3] w-full object-cover"
            />

            <figcaption className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                A look inside
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Picture your next space.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Explore room options, compare prices and check
                availability before applying.
              </p>

              <Link
                to="/rooms"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                Browse rooms
                <span aria-hidden="true">→</span>
              </Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Accommodation process */}
      <section aria-labelledby="how-it-works-heading">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            How it works
          </p>

          <h2
            id="how-it-works-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            From browsing to moving in.
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Four steps to getting settled. Your account helps you keep
            track along the way.
          </p>
        </div>

        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.number}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="text-3xl font-bold tracking-tight text-blue-600">
                {step.number}
              </span>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Resident features */}
      <section
        aria-labelledby="features-heading"
        className="rounded-[2rem] bg-slate-100 p-6 sm:p-10"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
            More than finding a room
          </p>

          <h2
            id="features-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Keep your stay in order.
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            Everyday hostel tasks, with a clear place to find what you need.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                {feature.tag}
              </p>

              <h3 className="mt-3 text-xl font-bold text-slate-900">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Final invitation */}
      <section className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-blue-700 p-7 text-white sm:p-10 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isResident
              ? "Already planning your move?"
              : "Find a space for your next chapter."}
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">
            {isResident
              ? "Check your application progress or explore the available rooms."
              : "Explore room options and take the first step towards your stay."}
          </p>
        </div>

        <Link
          to={isResident ? "/my-applications" : "/rooms"}
          className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
        >
          {isResident ? "View my applications" : "Explore rooms"}
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}