import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { syncWebPush } from './push/web';
import type { TeamRef } from './types';

const STORAGE_KEY = 'futebol-favoritos';

type FavoritesValue = {
  ready: boolean;
  names: Set<string>;
  isFav: (team: TeamRef | null | undefined) => boolean;
  toggle: (team: TeamRef) => void;
  migrate: (teams: Array<TeamRef | null | undefined>) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

async function readStored(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set((Array.isArray(list) ? list : []).filter((item) => typeof item === 'string' && item));
  } catch {
    return new Set();
  }
}

async function writeStored(names: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...names]));
  } catch {
    // aparelho sem espaço ou storage bloqueado
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    readStored().then((stored) => {
      if (!alive) return;
      setNames(stored);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void syncWebPush([...names]);
  }, [ready, names]);

  const isFav = useCallback(
    (team: TeamRef | null | undefined) =>
      !!(team && (names.has(team.time) || (team.origem && names.has(team.origem)))),
    [names],
  );

  const toggle = useCallback((team: TeamRef) => {
    setNames((current) => {
      const next = new Set(current);
      const on = next.has(team.time) || (!!team.origem && next.has(team.origem));
      if (on) {
        next.delete(team.time);
        if (team.origem) next.delete(team.origem);
      } else {
        next.add(team.time);
      }
      void writeStored(next);
      return next;
    });
  }, []);

  const migrate = useCallback((teams: Array<TeamRef | null | undefined>) => {
    setNames((current) => {
      const next = new Set(current);
      let changed = false;
      for (const team of teams) {
        if (!team?.origem || !next.has(team.origem)) continue;
        next.delete(team.origem);
        next.add(team.time);
        changed = true;
      }
      if (!changed) return current;
      void writeStored(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ready, names, isFav, toggle, migrate }),
    [ready, names, isFav, toggle, migrate],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites fora do provider');
  return value;
}
