export type Competition = {
  id: string;
  nome: string;
  pais: string;
  tipo: 'liga' | 'copa' | string;
};

export type TeamRef = {
  time: string;
  origem?: string;
  escudo?: string;
};

export type StandingRow = TeamRef & {
  pos: number | null;
  j: string;
  v: string;
  e: string;
  d: string;
  gp: string;
  gc: string;
  sg: string;
  pts: string;
  nota: { cor: string; texto: string } | null;
};

export type StandingGroup = {
  nome: string;
  linhas: StandingRow[];
};

export type Standings = {
  temporada?: string;
  grupos: StandingGroup[];
  semTabela?: boolean;
};

export type MatchSide = TeamRef & {
  gols?: string | number;
  penaltis?: number | null;
  venceu?: boolean;
};

export type Match = {
  id: string;
  data: string;
  estado: 'pre' | 'in' | 'post' | string;
  status?: string;
  relogio?: string;
  casa: MatchSide;
  fora: MatchSide;
  estadio?: string;
  fase?: string;
  liga?: string;
  competicao?: string;
};

export type MatchesResponse = {
  resultados: Match[];
  proximos: Match[];
  atualizadoEm?: string;
};

export type TodayResponse = {
  jogos: Match[];
  atualizadoEm?: string;
};

export type Scorer = TeamRef & {
  nome: string;
  jogos: number | null;
  gols?: number | null;
  assistencias?: number | null;
};

export type Scorers = {
  gols: Scorer[];
  assistencias: Scorer[];
};

export type LineupPlayer = {
  camisa: string;
  posicao: string;
  nome: string;
  lugar: string;
  entrou: boolean;
  saiu: boolean;
};

export type LineupTeam = TeamRef & {
  formacao: string;
  titulares: LineupPlayer[];
  reservas: LineupPlayer[];
};

export type StatLine = {
  rotulo: string;
  casa: string;
  fora: string;
};

export type MatchStats = {
  casa: TeamRef;
  fora: TeamRef;
  linhas: StatLine[];
};

export type MatchEvent = {
  minuto: string;
  tipo: string;
  texto: string;
};

export type LineupResponse = {
  divulgada: boolean;
  times?: LineupTeam[];
  estatisticas: MatchStats | null;
  aoVivo: boolean;
  lances: MatchEvent[];
};

export type PushStatus = {
  ativo: boolean;
  chavePublica?: string;
};

export type TabId = 'tabela' | 'resultados' | 'proximos' | 'artilheiros';
