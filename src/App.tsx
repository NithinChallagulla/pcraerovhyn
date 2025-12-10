import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import UnifiedAnalytics from "./pages/UnifiedAnalytics";
// (You can still import PeopleAnalytics / VehicleAnalytics if you want legacy URLs)

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/master" replace />} />
          <Route path="/master" element={<Master />} />
          <Route path="/feeds" element={<DroneFeeds />} />

          {/* New combined analytics */}
          <Route path="/analytics" element={<UnifiedAnalytics />} />

          {/* Optional: old URLs point to same page */}
          <Route path="/analytics/people" element={<UnifiedAnalytics />} />
          <Route path="/analytics/vehicles" element={<UnifiedAnalytics />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/master" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
