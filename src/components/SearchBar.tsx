"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function SearchBar({
  onSearch,
  loading,
}: {
  onSearch: (q: string) => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-4 ps-10 text-base shadow-card outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </div>
      <button
        type="submit"
        disabled={loading || value.trim().length === 0}
        className="rounded-2xl bg-brand-600 px-4 py-3 font-medium text-white shadow-card transition hover:bg-brand-700 active:scale-[.98] disabled:opacity-40 sm:px-5"
      >
        {loading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <span className="hidden sm:inline">{t("search_button")}</span>
        )}
        {!loading && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 sm:hidden"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        )}
      </button>
    </form>
  );
}
