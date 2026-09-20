import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

const LOGO_URL = "/logo.svg";
const POSTER_URL = "/poster.svg";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const FEATURES = [
    { icon: "📝", titleKey: "landing_feature_mock_title", descKey: "landing_feature_mock_desc" },
    { icon: "📚", titleKey: "landing_feature_pyq_title", descKey: "landing_feature_pyq_desc" },
    { icon: "📰", titleKey: "landing_feature_ca_title", descKey: "landing_feature_ca_desc" },
    { icon: "📊", titleKey: "landing_feature_analysis_title", descKey: "landing_feature_analysis_desc" },
    { icon: "🎯", titleKey: "landing_feature_rank_title", descKey: "landing_feature_rank_desc" },
    { icon: "👨‍🏫", titleKey: "landing_feature_batch_title", descKey: "landing_feature_batch_desc" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white overflow-x-hidden">
      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-6xl mx-auto gap-3">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img src={LOGO_URL} alt="BatchMock.in" className="w-9 h-9 object-contain" />
          <span className="text-lg font-bold tracking-tight">BatchMock.in</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 🆕 Language button — sirf yahan, poori site mein aur kahin nahi */}
          <LanguageSwitcher />
          <button
            onClick={() => navigate("/TeacherLogin")}
            className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap"
          >
            {t("landing_teacher_login")}
          </button>
          <button
            onClick={() => navigate("/Login")}
            className="px-4 sm:px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold transition-colors whitespace-nowrap"
          >
            {t("landing_student_login")}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] text-xs font-medium mb-5">
            {t("landing_badge")}
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-5">
            {t("landing_hero_title")}
          </h1>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
            {t("landing_hero_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/Singup")}
              className="px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors"
            >
              {t("landing_cta_start")}
            </button>
            <button
              onClick={() => navigate("/Login")}
              className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 font-medium transition-colors"
            >
              {t("landing_cta_login")}
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <img src={POSTER_URL} alt="Student preparing for exams" className="w-full max-w-md" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20 border-t border-gray-800">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t("landing_features_title")}</h2>
          <p className="text-gray-500 text-sm sm:text-base">{t("landing_features_subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-[#7C3AED]/40 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-base mb-2">{t(f.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Teacher CTA strip ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        <div className="bg-gradient-to-br from-[#7C3AED]/15 to-transparent border border-[#7C3AED]/30 rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">{t("landing_teacher_cta_title")}</h3>
            <p className="text-gray-400 text-sm max-w-md">{t("landing_teacher_cta_desc")}</p>
          </div>
          <button
            onClick={() => navigate("/TeacherLogin")}
            className="px-6 py-3 rounded-xl bg-white text-[#0A0D14] hover:bg-gray-200 font-semibold transition-colors flex-shrink-0"
          >
            {t("landing_teacher_login")} →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="BatchMock.in" className="w-5 h-5 object-contain" />
            <span>BatchMock.in</span>
          </div>
          <span>{t("landing_footer_tagline")}</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
