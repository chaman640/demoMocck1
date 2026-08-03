import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-16 rounded-xl" />
      <SkeletonBlock className="w-full h-14 rounded-xl" />
    </div>
  </div>
);

const TeacherStudentSearch = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [teacher, setTeacher] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [phone, setPhone] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const meRes = await api.get("/teacher-me");
      setTeacher(meRes.data.data);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Data load nahi ho paaya.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCouponChanged = () => {
    setResults([]);
    setSearched(false);
    load();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError("");
    if (phone.trim().length < 3) {
      setSearchError("Kam se kam 3 digit daalein.");
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const res = await api.get("/teacher/search-student", { params: { phone: phone.trim() } });
      setResults(res.data.data || []);
    } catch (err) {
      setSearchError(err.response?.data?.message || "Search nahi ho paayi.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (phase === "loading") return <PageSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={load} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Student Search</h1>
          <p className="text-gray-400 text-sm">Apne active batch ke student ka analysis dekhein</p>
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Search karne ke liye pehle active batch select karein.</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                placeholder="Phone number (partial bhi chalega)"
                className="flex-1 px-4 py-2.5 text-sm bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-50 flex-shrink-0"
              >
                {searching ? "..." : "Search"}
              </button>
            </form>

            {searchError && (
              <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {searchError}
              </div>
            )}

            {searched && !searching && !searchError && (
              results.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">Koi student nahi mila.</p>
              ) : (
                <div className="space-y-2.5">
                  {results.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => navigate(`/TeacherStudentAnalysis/${s._id}`, { state: { examName: s.exam, studentName: s.name } })}
                      className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-xl p-4 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.phone} &middot; {s.exam}</p>
                      </div>
                      <span className="text-[#A78BFA] flex-shrink-0">→</span>
                    </button>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherStudentSearch;