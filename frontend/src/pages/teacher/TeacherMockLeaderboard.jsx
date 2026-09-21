import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const rankColor = (rank) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-orange-400";
  return "text-gray-500";
};

const TeacherMockLeaderboard = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [blueprints, setBlueprints] = useState([]);
  const [selected, setSelected] = useState("");

  const [boardPhase, setBoardPhase] = useState("idle");
  const [board, setBoard] = useState(null);
  const [boardError, setBoardError] = useState("");

  const loadBlueprints = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await api.get("/teacher/mock-leaderboard/blueprints");
      const list = res.data.data || [];
      setBlueprints(list);
      if (list.length > 0) setSelected(list[0].blueprintName);
      setPhase("loaded");
    } catch (err) {
      if (err.response?.status === 401) { navigate("/TeacherLogin"); return; }
      setErrorMsg(err.response?.data?.message || "Could not load the list of mocks.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { loadBlueprints(); }, [loadBlueprints]);

  const loadBoard = useCallback(async (blueprintName) => {
    if (!blueprintName) return;
    setBoardPhase("loading");
    setBoardError("");
    try {
      const res = await api.get(`/teacher/mock-leaderboard/${encodeURIComponent(blueprintName)}`);
      setBoard(res.data.data);
      setBoardPhase("loaded");
    } catch (err) {
      setBoardError(err.response?.data?.message || "Could not load the leaderboard.");
      setBoardPhase("error");
    }
  }, []);

  useEffect(() => { if (selected) loadBoard(selected); }, [selected, loadBoard]);

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock className="w-48 h-7" />
          <SkeletonBlock className="w-full h-12 rounded-xl" />
          <SkeletonBlock className="w-full h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={loadBlueprints} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Try Again</button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate("/TeacherClassAnalysis")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">&larr; Back to Class Analysis</button>

        <div>
          <h1 className="text-2xl font-bold mb-1">Mock Test Leaderboard</h1>
          <p className="text-gray-400 text-sm">Best score per student, for your active batch</p>
        </div>

        {blueprints.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">No mocks found for this exam yet.</p>
          </div>
        ) : (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white"
            >
              {blueprints.map((bp) => (
                <option key={bp.blueprintName} value={bp.blueprintName}>{bp.blueprintName} ({bp.mockType})</option>
              ))}
            </select>

            {boardPhase === "loading" && (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
              </div>
            )}

            {boardPhase === "error" && (
              <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">{boardError}</div>
            )}

            {boardPhase === "loaded" && board && (
              <>
                <p className="text-xs text-gray-500">
                  {board.totalAttempted} of {board.totalBatchStudents} students have attempted &middot; max score: {board.maxScore}
                </p>

                <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                  {board.leaderboard.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400 text-center">No one in this batch has attempted this mock yet.</p>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {board.leaderboard.map((r) => (
                        <div key={r.studentId} className="flex items-center gap-3 px-4 py-3">
                          <span className={`w-7 text-center font-bold text-sm flex-shrink-0 ${rankColor(r.rank)}`}>#{r.rank}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-200 truncate">{r.name}</p>
                            <p className="text-[11px] text-gray-500">{r.attemptsCount} attempt{r.attemptsCount > 1 ? "s" : ""}</p>
                          </div>
                          <span className="text-sm font-bold text-[#A78BFA] flex-shrink-0">{r.bestScore}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {board.notAttempted.length > 0 && (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <h3 className="font-semibold text-sm text-gray-400">Not Attempted Yet ({board.notAttempted.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-48 overflow-y-auto">
                      {board.notAttempted.map((r) => (
                        <div key={r.studentId} className="px-4 py-2.5 text-sm text-gray-400">{r.name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherMockLeaderboard;
