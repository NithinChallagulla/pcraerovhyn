// src/pages/CommandHub.tsx
import { useEffect, useState } from "react";
import { API_BASE, type Stream } from "../config";

/**
 * CommandHub page
 * - Fetches streams and displays a simple table.
 * - This file was adjusted to avoid TS6133 (unused catch variable) and to
 *   map API response into Stream where rtmpUrl is optional.
 */

export default function CommandHub() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStreams = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error(`Failed to fetch streams (${res.status})`);
        const data = (await res.json()) as any[];

        // Map API items to our Stream type; rtmpUrl may be absent (optional)
        const mapped: Stream[] = data.map((d: any) => ({
          id: String(d.id),
          streamKey: String(d.streamKey),
          place: d.place ?? d.location ?? "",
          pilotName: d.pilotName ?? d.pilot ?? "",
          hlsUrl: d.hlsUrl ?? d.hls ?? "",
          status: d.status ?? "",
          rtmpUrl: d.rtmpUrl ?? d.rtmpUrl ?? d.rtmp ?? undefined,
          createdAt: typeof d.createdAt === "number" ? d.createdAt : undefined,
          startedAt: typeof d.startedAt === "number" ? d.startedAt : undefined,
          endedAt: typeof d.endedAt === "number" ? d.endedAt : undefined,
        }));

        if (!cancelled) setStreams(mapped);
      } catch (err) {
        // use the caught variable so TypeScript doesn't complain about unused 'error'
        console.error("CommandHub fetchStreams error:", err);
        if (!cancelled) setErrorMsg(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStreams();
    const id = window.setInterval(fetchStreams, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Command Hub</h2>
        <p className="card-subtitle">Overview of all streams (simple view).</p>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && <div className="loading">Loading streams…</div>}
        {errorMsg && <div className="error-box">{errorMsg}</div>}
      </div>

      <div style={{ marginTop: 12 }} className="streams-table-wrapper">
        <table className="streams-table" aria-live="polite">
          <thead>
            <tr>
              <th>Key</th>
              <th>Pilot / Place</th>
              <th>RTMP</th>
              <th>HLS</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {streams.length === 0 && !loading && (
              <tr><td colSpan={5} className="empty-state">No streams</td></tr>
            )}
            {streams.map((s) => (
              <tr key={s.streamKey}>
                <td className="mono">{s.streamKey}</td>
                <td>{s.pilotName} • {s.place}</td>
                <td style={{ wordBreak: "break-all", maxWidth: 260 }}>{s.rtmpUrl ?? "—"}</td>
                <td style={{ wordBreak: "break-all", maxWidth: 260 }}>{s.hlsUrl ?? "—"}</td>
                <td><span className={`status-pill ${String(s.status ?? "").toLowerCase()}`}>{s.status ?? "UNKNOWN"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
