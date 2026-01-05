import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import IncidentBridge from "./pages/IncidentBridge";
import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import Analytics from "./pages/Analytics";
import FullscreenFeeds from "./pages/FullscreenFeeds";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/master" replace />} />
        <Route path="incident-bridge" element={<IncidentBridge />} />
        <Route path="master" element={<Master />} />
        <Route path="feeds" element={<DroneFeeds />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="fullscreen" element={<FullscreenFeeds />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
