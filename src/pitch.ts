import type { LineupPlayer } from './types';

export type PitchPoint = LineupPlayer & {
  x: number;
  y: number;
  lado: string;
};

const FORMATIONS: Record<string, number[][]> = {
  '4-4-2': [[3, 6, 5, 2], [11, 8, 4, 7], [9, 10]],
  '4-2-3-1': [[3, 6, 5, 2], [4, 8], [11, 10, 7], [9]],
  '4-3-3': [[3, 6, 5, 2], [8, 4, 7], [11, 9, 10]],
  '4-1-4-1': [[3, 6, 5, 2], [4], [11, 10, 8, 7], [9]],
  '3-4-2-1': [[4, 5, 6], [3, 8, 7, 2], [11, 10], [9]],
  '3-4-3': [[4, 5, 6], [3, 8, 7, 2], [11, 9, 10]],
  '5-3-2': [[3, 4, 5, 6, 2], [11, 8, 7], [9, 10]],
  '5-4-1': [[3, 4, 5, 6, 2], [11, 10, 8, 7], [9]],
};

const PARTICLES = new Set(['da', 'de', 'do', 'dos', 'das', 'di', 'del', 'della', 'van', 'von', 'le', 'la']);

function rowXs(count: number): number[] {
  if (count <= 1) return [50];
  const pad = count >= 5 ? 10 : 16;
  return Array.from({ length: count }, (_, index) => pad + ((100 - 2 * pad) * index) / (count - 1));
}

export function lastName(nome: string): string {
  const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  let index = parts.length - 1;
  while (index > 0 && PARTICLES.has(parts[index - 1].toLowerCase().replace(/\.$/, ''))) index -= 1;
  return parts.slice(index).join(' ');
}

export function placePlayers(
  formacao: string,
  titulares: LineupPlayer[],
  lado?: 'cima' | 'baixo',
): PitchPoint[] | null {
  const lines = FORMATIONS[String(formacao || '').trim()];
  if (!lines || !titulares || titulares.length !== 11) return null;
  const byPlace = new Map(titulares.map((player) => [String(player.lugar || ''), player]));
  if (byPlace.size !== 11 || !byPlace.get('1')) return null;
  const count = lines.length;
  const yOf = (unit: number) => {
    if (lado === 'cima') return 8 + unit * (45 - 8);
    if (lado === 'baixo') return 92 + unit * (55 - 92);
    return 84 + unit * (18 - 84);
  };
  const xOf = (x: number) => (lado === 'cima' ? 100 - x : x);
  const keeper = byPlace.get('1');
  if (!keeper) return null;
  const points: PitchPoint[] = [{ ...keeper, x: xOf(50), y: yOf(0), lado: lado || '' }];
  let ok = true;
  lines.forEach((line, lineIndex) => {
    const xs = rowXs(line.length);
    line.forEach((place, placeIndex) => {
      const player = byPlace.get(String(place));
      if (!player) {
        ok = false;
        return;
      }
      points.push({
        ...player,
        x: xOf(xs[placeIndex]),
        y: yOf((lineIndex + 1) / count),
        lado: lado || '',
      });
    });
  });
  return ok && points.length === 11 ? points : null;
}
