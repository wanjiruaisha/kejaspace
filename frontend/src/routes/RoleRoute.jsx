import { Navigate, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";

export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.is_superuser
    ? "admin"
    : user.is_staff
      ? "staff"
      : "resident";

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}