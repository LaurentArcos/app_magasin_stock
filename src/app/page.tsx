"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useOffline } from "@/context/OfflineProvider";
import LanguageToggle from "@/components/LanguageToggle";
import AdminLogin from "@/components/AdminLogin";
import SearchBar from "@/components/SearchBar";
import ResultList from "@/components/ResultList";
import ProductCard from "@/components/ProductCard";
import SyncStatus from "@/components/SyncStatus";
import { searchProductsLocal } from "@/lib/store";
import type { AirtableRecord } from "@/lib/types";

export default function Home() {
  const { t } = useI18n();
  const { online } = useOffline();
  const [results, setResults] = useState<AirtableRecord[] | null>(null);
  const [selected, setSelected] = useState<AirtableRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La recherche se fait toujours sur le cache local (fonctionne hors ligne).
  async function search(q: string) {
    if (!q) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const records = await searchProductsLocal(q);
      setResults(records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleUpdated(updated: AirtableRecord) {
    setSelected(updated);
    setResults((prev) =>
      prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header collant */}
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </span>
            <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {t("app_title")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AdminLogin />
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        <SyncStatus />

        {/* Barre de recherche */}
        <div className="mb-5">
          <SearchBar onSearch={search} loading={loading} />
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {selected ? (
          <ProductCard
            record={selected}
            onBack={() => setSelected(null)}
            onUpdated={handleUpdated}
          />
        ) : results !== null ? (
          <ResultList records={results} onSelect={setSelected} />
        ) : (
          <EmptyState online={online} />
        )}
      </main>
    </div>
  );
}

function EmptyState({ online }: { online: boolean }) {
  const { t } = useI18n();
  return (
    <div className="mt-10 flex flex-col items-center gap-3 text-center text-slate-400">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-12 w-12"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <p className="max-w-xs text-sm">
        {online ? t("search_placeholder") : t("offline_banner")}
      </p>
    </div>
  );
}
