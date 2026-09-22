import { Navigate, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <p role="status" className="py-10 text-center text-slate-600">
        Checking your session…
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}