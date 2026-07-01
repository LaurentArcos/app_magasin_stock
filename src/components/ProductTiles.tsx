"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { AirtableRecord } from "@/lib/types";

function Tile({
  record,
  onSelect,
}: {
  record: AirtableRecord;
  onSelect: (r: AirtableRecord) => void;
}) {
  const { t } = useI18n();
  const f = record.fields;
  const name = f.Produit || f.Produit1 || f["Référence"] || "—";

  const photo = f.Photo && f.Photo.length > 0 ? f.Photo[0] : null;
  const thumb = photo?.thumbnails?.large?.url ?? photo?.url ?? null;

  const colors = Array.from(
    new Set(
      [f["Couleur maille"], f["Couleur ruban"], f["Couleur curseur"]].filter(
        (c): c is string => !!c && c.trim() !== ""
      )
    )
  );

  return (
    <button
      onClick={() => onSelect(record)}
      className="group flex w-[calc(50%-0.375rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-start shadow-card transition hover:border-brand-200 hover:shadow-md active:scale-[.98] sm:w-40"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={name}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-slate-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-8 w-8"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
          </svg>
        </div>
      )}
      <div className="min-w-0 p-2.5">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        {colors.length > 0 && (
          <p className="truncate text-xs font-medium text-slate-600">
            {colors.join(" · ")}
          </p>
        )}
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px] text-slate-400">
          {f["Référence"] && (
            <span className="truncate">Réf: {f["Référence"]}</span>
          )}
          <span className="flex-shrink-0">
            {t("quantity")}: {f["Quantité"] ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ProductTiles({
  records,
  onSelect,
}: {
  records: AirtableRecord[];
  onSelect: (r: AirtableRecord) => void;
}) {
  const { t } = useI18n();

  if (records.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t("no_results")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {records.map((r) => (
        <Tile key={r.id} record={r} onSelect={onSelect} />
      ))}
    </div>
  );
}
