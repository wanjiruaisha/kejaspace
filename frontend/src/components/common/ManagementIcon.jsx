const paths = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  rooms: "M4 21V3h12v18 M2 21h20 M16 8h4v13 M8 7h4 M8 11h4 M8 15h4",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  applications: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  stays: "M3 18v3 M21 18v3 M3 10v8h18v-5a3 3 0 0 0-3-3H3z M3 10V5 M7 10V7h5v3",
  payments: "M3 5h18v14H3z M3 9h18 M7 15h3 M15 15h2",
  maintenance: "M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2.12 2.12 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z",
  visitors: "M15 3h5v18h-5 M10 17l5-5-5-5 M15 12H3",
  notices: "M3 10v4h4l10 5V5L7 10H3z M7 14l2 7h3 M21 9v6",
  arrow: "M7 17 17 7 M7 7h10v10",
  refresh: "M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-1l2 3 M4 15l2 3a7 7 0 0 0 12-1",
  clock: "M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  check: "M9 12l2 2 4-4 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
};

export default function ManagementIcon({
  name,
  className = "size-4",
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name] || paths.dashboard} />
    </svg>
  );
}