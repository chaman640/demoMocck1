// pages/Classes.jsx — student: video classes of the active batch
// Live now → Upcoming → Continue watching → Subject folders → Topic folders → Classes
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import BottomNav from "../components/BottomNav";
import { classStatusBadge, formatClassTime } from "../utils/classFormat";

const ClassRow = ({ c, onOpen }) => {
  const badge = classStatusBadge(c);
  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/50 rounded-2xl p-3.5 transition-colors"
    >
      <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center text-lg">
        {c.status === "live" ? "🔴" : c.status === "scheduled" ? "🗓" : "▶"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{c.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
          {c.hasNotes && <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-300">📄 Notes</span>}
          {c.progress?.completed ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">✓ Watched</span>
          ) : c.progress?.watchMinutes > 0 ? (
            <span className="text-[10px] text-gray-500">{c.progress.watchMinutes} min watched</span>
          ) : null}
        </div>
      </div>
      <span className="text-[#A78BFA] text-sm flex-shrink-0">→</span>
    </button>
  );
};

const FolderCard = ({ icon, name, count, onOpen }) => (
  <button
    onClick={onOpen}
    className="w-full text-left flex items-center gap-3 bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/50 rounded-2xl p-4 transition-colors"
  >
    <span className="text-2xl">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate">{name}</p>
      <p className="text-[11px] text-gray-500">{count} {count === 1 ? "class" : "classes"}</p>
    </div>
    <span className="text-gray-500">›</span>
  </button>
);

const Classes = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const subjectId = params.get("s");
  const topicId = params.get("t");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-classes"],
    queryFn: async () => (await api.get("/classes")).data.data,
    retry: false,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (error?.response?.status === 401) navigate("/Login");
  }, [error, navigate]);

  const folders = useMemo(() => data?.folders || [], [data]);
  const classes = useMemo(() => data?.classes || [], [data]);
  const subjectFolder = folders.find((f) => f._id === subjectId) || null;
  const topicFolder = folders.find((f) => f._id === topicId) || null;

  const live = classes.filter((c) => c.status === "live");
  const upcoming = classes
    .filter((c) => c.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 5);
  const continueWatching = classes
    .filter((c) => c.status === "ended" && c.progress && !c.progress.completed && c.progress.lastPosition > 30)
    .slice(-3)
    .reverse();

  // Count classes in a folder including its topic folders
  const countIn = (folderId) => {
    const childIds = new Set([folderId, ...folders.filter((f) => f.parent === folderId).map((f) => f._id)]);
    return classes.filter((c) => childIds.has(c.folder)).length;
  };

  const open = (c) => navigate(`/Class/${c._id}`);
  const q = query.trim().toLowerCase();
  const searchResults = q
    ? classes.filter((c) => `${c.title} ${c.subjectName} ${c.topicName}`.toLowerCase().includes(q))
    : [];

  const goTo = (s, t) => {
    const next = {};
    if (s) next.s = s;
    if (t) next.t = t;
    setParams(next);
  };

  const header = (
    <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
      <button
        onClick={() => (topicFolder ? goTo(subjectId) : subjectFolder ? goTo() : navigate(-1))}
        className="text-gray-400 text-xl leading-none"
      >
        ←
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold truncate">{topicFolder?.name || subjectFolder?.name || "Video Classes"}</h1>
        {data?.batch && <p className="text-[11px] text-gray-500 truncate">{data.batch.name}</p>}
      </div>
      <button onClick={() => refetch()} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300">
        ↻
      </button>
    </header>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white pb-24">
        {header}
        <main className="px-4 py-4 max-w-2xl mx-auto space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-800/70 animate-pulse" />
          ))}
        </main>
        <BottomNav />
      </div>
    );
  }

  if (error && error.response?.status !== 401) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white pb-24">
        {header}
        <div className="text-center py-16 px-6 space-y-3">
          <p className="text-4xl">📡</p>
          <p className="text-sm text-gray-400">Could not load classes. Check your internet and try again.</p>
          <button onClick={() => refetch()} className="px-5 py-2 rounded-xl bg-[#7C3AED] text-sm font-semibold">
            Try again
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (data && !data.batch) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white pb-24">
        {header}
        <div className="text-center py-16 px-6 space-y-3">
          <p className="text-4xl">🎥</p>
          <p className="text-sm text-gray-300 font-semibold">Join a batch to watch classes</p>
          <p className="text-xs text-gray-500">Video classes come from your teacher's batch. Enter your teacher's code to join.</p>
          <button onClick={() => navigate("/MyBatch")} className="px-5 py-2 rounded-xl bg-[#7C3AED] text-sm font-semibold">
            Join a batch
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const atRoot = !subjectFolder;
  const subjectFolders = folders.filter((f) => f.kind === "subject");
  const topicFolders = subjectFolder ? folders.filter((f) => f.parent === subjectFolder._id) : [];
  const folderClasses = topicFolder
    ? classes.filter((c) => c.folder === topicFolder._id)
    : subjectFolder
      ? classes.filter((c) => c.folder === subjectFolder._id)
      : [];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-24">
      {header}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {atRoot && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search classes..."
            className="w-full px-4 py-2.5 text-sm bg-[#111827] border border-gray-800 focus:border-[#7C3AED] rounded-xl outline-none placeholder-gray-600"
          />
        )}

        {q ? (
          <section className="space-y-2">
            {searchResults.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No classes found.</p>}
            {searchResults.map((c) => (
              <ClassRow key={c._id} c={c} onOpen={() => open(c)} />
            ))}
          </section>
        ) : atRoot ? (
          <>
            {live.length > 0 && (
              <section className="space-y-2">
                {live.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => open(c)}
                    className="w-full text-left rounded-2xl p-4 bg-gradient-to-r from-red-600/30 to-red-900/20 border border-red-500/40"
                  >
                    <p className="text-[11px] font-bold text-red-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE NOW · {c.subjectName}
                    </p>
                    <p className="text-base font-bold mt-1">{c.title}</p>
                    <p className="text-xs text-red-200/80 mt-1">{c.teacherName ? `${c.teacherName} · ` : ""}Tap to join →</p>
                  </button>
                ))}
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Upcoming live classes</h2>
                <div className="space-y-2">
                  {upcoming.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => open(c)}
                      className="w-full text-left flex items-center gap-3 bg-[#111827] border border-amber-500/20 rounded-2xl p-3.5"
                    >
                      <span className="text-xl">🗓</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.title}</p>
                        <p className="text-[11px] text-amber-300">
                          {formatClassTime(c.scheduledAt)} · {c.subjectName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {continueWatching.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Continue watching</h2>
                <div className="space-y-2">
                  {continueWatching.map((c) => (
                    <ClassRow key={c._id} c={c} onOpen={() => open(c)} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Subjects</h2>
              {subjectFolders.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-4xl">🎥</p>
                  <p className="text-sm text-gray-500">Your teacher has not added any classes yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subjectFolders.map((f) => (
                    <FolderCard key={f._id} icon="📚" name={f.name} count={countIn(f._id)} onOpen={() => goTo(f._id)} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            {!topicFolder && topicFolders.length > 0 && (
              <section className="space-y-2">
                {topicFolders.map((f) => (
                  <FolderCard key={f._id} icon="📁" name={f.name} count={countIn(f._id)} onOpen={() => goTo(subjectFolder._id, f._id)} />
                ))}
              </section>
            )}
            <section className="space-y-2">
              {folderClasses.map((c) => (
                <ClassRow key={c._id} c={c} onOpen={() => open(c)} />
              ))}
              {folderClasses.length === 0 && (topicFolder || topicFolders.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-10">No classes here yet.</p>
              )}
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Classes;
