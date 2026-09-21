import { Route, Routes } from "react-router";

import PublicLayout from "./layouts/PublicLayout";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import NotFoundPage from "./pages/NotFoundPage";
import RoomDetailsPage from "./pages/RoomDetailsPage";
import RegisterPage from "./pages/auth/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/:id" element={<RoomDetailsPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
