// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import PeopleAnalytics from "./pages/PeopleAnalytics";
import VehicleAnalytics from "./pages/VehicleAnalytics";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/master" replace />} />
        <Route path="/master" element={<Master />} />
        <Route path="/feeds" element={<DroneFeeds />} />
        <Route path="/analytics/people" element={<PeopleAnalytics />} />
        <Route path="/analytics/vehicles" element={<VehicleAnalytics />} />
      </Routes>
    </Layout>
  );
}

export default App;
