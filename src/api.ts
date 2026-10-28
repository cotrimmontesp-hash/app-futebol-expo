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

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  const external = init?.signal;
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onExternalAbort);
  }
  try {
    const response = await fetch(`${apiOrigin()}/api/${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as { erro?: string };
    if (!response.ok) throw new ApiError(data.erro || `Erro ${response.status}`);
    return data as T;
  } catch (error) {
    if (external?.aborted) {
      const abort = new Error('aborted');
      abort.name = 'AbortError';
      throw abort;
    }
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('A consulta demorou demais.');
    }
    throw new ApiError(error instanceof Error ? error.message : 'Erro');
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', onExternalAbort);
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

/** Jogos de um dia civil em Brasília. Sem o campo `data` na resposta, o servidor ainda é o antigo. */
export function loadToday(date: string, signal?: AbortSignal): Promise<TodayResponse> {
  return api<TodayResponse>(`hoje?data=${encodeURIComponent(date)}`, signal ? { signal } : undefined);
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
