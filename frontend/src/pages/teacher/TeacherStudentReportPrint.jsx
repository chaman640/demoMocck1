import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/api";

const PrintSkeleton = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-gray-300 border-t-[#7C3AED] rounded-full animate-spin" />
  </div>
);

const TeacherStudentReportPrint = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId, studentName, examName } = location.state || {};

  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    if (!studentId || !examName) {
      navigate("/TeacherStudentSearch");
      return;
    }
    setPhase("loading");
    try {
      const res = await api.get(`/teacher/analysis/overview/${studentId}/${encodeURIComponent(examName)}`);
      setData(res.data.data);
      setPhase("loaded");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not load this report.");
      setPhase("error");
    }
  }, [studentId, examName, navigate]);

  useEffect(() => { load(); }, [load]);

  if (phase === "loading") return <PrintSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-white text-gray-800 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p>{errorMsg}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm">Go Back</button>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      <div className="no-print sticky top-0 bg-gray-100 border-b border-gray-300 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 z-10">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900">&larr; Back</button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-800">
          <div>
            <h1 className="text-2xl font-bold">Student Progress Report</h1>
            <p className="text-sm text-gray-600 mt-1">Generated on {today}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{studentName}</p>
            <p className="text-sm text-gray-600">{examName}</p>
          </div>
        </div>

        {!data?.mockDataAvailable ? (
          <p className="text-gray-600">This student has not taken any Mock Test yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="border border-gray-300 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">
                  {data.lifetimeAverageScoreOutOf ? `${data.lifetimeAverageScore}/${data.lifetimeAverageScoreOutOf}` : data.lifetimeAverageScore}
                </p>
                <p className="text-[11px] text-gray-600 mt-1">Lifetime Average</p>
              </div>
              <div className="border border-gray-300 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{data.totalTestsGiven}</p>
                <p className="text-[11px] text-gray-600 mt-1">Total Mocks</p>
              </div>
              <div className="border border-gray-300 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{data.totalWrongLifetime}</p>
                <p className="text-[11px] text-gray-600 mt-1">Total Wrong</p>
              </div>
              <div className="border border-gray-300 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-700">-{data.marksLostToNegativeLifetime}</p>
                <p className="text-[11px] text-gray-600 mt-1">Negative Marking Lost</p>
              </div>
            </div>

            {data.trend && (
              <p className="mb-8 text-sm">
                <span className="font-semibold">Trend: </span>
                {data.trend.direction === "improving" && `Improving (${data.trend.changePercent > 0 ? "+" : ""}${data.trend.changePercent}% vs previous mocks)`}
                {data.trend.direction === "declining" && `Declining (${data.trend.changePercent}% vs previous mocks)`}
                {data.trend.direction === "same" && "Steady, no major change vs previous mocks"}
              </p>
            )}

            {data.subjectAnalysis?.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-300">Subject-wise Performance (last 3 mocks)</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 text-xs uppercase">
                      <th className="py-1.5">Subject</th>
                      <th className="py-1.5">Accuracy</th>
                      <th className="py-1.5">Avg Time / Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subjectAnalysis.map((s, i) => (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="py-1.5">{s.subjectName}</td>
                        <td className="py-1.5">{s.averageAccuracy}%</td>
                        <td className="py-1.5">{s.averageTimePerQuestion}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.topWeakTopics?.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-300">Topics Needing Attention</h2>
                <ul className="text-sm space-y-1.5">
                  {data.topWeakTopics.map((t, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{t.topicName} <span className="text-gray-500">({t.subjectName})</span></span>
                      <span className="text-red-700 font-medium">{t.wrongCount} wrong</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.graphData?.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-bold mb-3 pb-1 border-b border-gray-300">Recent Mock Test History</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 text-xs uppercase">
                      <th className="py-1.5">Mock</th>
                      <th className="py-1.5">Date</th>
                      <th className="py-1.5">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.graphData].reverse().slice(0, 10).map((g) => (
                      <tr key={g.performanceId} className="border-t border-gray-200">
                        <td className="py-1.5">{g.blueprintName}</td>
                        <td className="py-1.5">{new Date(g.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="py-1.5 font-medium">{g.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <p className="text-[11px] text-gray-400 mt-10 pt-4 border-t border-gray-200">Generated by BatchMock.in</p>
      </div>
    </div>
  );
};

export default TeacherStudentReportPrint;
