// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import UnifiedAnalytics from "./pages/UnifiedAnalytics";
// Optional: keep old pages if you still have them
import PeopleAnalytics from "./pages/PeopleAnalytics";
import VehicleAnalytics from "./pages/VehicleAnalytics";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Default -> Master */}
        <Route path="/" element={<Navigate to="/master" replace />} />

        <Route path="/master" element={<Master />} />
        <Route path="/feeds" element={<DroneFeeds />} />

        {/* New combined analytics page */}
        <Route path="/analytics" element={<UnifiedAnalytics />} />

        {/* Old URLs still work but show same unified view */}
        <Route path="/analytics/people" element={<UnifiedAnalytics />} />
        <Route path="/analytics/vehicles" element={<UnifiedAnalytics />} />

        {/* (Optional) if you want old pages accessible separately:
        <Route path="/_people-only" element={<PeopleAnalytics />} />
        <Route path="/_vehicles-only" element={<VehicleAnalytics />} />
        */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/master" replace />} />
      </Routes>
    </Layout>
  );
}
