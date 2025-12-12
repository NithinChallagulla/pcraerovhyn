// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import IncidentBridge from "./pages/IncidentBridge";

import Master from "./pages/Master";
import DroneFeeds from "./pages/DroneFeeds";
import Analytics from "./pages/Analytics"; // combined page

// NEW: Fullscreen / Command Hub view
import FullscreenFeeds from "./pages/FullscreenFeeds";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Default → /master */}
        <Route path="/" element={<Navigate to="/master" replace />} />

        {/* existing pages */}
        <Route path="/incident-bridge" element={<IncidentBridge />} />
        <Route path="/master" element={<Master />} />
        <Route path="/feeds" element={<DroneFeeds />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* NEW: full-screen command hub (3x3 CCTV view) */}
        <Route path="/fullscreen" element={<FullscreenFeeds />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/master" replace />} />
      </Routes>
    </Layout>
  );
}
