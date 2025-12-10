// src/pages/Master.tsx
import { useEffect, useState } from "react";
import { API_BASE } from "../config";
import type { Stream } from "../config";

interface CreateForm {
  pilotName: string;
  place: string;
}

export default function Master() {
  const [form, setForm] = useState<CreateForm>({ pilotName: "", place: "" });
  const [creating, setCreating] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [createdStream, setCreatedStream] = useState<Stream | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStreams = async () => {
    try {
      setLoadingList(true);
      const res = await fetch(`${API_BASE}/streams`);
      const data = (await res.json()) as Stream[];
      setStreams(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load streams");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadStreams();
    const interval = setInterval(loadStreams, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pilotName.trim() || !form.place.trim()) return;

    try {
      setCreating(true);
      setError(null);
      setCreatedStream(null);

      const res = await fetch(`${API_BASE}/streams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as Stream;
      setCreatedStream(data);
      setForm({ pilotName: "", place: "" });
      await loadStreams();
    } catch (err) {
      console.error(err);
      setError("Failed to create stream");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this stream?")) return;
    try {
      const res = await fetch(`${API_BASE}/streams/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await loadStreams();
    } catch (err) {
      console.error(err);
      setError("Failed to delete stream");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch((e) => console.error(e));
  };

  return (
    <div className="page master-page">
      <section className="master-grid">
        <div className="master-card">
          <h2>Create New Drone Stream</h2>
          <p className="card-subtitle">
            Assign a pilot and location to generate a unique RTMP link for the DJI drone.
          </p>

          <form className="master-form" onSubmit={handleCreate}>
            <label>
              Pilot Name
              <input
                name="pilotName"
                value={form.pilotName}
                onChange={handleChange}
                placeholder="Ex: SI Ramesh"
                required
              />
            </label>

            <label>
              Flying Place
              <input
                name="place"
                value={form.place}
                onChange={handleChange}
                placeholder="Ex: North Gopuram Entrance"
                required
              />
            </label>

            <button type="submit" disabled={creating}>
              {creating ? "Generating..." : "Generate RTMP Link"}
            </button>
          </form>

          {createdStream && (() => {
            // base RTMP (rtmp://ip/live)
            const baseRtmp =
              createdStream.rtmpUrl.split("/live")[0] + "/live";
            // fused link: rtmp://ip/live/KEY
            const fusedRtmp = `${baseRtmp}/${createdStream.streamKey}`;

            return (
              <div className="generated-stream">
                <h3>Stream Generated</h3>

                <div className="generated-row">
                  <span className="label">RTMP Server</span>
                  <div className="value-with-btn">
                    <code>{baseRtmp}</code>
                    <button onClick={() => copyToClipboard(baseRtmp)}>
                      Copy
                    </button>
                  </div>
                </div>

                <div className="generated-row">
                  <span className="label">Stream Key</span>
                  <div className="value-with-btn">
                    <code>{createdStream.streamKey}</code>
                    <button
                      onClick={() =>
                        copyToClipboard(createdStream.streamKey)
                      }
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* 🔥 New fused link row */}
                <div className="generated-row">
                  <span className="label">RTMP Server + Key</span>
                  <div className="value-with-btn">
                    <code>{fusedRtmp}</code>
                    <button onClick={() => copyToClipboard(fusedRtmp)}>
                      Copy
                    </button>
                  </div>
                </div>

                <div className="generated-row">
                  <span className="label">HLS URL</span>
                  <div className="value-with-btn">
                    <code>{createdStream.hlsUrl}</code>
                    <button
                      onClick={() =>
                        copyToClipboard(createdStream.hlsUrl)
                      }
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <p className="hint">
                  <strong>DJI Setup:</strong> You can either paste server and
                  key separately, or directly use the{" "}
                  <strong>RTMP Server + Key</strong> link in devices that
                  support a single RTMP URL.
                </p>
              </div>
            );
          })()}
        </div>

        <div className="master-card">
          <h2>All Streams</h2>
          <p className="card-subtitle">
            Live registry of all drone sessions for this event. Use delete to
            immediately revoke a stream.
          </p>

          {error && <div className="error-box">{error}</div>}
          {loadingList ? (
            <div className="loading">Loading streams…</div>
          ) : streams.length === 0 ? (
            <div className="empty-state">No streams yet.</div>
          ) : (
            <div className="streams-table-wrapper">
              <table className="streams-table">
                <thead>
                  <tr>
                    <th>Pilot</th>
                    <th>Place</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {streams.map((s) => (
                    <tr key={s.id}>
                      <td>{s.pilotName}</td>
                      <td>{s.place}</td>
                      <td className="mono">{s.streamKey}</td>
                      <td>
                        <span
                          className={`status-pill ${s.status.toLowerCase()}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-"}
                      </td>
                      <td>
                        <button
                          className="danger-btn"
                          onClick={() => handleDelete(s.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
