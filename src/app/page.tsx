"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useOffline } from "@/context/OfflineProvider";
import { useAuth } from "@/context/AuthProvider";
import LanguageToggle from "@/components/LanguageToggle";
import AdminLogin from "@/components/AdminLogin";
import SearchBar from "@/components/SearchBar";
import FamilyFilter, { type Family } from "@/components/FamilyFilter";
import SelectFilter, { type Option } from "@/components/SelectFilter";
import ProductTiles from "@/components/ProductTiles";
import ProductCard from "@/components/ProductCard";
import ProductForm from "@/components/ProductForm";
import SyncStatus from "@/components/SyncStatus";
import { getCachedProducts } from "@/lib/store";
import { familyOf, groupKey, displayLabel } from "@/lib/productFamily";
import type { AirtableRecord } from "@/lib/types";

// Enregistrement enrichi des clés de filtrage (calculées une seule fois).
interface Indexed {
  record: AirtableRecord;
  familyId: string | null;
  familyLabel: string;
  fournisseurKey: string;
  fournisseurLabel: string;
  chezKey: string;
  chezLabel: string;
  haystack: string;
}

// Construit la liste d'options (clé, libellé, compteur) d'un critère.
function buildOptions(
  rows: Indexed[],
  key: (r: Indexed) => string,
  label: (r: Indexed) => string
): Option[] {
  const m = new Map<string, Option>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    const existing = m.get(k);
    if (existing) existing.count += 1;
    else m.set(k, { key: k, label: label(r), count: 1 });
  }
  return [...m.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

// Garantit que la valeur sélectionnée reste visible dans la liste, même si
// les autres filtres la ramènent à zéro résultat (sinon le menu paraîtrait vide).
function withSelected(
  options: Option[],
  selected: string | null,
  allRows: Indexed[],
  key: (r: Indexed) => string,
  label: (r: Indexed) => string
): Option[] {
  if (!selected || options.some((o) => o.key === selected)) return options;
  const row = allRows.find((r) => key(r) === selected);
  if (!row) return options;
  return [{ key: selected, label: label(row), count: 0 }, ...options];
}

export default function Home() {
  const { t } = useI18n();
  const { lastSync } = useOffline();
  const { isAdmin } = useAuth();

  const [all, setAll] = useState<AirtableRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [fournisseur, setFournisseur] = useState<string | null>(null);
  const [chezQui, setChezQui] = useState<string | null>(null);
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

  // Index de filtrage : famille de produit déduite du texte libre du champ
  // "Produit" ("zip 13 metal argent", "ZIP 15 5880", "zips parka 1311" -> zip),
  // et clés normalisées pour Fournisseur / Chez qui (casse et espaces ignorés).
  const indexed = useMemo<Indexed[]>(
    () =>
      all.map((record) => {
        const f = record.fields;
        const fam = familyOf(f.Produit);
        const fournisseurRaw = (f.Fournisseur ?? "").trim();
        const chezRaw = (f["Chez qui"] ?? "").trim();
        return {
          record,
          familyId: fam?.id ?? null,
          familyLabel: fam?.label ?? "",
          fournisseurKey: groupKey(fournisseurRaw),
          fournisseurLabel: displayLabel(fournisseurRaw),
          chezKey: groupKey(chezRaw),
          chezLabel: displayLabel(chezRaw),
          haystack: [
            f.Produit,
            f.Produit1,
            f.Produit2,
            f["Référence"],
            f.Fournisseur,
            f["Chez qui"],
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        };
      }),
    [all]
  );

  // Prédicats individuels : chaque liste d'options est calculée en ignorant
  // son propre critère, pour que les compteurs restent cohérents.
  const okQuery = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (r: Indexed) => (q ? r.haystack.includes(q) : true);
  }, [query]);

  const okFamily = (r: Indexed) => !family || r.familyId === family;
  const okFournisseur = (r: Indexed) =>
    !fournisseur || r.fournisseurKey === fournisseur;
  const okChez = (r: Indexed) => !chezQui || r.chezKey === chezQui;

  // Familles de produit disponibles, avec compteur.
  const familyScope = useMemo(
    () => indexed.filter((r) => okQuery(r) && okFournisseur(r) && okChez(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indexed, okQuery, fournisseur, chezQui]
  );

  const families = useMemo<Family[]>(() => {
    const rows = familyScope;
    const m = new Map<string, Family>();
    for (const r of rows) {
      if (!r.familyId) continue;
      const e = m.get(r.familyId);
      if (e) e.count += 1;
      else m.set(r.familyId, { id: r.familyId, label: r.familyLabel, count: 1 });
    }
    // La famille sélectionnée reste toujours affichée, même à 0 résultat.
    if (family && !m.has(family)) {
      const row = indexed.find((r) => r.familyId === family);
      if (row) m.set(family, { id: family, label: row.familyLabel, count: 0 });
    }
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [familyScope, indexed, family]);

  const fournisseurOptions = useMemo(() => {
    const k = (r: Indexed) => r.fournisseurKey;
    const l = (r: Indexed) => r.fournisseurLabel;
    const opts = buildOptions(
      indexed.filter((r) => okQuery(r) && okFamily(r) && okChez(r)),
      k,
      l
    );
    return withSelected(opts, fournisseur, indexed, k, l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexed, okQuery, family, fournisseur, chezQui]);

  const chezOptions = useMemo(() => {
    const k = (r: Indexed) => r.chezKey;
    const l = (r: Indexed) => r.chezLabel;
    const opts = buildOptions(
      indexed.filter((r) => okQuery(r) && okFamily(r) && okFournisseur(r)),
      k,
      l
    );
    return withSelected(opts, chezQui, indexed, k, l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexed, okQuery, family, fournisseur, chezQui]);

  // Produits filtrés (famille + fournisseur + chez qui + recherche texte).
  const filtered = useMemo(
    () =>
      indexed
        .filter(
          (r) => okQuery(r) && okFamily(r) && okFournisseur(r) && okChez(r)
        )
        .map((r) => r.record),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indexed, okQuery, family, fournisseur, chezQui]
  );

  const hasFilters = family !== null || fournisseur !== null || chezQui !== null;

  function resetFilters() {
    setFamily(null);
    setFournisseur(null);
    setChezQui(null);
  }

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

            <div className="mb-4 space-y-3">
              <FamilyFilter
                families={families}
                selected={family}
                total={familyScope.length}
                onSelect={setFamily}
              />

              <div className="flex items-end gap-2">
                <SelectFilter
                  label={t("field_Fournisseur")}
                  allLabel={t("all_suppliers")}
                  options={fournisseurOptions}
                  value={fournisseur}
                  onChange={setFournisseur}
                />
                <SelectFilter
                  label={t("field_Chez qui")}
                  allLabel={t("all_holders")}
                  options={chezOptions}
                  value={chezQui}
                  onChange={setChezQui}
                />
              </div>

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="mx-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  {t("reset_filters")}
                </button>
              )}
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
