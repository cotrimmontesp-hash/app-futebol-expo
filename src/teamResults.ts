import type { Match, MatchesResponse, StandingRow, Standings, TeamRef } from './types';

export type ResultMark = 'V' | 'E' | 'D';

export function isSameTeam(team: TeamRef | null | undefined, nome: string): boolean {
  if (!team || !nome) return false;
  return team.time === nome || (!!team.origem && team.origem === nome);
}

function involves(match: Match, nome: string): boolean {
  return isSameTeam(match.casa, nome) || isSameTeam(match.fora, nome);
}

export function resultMark(match: Match, nome: string): ResultMark {
  const home = isSameTeam(match.casa, nome);
  const side = home ? match.casa : match.fora;
  const other = home ? match.fora : match.casa;
  if (side.venceu) return 'V';
  if (other.venceu) return 'D';
  return 'E';
}

function allMatches(matches: MatchesResponse): Match[] {
  const seen = new Set<string>();
  const list: Match[] = [];
  for (const match of [...(matches.resultados || []), ...(matches.proximos || [])]) {
    const key = String(match.id);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(match);
  }
  return list;
}

function finishedFor(matches: MatchesResponse, nome: string, limit: number): Match[] {
  return allMatches(matches)
    .filter((match) => match.estado === 'post' && involves(match, nome))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, limit);
}

export function lastFinished(matches: MatchesResponse, nome: string): Match[] {
  return finishedFor(matches, nome, 5);
}

/** Jogos finalizados já carregados, do mais antigo ao mais recente, no máximo 10. */
export function recentForm(matches: MatchesResponse, nome: string): ResultMark[] {
  return finishedFor(matches, nome, 10)
    .map((match) => resultMark(match, nome))
    .reverse();
}

export function nextScheduled(matches: MatchesResponse, nome: string): Match[] {
  return allMatches(matches)
    .filter((match) => match.estado === 'pre' && involves(match, nome))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);
}

/** Os mesmos próximos e últimos jogos que a página do time mostra. */
export function teamSchedule(matches: MatchesResponse, nome: string): { upcoming: Match[]; recent: Match[] } {
  return {
    upcoming: nextScheduled(matches, nome),
    recent: lastFinished(matches, nome),
  };
}

export function findStanding(nome: string, standings: Standings): { grupo: string; row: StandingRow } | null {
  if (standings.semTabela) return null;
  const rows = (standings.grupos || []).flatMap((group) =>
    (group.linhas || []).map((row) => ({ grupo: group.nome, row })),
  );
  const found = rows.find((item) => item.row.time === nome) || rows.find((item) => item.row.origem === nome);
  return found ?? null;
}

export function findTeam(nome: string, standings: Standings, matches: MatchesResponse): TeamRef {
  const place = findStanding(nome, standings);
  if (place) return place.row;
  const sides = allMatches(matches).flatMap((match) => [match.casa, match.fora]);
  return sides.find((side) => side.time === nome) || sides.find((side) => side.origem === nome) || { time: nome };
}
