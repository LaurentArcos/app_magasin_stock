"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/context/AuthProvider";
import { useOffline } from "@/context/OfflineProvider";
import PhotoUploader from "@/components/PhotoUploader";
import {
  applyLocalFields,
  enqueue,
  getCachedProduct,
  sendFields,
} from "@/lib/store";
import type { AirtableRecord, ProductFields } from "@/lib/types";

type EditType = "text" | "number" | "currency" | "longtext" | "date";

// Tous les champs modifiables (nom de colonne Airtable + type de saisie).
const EDITABLE: { key: keyof ProductFields; type: EditType }[] = [
  { key: "Quantité", type: "number" },
  { key: "Prix Unitaire", type: "currency" },
  { key: "Produit", type: "text" },
  { key: "Produit1", type: "text" },
  { key: "Produit2", type: "text" },
  { key: "Référence", type: "text" },
  { key: "Fournisseur", type: "text" },
  { key: "Chez qui", type: "text" },
  { key: "Taille", type: "number" },
  { key: "Taille maille", type: "text" },
  { key: "Couleur maille", type: "text" },
  { key: "Couleur ruban", type: "text" },
  { key: "Couleur curseur", type: "text" },
  { key: "Couleur tirette", type: "text" },
  { key: "Tirette/Curseur", type: "text" },
  { key: "Double curseur ?", type: "text" },
  { key: "Close ou openend", type: "text" },
  { key: "Coated", type: "text" },
  { key: "Reverse ?", type: "text" },
  { key: "date d'arrivée", type: "date" },
  { key: "Commentaire", type: "longtext" },
];

// Ordre d'affichage de la grille détaillée (hors Quantité / Prix / Commentaire,
// qui ont leur propre zone). Les 3 derniers sont calculés = lecture seule.
const DETAIL_ORDER: (keyof ProductFields)[] = [
  "Produit",
  "Produit1",
  "Produit2",
  "Référence",
  "Fournisseur",
  "Chez qui",
  "Taille",
  "Taille maille",
  "Couleur maille",
  "Couleur ruban",
  "Couleur curseur",
  "Couleur tirette",
  "Tirette/Curseur",
  "Double curseur ?",
  "Close ou openend",
  "Coated",
  "Reverse ?",
  "date d'arrivée",
  "Total",
  "Principal",
  "updated_at",
];

const CURRENCY = new Set<keyof ProductFields>(["Prix Unitaire", "Total"]);

// Formate une date/heure en heure de Paris. Ex: 30/06/2026 15:19
function formatDateTime(v: unknown, lang: string): string {
  if (v === undefined || v === null || v === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString(lang === "ar" ? "ar" : "fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Formate une date seule. Ex: 30/06/2026
function formatDate(v: unknown, lang: string): string {
  if (v === undefined || v === null || v === "") return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(lang === "ar" ? "ar" : "fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function typeOf(key: keyof ProductFields): EditType | undefined {
  return EDITABLE.find((e) => e.key === key)?.type;
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

// Prix : toujours 2 décimales + €. Tolère les chaînes ("12,50", "12€"...).
function formatPrice(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  let n: number;
  if (typeof v === "number") {
    n = v;
  } else {
    const cleaned = String(v)
      .replace(/[^\d.,-]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".");
    n = Number(cleaned);
  }
  if (Number.isNaN(n)) return formatValue(v);
  return `${n.toFixed(2).replace(".", ",")} €`;
}

// Valeur initiale (chaîne) d'un champ pour le formulaire.
function initValue(v: unknown, type: EditType): string {
  if (v === undefined || v === null) return "";
  if (type === "date") return String(v).slice(0, 10);
  return String(v);
}

// Conversion chaîne -> valeur typée pour Airtable.
function toTyped(value: string, type: EditType): unknown {
  if (value === "") return null;
  if (type === "number" || type === "currency") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return value;
}

export default function ProductCard({
  record,
  onBack,
  onUpdated,
}: {
  record: AirtableRecord;
  onBack: () => void;
  onUpdated: (r: AirtableRecord) => void;
}) {
  const { t, dir, lang } = useI18n();
  const { isAdmin, adminCode } = useAuth();
  const { online, refresh } = useOffline();
  const f = record.fields;

  // État du formulaire : une chaîne par champ modifiable.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const { key, type } of EDITABLE) {
      init[key as string] = initValue(f[key], type);
    }
    return init;
  });
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "queued" | "error"
  >("idle");

  const setValue = (key: keyof ProductFields, val: string) =>
    setValues((prev) => ({ ...prev, [key as string]: val }));

  const name = f.Produit || f.Produit1 || f["Référence"] || "—";
  const photo = f.Photo && f.Photo.length > 0 ? f.Photo[0] : null;
  const photoUrl = photo?.thumbnails?.large?.url ?? photo?.url ?? null;

  // Champs réellement modifiés par rapport à l'original.
  function collectChanges(): Record<string, unknown> {
    const changed: Record<string, unknown> = {};
    for (const { key, type } of EDITABLE) {
      const cur = values[key as string] ?? "";
      const orig = initValue(f[key], type);
      if (cur !== orig) changed[key as string] = toTyped(cur, type);
    }
    return changed;
  }

  const dirty = Object.keys(collectChanges()).length > 0;

  async function save() {
    const changed = collectChanges();
    if (Object.keys(changed).length === 0) return;

    setStatus("saving");
    // 1) Mise à jour optimiste du cache local.
    await applyLocalFields(record.id, changed);

    // 2) En ligne : envoi direct.
    if (online) {
      try {
        const rec = await sendFields(record.id, { fields: changed, adminCode });
        onUpdated(rec);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      } catch {
        /* bascule en file d'attente */
      }
    }

    // 3) Hors ligne (ou échec) : file d'attente.
    await enqueue({
      recordId: record.id,
      kind: "fields",
      fields: changed,
      adminCode,
      ts: Date.now(),
    });
    const local = await getCachedProduct(record.id);
    if (local) onUpdated(local);
    await refresh();
    setStatus("queued");
    setTimeout(() => setStatus("idle"), 3000);
  }

  function step(delta: number) {
    setValues((prev) => {
      const cur = Number(prev["Quantité"]) || 0;
      return { ...prev, ["Quantité"]: String(Math.max(0, cur + delta)) };
    });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {t("back")}
      </button>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        {/* Hero */}
        <div className="relative">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={name}
              className="h-[25rem] w-full object-cover"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-12 w-12"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
              </svg>
            </div>
          )}
          <div className="absolute end-3 top-3">
            <PhotoUploader recordId={record.id} onUpdated={onUpdated} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h2 className="text-xl font-bold text-white drop-shadow-sm sm:text-2xl">
              {name}
            </h2>
            {f["Référence"] && (
              <p className="text-sm text-white/80">Réf: {f["Référence"]}</p>
            )}
          </div>
        </div>

        {/* Quantité + Prix (zone principale) */}
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
          {/* Quantité */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("quantity")}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={values["Quantité"] ?? ""}
                onChange={(e) => setValue("Quantité", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xl font-bold outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => step(1)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Prix unitaire */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("unit_price")}
              {!isAdmin && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5 text-slate-400"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </label>
            {isAdmin ? (
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={values["Prix Unitaire"] ?? ""}
                  onChange={(e) => setValue("Prix Unitaire", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pe-8 text-center text-xl font-bold outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-lg font-bold text-slate-400">
                  €
                </span>
              </div>
            ) : (
              <div className="flex h-[46px] items-center justify-center rounded-xl text-xl font-bold text-slate-800">
                {formatPrice(f["Prix Unitaire"])}
              </div>
            )}
          </div>
        </div>

        {/* Grille détaillée : tous les autres champs (toujours affichés) */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-0 px-4 pb-2 sm:grid-cols-2 sm:px-5">
          {DETAIL_ORDER.map((key) => {
            const type = typeOf(key);
            const editable = isAdmin && type !== undefined;
            const label = t(`field_${String(key)}`);
            const inputType =
              type === "date"
                ? "date"
                : type === "number" || type === "currency"
                ? "number"
                : "text";

            return (
              <div key={String(key)} className="border-b border-slate-100 py-2.5">
                {editable ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">
                      {label}
                    </label>
                    <input
                      type={inputType}
                      min={
                        type === "number" || type === "currency" ? 0 : undefined
                      }
                      step={type === "currency" ? "0.01" : undefined}
                      value={values[key as string] ?? ""}
                      onChange={(e) => setValue(key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="text-end text-sm font-medium text-slate-800">
                      {CURRENCY.has(key)
                        ? formatPrice(f[key])
                        : key === "updated_at"
                        ? formatDateTime(f[key], lang)
                        : key === "date d'arrivée"
                        ? formatDate(f[key], lang)
                        : formatValue(f[key])}
                    </dd>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Commentaire (toujours affiché, éditable en admin) */}
        <div className="border-t border-slate-100 p-4 sm:p-5">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("field_Commentaire")}
          </h3>
          {isAdmin ? (
            <textarea
              rows={3}
              value={values["Commentaire"] ?? ""}
              onChange={(e) => setValue("Commentaire", e.target.value)}
              className={`${inputClass} resize-y`}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {f.Commentaire ? f.Commentaire : "—"}
            </p>
          )}
        </div>
      </div>

      {/* Barre d'enregistrement collante */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={save}
            disabled={!dirty || status === "saving"}
            className="flex-1 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-card transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-40"
          >
            {status === "saving" ? t("saving") : t("save")}
          </button>
          {status === "saved" && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
              {t("saved")}
            </span>
          )}
          {status === "queued" && (
            <span className="inline-flex items-center gap-1 text-center text-sm font-medium text-amber-600">
              {t("queued")}
            </span>
          )}
          {status === "error" && (
            <span className="text-sm font-medium text-red-600">
              {t("save_error")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
