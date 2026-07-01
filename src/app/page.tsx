"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useOffline } from "@/context/OfflineProvider";
import { useAuth } from "@/context/AuthProvider";
import LanguageToggle from "@/components/LanguageToggle";
import AdminLogin from "@/components/AdminLogin";
import SearchBar from "@/components/SearchBar";
import FamilyFilter, { type Family } from "@/components/FamilyFilter";
import ProductTiles from "@/components/ProductTiles";
import ProductCard from "@/components/ProductCard";
import ProductForm from "@/components/ProductForm";
import SyncStatus from "@/components/SyncStatus";
import { getCachedProducts } from "@/lib/store";
import type { AirtableRecord } from "@/lib/types";

export default function Home() {
  const { t } = useI18n();
  const { lastSync } = useOffline();
  const { isAdmin } = useAuth();

  const [all, setAll] = useState<AirtableRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [selected, setSelected] = useState<AirtableRecord | null>(null);
  const [creating, setCreating] = useState(false);

  // Charge les produits du cache local, et recharge après chaque synchro.
  useEffect(() => {
    let active = true;
    getCachedProducts()
      .then((records) => {
        if (active) {
          setAll(records);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      active = false;
    };
  }, [lastSync]);

  // Familles (valeurs distinctes du champ Produit) avec compteur.
  const families = useMemo<Family[]>(() => {
    const m = new Map<string, number>();
    for (const r of all) {
      const k = (r.fields.Produit ?? "").trim();
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [all]);

  // Produits filtrés (famille + recherche texte).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      const f = r.fields;
      if (family && (f.Produit ?? "").trim() !== family) return false;
      if (q) {
        const hay = [
          f.Produit,
          f.Produit1,
          f.Produit2,
          f["Référence"],
          f.Fournisseur,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, family, query]);

  function handleUpdated(updated: AirtableRecord) {
    setSelected(updated);
    setAll((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleCreated(created: AirtableRecord) {
    setAll((prev) => {
      const exists = prev.some((r) => r.id === created.id);
      return exists
        ? prev.map((r) => (r.id === created.id ? created : r))
        : [created, ...prev];
    });
  }

  return (
    <div className="min-h-screen">
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

        {selected ? (
          <ProductCard
            record={selected}
            onBack={() => setSelected(null)}
            onUpdated={handleUpdated}
          />
        ) : creating && isAdmin ? (
          <ProductForm
            onBack={() => setCreating(false)}
            onCreated={handleCreated}
          />
        ) : (
          <>
            {isAdmin && (
              <button
                onClick={() => setCreating(true)}
                className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-[.99]"
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
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                {t("add_product")}
              </button>
            )}

            <div className="mb-3">
              <SearchBar value={query} onChange={setQuery} />
            </div>

            <div className="mb-4">
              <FamilyFilter
                families={families}
                selected={family}
                total={all.length}
                onSelect={setFamily}
              />
            </div>

            {!loaded ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {t("loading_products")}
              </p>
            ) : (
              <>
                <p className="mb-2 px-1 text-center text-sm text-slate-500">
                  {filtered.length} {t("results_count")}
                </p>
                <ProductTiles records={filtered} onSelect={setSelected} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
