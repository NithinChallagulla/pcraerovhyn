import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config";

type Stream = {
  id: string;
  pilotName?: string;
  place?: string;
  streamKey: string;
  rtmpUrl?: string;
  hlsUrl?: string;
  status?: string;
};

export default function IncidentBridge() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string>("ALL");
  const [selectedStreamKey, setSelectedStreamKey] = useState<string>("");
  const [incidentId, setIncidentId] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchStreams = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: Stream[] = await res.json();
        if (!cancelled) {
          setStreams(json);
          const p = Array.from(
            new Set(json.map((s) => (s.place || "").trim()).filter(Boolean))
          ).sort();
          setPlaces(["ALL", ...p]);
        }
      } catch (err: any) {
        setStatusMsg(`Failed to load streams: ${err.message || err}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStreams();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleStreams = useMemo(() => {
    return selectedPlace && selectedPlace !== "ALL"
      ? streams.filter((s) => (s.place || "").trim() === selectedPlace)
      : streams;
  }, [streams, selectedPlace]);

  useEffect(() => {
    // auto-select first stream in the filtered list for convenience
    if (visibleStreams.length > 0) {
      setSelectedStreamKey((prev) => prev || visibleStreams[0].streamKey);
    } else {
      setSelectedStreamKey("");
    }
  }, [visibleStreams]);

  const triggerWebhook = async () => {
    setStatusMsg(null);
    if (!incidentId || (!selectedStreamKey && selectedPlace === "ALL")) {
      setStatusMsg("Please provide an incident id and choose a stream.");
      return;
    }

    const payload: any = { incident_id: Number(incidentId) };
    if (selectedStreamKey) payload.streamKey = selectedStreamKey;
    else if (selectedPlace !== "ALL") payload.place = selectedPlace;

    setWorking(true);
    try {
      // Use Netlify proxy (or relative path). If you set __BRIDGE_BASE__ in window, it will be used.
      // Default is empty so fetch goes to /api/bridge/webhook which Netlify will proxy to your bridge.
      const BRIDGE = (window as any).__BRIDGE_BASE__ || "";
      const res = await fetch(`${BRIDGE}/api/bridge/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      let json;
      try {
        json = JSON.parse(txt);
      } catch {
        json = { raw: txt };
      }

      if (!res.ok) {
        setStatusMsg(`Bridge error ${res.status}: ${JSON.stringify(json)}`);
      } else {
        setStatusMsg(`Accepted: ${JSON.stringify(json)}`);
      }
    } catch (err: any) {
      setStatusMsg(`Request failed: ${err.message || err}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h2>Incident Bridge</h2>
          <p className="card-subtitle">Capture a single frame from a selected stream and push it to the incident API.</p>
        </div>
      </div>

      <div style={{ marginTop: "1rem", maxWidth: 920 }}>
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
            <div style={{ minWidth: 180 }}>
              <div className="card-subtitle">Filter by place</div>
              <select value={selectedPlace} onChange={(e) => setSelectedPlace(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, background: "var(--card)", color: "var(--text-main)" }}>
                {places.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <div className="card-subtitle">Select stream</div>
              <select value={selectedStreamKey} onChange={(e) => setSelectedStreamKey(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, background: "var(--card)", color: "var(--text-main)" }}>
                {visibleStreams.map((s) => (
                  <option key={s.streamKey} value={s.streamKey}>
                    {s.streamKey} — {s.place || s.pilotName || ""}
                  </option>
                ))}
                {visibleStreams.length === 0 && <option value="">No streams</option>}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
            <div style={{ minWidth: 180 }}>
              <div className="card-subtitle">Incident ID</div>
              <input value={incidentId} onChange={(e) => setIncidentId(e.target.value)} placeholder="e.g. 27817" style={{ width: "100%", padding: 8, borderRadius: 8, background: "var(--card)", color: "var(--text-main)", border: "1px solid rgba(255,255,255,0.06)" }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={triggerWebhook} disabled={working} style={{ padding: "8px 12px", borderRadius: 8 }}>
                {working ? "Working…" : "Send snapshot to incident"}
              </button>
              <button className="btn secondary" onClick={() => { setIncidentId(""); setStatusMsg(null); }} style={{ padding: "8px 12px", borderRadius: 8 }}>
                Clear
              </button>
            </div>
          </div>

          <div>
            <div className="card-subtitle">Status</div>
            <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.02)", color: "var(--text-muted)", minHeight: 42 }}>
              {loading && "Loading streams..."}
              {!loading && !statusMsg && "Ready."}
              {statusMsg && <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{statusMsg}</pre>}
            </div>
          </div>

          {/* small helper: list of streams for debugging */}
          <div>
            <div className="card-subtitle">Streams (visible)</div>
            <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.3)" }}>
              {visibleStreams.slice(0, 20).map((s) => (
                <div key={s.streamKey} style={{ fontSize: "0.86rem", padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.03)" }}>
                  <strong>{s.streamKey}</strong> — {s.place} • {s.status}
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.hlsUrl}</div>
                </div>
              ))}
              {visibleStreams.length === 0 && <div className="empty-state">No streams</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
