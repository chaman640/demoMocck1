// pages/MyDownloads.jsx — phone mein save books/notes + is account ke phones
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { daysLeft, formatBytes, getDeviceId, isExpired, listOffline, removeOffline, syncOffline } from "../offline/offlineStore";

const MyDownloads = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [devices, setDevices] = useState(null);
  const [maxDevices, setMaxDevices] = useState(2);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const loadItems = useCallback(() => listOffline().then(setItems).catch(() => setItems([])), []);

  const loadDevices = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const deviceId = await getDeviceId();
      const res = await api.get("/offline/devices", { params: { deviceId } });
      setDevices(res.data.data.devices);
      setMaxDevices(res.data.data.maxDevices);
    } catch {
      setDevices(null);
    }
  }, []);

  useEffect(() => {
    // Mount par IndexedDB/API se data — setState await ke baad hi hota hai
    /* eslint-disable react-hooks/set-state-in-effect */
    loadItems();
    loadDevices();
    /* eslint-enable react-hooks/set-state-in-effect */
    syncOffline()
      .then((r) => {
        if (r.removed) setMessage(`Access to ${r.removed} item(s) had ended, so they were removed.`);
        loadItems();
      })
      .catch(() => {});
  }, [loadItems, loadDevices]);

  const deleteItem = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from this phone?`)) return;
    await removeOffline(item.type, item.id);
    loadItems();
  };

  const removeDevice = async (d) => {
    if (!window.confirm(`Remove "${d.label}"? All offline books/notes on that phone will stop working.`)) return;
    setBusy(d.deviceId);
    try {
      const res = await api.post(`/offline/devices/${encodeURIComponent(d.deviceId)}/remove`);
      setMessage(res.data.message);
      await loadDevices();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not remove the phone.");
    } finally {
      setBusy("");
    }
  };

  const totalBytes = (items || []).reduce((sum, i) => sum + (i.size || 0), 0);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">←</button>
        <h1 className="text-base font-bold">My Downloads</h1>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-6">
        {message && (
          <div className="p-3 bg-[#7C3AED]/10 text-[#C4B5FD] border border-[#7C3AED]/25 rounded-xl text-sm text-center">{message}</div>
        )}

        <section>
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-sm font-semibold">Saved on this phone</h2>
            {items?.length > 0 && <p className="text-[11px] text-gray-500">{formatBytes(totalBytes)} used</p>}
          </div>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
            These open only inside this app — for up to 15 days without internet. It renews automatically when you are online.
          </p>

          {items === null && <div className="h-16 rounded-2xl bg-gray-800/70 animate-pulse" />}
          {items?.length === 0 && (
            <div className="text-center py-10 space-y-3 bg-[#111827] border border-gray-800 rounded-2xl">
              <p className="text-3xl">📥</p>
              <p className="text-sm text-gray-500">Nothing saved yet. Books or notes you open will appear here.</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => navigate("/Notes")} className="px-4 py-2 rounded-lg bg-[#7C3AED] text-xs font-semibold">Notes</button>
                <button onClick={() => navigate("/MyRedemptions")} className="px-4 py-2 rounded-lg border border-gray-700 text-xs">My Books</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {items?.map((item) => {
              const expired = isExpired(item);
              return (
                <div key={item.key} className="flex items-center gap-3 bg-[#111827] border border-gray-800 rounded-2xl p-3.5">
                  <span className="text-2xl">{item.type === "book" ? "📘" : "📄"}</span>
                  <button className="flex-1 min-w-0 text-left" onClick={() => navigate(`/Reader/${item.type}/${item.id}`)}>
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <p className={`text-[11px] ${expired ? "text-amber-400" : "text-gray-500"}`}>
                      {item.type === "book" ? "Book" : "Notes"} · {formatBytes(item.size)} ·{" "}
                      {expired ? "Turn on the internet to renew" : `${daysLeft(item)} days offline`}
                    </p>
                  </button>
                  <button onClick={() => deleteItem(item)} className="text-gray-500 hover:text-red-400 text-lg px-2" aria-label="Delete">
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-1">My phones</h2>
          <p className="text-[11px] text-gray-500 mb-3">
            One account can be used offline on {maxDevices} phones. You can change phones up to 3 times in 30 days.
          </p>
          {!navigator.onLine && <p className="text-xs text-gray-500">Internet is needed to see your phones.</p>}
          {devices?.length === 0 && <p className="text-xs text-gray-500">Nothing is saved on any phone yet.</p>}
          <div className="space-y-2">
            {devices?.map((d) => (
              <div key={d.deviceId} className="flex items-center gap-3 bg-[#111827] border border-gray-800 rounded-2xl p-3.5">
                <span className="text-xl">📱</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {d.label} {d.isThisDevice && <span className="text-[10px] text-[#A78BFA]">(this phone)</span>}
                  </p>
                  <p className="text-[11px] text-gray-500">Last used {new Date(d.lastSeenAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => removeDevice(d)}
                  disabled={!!busy}
                  className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs font-semibold disabled:opacity-50"
                >
                  {busy === d.deviceId ? "..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default MyDownloads;
