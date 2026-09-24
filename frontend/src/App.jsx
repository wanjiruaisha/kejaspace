import { Route, Routes } from "react-router";

import PublicLayout from "./layouts/PublicLayout";

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

// Admin pages
import ManageAnnouncementsPage from "./pages/admin/ManageAnnouncementsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {/* Public pages */}
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />

        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomDetailsPage />} />

        <Route path="register" element={<RegisterPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />

        {/* Login required */}
        <Route element={<ProtectedRoute />}>
          {/* Available to every logged-in role */}
          <Route
            path="announcements"
            element={<AnnouncementsPage />}
          />

          {/* Residents only */}
          <Route element={<RoleRoute allowedRoles={["resident"]} />}>
            <Route
              path="rooms/:id/apply"
              element={<ApplyPage />}
            />
            <Route
              path="my-applications"
              element={<MyApplicationsPage />}
            />
            <Route
              path="my-stay"
              element={<MyStayPage />}
            />
            <Route
              path="my-charges"
              element={<MyChargesPage />}
            />
            <Route
              path="my-maintenance"
              element={<MyMaintenancePage />}
            />
            <Route
              path="my-visitors"
              element={<MyVisitorsPage />}
            />
          </Route>

          {/* Staff and admins */}
          <Route
            element={<RoleRoute allowedRoles={["staff", "admin"]} />}
          >
            <Route
              path="staff/applications"
              element={<ApplicationsPage />}
            />
            <Route
              path="staff/stays"
              element={<StaysPage />}
            />
            <Route
              path="staff/maintenance"
              element={<MaintenancePage />}
            />
            <Route
              path="staff/visitors"
              element={<VisitorsPage />}
            />
          </Route>

          {/* Admins only */}
          <Route element={<RoleRoute allowedRoles={["admin"]} />}>
            <Route
              path="admin/announcements"
              element={<ManageAnnouncementsPage />}
            />
          </Route>
        </Route>

        {/* Unmatched addresses */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}