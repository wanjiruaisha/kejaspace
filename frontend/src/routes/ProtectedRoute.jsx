import { Navigate, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";
import LoadingMessage from "../components/common/LoadingMessage";

export default function ProtectedRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
  return <LoadingMessage label="Checking your session…" />;
}

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}