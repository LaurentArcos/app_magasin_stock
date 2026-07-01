"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  flushOutbox,
  getLastSync,
  outboxCount,
  syncDown,
} from "@/lib/store";

// Intervalle de synchro automatique en arrière-plan (ms).
const AUTO_SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes

interface OfflineContextValue {
  online: boolean;
  syncing: boolean;
  pending: number; // nombre de modifs en attente
  lastSync: number | null;
  syncError: boolean; // vrai si la dernière synchro a échoué
  justSynced: boolean; // vrai brièvement après une synchro réussie
  refresh: () => Promise<void>;
  syncNow: (silent?: boolean) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  // Empêche deux synchros simultanées (auto + manuelle).
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await outboxCount());
      setLastSync(await getLastSync());
    } catch {
      /* IndexedDB indisponible */
    }
  }, []);

  // silent = synchro auto (n'affiche pas le badge de succès, plus discret)
  const syncNow = useCallback(
    async (silent = false) => {
      if (!navigator.onLine) return;
      if (busyRef.current) return; // déjà en cours
      busyRef.current = true;
      setSyncing(true);
      setSyncError(false);
      try {
        await flushOutbox(); // envoie les modifs en attente
        await syncDown(); // récupère la dernière version
        if (!silent) {
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 2500);
        }
      } catch {
        if (!silent) setSyncError(true); // échec visible si action manuelle
      } finally {
        busyRef.current = false;
        setSyncing(false);
        await refresh();
      }
    },
    [refresh]
  );

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    if (navigator.onLine) syncNow(true); // synchro auto au démarrage

    // Retour de connexion -> synchro auto
    const goOnline = () => {
      setOnline(true);
      syncNow(true);
    };
    const goOffline = () => setOnline(false);

    // Retour sur l'app (onglet réactivé) -> synchro auto
    const onVisible = () => {
      if (document.visibilityState === "visible") syncNow(true);
    };

    // Synchro auto récurrente pendant que l'app est ouverte
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") syncNow(true);
    }, AUTO_SYNC_INTERVAL);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [refresh, syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        online,
        syncing,
        pending,
        lastSync,
        syncError,
        justSynced,
        refresh,
        syncNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOffline doit être utilisé dans un OfflineProvider");
  }
  return ctx;
}
