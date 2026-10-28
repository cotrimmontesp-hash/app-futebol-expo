/** Ritmo da atualização automática da tela Hoje, com a tela visível. */

export const LIVE_REFRESH_MS = 30_000;
export const IDLE_REFRESH_MS = 2 * 60_000;
export const STALE_DATA_NOTE = 'Não foi possível atualizar. Mostrando os dados anteriores.';

export type RefreshDay = 'ontem' | 'hoje' | 'amanha';
export type RefreshKind = 'open' | 'tick' | 'resume' | 'manual';

export type RefreshGate = {
  visible: boolean;
  inFlight: boolean;
  /** O pedido começou com a tela pausada (aba ou app em segundo plano). */
  startedHidden: boolean;
  followUp: boolean;
};

export function createRefreshGate(visible = true): RefreshGate {
  return { visible, inFlight: false, startedHidden: false, followUp: false };
}

/** `null` fora do dia de hoje: Ontem e Amanhã não ficam rebuscando sozinhos. */
export function refreshIntervalMs(day: RefreshDay, hasLiveMatch: boolean): number | null {
  if (day !== 'hoje') return null;
  return hasLiveMatch ? LIVE_REFRESH_MS : IDLE_REFRESH_MS;
}

/** Pausa no segundo plano. `inactive` é transitório (central de notificações) e não pausa. */
export function shouldPauseRefresh(appState: string | null | undefined): boolean {
  return appState === 'background';
}

/**
 * `run` inicia o pedido. `wait` segura enquanto outro pedido anda (no máximo um a mais).
 * `ignore` não faz nada: tela pausada, ou o relógio disparou no meio de um pedido.
 */
export function planRefresh(gate: RefreshGate, kind: RefreshKind): 'run' | 'wait' | 'ignore' {
  if (kind === 'tick' && !gate.visible) return 'ignore';
  if (gate.inFlight) {
    if (kind === 'manual' || (kind === 'resume' && gate.startedHidden)) gate.followUp = true;
    return 'wait';
  }
  if (!gate.visible && kind !== 'manual') return 'ignore';
  gate.inFlight = true;
  gate.startedHidden = !gate.visible;
  return 'run';
}

export function planAfterRefresh(
  gate: RefreshGate,
  delayMs: number | null,
): { type: 'again' } | { type: 'wait'; delayMs: number } | { type: 'stop' } {
  gate.inFlight = false;
  gate.startedHidden = false;
  if (!gate.visible) {
    gate.followUp = false;
    return { type: 'stop' };
  }
  if (gate.followUp) {
    gate.followUp = false;
    return { type: 'again' };
  }
  if (delayMs == null) return { type: 'stop' };
  return { type: 'wait', delayMs };
}

const updatedAtFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Horário de Brasília, sempre `HH:MM`. */
export function formatUpdatedAt(date: Date): string {
  const parts = updatedAtFormat.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = value('hour').padStart(2, '0');
  const minute = value('minute').padStart(2, '0');
  return `Atualizado às ${hour}:${minute}`;
}
