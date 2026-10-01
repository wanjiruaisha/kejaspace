import { useState } from "react";
import { Link } from "react-router";

const audiences = [
  {
    number: "01",
    title: "For residents",
    description:
      "Find your room, follow your application and check your rent records. Once checked in, register visitors and report maintenance issues.",
    label: "Your stay, organised.",
  },
  {
    number: "02",
    title: "For hostel staff",
    description:
      "Review applications, manage arrivals, record payments and follow up on maintenance requests and visitor records.",
    label: "Keep everyday tasks moving.",
  },
  {
    number: "03",
    title: "For administrators",
    description:
      "Keep room information updated, manage account access and publish the notices residents need to see.",
    label: "Keep everyone informed.",
  },
];

const steps = [
  {
    number: "01",
    title: "Find your room",
    description:
      "Compare room types and rent, then submit an application with your preferred move-in date.",
  },
  {
    number: "02",
    title: "Confirm your place",
    description:
      "After approval, pay the first month’s full rent before the deadline. Your reservation is confirmed when payment is recorded successfully.",
  },
  {
    number: "03",
    title: "Settle in",
    description:
      "Staff check you in when you arrive. Your account then helps you manage visitors, maintenance requests and your stay.",
  },
];

const eyebrowStyle =
  "text-xs font-semibold uppercase tracking-[0.14em] text-[#965038]";

const headingStyle =
  "font-heading text-xl font-bold tracking-tight text-[#173F35] sm:text-2xl";

const buttonStyle =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl " +
  "bg-[#245747] px-5 py-2.5 text-sm font-semibold text-white " +
  "transition-colors hover:bg-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747]";

export default function AboutPage() {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-10 sm:space-y-12">
      {/* Introduction */}
      <section
        aria-labelledby="about-heading"
        className="grid items-center gap-7 md:grid-cols-[1.15fr_0.85fr] md:gap-10"
      >
        <div>
          <p className={eyebrowStyle}>About KejaSpace</p>

          <p
            lang="sw"
            className="mt-4 font-heading text-base font-semibold text-[#245747]"
          >
            Karibu KejaSpace.
          </p>

          <h1
            id="about-heading"
            className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-[#173F35] sm:text-4xl"
          >
            Your space.
            <br />
            Your people.
            <br />
            <span className="text-[#965038]">Your next chapter.</span>
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-7 text-[#57534E]">
            Moving into a hostel comes with enough questions.{" "}
            <span lang="sw" className="font-semibold text-[#173F35]">
              Utakaa wapi?
            </span>{" "}
            What’s the rent? How do you report something that needs
            fixing?
          </p>

          <p className="mt-3 max-w-lg text-sm leading-7 text-[#57534E]">
            KejaSpace gives your accommodation a little more order—from
            finding a room to keeping track of everyday hostel life.
          </p>

          <Link to="/rooms" className={`mt-5 ${buttonStyle}`}>
            Find your room
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Compact portrait photo */}
        <figure className="relative mx-auto w-full max-w-sm md:max-w-none">
          <div className="overflow-hidden rounded-t-[3rem] rounded-b-2xl border border-[#245747]/15 bg-[#E8EDE4]">
            {photoFailed ? (
              <div className="flex h-80 items-center justify-center p-6 text-center sm:h-96">
                <div>
                  <p
                    lang="sw"
                    className="font-heading text-2xl font-bold text-[#173F35]"
                  >
                    Karibu.
                  </p>
                  <p className="mt-2 text-sm text-[#57534E]">
                    A little space to make your own.
                  </p>
                </div>
              </div>
            ) : (
              <img
                src="/images/home-hero.jpg"
                alt="Colourful shared lounge with seating and hanging lights"
                decoding="async"
                onError={() => setPhotoFailed(true)}
                className="h-80 w-full object-cover object-center sm:h-96"
              />
            )}
          </div>

          <figcaption className="absolute inset-x-4 bottom-4 rounded-xl border border-white/70 bg-[#FAF7F2]/95 p-4 supports-[backdrop-filter:blur(1px)]:bg-[#FAF7F2]/85 supports-[backdrop-filter:blur(1px)]:backdrop-blur-md">
            <p className="font-heading text-sm font-bold text-[#173F35]">
              Room for your everyday life.
            </p>

            <p className="mt-1 text-xs leading-5 text-[#57534E]">
              {photoFailed
                ? "Find a room and start planning your stay."
                : "An illustrative glimpse of shared living."}
            </p>
          </figcaption>
        </figure>
      </section>

      {/* Purpose, without another large card */}
      <section
        aria-labelledby="purpose-heading"
        className="grid gap-5 border-y border-[#245747]/15 py-7 md:grid-cols-[0.8fr_1.2fr] md:gap-10"
      >
        <div>
          <p className={eyebrowStyle}>Why KejaSpace?</p>

          <h2 id="purpose-heading" className={`mt-2 ${headingStyle}`}>
            Less chasing.
            <br />
            More settling in.
          </h2>
        </div>

        <div className="space-y-3 text-sm leading-7 text-[#57534E]">
          <p>
            Between classes, moving bags and learning your way around,
            keeping track of accommodation shouldn’t feel like another
            assignment.
          </p>

          <p>
            Has your application been approved? What rent is due? Is
            someone working on that repair? KejaSpace brings those
            records together so you can check your account and see
            where things stand.
          </p>
        </div>
      </section>

      {/* People */}
      <section aria-labelledby="audiences-heading">
        <p className={eyebrowStyle}>
          <span lang="sw">Tuko pamoja</span>
          <span className="normal-case tracking-normal">
            {" "}— we’re in this together
          </span>
        </p>

        <h2 id="audiences-heading" className={`mt-2 ${headingStyle}`}>
          Different roles. One connected hostel.
        </h2>

        <div className="mt-5 grid items-stretch gap-4 md:grid-cols-3">
          {audiences.map((audience) => (
            <article
              key={audience.number}
              className="flex min-w-0 flex-col rounded-2xl
                border border-[#245747]/15 bg-white p-5
                hover:border-[#245747]/35
                hover:shadow-[0_8px_24px_rgba(23,63,53,0.08)]
                motion-safe:transition-[transform,box-shadow,border-color]
                motion-safe:duration-300 motion-safe:hover:-translate-y-1"
            >
              <span
                aria-hidden="true"
                className="text-xs font-bold tracking-widest text-[#965038]"
              >
                {audience.number}
              </span>

              <h3 className="mt-3 font-heading text-base font-semibold text-[#173F35]">
                {audience.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                {audience.description}
              </p>

              <div className="mt-auto pt-4">
                <p className="border-t border-[#245747]/10 pt-3 text-xs font-medium text-[#245747]">
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
        className="rounded-2xl border border-[#245747]/10
          bg-gradient-to-br from-[#FAF7F2] via-[#EDF3E8] to-[#DCE9DD]
          p-5 sm:p-6"
      >
        <p className={eyebrowStyle}>Planning your move</p>

        <h2 id="process-heading" className={`mt-2 ${headingStyle}`}>
          From “which room?” to moving day.
        </h2>

        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="min-w-0 border-t border-[#245747]/25 pt-4"
            >
              <span
                aria-hidden="true"
                className="text-xs font-bold text-[#965038]"
              >
                {step.number}
              </span>

              <h3 className="mt-2 font-heading text-sm font-bold text-[#173F35]">
                {step.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#57534E]">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Honest project context */}
      <section
        aria-labelledby="project-heading"
        className="border-l-2 border-[#B45336]/50 py-1 pl-4 sm:pl-5"
      >
        <p className={eyebrowStyle}>Behind the project</p>

        <h2
          id="project-heading"
          className="mt-2 font-heading text-base font-semibold text-[#173F35]"
        >
          Built by a student, with hostel life in mind.
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#57534E]">
          KejaSpace is a student-built hostel management project exploring
          how room applications, resident services and management can
          work together. It is still being developed and tested, with
          the aim of making everyday accommodation tasks easier to follow.
        </p>
      </section>

      {/* Final invitation */}
      <section
        aria-labelledby="explore-heading"
        className="flex flex-col items-start justify-between gap-5
          rounded-2xl bg-[#173F35] p-5 text-[#FAF7F2]
          sm:flex-row sm:items-center sm:p-6"
      >
        <div>
          <p lang="sw" className="text-xs font-medium text-[#E9BC9F]">
            Karibu kwako.
          </p>

          <h2
            id="explore-heading"
            className="mt-2 font-heading text-lg font-semibold"
          >
            Your next chapter needs a space.
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#D4E2D8]">
            Start with a look around. Find the room that suits you.
          </p>
        </div>

        <Link
          to="/rooms"
          className="inline-flex min-h-11 w-full shrink-0 items-center
            justify-center gap-2 rounded-xl bg-[#FAF7F2]
            px-5 py-2.5 text-sm font-semibold text-[#173F35]
            transition-colors hover:bg-[#E8EDE4]
            focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-[#E9BC9F] sm:w-auto"
        >
          Explore rooms
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}