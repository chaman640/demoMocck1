def patch(path, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if new in content:
        print(f"OK [{label}]: already applied earlier, skipping — {path}")
        return
    if old not in content:
        print(f"WARNING [{label}]: anchor text not found in {path} — SKIPPED (file may have changed, needs manual check)")
        return
    if content.count(old) > 1:
        print(f"WARNING [{label}]: anchor text found MORE THAN ONCE in {path} — SKIPPED (ambiguous, needs manual check)")
        return
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK [{label}]: patched {path}")


# ─────────────────────────────────────────────
# App.jsx — imports, routes, mount CoinRewardListener
# ─────────────────────────────────────────────
patch(
    "frontend/src/App.jsx",
    "import AdminPromoters from './pages/AdminPromoters';",
    '''import AdminPromoters from './pages/AdminPromoters';
import RewardsStore from './pages/RewardsStore';
import MyRedemptions from './pages/MyRedemptions';
import StreakCalendar from './pages/StreakCalendar';
import CoinRewardListener from './components/CoinRewardListener';''',
    "App.jsx: rewards imports",
)

patch(
    "frontend/src/App.jsx",
    '            <Route path="/PromoterDashboard" element={<PromoterDashboard />} />',
    '''            <Route path="/PromoterDashboard" element={<PromoterDashboard />} />
            <Route path="/RewardsStore" element={<RewardsStore />} />
            <Route path="/MyRedemptions" element={<MyRedemptions />} />
            <Route path="/StreakCalendar" element={<StreakCalendar />} />''',
    "App.jsx: rewards routes",
)

patch(
    "frontend/src/App.jsx",
    '''        <HashRouter>
          <div>''',
    '''        <HashRouter>
          <CoinRewardListener />
          <div>''',
    "App.jsx: mount CoinRewardListener",
)

# ─────────────────────────────────────────────
# HomePage.jsx — header badge, rewards summary query, wide Rewards button
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/HomePage.jsx",
    '''  const averageScore = overview?.averageScore ?? null;
  const averageScoreOutOf = overview?.averageScoreOutOf ?? null; // 👈 NAYA
  const totalTests = overview?.totalTestsGiven ?? 0;''',
    '''  const averageScore = overview?.averageScore ?? null;
  const averageScoreOutOf = overview?.averageScoreOutOf ?? null; // 👈 NAYA
  const totalTests = overview?.totalTestsGiven ?? 0;

  // 🆕 Coins + streak badge (header)
  const { data: rewardsSummary } = useQuery({
    queryKey: ["rewards-summary"],
    queryFn: async () => {
      const res = await api.get("/rewards/summary");
      return res.data.data;
    },
    staleTime: 30 * 1000,
    retry: false,
  });''',
    "HomePage.jsx: rewards summary query",
)

patch(
    "frontend/src/pages/HomePage.jsx",
    '''      <header className="flex items-center px-4 py-3.5 border-b border-gray-800">
        <img src={LOGO_URL} alt="AntimPrayash.in" className="w-8 h-8 object-contain rounded-lg" />
        <span className="ml-2.5 text-base font-bold tracking-tight">AntimPrayash.in</span>
      </header>''',
    '''      <header className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800">
        <div className="flex items-center">
          <img src={LOGO_URL} alt="AntimPrayash.in" className="w-8 h-8 object-contain rounded-lg" />
          <span className="ml-2.5 text-base font-bold tracking-tight">AntimPrayash.in</span>
        </div>
        <button onClick={() => navigate("/RewardsStore")} className="flex items-center gap-2">
          {rewardsSummary?.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-orange-400">
              🔥{rewardsSummary.currentStreak}
            </span>
          )}
          <span className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1">
            <span className="text-xs">🪙</span>
            <span className="text-xs font-bold text-amber-300">{rewardsSummary?.coins ?? 0}</span>
          </span>
        </button>
      </header>''',
    "HomePage.jsx: header coin/streak badge",
)

patch(
    "frontend/src/pages/HomePage.jsx",
    '''    {
      icon: "⚔️",
      title: "Challenge",
      desc: "Challenge a friend",
      primary: false,
      onClick: () => navigate("/Challenge"),
    },
  ];''',
    '''    {
      icon: "⚔️",
      title: "Challenge",
      desc: "Challenge a friend",
      primary: false,
      onClick: () => navigate("/Challenge"),
    },
    {
      icon: "🎁",
      title: "Rewards Store",
      desc: "Coins se books lein",
      primary: false,
      wide: true,
      onClick: () => navigate("/RewardsStore"),
    },
  ];''',
    "HomePage.jsx: Rewards Store button entry",
)

patch(
    "frontend/src/pages/HomePage.jsx",
    '''            {mainActions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                className={`text-left p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                  action.primary
                    ? "bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] border-transparent text-white shadow-lg shadow-purple-900/20"
                    : "bg-[#111827] border-gray-800 text-gray-300 hover:border-gray-600"
                }`}
              >
                <span className="text-2xl mb-1.5 block">{action.icon}</span>
                <span className="text-sm font-bold text-white block mb-0.5">{action.title}</span>
                <span className={`text-[11px] block ${action.primary ? "text-purple-200" : "text-gray-500"}`}>
                  {action.desc}
                </span>
              </button>
            ))}''',
    '''            {mainActions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                className={`text-left p-4 rounded-2xl border transition-all active:scale-[0.97] ${action.wide ? "col-span-2 flex items-center gap-3" : ""} ${
                  action.wide
                    ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/30 text-white"
                    : action.primary
                    ? "bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] border-transparent text-white shadow-lg shadow-purple-900/20"
                    : "bg-[#111827] border-gray-800 text-gray-300 hover:border-gray-600"
                }`}
              >
                <span className={action.wide ? "text-3xl" : "text-2xl mb-1.5 block"}>{action.icon}</span>
                <div className={action.wide ? "flex-1" : ""}>
                  <span className="text-sm font-bold text-white block mb-0.5">{action.title}</span>
                  <span className={`text-[11px] block ${action.wide ? "text-amber-200" : action.primary ? "text-purple-200" : "text-gray-500"}`}>
                    {action.desc}
                  </span>
                </div>
                {action.wide && rewardsSummary?.coins !== undefined && (
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/20 rounded-full px-2.5 py-1 flex-shrink-0">
                    🪙 {rewardsSummary.coins}
                  </span>
                )}
              </button>
            ))}''',
    "HomePage.jsx: wide Rewards Store card styling",
)

# ─────────────────────────────────────────────
# ProfilePage.jsx — streak summary card + My Orders link
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/ProfilePage.jsx",
    '''  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");''',
    '''  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rewardsSummary, setRewardsSummary] = useState(null);''',
    "ProfilePage.jsx: rewardsSummary state",
)

patch(
    "frontend/src/pages/ProfilePage.jsx",
    '''    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {''',
    '''    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .get("/rewards/summary")
      .then((res) => setRewardsSummary(res.data.data))
      .catch(() => {});
  }, []);

  const startEdit = () => {''',
    "ProfilePage.jsx: fetch rewards summary",
)

patch(
    "frontend/src/pages/ProfilePage.jsx",
    '''            </div>

            {/* My Batch button */}
            <button
              onClick={() => navigate("/MyBatch")}
              className="w-full py-3 rounded-xl border border-[#7C3AED]/40 text-[#A78BFA] hover:bg-[#7C3AED]/10 font-medium mb-3 transition-colors"
            >
              My Batch
            </button>''',
    '''            </div>

            {/* 🆕 Streak & Coins */}
            {rewardsSummary && (
              <button
                onClick={() => navigate("/StreakCalendar")}
                className="w-full bg-[#111827] border border-gray-800 rounded-2xl p-4 mb-3 flex items-center justify-between hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <div className="text-left">
                    <p className="text-lg font-bold text-orange-400 leading-tight">{rewardsSummary.currentStreak} din</p>
                    <p className="text-[11px] text-gray-500">Current Streak &middot; Calendar dekhein →</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1.5">
                  <span className="text-sm">🪙</span>
                  <span className="text-sm font-bold text-amber-300">{rewardsSummary.coins}</span>
                </div>
              </button>
            )}

            {/* My Orders button */}
            <button
              onClick={() => navigate("/MyRedemptions")}
              className="w-full py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800/50 font-medium mb-3 transition-colors"
            >
              My Book Orders
            </button>

            {/* My Batch button */}
            <button
              onClick={() => navigate("/MyBatch")}
              className="w-full py-3 rounded-xl border border-[#7C3AED]/40 text-[#A78BFA] hover:bg-[#7C3AED]/10 font-medium mb-3 transition-colors"
            >
              My Batch
            </button>''',
    "ProfilePage.jsx: streak card + My Orders button",
)

# ─────────────────────────────────────────────
# MockTest.jsx — vibrate + coin popup on submit
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/MockTest.jsx",
    'import AdBanner from "../components/AdBanner";',
    '''import AdBanner from "../components/AdBanner";
import { emitCoinEarned } from "../utils/rewardEvents";
import { vibrateShort } from "../utils/vibrate";''',
    "MockTest.jsx: import reward utils",
)

patch(
    "frontend/src/pages/MockTest.jsx",
    '''      // Submit successful hone ke baad saved in-progress test hata do
      localStorage.removeItem(getStorageKey(userId));

      setResultData(res.data.data);
      setPhase("results");''',
    '''      // Submit successful hone ke baad saved in-progress test hata do
      localStorage.removeItem(getStorageKey(userId));

      vibrateShort();
      if (res.data.data?.coinsEarned) emitCoinEarned(res.data.data.coinsEarned);

      setResultData(res.data.data);
      setPhase("results");''',
    "MockTest.jsx: vibrate + coin celebration",
)

# ─────────────────────────────────────────────
# CustomTest.jsx — vibrate + coin popup on submit
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/CustomTest.jsx",
    'import AdBanner from "../components/AdBanner";',
    '''import AdBanner from "../components/AdBanner";
import { emitCoinEarned } from "../utils/rewardEvents";
import { vibrateShort } from "../utils/vibrate";''',
    "CustomTest.jsx: import reward utils",
)

patch(
    "frontend/src/pages/CustomTest.jsx",
    '''      const res = await api.post(`/custom-test/${testId}/submit`, { attemptedQuestions });

      localStorage.removeItem(getStorageKey(userId, testId));

      setResultData(res.data.data);
      setPhase("result");''',
    '''      const res = await api.post(`/custom-test/${testId}/submit`, { attemptedQuestions });

      localStorage.removeItem(getStorageKey(userId, testId));

      vibrateShort();
      if (res.data.data?.coinsEarned) emitCoinEarned(res.data.data.coinsEarned);

      setResultData(res.data.data);
      setPhase("result");''',
    "CustomTest.jsx: vibrate + coin celebration",
)

# ─────────────────────────────────────────────
# PreviousYearTest.jsx — vibrate + coin popup on submit
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    'import AdBanner from "../components/AdBanner";',
    '''import AdBanner from "../components/AdBanner";
import { emitCoinEarned } from "../utils/rewardEvents";
import { vibrateShort } from "../utils/vibrate";''',
    "PreviousYearTest.jsx: import reward utils",
)

patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    '''      const res = await api.post(`/previous-year-test/${testId}/submit`, { attemptedQuestions });

      localStorage.removeItem(getStorageKey(userId, testId));

      setResultData(res.data.data);
      setPhase("result");''',
    '''      const res = await api.post(`/previous-year-test/${testId}/submit`, { attemptedQuestions });

      localStorage.removeItem(getStorageKey(userId, testId));

      vibrateShort();
      if (res.data.data?.coinsEarned) emitCoinEarned(res.data.data.coinsEarned);

      setResultData(res.data.data);
      setPhase("result");''',
    "PreviousYearTest.jsx: vibrate + coin celebration",
)

# ─────────────────────────────────────────────
# CurrentAffairs.jsx — vibrate + coin popup on submit
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/CurrentAffairs.jsx",
    'import AdBanner from "../components/AdBanner";',
    '''import AdBanner from "../components/AdBanner";
import { emitCoinEarned } from "../utils/rewardEvents";
import { vibrateShort } from "../utils/vibrate";''',
    "CurrentAffairs.jsx: import reward utils",
)

patch(
    "frontend/src/pages/CurrentAffairs.jsx",
    '''      const res = await api.post(
        `/current-affair-quiz/${encodeURIComponent(examName)}/${affair.date}/submit`,
        { attemptedQuestions }
      );
      setResultData(res.data.data);''',
    '''      const res = await api.post(
        `/current-affair-quiz/${encodeURIComponent(examName)}/${affair.date}/submit`,
        { attemptedQuestions }
      );
      vibrateShort();
      if (res.data.data?.coinsEarned) emitCoinEarned(res.data.data.coinsEarned);
      setResultData(res.data.data);''',
    "CurrentAffairs.jsx: vibrate + coin celebration",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar koi WARNING aaya hai to wo file manually check karni hogi — patch skip ho gaya hai, koi nuksan nahi hua.")
