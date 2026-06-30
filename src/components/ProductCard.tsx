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

const INFO_FIELDS: (keyof ProductFields)[] = [
  "Référence",
  "Fournisseur",
  "Chez qui",
  "Produit1",
  "Produit2",
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
];

function formatValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

// Formate un prix : toujours 2 décimales + signe €. Ex: 12,50 €
// Gère les valeurs numériques comme les chaînes ("12,50", "1 234.5", "12€"...).
// En cas de valeur non interprétable, on affiche la valeur brute plutôt que rien.
function formatPrice(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";

  let n: number;
  if (typeof v === "number") {
    n = v;
  } else {
    const cleaned = String(v)
      .replace(/[^\d.,-]/g, "") // retire €, espaces, lettres...
      .replace(/\s/g, "")
      .replace(",", "."); // virgule décimale -> point
    n = Number(cleaned);
  }

  if (Number.isNaN(n)) return formatValue(v); // fallback : ne rien masquer
  return `${n.toFixed(2).replace(".", ",")} €`;
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
  const { t, dir } = useI18n();
  const { isAdmin, adminCode } = useAuth();
  const { online, refresh } = useOffline();
  const f = record.fields;

  const [quantite, setQuantite] = useState<string>(
    f["Quantité"] !== undefined ? String(f["Quantité"]) : "0"
  );
  const [prix, setPrix] = useState<string>(
    f["Prix Unitaire"] !== undefined ? String(f["Prix Unitaire"]) : ""
  );
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "queued" | "error"
  >("idle");

  const name = f.Produit || f.Produit1 || f["Référence"] || "—";
  const photo = f.Photo && f.Photo.length > 0 ? f.Photo[0] : null;
  const photoUrl = photo?.thumbnails?.large?.url ?? photo?.url ?? null;

  const dirty =
    quantite !== String(f["Quantité"] ?? 0) ||
    (isAdmin && prix !== String(f["Prix Unitaire"] ?? ""));

  async function save() {
    setStatus("saving");

    const payload: {
      quantite?: number;
      prixUnitaire?: number;
    } = {};
    if (quantite !== String(f["Quantité"] ?? 0)) {
      payload.quantite = Number(quantite);
    }
    if (isAdmin && prix !== String(f["Prix Unitaire"] ?? "")) {
      payload.prixUnitaire = Number(prix);
    }

    // 1) Mise à jour optimiste du cache local (visible immédiatement).
    await applyLocalFields(record.id, payload);

    // 2) Si en ligne, on tente l'envoi direct.
    if (online) {
      try {
        const rec = await sendFields(record.id, { ...payload, adminCode });
        onUpdated(rec);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      } catch {
        // échec réseau -> on bascule en file d'attente
      }
    }

    // 3) Hors ligne (ou échec) : on met en file d'attente.
    await enqueue({
      recordId: record.id,
      kind: "fields",
      quantite: payload.quantite,
      prixUnitaire: payload.prixUnitaire,
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
    setQuantite((cur) => String(Math.max(0, (Number(cur) || 0) + delta)));
  }

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
          {/* Boutons changer la photo (coin haut) */}
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

        {/* Édition quantité + prix */}
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
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
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
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
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

        {/* Infos détaillées */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-0 px-4 pb-2 sm:grid-cols-2 sm:px-5">
          {INFO_FIELDS.map((key) => (
            <div
              key={String(key)}
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5"
            >
              <dt className="text-sm text-slate-500">
                {t(`field_${String(key)}`)}
              </dt>
              <dd className="text-end text-sm font-medium text-slate-800">
                {formatValue(f[key])}
              </dd>
            </div>
          ))}
          {f.Total !== undefined && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5">
              <dt className="text-sm text-slate-500">{t("field_Total")}</dt>
              <dd className="text-end text-sm font-semibold text-slate-900">
                {formatPrice(f.Total)}
              </dd>
            </div>
          )}
        </dl>

        {/* Commentaire */}
        {f.Commentaire && (
          <div className="border-t border-slate-100 p-4 sm:p-5">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("field_Commentaire")}
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {f.Commentaire}
            </p>
          </div>
        )}
      </div>

      {/* Barre d'enregistrement collante (mobile-first) */}
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
