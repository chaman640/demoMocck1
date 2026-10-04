// pages/ClassPlayer.jsx — student: watch a class (live or recording), open notes, ask doubts
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import YouTubeClassPlayer from "../components/YouTubeClassPlayer";
import { classStatusBadge, formatClassTime } from "../utils/classFormat";
import { formatBytes } from "../offline/offlineStore";

const timeAgo = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const ClassPlayer = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [doubt, setDoubt] = useState("");
  const [sending, setSending] = useState(false);
  const [doubtMsg, setDoubtMsg] = useState(null);

  const { data: cls, isLoading, error, refetch } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => (await api.get(`/classes/${classId}`)).data.data,
    retry: false,
    // Keep checking while the class is upcoming/live so "Go live" / "End" show up by themselves
    refetchInterval: (q) => (["scheduled", "live"].includes(q.state.data?.status) ? 30000 : false),
  });

  const { data: doubts, refetch: refetchDoubts } = useQuery({
    queryKey: ["class-doubts", classId],
    queryFn: async () => (await api.get(`/classes/${classId}/doubts`)).data.data,
    enabled: Boolean(cls),
    retry: false,
    refetchInterval: cls?.status === "live" ? 20000 : false,
  });

  useEffect(() => {
    if (error?.response?.status === 401) navigate("/Login");
  }, [error, navigate]);

  const saveProgress = useCallback(
    ({ watched, position, duration }) => {
      api.post(`/classes/${classId}/progress`, { watched, position, duration }).catch(() => {});
    },
    [classId]
  );

  // Leaving the page: refresh the class list so progress badges are up to date
  useEffect(() => () => queryClient.invalidateQueries({ queryKey: ["student-classes"] }), [queryClient]);

  const sendDoubt = async (e) => {
    e.preventDefault();
    if (doubt.trim().length < 3) return;
    setSending(true);
    setDoubtMsg(null);
    try {
      const res = await api.post(`/classes/${classId}/doubts`, { text: doubt.trim() });
      setDoubt("");
      setDoubtMsg({ ok: true, text: res.data.message });
      refetchDoubts();
    } catch (err) {
      setDoubtMsg({ ok: false, text: err.response?.data?.message || "Could not send the doubt." });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 py-4 max-w-3xl mx-auto space-y-4">
        <div className="aspect-video rounded-2xl bg-gray-800/70 animate-pulse" />
        <div className="h-6 w-2/3 rounded bg-gray-800/70 animate-pulse" />
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-4xl">🎥</p>
          <p className="text-sm text-gray-400">{error?.response?.data?.message || "Could not load this class."}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate("/Classes")} className="px-4 py-2 rounded-xl border border-gray-700 text-sm">
              All classes
            </button>
            {!error?.response && (
              <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-[#7C3AED] text-sm font-semibold">
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const badge = classStatusBadge(cls);
  const canPlay = Boolean(cls.youtubeVideoId) && (cls.status === "live" || cls.status === "ended");

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-10">
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">{cls.title}</h1>
          <p className="text-[11px] text-gray-500 truncate">{[cls.subjectName, cls.topicName].filter(Boolean).join(" › ")}</p>
        </div>
      </header>

      <main className="px-4 py-4 max-w-3xl mx-auto space-y-4">
        {canPlay ? (
          <YouTubeClassPlayer
            videoId={cls.youtubeVideoId}
            live={cls.status === "live"}
            startAt={cls.progress?.completed ? 0 : cls.progress?.lastPosition || 0}
            onProgress={saveProgress}
          />
        ) : (
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-[#1E1145] to-[#0F1221] border border-gray-800 flex flex-col items-center justify-center text-center px-6 gap-2">
            <p className="text-4xl">🗓</p>
            <p className="text-base font-bold">Live class starts {formatClassTime(cls.scheduledAt)}</p>
            <p className="text-xs text-gray-400">Keep this page open — the video will start here when your teacher goes live.</p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.text}</span>
          {cls.teacherName && <span className="text-xs text-gray-400">by {cls.teacherName}</span>}
          {cls.progress?.completed && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">✓ Watched</span>
          )}
        </div>

        <h2 className="text-lg font-bold leading-snug">{cls.title}</h2>
        {cls.description && <p className="text-sm text-gray-400 whitespace-pre-line">{cls.description}</p>}

        {cls.note ? (
          <button
            onClick={() => navigate(`/Reader/note/${cls.note._id}`)}
            className="w-full flex items-center gap-3 bg-[#111827] border border-[#7C3AED]/40 hover:border-[#7C3AED] rounded-2xl p-4 text-left transition-colors"
          >
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Class notes</p>
              <p className="text-[11px] text-gray-500">
                {cls.note.fileBytes ? `${formatBytes(cls.note.fileBytes)} · ` : ""}Read in the app, save for offline
              </p>
            </div>
            <span className="text-[#A78BFA] text-sm">Open →</span>
          </button>
        ) : (
          <p className="text-xs text-gray-600">No notes for this class yet.</p>
        )}

        <section className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">💬 Doubts</h3>
            <button onClick={() => refetchDoubts()} className="text-[11px] text-gray-400">
              ↻ Refresh
            </button>
          </div>
          <form onSubmit={sendDoubt} className="flex gap-2">
            <input
              value={doubt}
              onChange={(e) => setDoubt(e.target.value)}
              maxLength={500}
              placeholder="Ask your doubt about this class..."
              className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={sending || doubt.trim().length < 3}
              className="px-4 rounded-xl bg-[#7C3AED] text-sm font-semibold disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </form>
          {doubtMsg && <p className={`text-xs ${doubtMsg.ok ? "text-green-400" : "text-red-400"}`}>{doubtMsg.text}</p>}

          <div className="space-y-2.5">
            {(doubts || []).length === 0 && <p className="text-xs text-gray-500">No doubts yet. Ask the first one!</p>}
            {(doubts || []).map((d) => (
              <div key={d._id} className={`rounded-xl p-3 border ${d.mine ? "border-[#7C3AED]/30 bg-[#7C3AED]/5" : "border-gray-800 bg-[#0A0D14]"}`}>
                <p className="text-[11px] text-gray-500">
                  {d.mine ? "You" : d.userName} · {timeAgo(d.createdAt)}
                </p>
                <p className="text-sm mt-0.5 whitespace-pre-line break-words">{d.text}</p>
                {d.answer ? (
                  <div className="mt-2 pl-3 border-l-2 border-green-500/50">
                    <p className="text-[11px] text-green-400">{d.answeredBy || "Teacher"} answered</p>
                    <p className="text-sm text-gray-200 whitespace-pre-line break-words">{d.answer}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-400/80 mt-1">Waiting for the teacher's answer</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClassPlayer;
