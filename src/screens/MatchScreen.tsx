import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { errorMessage, loadLineup } from '../api';
import { Crest } from '../components/Crest';
import { Pitch } from '../components/Pitch';
import { StarButton } from '../components/StarButton';
import { TeamLink } from '../components/TeamLink';
import { Content, Message, Screen, SectionTitle } from '../components/ui';
import { useFavorites } from '../favorites';
import type { RootStackParamList } from '../navigation';
import { placePlayers } from '../pitch';
import { cardStyle, useTheme, type Palette } from '../theme';
import type { LineupPlayer, LineupResponse, LineupTeam, MatchEvent, MatchStats } from '../types';

export default function MatchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Match'>>();
  const { liga, id } = route.params;
  const { migrate } = useFavorites();
  const [data, setData] = useState<LineupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setInterval> | null = null;
      const clear = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };
      const load = async (silent: boolean) => {
        try {
          const next = await loadLineup(liga, id);
          if (!alive) return;
          setData(next);
          setError(null);
          clear();
          const wait = next.aoVivo ? 30_000 : next.divulgada ? 0 : 5 * 60_000;
          if (wait) {
            timer = setInterval(() => {
              void load(true);
            }, wait);
          }
        } catch (cause) {
          if (!alive) return;
          if (!silent) setError(errorMessage(cause));
        } finally {
          if (alive && !silent) setLoading(false);
        }
      };
      void load(false);
      return () => {
        alive = false;
        clear();
      };
    }, [liga, id, attempt]),
  );

  useEffect(() => {
    if (data?.times) migrate(data.times);
  }, [data, migrate]);

  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  return (
    <Screen title="Escalação" onBack={back} testID="match-screen">
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
          <Events events={data.lances || []} />
          <Stats stats={data.estatisticas} liga={liga} />
          {data.divulgada ? (
            <Lineups teams={data.times || []} liga={liga} />
          ) : (
            <Message text="Escalação ainda não divulgada (sai cerca de 1 hora antes do jogo)." />
          )}
        </Content>
      ) : null}
    </Screen>
  );
}

function Events({ events }: { events: MatchEvent[] }) {
  const { card, styles } = useMatchChrome();
  if (!events.length) return null;
  return (
    <View style={card} testID="lances">
      <SectionTitle>Lances</SectionTitle>
      {events.map((event, index) => (
        <View key={`${event.minuto}-${event.tipo}-${index}`} style={styles.event}>
          <Text style={styles.minute}>{event.minuto}</Text>
          <EventMark tipo={event.tipo} />
          <Text style={styles.eventText}>{event.texto}</Text>
        </View>
      ))}
    </View>
  );
}

function EventMark({ tipo }: { tipo: string }) {
  const { styles } = useMatchChrome();
  if (tipo === 'gol' || tipo === 'gol-contra' || tipo === 'penalti') return <View style={styles.goal} />;
  if (tipo === 'penalti-perdido') return <Text style={styles.miss}>×</Text>;
  if (tipo === 'amarelo') return <View style={styles.yellow} />;
  if (tipo === 'vermelho') return <View style={styles.red} />;
  if (tipo === 'substituicao') return <Text style={styles.sub}>⇄</Text>;
  if (tipo === 'var') return <Text style={styles.varMark}>VAR</Text>;
  return <View style={styles.markSlot} />;
}

function Stats({ stats, liga }: { stats: MatchStats | null; liga: string }) {
  const { card, styles } = useMatchChrome();
  if (!stats?.linhas?.length) return null;
  return (
    <View style={card} testID="stats">
      <SectionTitle>Estatísticas</SectionTitle>
      <View style={styles.stat}>
        <StatSide team={stats.casa} align="left" liga={liga} />
        <Text style={styles.statLabel}> </Text>
        <StatSide team={stats.fora} align="right" liga={liga} />
      </View>
      {stats.linhas.map((line) => (
        <View key={line.rotulo} style={styles.stat}>
          <Text style={[styles.statValue, styles.statLeft]}>{line.casa}</Text>
          <Text style={styles.statLabel}>{line.rotulo}</Text>
          <Text style={styles.statValue}>{line.fora}</Text>
        </View>
      ))}
    </View>
  );
}

function StatSide({ team, align, liga }: { team: MatchStats['casa']; align: 'left' | 'right'; liga: string }) {
  const { styles } = useMatchChrome();
  const away = align === 'right';
  return (
    <TeamLink liga={liga} team={team} style={[styles.statSide, away && styles.statSideRight]}>
      {away ? null : <Crest uri={team.escudo} name={team.time} />}
      <Text numberOfLines={1} style={styles.statTeam}>
        {team.time}
      </Text>
      {away ? <Crest uri={team.escudo} name={team.time} /> : null}
    </TeamLink>
  );
}

function Lineups({ teams, liga }: { teams: LineupTeam[]; liga: string }) {
  const { card } = useMatchChrome();
  if (teams.length > 1) {
    const home = placePlayers(teams[0].formacao, teams[0].titulares, 'cima');
    const away = placePlayers(teams[1].formacao, teams[1].titulares, 'baixo');
    if (home && away) {
      return (
        <View style={card}>
          <TeamHead team={teams[0]} liga={liga} />
          <Pitch points={[...home, ...away]} />
          <TeamHead team={teams[1]} liga={liga} />
          <PlayerList title={`Reservas · ${teams[0].time}`} players={teams[0].reservas} />
          <PlayerList title={`Reservas · ${teams[1].time}`} players={teams[1].reservas} />
        </View>
      );
    }
  }
  return (
    <View>
      {teams.map((team) => {
        const points = placePlayers(team.formacao, team.titulares);
        return (
          <View key={team.time} style={card}>
            <TeamHead team={team} liga={liga} />
            {points ? <Pitch points={points} /> : <PlayerList title="Titulares" players={team.titulares} />}
            <PlayerList title="Reservas" players={team.reservas} />
          </View>
        );
      })}
    </View>
  );
}

function TeamHead({ team, liga }: { team: LineupTeam; liga: string }) {
  const { styles } = useMatchChrome();
  return (
    <View style={styles.teamHead}>
      <StarButton team={team} />
      <TeamLink liga={liga} team={team} style={styles.teamOpen}>
        <Crest uri={team.escudo} name={team.time} />
        <Text numberOfLines={1} style={styles.teamName}>
          {team.time}
        </Text>
      </TeamLink>
      {team.formacao ? <Text style={styles.formation}>{team.formacao}</Text> : null}
    </View>
  );
}

function PlayerList({ title, players }: { title: string; players: LineupPlayer[] }) {
  const { styles } = useMatchChrome();
  if (!players.length) return null;
  return (
    <View>
      <Text style={styles.listTitle}>{title}</Text>
      {players.map((player, index) => (
        <View key={`${player.camisa}-${player.nome}-${index}`} style={styles.player}>
          <Text style={styles.shirt}>{player.camisa}</Text>
          <Text style={styles.position}>{player.posicao}</Text>
          <Text numberOfLines={1} style={styles.playerName}>
            {player.nome}
          </Text>
          {player.saiu ? <Text style={styles.out}>saiu</Text> : null}
          {!player.saiu && player.entrou ? <Text style={styles.entered}>entrou</Text> : null}
        </View>
      ))}
    </View>
  );
}

function useMatchChrome() {
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const card = useMemo(() => cardStyle(colors, scheme), [colors, scheme]);
  return { card, styles };
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    event: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    minute: { width: 56, fontWeight: '700', fontSize: 14, color: colors.link, fontVariant: ['tabular-nums'] },
    eventText: { flex: 1, color: colors.text, fontSize: 15 },
    goal: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.text, marginTop: 2 },
    yellow: { width: 12, height: 16, borderRadius: 1, backgroundColor: colors.yellow, marginTop: 2, marginLeft: 2 },
    red: { width: 12, height: 16, borderRadius: 1, backgroundColor: colors.redCard, marginTop: 2, marginLeft: 2 },
    miss: { width: 18, textAlign: 'center', color: colors.miss, fontWeight: '800', fontSize: 16 },
    sub: { width: 18, textAlign: 'center', color: colors.link, fontWeight: '800', fontSize: 16 },
    varMark: { width: 36, color: colors.varBlue, fontWeight: '800', fontSize: 12, marginTop: 2 },
    markSlot: { width: 18 },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    statValue: { flex: 1, fontWeight: '700', fontSize: 14, color: colors.text },
    statLeft: { textAlign: 'right' },
    statLabel: { color: colors.muted, fontSize: 12, textAlign: 'center' },
    statSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
    statSideRight: { justifyContent: 'flex-end' },
    statTeam: { fontWeight: '600', fontSize: 14, color: colors.text, flexShrink: 1 },
    teamHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
    teamOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, alignSelf: 'stretch' },
    teamName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    formation: { marginLeft: 'auto', fontWeight: '700', fontSize: 14, color: colors.muted },
    listTitle: {
      marginTop: 12,
      marginBottom: 4,
      marginHorizontal: 12,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    player: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    shirt: { width: 26, fontWeight: '700', fontSize: 14, color: colors.link },
    position: { width: 36, fontSize: 12, color: colors.muted },
    playerName: { flex: 1, color: colors.text, fontSize: 15 },
    out: { color: colors.out, fontWeight: '700', fontSize: 12 },
    entered: { color: colors.link, fontWeight: '700', fontSize: 12 },
  });
}
