import { useRef, useState } from "react";
import { Link } from "react-router";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const initialForm = {
  username: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
};

const fields = [
  {
    name: "username",
    label: "Username",
    type: "text",
    autoComplete: "username",
    placeholder: "Choose a username",
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
    placeholder: "you@example.com",
  },
  {
    name: "phone_number",
    label: "Phone number",
    type: "tel",
    autoComplete: "tel",
    placeholder: "Your phone number",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
    placeholder: "Create a password",
  },
  {
    name: "confirm_password",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
    placeholder: "Repeat your password",
  },
];

const inputStyle =
  "min-h-11 w-full min-w-0 rounded-xl border bg-white " +
  "px-3.5 py-2.5 text-sm text-[#173F35] " +
  "placeholder:text-[#78716C] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const buttonStyle =
  "inline-flex min-h-11 items-center justify-center gap-2 " +
  "rounded-xl bg-[#245747] px-5 py-3 text-sm font-semibold text-white " +
  "transition-colors hover:bg-[#173F35] " +
  "focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[#245747] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function errorText(messages) {
  return Array.isArray(messages) ? messages.join(" ") : String(messages);
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState("");
  const [photoFailed, setPhotoFailed] = useState(false);

  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirm_password: false,
  });

  const submissionRef = useRef(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function togglePassword(name) {
    setVisiblePasswords((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submissionRef.current) return;

    setErrors({});

    const cleanUsername = form.username.trim();
    const cleanEmail = form.email.trim();
    const validationErrors = {};

    if (!cleanUsername) {
      validationErrors.username = ["Please enter a username."];
    }

    if (!cleanEmail) {
      validationErrors.email = ["Please enter your email address."];
    }

    if (form.password !== form.confirm_password) {
      validationErrors.confirm_password = ["Your passwords do not match."];
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    submissionRef.current = true;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          phone_number: form.phone_number.trim(),
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (
          response.status === 400 &&
          data &&
          typeof data === "object" &&
          !Array.isArray(data)
        ) {
          setErrors(data);
        } else {
          setErrors({
            detail: [
              data?.detail ||
                (response.status === 429
                  ? "Too many requests. Please wait before trying again."
                  : "We couldn’t create your account. Please try again."),
            ],
          });
        }

        return;
      }

      setRegisteredUsername(data?.username || cleanUsername);
      setForm(initialForm);
      setVisiblePasswords({
        password: false,
        confirm_password: false,
      });
    } catch {
      setErrors({
        detail: [
          "We couldn’t confirm whether your account was created because the connection was interrupted. Try logging in first. If that doesn’t work, try registering again.",
        ],
      });
    } finally {
      submissionRef.current = false;
      setSubmitting(false);
    }
  }

  if (registeredUsername) {
    return (
      <section
        aria-labelledby="registration-success-heading"
        className="mx-auto w-full max-w-md overflow-hidden rounded-2xl
          border border-[#245747]/15 bg-[#FAF7F2] shadow-sm"
      >
        <div className="bg-gradient-to-br from-[#EDF3E8] to-[#D6E7DD] p-5 sm:p-6">
          <span
            aria-hidden="true"
            className="flex size-11 items-center justify-center
              rounded-full bg-[#245747] text-white"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>

          <p
            role="status"
            className="mt-4 text-xs font-semibold text-[#245747]"
          >
            Registration successful
          </p>

          <h1
            id="registration-success-heading"
            className="mt-2 break-words font-heading text-2xl
              font-bold tracking-tight text-[#173F35]"
          >
            Welcome, {registeredUsername}!
          </h1>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-sm leading-6 text-[#57534E]">
            Your account is ready. Log in to apply for a room and start managing
            your stay.
          </p>

          <Link to="/login" className={`mt-5 w-full ${buttonStyle}`}>
            Continue to login
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="register-heading"
      className="mx-auto grid w-full max-w-4xl overflow-hidden
        rounded-3xl border border-[#245747]/15 bg-[#FAF7F2]
        shadow-[0_12px_40px_rgba(23,63,53,0.07)]
        md:grid-cols-[0.85fr_1.15fr]"
    >
      {/* Decorative photo panel */}
      <div className="relative isolate hidden overflow-hidden bg-[#173F35] md:flex md:flex-col md:justify-between">
        {!photoFailed && (
          <img
            src="/images/home-hero.jpg"
            alt=""
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 -z-20 h-full w-full object-cover"
          />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b
            from-[#102E28]/65 via-[#102E28]/25 to-[#102E28]/85"
        />

        <Link
          to="/"
          aria-label="KejaSpace home"
          className="m-6 inline-flex min-h-11 items-center gap-1
            self-start rounded-lg px-2 font-heading text-lg
            font-bold text-white focus-visible:outline-2
            focus-visible:outline-offset-4
            focus-visible:outline-[#E9BC9F]"
        >
          KejaSpace
          <span aria-hidden="true" className="text-[#E9BC9F]">
            .
          </span>
        </Link>

        <div className="m-6 rounded-2xl border border-white/25 bg-[#102E28]/85 p-5 text-white supports-[backdrop-filter:blur(1px)]:bg-[#102E28]/65 supports-[backdrop-filter:blur(1px)]:backdrop-blur-md">
          <p lang="sw" className="text-xs font-semibold text-[#E9BC9F]">
            Karibu kwako.
          </p>

          <h2 className="mt-3 font-heading text-2xl font-bold leading-tight">
            Your next chapter
            <br />
            starts here.
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#E2EBE4]">
            Find a room that suits you, follow your application and keep your
            hostel life organised.
          </p>
        </div>
      </div>

      {/* Registration form */}
      <div className="min-w-0 px-5 py-6 sm:px-7 sm:py-7">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2
            rounded-lg text-xs font-semibold text-[#245747]
            underline-offset-4 hover:underline"
        >
          <span aria-hidden="true">←</span>
          Back to home
        </Link>

        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#965038]">
          Join KejaSpace
        </p>

        <h1
          id="register-heading"
          className="mt-2 font-heading text-2xl font-bold
            tracking-tight text-[#173F35]"
        >
          Create your account.
        </h1>

        <p className="mt-2 text-sm leading-6 text-[#57534E]">
          A few details, and you’re ready to start planning your stay.
        </p>

        {Object.keys(errors).length > 0 && (
          <div
            id="register-errors"
            role="alert"
            className="mt-4 rounded-xl border border-red-100
              bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            <ul className="list-inside list-disc space-y-1">
              {Object.entries(errors).map(([field, messages]) => (
                <li key={field}>
                  {field !== "detail" && field !== "non_field_errors" && (
                    <span className="font-semibold">
                      {fields.find((item) => item.name === field)?.label ||
                        field}
                      :{" "}
                    </span>
                  )}

                  {errorText(messages)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          aria-describedby={
            Object.keys(errors).length > 0 ? "register-errors" : undefined
          }
          className="mt-5"
        >
          <fieldset disabled={submitting} className="min-w-0 space-y-3.5">
            <legend className="sr-only">Account details</legend>

            {fields.map((field) => {
              const isPassword = field.type === "password";
              const visible = Boolean(visiblePasswords[field.name]);
              const hasError = Boolean(errors[field.name]);
              const inputId = `register-${field.name}`;

              return (
                <div key={field.name}>
                  <label
                    htmlFor={inputId}
                    className="mb-1.5 block text-sm font-semibold text-[#173F35]"
                  >
                    {field.label}

                    {field.name === "phone_number" && (
                      <span className="font-normal text-[#78716C]">
                        {" "}
                        (optional)
                      </span>
                    )}
                  </label>

                  <div className="relative">
                    <input
                      id={inputId}
                      name={field.name}
                      type={
                        isPassword
                          ? visible
                            ? "text"
                            : "password"
                          : field.type
                      }
                      autoComplete={field.autoComplete}
                      autoCapitalize="none"
                      spellCheck={false}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required={field.name !== "phone_number"}
                      aria-invalid={hasError}
                      aria-describedby={
                        hasError ? `${inputId}-error` : undefined
                      }
                      className={`${inputStyle} ${
                        hasError ? "border-red-400" : "border-[#245747]/20"
                      } ${isPassword ? "pr-20" : ""}`}
                    />

                    {isPassword && (
                      <button
                        type="button"
                        aria-label={`${visible ? "Hide" : "Show"} ${field.label.toLowerCase()}`}
                        aria-controls={inputId}
                        title={visible ? "Hide password" : "Show password"}
                        disabled={submitting}
                        onClick={() => togglePassword(field.name)}
                        className="absolute right-1 top-1/2 inline-flex size-11
      -translate-y-1/2 items-center justify-center rounded-lg
      text-[#245747] transition-colors hover:bg-[#E8EDE4]
      focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-[#245747]
      disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          focusable="false"
                        >
                          {visible ? (
                            <>
                              <path d="m3 3 18 18" />
                              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                              <path d="M9.9 5.2A11 11 0 0 1 12 5c7 0 10 7 10 7a16 16 0 0 1-3.1 4.2" />
                              <path d="M6.5 6.5A16 16 0 0 0 2 12s3 7 10 7a11 11 0 0 0 5.5-1.5" />
                            </>
                          ) : (
                            <>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          )}
                        </svg>
                      </button>
                    )}
                  </div>

                  {hasError && (
                    <p
                      id={`${inputId}-error`}
                      className="mt-1.5 text-xs leading-5 text-red-800"
                    >
                      {errorText(errors[field.name])}
                    </p>
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full ${buttonStyle}`}
            >
              {submitting ? "Creating your account…" : "Create account"}

              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </fieldset>
        </form>

        <p className="mt-5 border-t border-[#245747]/15 pt-4 text-sm leading-6 text-[#57534E]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#245747]
              underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}
