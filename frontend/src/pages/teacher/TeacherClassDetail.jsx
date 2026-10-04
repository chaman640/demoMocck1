// pages/teacher/TeacherClassDetail.jsx — attendance + doubts of one video class
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import { classStatusBadge } from "../../utils/classFormat";

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

const DoubtItem = ({ d, onChanged }) => {
  const [answer, setAnswer] = useState(d.answer || "");
  const [editing, setEditing] = useState(!d.answer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/teacher/class-doubts/${d._id}/answer`, { answer: answer.trim() });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the answer.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove this doubt?")) return;
    try {
      await api.delete(`/teacher/class-doubts/${d._id}`);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove the doubt.");
    }
  };

  return (
    <div className={`rounded-xl p-3 border ${d.answer ? "border-gray-800" : "border-amber-500/30 bg-amber-500/5"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500">
          {d.userName} · {fmt(d.createdAt)}
        </p>
        <button onClick={remove} className="text-[11px] text-red-400">
          Remove
        </button>
      </div>
      <p className="text-sm mt-0.5 whitespace-pre-line break-words">{d.text}</p>
      {editing ? (
        <div className="mt-2 flex gap-2">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            maxLength={1000}
            placeholder="Write your answer..."
            className="flex-1 min-w-0 px-3 py-2 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none"
          />
          <button onClick={send} disabled={busy || !answer.trim()} className="px-3 rounded-lg bg-[#7C3AED] text-xs font-bold disabled:opacity-50">
            {busy ? "..." : "Answer"}
          </button>
        </div>
      ) : (
        <div className="mt-2 pl-3 border-l-2 border-green-500/50 flex items-start justify-between gap-2">
          <p className="text-sm text-gray-200 whitespace-pre-line break-words">{d.answer}</p>
          <button onClick={() => setEditing(true)} className="text-[11px] text-gray-400 flex-shrink-0">
            Edit
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

const TeacherClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("doubts");

  const attendance = useQuery({
    queryKey: ["teacher-class-attendance", classId],
    queryFn: async () => (await api.get(`/teacher/classes/${classId}/attendance`)).data.data,
    retry: false,
    refetchInterval: (q) => (q.state.data?.class?.status === "live" ? 30000 : false),
  });
  const doubts = useQuery({
    queryKey: ["teacher-class-doubts", classId],
    queryFn: async () => (await api.get(`/teacher/classes/${classId}/doubts`)).data.data,
    retry: false,
    refetchInterval: attendance.data?.class?.status === "live" ? 15000 : false,
  });

  useEffect(() => {
    if (attendance.error?.response?.status === 401) navigate("/TeacherLogin");
  }, [attendance.error, navigate]);

  const cls = attendance.data?.class;
  const joined = attendance.data?.joined || [];
  const notJoined = attendance.data?.notJoined || [];
  const openDoubts = (doubts.data || []).filter((d) => !d.answer).length;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{cls?.title || "Class"}</h1>
            {cls && (
              <p className="text-xs text-gray-500 truncate">
                {[cls.subjectName, cls.topicName].filter(Boolean).join(" › ")}
              </p>
            )}
          </div>
        </div>

        {attendance.isLoading ? (
          <div className="h-24 rounded-2xl bg-gray-800/70 animate-pulse" />
        ) : attendance.error ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center text-sm text-gray-400">
            {attendance.error.response?.data?.message || "Could not load this class."}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] px-2.5 py-1 rounded-full border ${classStatusBadge(cls).cls}`}>{classStatusBadge(cls).text}</span>
              {cls.youtubeVideoId && (
                <a href={`https://youtu.be/${cls.youtubeVideoId}`} target="_blank" rel="noreferrer" className="text-[11px] text-[#A78BFA] underline">
                  Open on YouTube
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#111827] border border-gray-800 rounded-xl py-3">
                <p className="text-lg font-bold">{joined.length}</p>
                <p className="text-[10px] text-gray-500">Joined</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl py-3">
                <p className="text-lg font-bold text-red-400">{joined.filter((j) => j.joinedLive).length}</p>
                <p className="text-[10px] text-gray-500">Watched live</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl py-3">
                <p className="text-lg font-bold text-amber-300">{notJoined.length}</p>
                <p className="text-[10px] text-gray-500">Not joined</p>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { k: "doubts", t: `💬 Doubts${openDoubts ? ` (${openDoubts})` : ""}` },
                { k: "joined", t: `👥 Joined (${joined.length})` },
                { k: "absent", t: `Not joined (${notJoined.length})` },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setTab(o.k)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${tab === o.k ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"}`}
                >
                  {o.t}
                </button>
              ))}
            </div>

            {tab === "doubts" && (
              <div className="space-y-2.5">
                {(doubts.data || []).length === 0 && <p className="text-sm text-gray-500 text-center py-8">No doubts yet.</p>}
                {(doubts.data || []).map((d) => (
                  <DoubtItem key={d._id} d={d} onChanged={() => doubts.refetch()} />
                ))}
              </div>
            )}

            {tab === "joined" && (
              <div className="space-y-2">
                {joined.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No student has opened this class yet.</p>}
                {joined.map((j) => (
                  <div key={j.userId} className="flex items-center gap-3 bg-[#111827] border border-gray-800 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{j.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {j.phone} · first opened {fmt(j.firstJoinedAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold">{j.watchMinutes} min</p>
                      <p className="text-[10px]">
                        {j.joinedLive && <span className="text-red-400">Live </span>}
                        {j.completed && <span className="text-green-400">✓ Done</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "absent" && (
              <div className="space-y-2">
                {notJoined.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Every student in the batch has opened this class. 🎉</p>}
                {notJoined.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between bg-[#111827] border border-gray-800 rounded-xl p-3">
                    <p className="text-sm truncate">{u.name}</p>
                    <a href={`tel:${u.phone}`} className="text-[11px] text-[#A78BFA]">
                      {u.phone}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherClassDetail;
