"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Lang, translations } from "./translations";

interface I18nContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "app_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Démarre en français (choix par défaut).
  const [lang, setLangState] = useState<Lang>("fr");

  // Restaure la préférence enregistrée.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "fr" || saved === "ar") {
      setLangState(saved);
    }
  }, []);

  // Applique lang + dir sur <html>.
  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(
    () => setLangState((cur) => (cur === "fr" ? "ar" : "fr")),
    []
  );

  const t = useCallback(
    (key: string) => translations[lang][key] ?? key,
    [lang]
  );

  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, dir, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n doit être utilisé dans un I18nProvider");
  }
  return ctx;
}
