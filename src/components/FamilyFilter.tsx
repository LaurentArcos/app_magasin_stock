"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { familyLabel } from "@/lib/productFamily";

export interface Family {
  id: string; // identifiant canonique de la famille (ex: "zip")
  label: string; // libellé français au singulier (ex: "Zip")
  count: number;
}

// Barre de filtres par famille de produit (chips défilables horizontalement).
export default function FamilyFilter({
  families,
  selected,
  total,
  onSelect,
}: {
  families: Family[];
  selected: string | null;
  total: number;
  onSelect: (id: string | null) => void;
}) {
  const { t, lang } = useI18n();

  if (families.length === 0) return null;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-brand-600 bg-brand-600 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700"
    }`;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button onClick={() => onSelect(null)} className={chip(selected === null)}>
        {t("all_families")} <span className="opacity-70">{total}</span>
      </button>
      {families.map((fam) => (
        <button
          key={fam.id}
          onClick={() => onSelect(fam.id)}
          className={chip(selected === fam.id)}
        >
          {familyLabel(fam.id, fam.label, lang)}{" "}
          <span className="opacity-70">{fam.count}</span>
        </button>
      ))}
    </div>
  );
}
