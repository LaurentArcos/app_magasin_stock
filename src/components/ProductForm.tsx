"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/context/AuthProvider";
import { useOffline } from "@/context/OfflineProvider";
import { EDITABLE, inputTypeFor, toTyped, typeOf } from "@/lib/fields";
import { compressImage } from "@/lib/image";
import { createProduct, sendPhoto } from "@/lib/store";
import type { AirtableRecord, ProductFields } from "@/lib/types";

// Ordre d'affichage du formulaire de création.
const FORM_ORDER: (keyof ProductFields)[] = [
  "Produit",
  "Produit1",
  "Produit2",
  "Référence",
  "Fournisseur",
  "Chez qui",
  "Quantité",
  "Prix Unitaire",
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
  "Commentaire_Bertrand",
  "Commentaire_Tunisie",
];

function emptyValues(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const { key } of EDITABLE) o[key as string] = "";
  return o;
}

interface PickedPhoto {
  base64: string;
  contentType: string;
  filename: string;
  preview: string;
}

export default function ProductForm({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (r: AirtableRecord) => void;
}) {
  const { t, dir } = useI18n();
  const { adminCode } = useAuth();
  const { online } = useOffline();

  const [values, setValues] = useState<Record<string, string>>(emptyValues);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [status, setStatus] = useState<
    "idle" | "creating" | "created" | "error"
  >("idle");

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setValue = (key: keyof ProductFields, val: string) =>
    setValues((prev) => ({ ...prev, [key as string]: val }));

  const hasContent =
    Object.values(values).some((v) => v.trim() !== "") || !!photo;

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { base64, contentType, filename } = await compressImage(file);
      setPhoto({
        base64,
        contentType,
        filename,
        preview: `data:${contentType};base64,${base64}`,
      });
    } catch {
      /* ignore */
    }
  }

  async function submit() {
    setStatus("creating");
    const fields: Record<string, unknown> = {};
    for (const { key, type } of EDITABLE) {
      const v = values[key as string] ?? "";
      if (v.trim() === "") continue;
      fields[key as string] = toTyped(v, type);
    }

    try {
      const record = await createProduct(fields, adminCode);
      // Photo optionnelle : envoyée après création (nécessite l'id).
      let finalRecord = record;
      if (photo) {
        try {
          finalRecord = await sendPhoto(record.id, {
            file: photo.base64,
            contentType: photo.contentType,
            filename: photo.filename,
          });
        } catch {
          /* le produit est créé même si la photo échoue */
        }
      }
      onCreated(finalRecord);
      // Reset : on reste sur la page, tout vide.
      setValues(emptyValues());
      setPhoto(null);
      setStatus("created");
      setTimeout(() => setStatus("idle"), 2500);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
    }
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
        {t("back_home")}
      </button>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">
            {t("new_product_title")}
          </h2>
        </div>

        {/* Photo */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("photo_optional")}
          </p>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.preview}
                alt=""
                className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-100"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("take_photo")}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("choose_file")}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {t("cancel")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Champs */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:p-5">
          {FORM_ORDER.map((key) => {
            const type = typeOf(key);
            if (!type) return null;
            const label = t(`field_${String(key)}`);
            const isComment = type === "longtext";
            return (
              <div key={String(key)} className={isComment ? "sm:col-span-2" : ""}>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {label}
                </label>
                {isComment ? (
                  <textarea
                    rows={3}
                    value={values[key as string] ?? ""}
                    onChange={(e) => setValue(key, e.target.value)}
                    className={`${inputClass} resize-y`}
                  />
                ) : (
                  <input
                    type={inputTypeFor(type)}
                    min={
                      type === "number" || type === "currency" ? 0 : undefined
                    }
                    step={type === "currency" ? "0.01" : undefined}
                    value={values[key as string] ?? ""}
                    onChange={(e) => setValue(key, e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Barre d'action collante */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={submit}
            disabled={!online || !hasContent || status === "creating"}
            className="flex-1 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-card transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-40"
          >
            {status === "creating" ? t("creating") : t("create")}
          </button>
          {status === "created" && (
            <span className="text-sm font-medium text-emerald-600">
              {t("created_ok")}
            </span>
          )}
          {status === "error" && (
            <span className="text-sm font-medium text-red-600">
              {t("create_error")}
            </span>
          )}
        </div>
        {!online && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-amber-600">
            {t("create_offline")}
          </p>
        )}
      </div>
    </div>
  );
}
