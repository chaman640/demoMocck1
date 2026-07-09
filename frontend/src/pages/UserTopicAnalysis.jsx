import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const BASE_URL = "http://localhost:5000/api";

const UserTopicAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const examNameFromState = location.state?.examName;
  const subjectNameFromState = location.state?.subjectName;
  const topicNameFromState = location.state?.topicName;

  useEffect(() => {
    // Agar kisi ne directly ye URL khol liya, usko wapas overview pe bhej do
    if (!topicNameFromState || !subjectNameFromState) {
      navigate('/UserAllAnalysis');
      return;
    }

    const fetchTopicAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        let activeExamName = examNameFromState;

        if (!activeExamName) {
          const meRes = await fetch(`${BASE_URL}/me`, { credentials: "include" });
          const meJson = await meRes.json();
          if (!meRes.ok || !meJson.success) throw new Error("Please login first.");
          activeExamName = meJson.data.exam;
        }

        const examEncoded = encodeURIComponent(activeExamName);
        const subjectEncoded = encodeURIComponent(subjectNameFromState);
        const topicEncoded = encodeURIComponent(topicNameFromState);
        
        // 🎯 NAYA URL: "active_user" backend ko batayega token se ID uthane ko
        const url = `${BASE_URL}/analysis/topic/active_user/${examEncoded}/${subjectEncoded}/${topicEncoded}`;

        const res = await fetch(url, { credentials: "include" });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Backend se error aaya");
        }

        setData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicAnalysis();
  }, [examNameFromState, subjectNameFromState, topicNameFromState, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-800 border-t-[#8B5CF6] rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium tracking-wide">Fetching deep research data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-red-500/30 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/UserAllAnalysis')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          // Wapas Subject Analysis page par bhejna state ke sath
          onClick={() => navigate('/UserSubjectAnallysis', { 
            state: { examName: examNameFromState, subjectName: data.subjectName } 
          })}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to {data.subjectName}
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topic Deep Research — <span className="text-[#A78BFA]">{data.topicName}</span></h1>
          <p className="text-gray-400 mt-2 text-sm">Subject: {data.subjectName} | Combined data from all lifetime mocks</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Efficiency</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#A78BFA]">{data.summary?.efficiency}%</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Attempted</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">{data.summary?.totalAttempted}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Correct</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-400">{data.summary?.totalCorrect}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Wrong</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-400">{data.summary?.totalWrong}</p>
          </div>
        </div>

        {/* ── Good At ── */}
        <section className="pt-6">
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            ✅ Correctly Answered ({data.goodAt?.length || 0})
          </h3>
          {data.goodAt?.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-gray-500 text-sm">
              Aapne is topic mein koi sawaal sahi nahi kiya hai.
            </div>
          ) : (
            <div className="space-y-4">
              {data.goodAt?.map((q, i) => (
                <QuestionCard key={i} q={q} type="good" index={i} />
              ))}
            </div>
          )}
        </section>

        {/* ── Wrong ── */}
        <section className="pt-6">
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            ❌ Incorrect Answers ({data.wrong?.length || 0})
          </h3>
          {data.wrong?.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-green-400/80 text-sm">
              Great! Aapne koi sawaal galat nahi kiya.
            </div>
          ) : (
            <div className="space-y-4">
              {data.wrong?.map((q, i) => (
                <QuestionCard key={i} q={q} type="wrong" index={i} />
              ))}
            </div>
          )}
        </section>

        {/* ── Unattempted ── */}
        <section className="pt-6">
          <h3 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
            ⏭️ Unattempted ({data.unattempted?.length || 0})
          </h3>
          {data.unattempted?.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-green-400/80 text-sm">
              Awesome! Aapne sabhi sawaal attempt kiye hain.
            </div>
          ) : (
            <div className="space-y-4">
              {data.unattempted?.map((q, i) => (
                <QuestionCard key={i} q={q} type="unattempted" index={i} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

// ── Question Card Component (Dark Theme UI) ──
const QuestionCard = ({ q, type, index }) => {
  const borderColorClass =
    type === "good" ? "border-l-green-500" : type === "wrong" ? "border-l-red-500" : "border-l-yellow-500";

  return (
    <div className={`bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 shadow-md border-l-4 ${borderColorClass}`}>
      
      {/* Meta info */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 mb-4 font-mono">
        <span>Mock ID: {String(q.performanceId).slice(-6)}</span>
        <span>•</span>
        <span>{new Date(q.mockDate).toLocaleDateString("hi-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span>•</span>
        <span>Time: {q.timeTakenInSeconds ?? "—"}s</span>
      </div>

      {/* Question */}
      <p className="text-base sm:text-lg font-medium text-gray-200 mb-5 leading-relaxed">
        <span className="text-gray-500 mr-2">Q{index + 1}.</span> 
        {q.question}
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {[1, 2, 3, 4].map((n) => {
          const isCorrect = q.correctOption === n;
          const isUser = q.userAnswer === String(n);
          
          let optionStyle = "bg-[#1F2937] border-gray-700 text-gray-400"; // Default
          
          if (isCorrect) {
            optionStyle = "bg-green-500/10 border-green-500/30 text-green-400 font-semibold";
          } else if (isUser && !isCorrect) {
            optionStyle = "bg-red-500/10 border-red-500/30 text-red-400 font-semibold";
          }

          return (
            <div
              key={n}
              className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${optionStyle}`}
            >
              <span className="shrink-0">{n}.</span>
              <span className="flex-1">{q.options?.[`option${n}`]}</span>
              {isCorrect && <span className="shrink-0">✅</span>}
              {isUser && !isCorrect && <span className="shrink-0 text-xs mt-0.5">(Your Answer) ❌</span>}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4 mt-2">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">Explanation</p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

export default UserTopicAnalysis;