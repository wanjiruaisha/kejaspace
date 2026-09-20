import { Route, Routes } from "react-router";

import PublicLayout from "./layouts/PublicLayout";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}