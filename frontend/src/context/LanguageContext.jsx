// frontend/src/context/LanguageContext.jsx
//
// 🆕 NAYA — Poori website ke liye language-switching system ki NEEV.
// Teen languages support karta hai: Hindi (हिंदी), English, aur Hinglish
// (jo already poori website mein use ho raha tha — Roman script mein
// mix Hindi+English, jaisa is app ki asli "voice" hai).
//
// Kaise use karein kisi bhi component mein:
//   import { useLanguage } from "../context/LanguageContext";
//   const { t, language, setLanguage } = useLanguage();
//   <p>{t("submit")}</p>   // language ke hisaab se sahi text dikhega
//
// Naya text add karna ho to sirf translations.js mein ek naya key add
// karein — teeno languages ke saath.
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TRANSLATIONS } from "../i18n/translations";

const LanguageContext = createContext(null);

const STORAGE_KEY = "batchmock_language";
const VALID_LANGUAGES = ["hindi", "english", "hinglish"];
const DEFAULT_LANGUAGE = "hinglish"; // 🆕 website ki asli/purani "voice" — backward-compatible default

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return VALID_LANGUAGES.includes(saved) ? saved : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = useCallback((lang) => {
    if (!VALID_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage na mile to bhi chalne do, sirf is session ke liye lagu hoga
    }
  }, []);

  // 🆕 "t" function — key dekar sahi language ka text nikalta hai.
  // Agar kisi key ka translation abhi tak nahi likha gaya, to key ka naam
  // hi dikha deta hai (console mein warning bhi) — taaki missing translation
  // turant pata chal jaaye, chup-chaap khaali na dikhe.
  const t = useCallback(
    (key) => {
      const entry = TRANSLATIONS[key];
      if (!entry) {
        console.warn(`[i18n] Translation missing for key: "${key}"`);
        return key;
      }
      return entry[language] || entry.hinglish || entry.english || key;
    },
    [language]
  );

  useEffect(() => {
    document.documentElement.lang = language === "hindi" ? "hi" : "en";
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage() sirf <LanguageProvider> ke andar use karein — App.jsx check karein.");
  }
  return ctx;
};
