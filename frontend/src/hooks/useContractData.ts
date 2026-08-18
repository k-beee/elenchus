'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Arena,
  fetchArenas,
  fetchLedger,
  fetchStats,
  LedgerEvent,
  Stats,
} from '@/lib/contract';

const FETCH_INTERVAL_MS = 60_000;

export interface ContractDataState {
  arenas: Arena[];
  ledger: LedgerEvent[];
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refreshData: () => Promise<void>;
  setIsBusy: (busy: boolean) => void;
}

function classifyContractError(e: unknown): string {
  const errMsg = String(e);
  if (/contract not found|execution reverted|no contract/i.test(errMsg)) {
    return 'No Elenchus contract detected at the configured address. Deployment on StudioNet may be required.';
  }
  if (/rate limit|429|too many/i.test(errMsg)) {
    return 'The RPC node is rate limiting query requests. Retrying shortly.';
  }
  return 'Could not retrieve Socratic dialectic records from the chain. Please check your RPC connection.';
}

export function useContractData(): ContractDataState {
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const isMounted = useRef(true);
  const isTransactionBusy = useRef(false);
  const lastFetchedTimestamp = useRef<number>(0);

  const loadData = useCallback(async () => {
    try {
      const [fetchedArenas, fetchedLedger, fetchedStats] = await Promise.all([
        fetchArenas(0),
        fetchLedger(0),
        fetchStats(),
      ]);
      if (!isMounted.current) return;
      setArenas(fetchedArenas);
      setLedger(fetchedLedger);
      setStats(fetchedStats);
      setError(null);
      setIsStale(false);
      lastFetchedTimestamp.current = Date.now();
    } catch (e) {
      if (!isMounted.current) return;
      setError(classifyContractError(e));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading((prev) => prev || arenas.length === 0);
    await loadData();
  }, [loadData, arenas.length]);

  const setIsBusy = useCallback((busy: boolean) => {
    isTransactionBusy.current = busy;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadData();

    const intervalId = setInterval(() => {
      if (isTransactionBusy.current) return;
      if (Date.now() - lastFetchedTimestamp.current > FETCH_INTERVAL_MS * 1.5) {
        setIsStale(true);
      }
      loadData();
    }, FETCH_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [loadData]);

  return {
    arenas,
    ledger,
    stats,
    loading,
    error,
    isStale,
    refreshData,
    setIsBusy,
  };
}
