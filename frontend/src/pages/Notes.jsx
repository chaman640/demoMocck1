// pages/Notes.jsx — student ke liye study notes (subject → topic)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import BottomNav from "../components/BottomNav";
import { formatBytes, isExpired, listOffline } from "../offline/offlineStore";

const Notes = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(new Map());
  const [query, setQuery] = useState("");

  const { data: notes, isLoading, error } = useQuery({
    queryKey: ["student-notes"],
    queryFn: async () => (await api.get("/notes")).data.data,
    retry: false,
  });

  useEffect(() => {
    if (error?.response?.status === 401) navigate("/Login");
  }, [error, navigate]);

  useEffect(() => {
    listOffline()
      .then((items) => setSaved(new Map(items.filter((i) => i.type === "note").map((i) => [i.id, i]))))
      .catch(() => {});
  }, []);

  const offline = !navigator.onLine || (error && !error.response);

  // Internet nahi hai to jo phone mein save hai wahi dikhao
  const list = useMemo(() => {
    if (notes) return notes;
    if (!offline) return [];
    return [...saved.values()].map((i) => {
      const [subjectName, topicName] = (i.subtitle || "").split(" · ");
      return { _id: i.id, title: i.title, subjectName: subjectName || "Saved", topicName: topicName || "" };
    });
  }, [notes, offline, saved]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map();
    for (const n of list) {
      const hay = `${n.title} ${n.subjectName} ${n.topicName}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      const subject = n.subjectName || "Other";
      if (!map.has(subject)) map.set(subject, []);
      map.get(subject).push(n);
    }
    return [...map.entries()];
  }, [list, query]);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-24">
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">←</button>
        <h1 className="text-base font-bold flex-1">Study Notes</h1>
        <button
          onClick={() => navigate("/MyDownloads")}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300"
        >
          ⬇ My Downloads
        </button>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {offline && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
            Aap offline hain — sirf phone mein save kiye notes dikh rahe hain.
          </div>
        )}

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notes search karein..."
          className="w-full px-4 py-2.5 text-sm bg-[#111827] border border-gray-800 focus:border-[#7C3AED] rounded-xl outline-none placeholder-gray-600"
        />

        {isLoading && !offline && [1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-800/70 animate-pulse" />)}

        {!isLoading && grouped.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-4xl">📝</p>
            <p className="text-sm text-gray-500">
              {query ? "Kuch nahi mila." : "Abhi aapke exam ya batch ke liye koi notes nahi hain."}
            </p>
          </div>
        )}

        {grouped.map(([subject, items]) => (
          <section key={subject}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA] mb-2">{subject}</h2>
            <div className="space-y-2">
              {items.map((n) => {
                const s = saved.get(String(n._id));
                return (
                  <button
                    key={n._id}
                    onClick={() => navigate(`/Reader/note/${n._id}`)}
                    className="w-full text-left flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/50 rounded-2xl p-3.5 transition-colors"
                  >
                    <span className="text-2xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {[n.topicName, n.teacherName && `by ${n.teacherName}`, n.fileBytes && formatBytes(n.fileBytes)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {s && !isExpired(s) ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                        Offline ✓
                      </span>
                    ) : (
                      <span className="text-[#A78BFA] text-sm">Padhein →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default Notes;
