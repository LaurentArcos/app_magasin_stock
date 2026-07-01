"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  flushOutbox,
  getLastSync,
  outboxCount,
  syncDown,
} from "@/lib/store";

interface OfflineContextValue {
  online: boolean;
  syncing: boolean;
  pending: number; // nombre de modifs en attente
  lastSync: number | null;
  syncError: boolean; // vrai si la dernière synchro a échoué
  justSynced: boolean; // vrai brièvement après une synchro réussie
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await outboxCount());
      setLastSync(await getLastSync());
    } catch {
      /* IndexedDB indisponible */
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    setSyncError(false);
    try {
      await flushOutbox(); // envoie les modifs en attente
      await syncDown(); // récupère la dernière version
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    } catch {
      setSyncError(true); // échec visible pour l'utilisateur
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();
    if (navigator.onLine) syncNow();

    const goOnline = () => {
      setOnline(true);
      syncNow();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
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
