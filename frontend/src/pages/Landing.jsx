import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Coins,
  Flame,
  Gift,
  GraduationCap,
  Languages,
  Menu,
  Newspaper,
  Swords,
  Target,
  Timer,
  Trophy,
  Users,
  X,
} from "lucide-react";
import api from "../api/api";
import InstallAppButton from "../components/InstallAppButton";

const LOGO_URL = "/logo.svg";
const BRAND = "AntimPrayash.in";

// Backend down ho ya list khaali aaye, tab bhi exam chips dikhte rahein
const FALLBACK_EXAMS = ["UP Police Constable", "SSC GD", "SSC CGL"];

const JOURNEY = [
  { icon: BookOpen, label: "Learn", desc: "Daily current affairs" },
  { icon: ClipboardList, label: "Practice", desc: "Mocks & PYQs" },
  { icon: ChartColumn, label: "Improve", desc: "Deep analysis" },
  { icon: Trophy, label: "Succeed", desc: "Crack the exam" },
];

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Full-Length Mock Tests",
    desc: "Real exam-pattern mocks with exact timing and negative marking, so exam day feels familiar.",
    tint: "bg-violet-50 text-violet-600",
  },
  {
    icon: BookOpen,
    title: "Previous Year Papers",
    desc: "Attempt actual past papers in a real test window, organised by exam.",
    tint: "bg-sky-50 text-sky-600",
  },
  {
    icon: ChartColumn,
    title: "Subject & Topic Analysis",
    desc: "Find weak topics, track accuracy and time per question, and see exactly where marks slip.",
    tint: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Newspaper,
    title: "Daily Current Affairs",
    desc: "Short daily updates with a quick quiz, curated for your exam category.",
    tint: "bg-amber-50 text-amber-600",
  },
  {
    icon: Swords,
    title: "Challenge Your Friends",
    desc: "Create a test, share the code and compete on a live leaderboard.",
    tint: "bg-rose-50 text-rose-600",
  },
  {
    icon: Languages,
    title: "Hindi & English",
    desc: "Prepare in the language you think in — switch any time.",
    tint: "bg-indigo-50 text-indigo-600",
  },
];

const STEPS = [
  { title: "Sign up free", desc: "Create your account with your phone number in under a minute." },
  { title: "Pick your exam", desc: "Choose your target exam — your mocks, papers and analysis adapt to it." },
  { title: "Practice & improve", desc: "Attempt tests, review solutions and fix weak topics one by one." },
];

const FAQS = [
  {
    q: `Is ${BRAND} free to use?`,
    a: "Yes. You can sign up, attempt mock tests, previous year papers and daily current affairs for free.",
  },
  {
    q: "Which exams can I prepare for?",
    a: "Government exams such as UP Police Constable, SSC GD and SSC CGL — the list on this page shows every exam currently available, and new exams keep getting added.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. The site works in any mobile browser, and you can install it as an app from the “Install App” button.",
  },
  {
    q: "How do coins and streaks work?",
    a: "You earn coins for practising every day. Keep your streak alive, collect coins and redeem them for books in the Rewards Store.",
  },
  {
    q: "I run a coaching / I am a teacher. Can I use it for my batch?",
    a: "Yes. Teachers get a dashboard to create batch coupons, custom tests, track every student's performance and see class-wide weak topics.",
  },
];

const Section = ({ id, className = "", children }) => (
  <section id={id} className={`scroll-mt-20 ${className}`}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6">{children}</div>
  </section>
);

const SectionTitle = ({ eyebrow, title, subtitle }) => (
  <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 mb-2">{eyebrow}</p>
    )}
    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h2>
    {subtitle && <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">{subtitle}</p>}
  </div>
);

// Hero ke right side ka product preview — sirf ek sample illustration hai
const ProductPreview = () => {
  const subjects = [
    { name: "Reasoning", pct: 86, color: "bg-emerald-500" },
    { name: "General Knowledge", pct: 64, color: "bg-sky-500" },
    { name: "Mathematics", pct: 48, color: "bg-amber-500" },
    { name: "Hindi", pct: 72, color: "bg-violet-500" },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="absolute -inset-4 bg-gradient-to-tr from-violet-200 via-fuchsia-100 to-sky-100 rounded-[2rem] blur-2xl opacity-70" />
      <div className="relative bg-white rounded-3xl border border-slate-200 shadow-xl shadow-violet-100 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Sample result</p>
            <p className="text-sm font-semibold text-slate-800">Full Mock Test · 01</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-1">
            <Flame className="w-3.5 h-3.5" /> 12-day streak
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { icon: Target, label: "Score", value: "68/100" },
            { icon: CircleCheck, label: "Accuracy", value: "81%" },
            { icon: Timer, label: "Time", value: "54 min" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
              <Icon className="w-4 h-4 mx-auto text-violet-600 mb-1" />
              <p className="text-sm font-bold text-slate-900">{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-slate-700 mb-3">Subject-wise accuracy</p>
        <div className="space-y-3">
          {subjects.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                <span>{s.name}</span>
                <span className="font-semibold text-slate-700">{s.pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <Coins className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-800">
            <span className="font-semibold">+20 coins</span> earned for today’s practice
          </p>
        </div>
      </div>
    </div>
  );
};

const FaqItem = ({ q, a }) => (
  <details className="group bg-white border border-slate-200 rounded-2xl px-5 py-4 open:shadow-sm">
    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-sm sm:text-base font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
      {q}
      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <p className="mt-3 text-sm text-slate-500 leading-relaxed">{a}</p>
  </details>
);

const Landing = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: exams } = useQuery({
    queryKey: ["allExamName"],
    queryFn: async () => {
      const res = await api.get("/allExamName");
      return res.data.data;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const examList = exams?.length ? exams : FALLBACK_EXAMS;

  const goSignup = () => navigate("/Singup");
  const goLogin = () => navigate("/Login");

  const navLinks = [
    { href: "#exams", label: "Exams" },
    { href: "#features", label: "Features" },
    { href: "#rewards", label: "Rewards" },
    { href: "#teachers", label: "For Teachers" },
    { href: "#faq", label: "FAQ" },
  ];

  // HashRouter use ho raha hai, isliye "#exams" jaisa href route badal deta.
  // Isliye in-page sections par scroll manually karte hain.
  const scrollTo = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
  };

  const primaryBtn =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-lg shadow-violet-200 transition-colors whitespace-nowrap";
  const secondaryBtn =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white hover:border-violet-400 hover:text-violet-700 text-slate-700 text-sm font-semibold transition-colors whitespace-nowrap";

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans antialiased">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/Landing" className="flex items-center gap-2">
            <img src={LOGO_URL} alt={BRAND} className="w-8 h-8 object-contain rounded" />
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900">{BRAND}</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => scrollTo(e, l.href)}
                className="text-sm font-medium text-slate-600 hover:text-violet-700 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goLogin}
              className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-violet-700 transition-colors"
            >
              Login
            </button>
            <button
              onClick={goSignup}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden p-2 -mr-2 text-slate-600"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => scrollTo(e, l.href)}
                className="block px-2 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {l.label}
              </a>
            ))}
            <button
              onClick={goLogin}
              className="block w-full text-left px-2 py-2.5 rounded-lg text-sm font-semibold text-violet-700 hover:bg-slate-50"
            >
              Login
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/80 via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-violet-200 text-violet-700 text-xs font-semibold mb-6 shadow-sm">
              <GraduationCap className="w-3.5 h-3.5" /> Built for Government Exam Aspirants
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-slate-900">
              One destination for your{" "}
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                complete exam preparation
              </span>
            </h1>
            <p className="mt-5 text-slate-500 text-sm sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Mock tests, previous year papers, daily current affairs and detailed performance analysis — all
              in one place, in Hindi and English.
            </p>

            {/* Learn → Practice → Improve → Succeed */}
            <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto lg:mx-0">
              {JOURNEY.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex flex-col items-center lg:items-start">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-violet-600" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{label}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 text-center lg:text-left">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button onClick={goSignup} className={primaryBtn}>
                Get Started — It’s Free <ArrowRight className="w-4 h-4" />
              </button>
              <InstallAppButton className={secondaryBtn} />
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Already have an account?{" "}
              <button onClick={goLogin} className="font-semibold text-violet-700 hover:underline">
                Login
              </button>
            </p>
          </div>

          <ProductPreview />
        </div>
      </section>

      {/* ── Exams ── */}
      <Section id="exams" className="py-14 sm:py-20 bg-slate-50 border-y border-slate-100">
        <SectionTitle
          eyebrow="Exams"
          title="Choose your exam and start preparing"
          subtitle="Mocks, papers and analysis tailored to the exam you select."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {examList.map((name) => (
            <button
              key={name}
              onClick={goSignup}
              className="group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-violet-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-700 font-bold flex items-center justify-center text-sm shrink-0">
                {name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 3)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{name}</p>
                <p className="text-xs text-slate-500">Mock tests · PYQs · Analysis</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </Section>

      {/* ── Features ── */}
      <Section id="features" className="py-14 sm:py-24">
        <SectionTitle
          eyebrow={`Why ${BRAND}`}
          title="Everything you need to crack your exam"
          subtitle="Stop juggling five apps. Practice, revise and track your progress in one place."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, tint }) => (
            <div
              key={title}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${tint}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section className="py-14 sm:py-20 bg-slate-50 border-y border-slate-100">
        <SectionTitle eyebrow="How it works" title="Start in three simple steps" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative bg-white border border-slate-200 rounded-2xl p-6">
              <div className="w-9 h-9 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center mb-4">
                {i + 1}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Rewards (coins + streak) ── */}
      <Section id="rewards" className="py-14 sm:py-24">
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border border-orange-100 p-6 sm:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600 mb-2">Rewards</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Practice daily. Earn coins. Get free books.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Build a habit that sticks. Every day you practise keeps your streak alive and earns you coins
              you can redeem for real books.
            </p>
            <button onClick={goSignup} className={`${primaryBtn} mt-7`}>
              Start your streak <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
            {[
              { icon: Flame, title: "Daily streak", desc: "Practise every day and watch your streak grow.", color: "text-orange-500" },
              { icon: Coins, title: "Earn coins", desc: "Get coins for tests, quizzes and challenges.", color: "text-amber-500" },
              { icon: Gift, title: "Redeem books", desc: "Spend coins in the Rewards Store on books.", color: "text-rose-500" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white/80 rounded-2xl border border-white p-5 shadow-sm lg:flex lg:items-start lg:gap-4">
                <Icon className={`w-6 h-6 mb-3 lg:mb-0 shrink-0 ${color}`} />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── For teachers ── */}
      <Section id="teachers" className="pb-14 sm:pb-24">
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-12 grid lg:grid-cols-2 gap-10 items-center overflow-hidden relative">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300 mb-2">For teachers & coaching</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Run your batch smarter</h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Give your students mocks and custom tests, and see exactly where each one — and the whole class —
              needs help.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/TeacherLogin")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 hover:bg-violet-50 text-sm font-semibold transition-colors"
              >
                Teacher Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ul className="relative space-y-3">
            {[
              "Batch coupons to enrol students in one step",
              "Create custom tests and see results instantly",
              "Student-wise subject & topic analysis",
              "Class-wide weak-topic and question analysis",
              "Bulk student import and printable reports",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                <CircleCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
            <li className="flex items-start gap-3 text-sm text-slate-200">
              <Users className="w-5 h-5 text-violet-300 shrink-0" />
              Invite sub-teachers to manage subjects
            </li>
          </ul>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq" className="py-14 sm:py-20 bg-slate-50 border-y border-slate-100">
        <SectionTitle eyebrow="FAQ" title="Frequently asked questions" />
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((f) => (
            <FaqItem key={f.q} {...f} />
          ))}
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <Section className="py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Your selection starts with today’s practice
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-500">
            Join free, take your first mock test and see where you stand.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={goSignup} className={primaryBtn}>
              Create free account <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={goLogin} className={secondaryBtn}>
              Login
            </button>
          </div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <img src={LOGO_URL} alt={BRAND} className="w-8 h-8 object-contain rounded" />
              <span className="text-lg font-bold text-white">{BRAND}</span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              Mock tests, previous year papers and analysis for government exam aspirants.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-3">Students</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/Singup" className="hover:text-white">Sign Up</Link></li>
              <li><Link to="/Login" className="hover:text-white">Login</Link></li>
              <li><Link to="/ForgotPassword" className="hover:text-white">Forgot Password</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-3">More</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/TeacherLogin" className="hover:text-white">Teacher Login</Link></li>
              <li><Link to="/PromoterLogin" className="hover:text-white">Promoter Login</Link></li>
              <li><Link to="/PrivacyPolicy" className="hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-slate-500">
            © {new Date().getFullYear()} {BRAND} — All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
