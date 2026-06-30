"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { AirtableRecord } from "@/lib/types";

export default function ResultList({
  records,
  onSelect,
}: {
  records: AirtableRecord[];
  onSelect: (r: AirtableRecord) => void;
}) {
  const { t, dir } = useI18n();

  if (records.length === 0) {
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
          <path d="M10 21h7a2 2 0 0 0 2-2V9.5L14.5 4H7a2 2 0 0 0-2 2v3" />
          <path d="M14 4v6h5" />
          <path d="m3 15 4 4" />
          <path d="m7 15-4 4" />
        </svg>
        <p className="text-sm">{t("no_results")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-sm text-slate-500">
        {records.length} {t("results_count")}
      </p>
      <ul className="space-y-2">
        {records.map((r) => {
          const f = r.fields;
          const name = f.Produit || f.Produit1 || f["Référence"] || "—";

          const photo = f.Photo && f.Photo.length > 0 ? f.Photo[0] : null;
          const thumb = photo?.thumbnails?.small?.url ?? photo?.url ?? null;

          const colors = Array.from(
            new Set(
              [
                f["Couleur maille"],
                f["Couleur ruban"],
                f["Couleur curseur"],
                f["Couleur tirette"],
              ].filter((c): c is string => !!c && c.trim() !== "")
            )
          );

          return (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start shadow-card transition hover:border-brand-200 hover:shadow-md active:scale-[.995]"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={name}
                    className="h-14 w-14 flex-shrink-0 rounded-xl object-cover ring-1 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-6 w-6"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                    </svg>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{name}</p>
                  {colors.length > 0 && (
                    <p className="truncate text-sm font-medium text-slate-600">
                      {colors.join(" · ")}
                    </p>
                  )}
                  {f.Taille !== undefined && f.Taille !== null && (
                    <p className="truncate text-sm font-medium text-slate-600">
                      {t("field_Taille")}: {f.Taille}
                    </p>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                    {f["Référence"] && <span>Réf: {f["Référence"]}</span>}
                    <span>
                      {t("quantity")}: {f["Quantité"] ?? 0}
                    </span>
                  </div>
                </div>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-5 w-5 flex-shrink-0 text-slate-300 transition group-hover:text-brand-500 ${
                    dir === "rtl" ? "rotate-180" : ""
                  }`}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
