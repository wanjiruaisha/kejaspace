import { useState } from "react";
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
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
  },
  {
    name: "phone_number",
    label: "Phone number",
    type: "tel",
    autoComplete: "tel",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
  },
  {
    name: "confirm_password",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
  },
];

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredUsername, setRegisteredUsername] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});

    if (form.password !== form.confirm_password) {
      setErrors({
        confirm_password: ["Your passwords do not match."],
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
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
                "We couldn’t create your account. Please try again.",
            ],
          });
        }
        return;
      }

      setRegisteredUsername(data?.username || form.username.trim());
      setForm(initialForm);
    } catch {
      setErrors({
        detail: [
          "Could not connect to the server. Please check your connection.",
        ],
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredUsername) {
    return (
      <section className="mx-auto max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">
          Registration successful
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Welcome, {registeredUsername}!
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          Your account has been created. You’ll need to log in before applying
          for accommodation.
        </p>

        <Link
          to="/login"
          className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          Continue to login
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
        Get started with KejaSpace
      </p>

      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        Create your account
      </h1>

      <p className="mt-3 leading-6 text-slate-500">
        Find a room and manage your hostel stay in one place.
      </p>

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          <ul className="list-inside list-disc space-y-2">
            {Object.entries(errors).map(([field, messages]) => (
              <li key={field}>
                {field !== "detail" && field !== "non_field_errors" && (
                  <span className="font-semibold">
                    {fields.find((item) => item.name === field)?.label || field}
                    :{" "}
                  </span>
                )}

                {Array.isArray(messages)
                  ? messages.join(" ")
                  : String(messages)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7">
        <fieldset disabled={submitting} className="space-y-5">
          <legend className="sr-only">Account details</legend>

          {fields.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                {field.label}
                {field.name === "phone_number" && (
                  <span className="font-normal text-slate-500">
                    {" "}
                    (optional)
                  </span>
                )}
              </label>

              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                value={form[field.name]}
                onChange={handleChange}
                required={field.name !== "phone_number"}
                aria-invalid={Boolean(errors[field.name])}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating your account…" : "Create account"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
