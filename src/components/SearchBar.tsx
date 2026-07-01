"use client";

import { useI18n } from "@/i18n/I18nProvider";

// Recherche "live" : filtre au fur et à mesure de la frappe.
export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="relative">
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
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("search_placeholder")}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pe-10 ps-10 text-base shadow-card outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="clear"
          className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
