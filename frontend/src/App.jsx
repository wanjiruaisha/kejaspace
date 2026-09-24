import { Route, Routes } from "react-router";

import PublicLayout from "./layouts/PublicLayout";

import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailsPage from "./pages/RoomDetailsPage";
import NotFoundPage from "./pages/NotFoundPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

import RegisterPage from "./pages/auth/RegisterPage";
import LoginPage from "./pages/auth/LoginPage";
import MyApplicationsPage from "./pages/resident/MyApplicationsPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import ApplyPage from "./pages/resident/ApplyPage";
import ApplicationsPage from "./pages/staff/ApplicationsPage";
import MyStayPage from "./pages/resident/MyStayPage";
import MyChargesPage from "./pages/resident/MyChargesPage";
import MyMaintenancePage from "./pages/resident/MyMaintenancePage";
import MaintenancePage from "./pages/staff/MaintenancePage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomDetailsPage />} />

        <Route path="register" element={<RegisterPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={["resident"]} />}>
            <Route path="my-applications" element={<MyApplicationsPage />} />
            <Route path="rooms/:id/apply" element={<ApplyPage />} />
            <Route path="my-stay" element={<MyStayPage />} />
            <Route path="my-charges" element={<MyChargesPage />} />
            <Route path="my-maintenance" element={<MyMaintenancePage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={["staff", "admin"]} />}>
            <Route path="staff/applications" element={<ApplicationsPage />} />
            <Route path="staff/maintenance" element={<MaintenancePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
