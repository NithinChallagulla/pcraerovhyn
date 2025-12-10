// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import PeopleAnalytics from "./pages/PeopleAnalytics";
import VehicleAnalytics from "./pages/VehicleAnalytics";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Default -> /master */}
        <Route path="/" element={<Navigate to="/master" replace />} />

        <Route path="/master" element={<Master />} />
        <Route path="/feeds" element={<DroneFeeds />} />

        {/* ✅ Analytics routes */}
        <Route path="/analytics/people" element={<PeopleAnalytics />} />
        <Route path="/analytics/vehicles" element={<VehicleAnalytics />} />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/master" replace />} />
      </Routes>
    </Layout>
  );
}
