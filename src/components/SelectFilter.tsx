"use client";

export interface Option {
  key: string; // valeur normalisée (clé de filtrage)
  label: string; // libellé affiché
  count: number;
}

/**
 * Menu déroulant de filtre (Fournisseur, Chez qui...).
 * Compact, adapté au mobile. Affiche le nombre de produits par valeur.
 */
export default function SelectFilter({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: Option[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  if (options.length === 0) return null;

  const active = value !== null;

  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="px-1 text-xs font-medium text-slate-500">{label}</span>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
          className={`w-full appearance-none rounded-xl border py-2.5 pl-3 pr-8 text-sm font-medium outline-none transition focus:ring-2 focus:ring-brand-200 ${
            active
              ? "border-brand-600 bg-brand-50 text-brand-800"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label} ({o.count})
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}
