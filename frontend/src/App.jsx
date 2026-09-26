import { Route, Routes } from "react-router";

import PublicLayout from "./layouts/PublicLayout";
import ManagementLayout from "./layouts/ManagementLayout";

import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

// General pages
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailsPage from "./pages/RoomDetailsPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import NotFoundPage from "./pages/NotFoundPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import AboutPage from "./pages/AboutPage";

// Authentication
import RegisterPage from "./pages/auth/RegisterPage";
import LoginPage from "./pages/auth/LoginPage";

// Resident pages
import ApplyPage from "./pages/resident/ApplyPage";
import MyApplicationsPage from "./pages/resident/MyApplicationsPage";
import MyStayPage from "./pages/resident/MyStayPage";
import MyChargesPage from "./pages/resident/MyChargesPage";
import MyMaintenancePage from "./pages/resident/MyMaintenancePage";
import MyVisitorsPage from "./pages/resident/MyVisitorsPage";

// Staff pages
import ApplicationsPage from "./pages/staff/ApplicationsPage";
import MaintenancePage from "./pages/staff/MaintenancePage";
import VisitorsPage from "./pages/staff/VisitorsPage";
import StaysPage from "./pages/staff/StaysPage";
import RentPaymentsPage from "./pages/staff/RentPaymentsPage";
import DashboardPage from "./pages/staff/DashboardPage";

// Admin pages
import ManageAnnouncementsPage from "./pages/admin/ManageAnnouncementsPage";
import ManageRoomsPage from "./pages/admin/ManageRoomsPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";

export default function App() {
  return (
    <Routes>
      {/* Public website and resident area */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomDetailsPage />} />

        <Route path="register" element={<RegisterPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="announcements" element={<AnnouncementsPage />} />

          <Route element={<RoleRoute allowedRoles={["resident"]} />}>
            <Route path="rooms/:id/apply" element={<ApplyPage />} />
            <Route path="my-applications" element={<MyApplicationsPage />} />
            <Route path="my-stay" element={<MyStayPage />} />
            <Route path="my-charges" element={<MyChargesPage />} />
            <Route path="my-maintenance" element={<MyMaintenancePage />} />
            <Route path="my-visitors" element={<MyVisitorsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Separate staff/admin area */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={["staff", "admin"]} />}>
          <Route element={<ManagementLayout />}>
            <Route path="staff/applications" element={<ApplicationsPage />} />
            <Route path="staff/dashboard" element={<DashboardPage />} />
            <Route path="staff/stays" element={<StaysPage />} />
            <Route path="staff/maintenance" element={<MaintenancePage />} />
            <Route path="staff/visitors" element={<VisitorsPage />} />
            <Route path="staff/rent-payments" element={<RentPaymentsPage />} />
            <Route path="staff/notices" element={<AnnouncementsPage />} />

            <Route element={<RoleRoute allowedRoles={["admin"]} />}>
              <Route
                path="admin/announcements"
                element={<ManageAnnouncementsPage />}
              />
              <Route path="admin/rooms" element={<ManageRoomsPage />} />
              <Route path="admin/users" element={<ManageUsersPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
