// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import IncidentBridge from "./pages/IncidentBridge";
import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import Analytics from "./pages/Analytics";
import FullscreenFeeds from "./pages/FullscreenFeeds";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Default → /master */}
        <Route path="/" element={<Navigate to="/master" replace />} />

        {/* Pages */}
        <Route path="/incident-bridge" element={<IncidentBridge />} />
        <Route path="/master" element={<Master />} />
        <Route path="/feeds" element={<DroneFeeds />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/fullscreen" element={<FullscreenFeeds />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/master" replace />} />
      </Routes>
    </Layout>
  );
}
