"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { useOffline } from "@/context/OfflineProvider";

function timeAgo(ts: number, lang: string): string {
  const d = new Date(ts);
  return d.toLocaleString(lang === "ar" ? "ar" : "fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SyncStatus() {
  const { t, lang } = useI18n();
  const { online, syncing, pending, lastSync, syncError, justSynced, syncNow } =
    useOffline();

  return (
    <div className="mb-3 space-y-2">
      {/* Bandeau hors ligne */}
      {!online && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 flex-shrink-0"
          >
            <path d="M2 8.82a15 15 0 0 1 20 0" opacity=".4" />
            <path d="M5 12.859a10 10 0 0 1 14 0" opacity=".7" />
            <path d="M8.5 16.429a5 5 0 0 1 7 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <span>{t("offline_banner")}</span>
        </div>
      )}

      {/* Ligne d'état synchro */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          {syncing ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
              {t("syncing")}
            </>
          ) : syncError ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
              {t("sync_failed")}
            </span>
          ) : justSynced ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
              {t("sync_done")}
            </span>
          ) : pending > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
              {pending}{" "}
              {pending === 1 ? t("pending_one") : t("pending_many")}
            </span>
          ) : lastSync ? (
            <span>
              {t("synced_ok")} · {t("last_sync")}: {timeAgo(lastSync, lang)}
            </span>
          ) : (
            <span>{t("never_synced")}</span>
          )}
        </span>

        {online && !syncing && (
          <button
            onClick={syncNow}
            className="rounded-full px-2 py-0.5 font-medium text-brand-600 hover:bg-brand-50"
          >
            {t("sync_now")}
          </button>
        )}
      </div>
    </div>
  );
}
