import { Platform } from 'react-native';

import type {
  Competition,
  LineupResponse,
  MatchesResponse,
  PushStatus,
  Scorers,
  Standings,
  TodayResponse,
} from './types';

const DEFAULT_API_URL = 'https://app-futebol-1ric.onrender.com';

/**
 * Native builds call EXPO_PUBLIC_API_URL (the Render server).
 * Web calls same-origin /api so Vercel can proxy it. The old server sends no CORS headers.
 */
export function apiOrigin(): string {
  if (Platform.OS === 'web') return '';
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return (configured || DEFAULT_API_URL).replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Erro';
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${apiOrigin()}/api/${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
      signal: init?.signal ?? controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as { erro?: string };
    if (!response.ok) throw new ApiError(data.erro || `Erro ${response.status}`);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('A consulta demorou demais.');
    }
    throw new ApiError(error instanceof Error ? error.message : 'Erro');
  } finally {
    clearTimeout(timer);
  }
}

let competitionsCache: Promise<Competition[]> | null = null;

export function loadCompetitions(force = false): Promise<Competition[]> {
  if (force) competitionsCache = null;
  if (!competitionsCache) {
    competitionsCache = api<Competition[]>('competicoes').catch((error) => {
      competitionsCache = null;
      throw error;
    });
  }
  return competitionsCache;
}

const scorersCache = new Map<string, Promise<Scorers>>();

export function loadScorers(id: string): Promise<Scorers> {
  const cached = scorersCache.get(id);
  if (cached) return cached;
  const pending = api<Scorers>(`${id}/artilheiros`).catch((error) => {
    scorersCache.delete(id);
    throw error;
  });
  scorersCache.set(id, pending);
  return pending;
}

export function loadStandings(id: string): Promise<Standings> {
  return api<Standings>(`${id}/tabela`);
}

export function loadMatches(id: string): Promise<MatchesResponse> {
  return api<MatchesResponse>(`${id}/jogos`);
}

export function loadToday(): Promise<TodayResponse> {
  return api<TodayResponse>('hoje');
}

export function loadLineup(league: string, eventId: string): Promise<LineupResponse> {
  return api<LineupResponse>(`${league}/escalacao/${eventId}`);
}

let pushStatusCache: Promise<PushStatus> | null = null;

export function loadPushStatus(force = false): Promise<PushStatus> {
  if (force) pushStatusCache = null;
  if (!pushStatusCache) {
    pushStatusCache = api<PushStatus>('push/status').catch((error) => {
      pushStatusCache = null;
      throw error;
    });
  }
  return pushStatusCache;
}
