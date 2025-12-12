// src/pages/Master.tsx
import { useEffect, useState } from "react";
import { API_BASE, type Stream } from "../config";

export default function Master() {
  const [pilotName, setPilotName] = useState("");
  const [place, setPlace] = useState("");
  const [streams, setStreams] = useState<Stream[]>([]);
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState<Stream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStreams = async () => {
      try {
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: Stream[] = await res.json();
        if (!cancelled) setStreams(json);
      } catch (err: any) {
        if (!cancelled) setError(err.message || String(err));
      }
    };
    fetchStreams();
    return () => { cancelled = true; };
  }, []);

  const generate = async () => {
    setError(null);
    if (!pilotName || !place) { setError("Provide pilot name and place"); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/streams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pilotName, place }),
      });
      if (!res.ok) throw new Error("Failed to create stream");
      const json: Stream = await res.json();
      setGenerated(json);
      // refresh streams list
      const list = await (await fetch(`${API_BASE}/streams`)).json();
      setStreams(list);
      setPilotName(""); setPlace("");
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Create New Drone Stream</h2>
        <p>Assign a pilot and location to generate a unique RTMP link for the DJI drone.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "1rem", alignItems: "start" }}>
        <div className="master-card">
          <div className="master-form">
            <label>Pilot name</label>
            <input value={pilotName} onChange={(e) => setPilotName(e.target.value)} placeholder="Ex: SI Ramesh" />
            <label>Flying place</label>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Ex: North Gopuram Entrance" />
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="master-form-button" onClick={generate} disabled={creating} style={{ padding: "10px 16px", borderRadius: 10 }}>
                {creating ? "Generating…" : "Generate RTMP Link"}
              </button>
            </div>

            {error && <div style={{ marginTop: 10 }} className="error-box">{error}</div>}
          </div>

          {/* Streams list (compact) */}
          <div style={{ marginTop: 18 }}>
            <div className="card-subtitle">Existing Streams</div>
            <div className="streams-table-wrapper" style={{ marginTop: 8 }}>
              <table className="streams-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Pilot / Place</th>
                    <th>Status</th>
                    <th style={{ width: 1 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {streams.map((s) => (
                    <tr key={s.streamKey}>
                      <td className="mono">{s.streamKey}</td>
                      <td>{s.pilotName} • {s.place}</td>
                      <td><span className={`status-pill ${s.status?.toLowerCase()}`}>{s.status}</span></td>
                      <td className="row-actions">
                        {/* possible actions later */}
                      </td>
                    </tr>
                  ))}
                  {streams.length === 0 && <tr><td colSpan={4} className="empty-state">No streams</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Stream Generated (styled) */}
        <div>
          <div className="master-card">
            <h3 style={{ marginTop: 0 }}>Stream Generated</h3>

            {generated ? (
              <div className="stream-links-card">
                <div className="stream-links-header">Stream Generated</div>

                <div className="stream-links-row">
                  <div className="stream-links-label">RTMP Server</div>
                  <div className="stream-links-value">{generated.rtmpUrl?.replace(/\/[^/]+$/, "/") || "—"}</div>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(generated.rtmpUrl || "")}>Copy</button>
                </div>

                <div className="stream-links-row">
                  <div className="stream-links-label">Stream Key</div>
                  <div className="stream-links-value mono">{generated.streamKey}</div>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(generated.streamKey)}>Copy</button>
                </div>

                <div className="stream-links-row">
                  <div className="stream-links-label">RTMP Server + Key</div>
                  <div className="stream-links-value">{generated.rtmpUrl ? `${generated.rtmpUrl}${generated.streamKey}` : "—"}</div>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(generated.rtmpUrl ? `${generated.rtmpUrl}${generated.streamKey}` : "")}>Copy</button>
                </div>

                <div className="stream-links-row">
                  <div className="stream-links-label">HLS URL</div>
                  <div className="stream-links-value">{generated.hlsUrl || "—"}</div>
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(generated.hlsUrl || "")}>Copy</button>
                </div>

                <div style={{ marginTop: 10, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                  DJI Setup: You can either paste server and key separately, or directly use the RTMP Server + Key link in devices that support a single RTMP URL.
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)" }}>No recently generated stream. After you create a stream it will appear here.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
