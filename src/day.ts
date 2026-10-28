const TZ = 'America/Sao_Paulo';

const weekdayShort = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'short',
});

const weekdayLong = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export type DayId = 'ontem' | 'hoje' | 'amanha';

export type DayChoice = {
  id: DayId;
  label: string;
  date: string;
  caption: string;
  accessibilityLabel: string;
};

const DAYS: { id: DayId; label: string; offset: number }[] = [
  { id: 'ontem', label: 'Ontem', offset: -1 },
  { id: 'hoje', label: 'Hoje', offset: 0 },
  { id: 'amanha', label: 'Amanhã', offset: 1 },
];

/** Data civil YYYY-MM-DD em Brasília. */
export function saoPauloISODate(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function addCalendarDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function noonInSaoPaulo(iso: string): Date {
  return new Date(`${iso}T12:00:00-03:00`);
}

/** Ex.: "ter 27/10". */
export function formatDayCaption(iso: string): string {
  const weekday = weekdayShort.format(noonInSaoPaulo(iso)).replace(/\./g, '').trim().toLowerCase();
  const [, month, day] = iso.split('-');
  return `${weekday} ${day}/${month}`;
}

export function formatDayLong(iso: string): string {
  return weekdayLong.format(noonInSaoPaulo(iso));
}

export function dayChoices(now: Date = new Date()): DayChoice[] {
  const today = saoPauloISODate(now);
  return DAYS.map(({ id, label, offset }) => {
    const date = addCalendarDays(today, offset);
    const long = formatDayLong(date);
    return {
      id,
      label,
      date,
      caption: formatDayCaption(date),
      accessibilityLabel: `${label}, ${long}`,
    };
  });
}

export function dateForDay(id: DayId, now: Date = new Date()): string {
  const choice = dayChoices(now).find((item) => item.id === id);
  return choice?.date ?? saoPauloISODate(now);
}

/**
 * O servidor novo devolve `data` igual ao dia pedido.
 * O antigo ignora o parâmetro e não manda `data`: nesse caso só Hoje pode mostrar os jogos.
 */
export function dayResponseMatches(
  responseDate: string | undefined,
  requested: string,
  selected: DayId,
): boolean {
  if (responseDate === requested) return true;
  return selected === 'hoje' && (responseDate === undefined || responseDate === '');
}
