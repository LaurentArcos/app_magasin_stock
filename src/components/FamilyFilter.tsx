"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { translateProduct } from "@/lib/productNames";

export interface Family {
  name: string;
  count: number;
}

// Pluriel d'affichage (français) : on pluralise le mot principal (le premier),
// sauf s'il se termine déjà par s, x ou z. Ex: "Bouton à coudre" -> "Boutons à coudre".
function pluralize(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return name;
  const head = parts[0];
  if (!/[sxz]$/i.test(head)) parts[0] = head + "s";
  return parts.join(" ");
}

// Libellé d'une famille : arabe traduit si dispo, sinon pluriel français.
function familyLabel(name: string, lang: string): string {
  if (lang === "ar") return translateProduct(name, "ar");
  return pluralize(name);
}

// Barre de filtres par famille (chips défilables horizontalement).
export default function FamilyFilter({
  families,
  selected,
  total,
  onSelect,
}: {
  families: Family[];
  selected: string | null;
  total: number;
  onSelect: (name: string | null) => void;
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
          key={fam.name}
          onClick={() => onSelect(fam.name)}
          className={chip(selected === fam.name)}
        >
          {familyLabel(fam.name, lang)}{" "}
          <span className="opacity-70">{fam.count}</span>
        </button>
      ))}
    </div>
  );
}
