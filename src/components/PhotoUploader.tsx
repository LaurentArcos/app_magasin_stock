"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useOffline } from "@/context/OfflineProvider";
import {
  applyLocalPhoto,
  enqueue,
  getCachedProduct,
  sendPhoto,
} from "@/lib/store";
import type { AirtableRecord } from "@/lib/types";

const MAX_DIM = 1600; // redimensionnement max (px)
const QUALITY = 0.8; // qualité JPEG

// Compresse une image (File) et renvoie { base64, contentType, filename }.
function compressImage(
  file: File
): Promise<{ base64: string; contentType: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read error"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image error"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height >= width && height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas error"));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        const base64 = dataUrl.split(",")[1] ?? "";
        const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
        resolve({
          base64,
          contentType: "image/jpeg",
          filename: `${baseName}.jpg`,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoUploader({
  recordId,
  onUpdated,
}: {
  recordId: string;
  onUpdated: (r: AirtableRecord) => void;
}) {
  const { t } = useI18n();
  const { online, refresh } = useOffline();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;

    setStatus("uploading");
    try {
      const { base64, contentType, filename } = await compressImage(file);

      // Aperçu local immédiat (visible même hors ligne).
      await applyLocalPhoto(recordId, `data:${contentType};base64,${base64}`);

      if (online) {
        try {
          const rec = await sendPhoto(recordId, {
            file: base64,
            contentType,
            filename,
          });
          onUpdated(rec);
          setStatus("idle");
          return;
        } catch {
          // échec réseau -> file d'attente
        }
      }

      // Hors ligne (ou échec) : on met en file d'attente.
      await enqueue({
        recordId,
        kind: "photo",
        file: base64,
        contentType,
        filename,
        ts: Date.now(),
      });
      const local = await getCachedProduct(recordId);
      if (local) onUpdated(local);
      await refresh();
      setStatus("idle");
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white active:scale-95";

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {status === "uploading" ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          {t("uploading")}
        </span>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className={btn}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            {t("take_photo")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={btn}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
            {t("choose_file")}
          </button>
        </div>
      )}

      {status === "error" && (
        <span className="rounded-full bg-red-500/90 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
          {t("photo_error")}
        </span>
      )}
    </>
  );
}
