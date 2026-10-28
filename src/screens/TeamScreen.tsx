import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { errorMessage, loadCompetitions, loadMatches, loadStandings } from '../api';
import { Crest } from '../components/Crest';
import { StarButton } from '../components/StarButton';
import { Content, Message, Screen, SectionTitle } from '../components/ui';
import { useFavorites } from '../favorites';
import { formatDay, formatTime } from '../format';
import type { RootStackParamList } from '../navigation';
import { card, colors } from '../theme';
import type { Competition, Match, MatchesResponse, StandingRow, Standings, TeamRef } from '../types';

type TeamData = {
  competition: Competition | null;
  standings: Standings;
  matches: MatchesResponse;
};

type Place = {
  grupo: string;
  row: StandingRow;
};

export default function TeamScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Team'>>();
  const { liga, nome } = route.params;
  const { migrate } = useFavorites();
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setError(null);
      setData(null);
      const run = async () => {
        try {
          const [standings, matches, competitions] = await Promise.all([
            loadStandings(liga),
            loadMatches(liga),
            loadCompetitions().catch(() => [] as Competition[]),
          ]);
          if (!alive) return;
          setData({
            competition: competitions.find((item) => item.id === liga) ?? null,
            standings,
            matches,
          });
        } catch (cause) {
          if (alive) setError(errorMessage(cause));
        } finally {
          if (alive) setLoading(false);
        }
      };
      void run();
      return () => {
        alive = false;
      };
    }, [liga, nome, attempt]),
  );

  useEffect(() => {
    if (!data) return;
    migrate([
      ...(data.standings.grupos || []).flatMap((group) => group.linhas),
      ...(data.matches.resultados || []).flatMap((match) => [match.casa, match.fora]),
      ...(data.matches.proximos || []).flatMap((match) => [match.casa, match.fora]),
    ]);
  }, [data, migrate]);

  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  const team = data ? findTeam(nome, data.standings, data.matches) : { time: nome };
  const place = data ? findStanding(nome, data.standings) : null;
  const recent = data ? lastFinished(data.matches, nome) : [];
  const upcoming = data ? nextScheduled(data.matches, nome) : [];

  return (
    <Screen title={team.time || nome || 'Time'} onBack={back} testID="team-screen">
      {loading && !data ? <Message text="Carregando…" /> : null}
      {error && !data ? (
        <Message
          tone="error"
          text="Não foi possível carregar os dados."
          detail={error}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : null}
      {data ? (
        <Content>
          <View style={[card, styles.headerCard]} testID="team-header">
            <Crest uri={team.escudo} name={team.time} size={48} />
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{team.time}</Text>
              {data.competition?.nome ? <Text style={styles.headerComp}>{data.competition.nome}</Text> : null}
            </View>
            <StarButton team={team} />
          </View>

          <View testID="team-classification">
            <SectionTitle>Classificação</SectionTitle>
            {place ? <Classification place={place} /> : <Message text="Sem dados." />}
          </View>

          <View testID="team-results">
            <SectionTitle>Últimos resultados</SectionTitle>
            {recent.length ? (
              <GameList matches={recent} nome={nome} liga={liga} finished />
            ) : (
              <Message text="Sem dados." />
            )}
          </View>

          <View testID="team-fixtures">
            <SectionTitle>Próximos jogos</SectionTitle>
            {upcoming.length ? (
              <GameList matches={upcoming} nome={nome} liga={liga} finished={false} />
            ) : (
              <Message text="Sem dados." />
            )}
          </View>
        </Content>
      ) : null}
    </Screen>
  );
}

function Classification({ place }: { place: Place }) {
  const lines = [
    { label: 'Posição', value: place.row.pos == null ? '–' : String(place.row.pos) },
    { label: 'Pontos', value: place.row.pts },
    { label: 'Jogos', value: place.row.j },
    { label: 'Vitórias', value: place.row.v },
    { label: 'Empates', value: place.row.e },
    { label: 'Derrotas', value: place.row.d },
    { label: 'Saldo de gols', value: place.row.sg },
  ];
  return (
    <View style={card}>
      {place.grupo ? <Text style={styles.group}>{place.grupo}</Text> : null}
      {lines.map((line, index) => (
        <View key={line.label} style={[styles.statLine, (index > 0 || !!place.grupo) && styles.statDivider]}>
          <Text style={styles.statLabel}>{line.label}</Text>
          <Text style={styles.statValue}>{line.value}</Text>
        </View>
      ))}
      {place.row.nota ? (
        <View style={styles.nota}>
          <View style={[styles.swatch, { backgroundColor: place.row.nota.cor || colors.muted }]} />
          <Text style={styles.notaText}>{place.row.nota.texto}</Text>
        </View>
      ) : null}
    </View>
  );
}

function GameList({
  matches,
  nome,
  liga,
  finished,
}: {
  matches: Match[];
  nome: string;
  liga: string;
  finished: boolean;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={card}>
      {matches.map((match, index) => {
        const mark = finished ? resultMark(match, nome) : null;
        const penalties =
          match.casa.penaltis != null && match.fora.penaltis != null
            ? `pên. ${match.casa.penaltis}–${match.fora.penaltis}`
            : '';
        const score = `${match.casa.gols ?? ''} – ${match.fora.gols ?? ''}`;
        const resultWord = mark === 'V' ? 'vitória' : mark === 'E' ? 'empate' : mark === 'D' ? 'derrota' : '';
        const label = finished
          ? `${match.casa.time} ${score} ${match.fora.time}${resultWord ? `, ${resultWord}` : ''}`
          : `${match.casa.time} contra ${match.fora.time}`;
        return (
          <Pressable
            key={String(match.id)}
            style={[styles.game, index < matches.length - 1 && styles.gameDivider]}
            onPress={() => navigation.push('Match', { liga, id: String(match.id) })}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={styles.day}>{formatDay(match.data)}</Text>
            <View style={styles.line}>
              <View style={styles.side}>
                <Crest uri={match.casa.escudo} name={match.casa.time} />
                <Text numberOfLines={1} style={[styles.name, isSameTeam(match.casa, nome) && styles.selfName]}>
                  {match.casa.time}
                </Text>
              </View>
              <View style={styles.center}>
                {finished ? (
                  <>
                    <Text style={styles.score}>{score}</Text>
                    {penalties ? <Text style={styles.meta}>{penalties}</Text> : null}
                    {mark ? <ResultBadge mark={mark} /> : null}
                  </>
                ) : (
                  <Text style={styles.kickoff}>{formatTime(match.data)}</Text>
                )}
              </View>
              <View style={[styles.side, styles.sideAway]}>
                <Text numberOfLines={1} style={[styles.name, styles.nameAway, isSameTeam(match.fora, nome) && styles.selfName]}>
                  {match.fora.time}
                </Text>
                <Crest uri={match.fora.escudo} name={match.fora.time} />
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ResultBadge({ mark }: { mark: 'V' | 'E' | 'D' }) {
  return (
    <View style={[styles.badge, mark === 'V' && styles.badgeV, mark === 'E' && styles.badgeE, mark === 'D' && styles.badgeD]}>
      <Text style={[styles.badgeText, mark === 'V' && styles.badgeTextV, mark === 'E' && styles.badgeTextE, mark === 'D' && styles.badgeTextD]}>
        {mark}
      </Text>
    </View>
  );
}

function isSameTeam(team: TeamRef | null | undefined, nome: string): boolean {
  if (!team || !nome) return false;
  return team.time === nome || (!!team.origem && team.origem === nome);
}

function involves(match: Match, nome: string): boolean {
  return isSameTeam(match.casa, nome) || isSameTeam(match.fora, nome);
}

function resultMark(match: Match, nome: string): 'V' | 'E' | 'D' {
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

function lastFinished(matches: MatchesResponse, nome: string): Match[] {
  return allMatches(matches)
    .filter((match) => match.estado === 'post' && involves(match, nome))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);
}

function nextScheduled(matches: MatchesResponse, nome: string): Match[] {
  return allMatches(matches)
    .filter((match) => match.estado === 'pre' && involves(match, nome))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);
}

function findStanding(nome: string, standings: Standings): Place | null {
  if (standings.semTabela) return null;
  const rows = (standings.grupos || []).flatMap((group) =>
    (group.linhas || []).map((row) => ({ grupo: group.nome, row })),
  );
  const found = rows.find((item) => item.row.time === nome) || rows.find((item) => item.row.origem === nome);
  return found ?? null;
}

function findTeam(nome: string, standings: Standings, matches: MatchesResponse): TeamRef {
  const place = findStanding(nome, standings);
  if (place) return place.row;
  const sides = allMatches(matches).flatMap((match) => [match.casa, match.fora]);
  return sides.find((side) => side.time === nome) || sides.find((side) => side.origem === nome) || { time: nome };
}

const styles = StyleSheet.create({
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerComp: { color: colors.muted, fontSize: 13, marginTop: 2 },
  group: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, fontWeight: '700', color: colors.text, fontSize: 15 },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  statLabel: { color: colors.muted, fontSize: 15 },
  statValue: { color: colors.text, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  notaText: { color: '#4b5550', fontSize: 13, flex: 1 },
  game: { paddingHorizontal: 8, paddingVertical: 8 },
  gameDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  day: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  sideAway: { justifyContent: 'flex-end' },
  name: { flex: 1, fontSize: 14, color: colors.text },
  nameAway: { textAlign: 'right' },
  selfName: { fontWeight: '700' },
  center: { minWidth: 76, alignItems: 'center', justifyContent: 'center' },
  score: { fontWeight: '700', fontSize: 16, color: colors.text },
  kickoff: { fontWeight: '700', fontSize: 15, color: colors.green },
  meta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  badge: {
    marginTop: 2,
    minWidth: 22,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeV: { backgroundColor: '#e5f4ec' },
  badgeE: { backgroundColor: '#f4f1e4' },
  badgeD: { backgroundColor: '#fdecea' },
  badgeTextV: { color: colors.green },
  badgeTextE: { color: '#6b5a20' },
  badgeTextD: { color: colors.error },
});
