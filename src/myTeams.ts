import { isSameTeam, teamSchedule } from './teamResults';
import type { Match, MatchesResponse, TeamRef } from './types';

export type LeagueBundle = {
  id: string;
  nome: string;
  matches: MatchesResponse | null;
};

export type AgendaGame = {
  match: Match;
  liga: string;
  competicao: string;
  time: TeamRef;
};

export type TeamNotice = {
  nome: string;
  texto: string;
  liga?: string;
};

export type FavoriteAgenda = {
  upcoming: AgendaGame[];
  recent: AgendaGame[];
  notices: TeamNotice[];
  failedLeagues: string[];
};

const NO_GAMES = 'Sem jogos neste período.';
const LOAD_FAILED = 'Não foi possível carregar os jogos.';

function favoriteSide(match: Match, nome: string): TeamRef | null {
  if (isSameTeam(match.casa, nome)) return match.casa;
  if (isSameTeam(match.fora, nome)) return match.fora;
  return null;
}

function primaryFavorite(match: Match, names: readonly string[]): TeamRef {
  if (names.some((nome) => isSameTeam(match.casa, nome))) return match.casa;
  if (names.some((nome) => isSameTeam(match.fora, nome))) return match.fora;
  return match.casa;
}

function liveMatches(matches: MatchesResponse, nome: string): Match[] {
  const seen = new Set<string>();
  const list: Match[] = [];
  for (const match of [...(matches.resultados || []), ...(matches.proximos || [])]) {
    if (match.estado !== 'in') continue;
    if (!isSameTeam(match.casa, nome) && !isSameTeam(match.fora, nome)) continue;
    const key = String(match.id);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(match);
  }
  return list;
}

function remember(list: AgendaGame[], seen: Set<string>, game: AgendaGame): void {
  const key = `${game.liga}:${game.match.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push(game);
}

/**
 * Próximos jogos de todos os favoritos, do mais cedo ao mais tarde,
 * e depois os últimos resultados, do mais recente ao mais antigo.
 * Cada time usa a mesma seleção da página do time.
 */
export function favoriteAgenda(leagues: readonly LeagueBundle[], names: readonly string[]): FavoriteAgenda {
  const failedLeagues = leagues.filter((league) => !league.matches).map((league) => league.nome);
  const upcoming: AgendaGame[] = [];
  const recent: AgendaGame[] = [];
  const seenUpcoming = new Set<string>();
  const seenRecent = new Set<string>();
  const notices: TeamNotice[] = [];
  const seenNotice = new Set<string>();

  for (const nome of [...new Set(names.filter((item) => item))]) {
    let involved = false;
    let resolved: { nome: string; liga: string } | null = null;
    for (const league of leagues) {
      if (!league.matches) continue;
      const schedule = teamSchedule(league.matches, nome);
      const live = liveMatches(league.matches, nome);
      if (schedule.upcoming.length || schedule.recent.length || live.length) involved = true;
      const pool = [...(league.matches.resultados || []), ...(league.matches.proximos || [])];
      for (const match of pool) {
        const side = favoriteSide(match, nome);
        if (side && !resolved) resolved = { nome: side.time || nome, liga: league.id };
      }
      for (const match of [...live, ...schedule.upcoming]) {
        remember(upcoming, seenUpcoming, {
          match,
          liga: league.id,
          competicao: league.nome,
          time: primaryFavorite(match, names),
        });
      }
      for (const match of schedule.recent) {
        remember(recent, seenRecent, {
          match,
          liga: league.id,
          competicao: league.nome,
          time: primaryFavorite(match, names),
        });
      }
    }
    if (involved) continue;
    const notice: TeamNotice = {
      nome: resolved?.nome || nome,
      liga: resolved?.liga,
      texto: !resolved && failedLeagues.length ? LOAD_FAILED : NO_GAMES,
    };
    const key = `${notice.nome}|${notice.texto}|${notice.liga || ''}`;
    if (seenNotice.has(key)) continue;
    seenNotice.add(key);
    notices.push(notice);
  }

  upcoming.sort(
    (a, b) => a.match.data.localeCompare(b.match.data) || String(a.match.id).localeCompare(String(b.match.id)),
  );
  recent.sort(
    (a, b) => b.match.data.localeCompare(a.match.data) || String(a.match.id).localeCompare(String(b.match.id)),
  );

  return { upcoming, recent, notices, failedLeagues };
}
