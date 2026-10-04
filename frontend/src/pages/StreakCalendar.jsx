import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DayCell = ({ day, isToday }) => {
  const dateNum = Number(day.date.split("-")[2]);

  let content;
  if (day.status === "completed") {
    content = (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-sm">
        🔥
      </div>
    );
  } else if (day.status === "freeze") {
    content = (
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-sm">
        ❄️
      </div>
    );
  } else {
    content = (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
          day.status === "future" ? "text-gray-700" : "text-gray-600 bg-gray-800/40"
        } ${isToday ? "ring-2 ring-[#7C3AED]" : ""}`}
      >
        {dateNum}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {content}
      {(day.status === "completed" || day.status === "freeze") && (
        <span className={`text-[9px] ${isToday ? "text-[#A78BFA] font-bold" : "text-gray-600"}`}>{dateNum}</span>
      )}
    </div>
  );
};

const StreakCalendar = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const load = (year, month) => {
    setPhase("loading");
    api
      .get(`/rewards/streak-calendar?year=${year}&month=${month}`)
      .then((res) => {
        setData(res.data.data);
        setPhase("ready");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate("/Login");
          return;
        }
        setPhase("error");
      });
  };

  useEffect(() => {
    load(cursor.year, cursor.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const goPrevMonth = () => {
    setCursor((prev) => (prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 }));
  };
  const goNextMonth = () => {
    setCursor((prev) => (prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 }));
  };

  const leadingBlanks = data ? new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay() : 0;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">
          ←
        </button>
        <h1 className="text-base font-bold">Streak</h1>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {phase === "loading" && !data ? (
          <>
            <SkeletonBlock className="w-32 h-12 mx-auto" />
            <SkeletonBlock className="w-full h-72 rounded-2xl" />
          </>
        ) : phase === "error" ? (
          <p className="text-sm text-gray-500 text-center py-10">Could not load the streak.</p>
        ) : (
          data && (
            <>
              <div className="flex flex-col items-center gap-1">
                <div className="text-6xl">🔥</div>
                <p className="text-4xl font-extrabold text-orange-400">{data.currentStreak}</p>
                <p className="text-sm text-gray-400">day streak!</p>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={goPrevMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">
                    ‹
                  </button>
                  <p className="font-semibold text-sm">
                    {MONTH_NAMES[cursor.month - 1]} {cursor.year}
                  </p>
                  <button onClick={goNextMonth} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white">
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-3 place-items-center mb-2">
                  {WEEKDAYS.map((w, i) => (
                    <span key={i} className="text-[10px] text-gray-600 font-semibold">
                      {w}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-3 place-items-center">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {data.days.map((day) => (
                    <DayCell key={day.date} day={day} isToday={day.date === todayStr} />
                  ))}
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Longest Streak</span>
                <span className="text-lg font-bold text-orange-400">🔥 {data.longestStreak}</span>
              </div>

              <p className="text-[11px] text-gray-600 text-center px-4">
                Missing 1-2 days freezes your streak — missing more than that resets it.
              </p>
            </>
          )
        )}
      </main>
    </div>
  );
};

export default StreakCalendar;
