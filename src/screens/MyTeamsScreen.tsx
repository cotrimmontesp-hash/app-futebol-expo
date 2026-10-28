import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { errorMessage, loadCompetitions, loadMatches } from '../api';
import { Crest } from '../components/Crest';
import { TeamLink } from '../components/TeamLink';
import { Content, Message, Screen, SectionTitle } from '../components/ui';
import { useFavorites } from '../favorites';
import { formatDay, formatTime } from '../format';
import { favoriteAgenda, type AgendaGame, type LeagueBundle, type TeamNotice } from '../myTeams';
import type { RootStackParamList } from '../navigation';
import { isSameTeam, resultMark } from '../teamResults';
import { cardStyle, useTheme, type Palette } from '../theme';
import type { TeamRef } from '../types';

export default function MyTeamsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { names, ready, migrate } = useFavorites();
  const [leagues, setLeagues] = useState<LeagueBundle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!ready || names.size === 0) return undefined;
      let alive = true;
      setLoading(true);
      setError(null);
      const run = async () => {
        try {
          const competitions = await loadCompetitions();
          const lists = await Promise.all(
            competitions.map(async (competition) => {
              try {
                return { id: competition.id, nome: competition.nome, matches: await loadMatches(competition.id) };
              } catch {
                return { id: competition.id, nome: competition.nome, matches: null };
              }
            }),
          );
          if (!alive) return;
          if (lists.length > 0 && lists.every((item) => !item.matches)) {
            throw new Error('Não foi possível carregar os jogos');
          }
          migrate(
            lists.flatMap((item) =>
              item.matches
                ? [...(item.matches.resultados || []), ...(item.matches.proximos || [])].flatMap((match) => [
                    match.casa,
                    match.fora,
                  ])
                : [],
            ),
          );
          setLeagues(lists);
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
    }, [ready, names.size, attempt, migrate]),
  );

  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const card = useMemo(() => cardStyle(colors, scheme), [colors, scheme]);
  const agenda = useMemo(() => (leagues ? favoriteAgenda(leagues, [...names]) : null), [leagues, names]);
  const favoriteNames = useMemo(() => [...names], [names]);

  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  const openTeam = (liga: string, nome: string) => {
    if (!liga || !nome) return;
    navigation.push('Team', { liga, nome });
  };

  return (
    <Screen title="Meus times" onBack={back} testID="my-teams-screen">
      <Content>
        {!ready ? (
          <View accessibilityLiveRegion="polite">
            <Message text="Carregando…" />
          </View>
        ) : null}
        {ready && names.size === 0 ? (
          <View testID="my-teams-empty" accessibilityLiveRegion="polite">
            <Message text="Favorite um time para vê-lo aqui." />
            <Pressable
              style={styles.choose}
              onPress={() => navigation.navigate('Home')}
              accessibilityRole="button"
              accessibilityLabel="Escolher um time para favoritar"
            >
              <Text style={styles.chooseText}>Escolher um time</Text>
            </Pressable>
          </View>
        ) : null}
        {ready && names.size > 0 && loading && !leagues ? (
          <View accessibilityLiveRegion="polite">
            <Message text="Carregando…" />
          </View>
        ) : null}
        {ready && names.size > 0 && error && !leagues ? (
          <View accessibilityLiveRegion="polite">
            <Message
              tone="error"
              text="Não foi possível carregar os dados."
              detail={error}
              onRetry={() => setAttempt((value) => value + 1)}
            />
          </View>
        ) : null}
        {ready && names.size > 0 && agenda ? (
          <View testID="my-teams-agenda">
            {agenda.failedLeagues.length ? (
              <Text style={styles.partial} accessibilityLiveRegion="polite" testID="my-teams-partial">
                Alguns campeonatos não carregaram.
              </Text>
            ) : null}
            {agenda.upcoming.length ? (
              <View testID="my-teams-upcoming">
                <SectionTitle>Próximos jogos</SectionTitle>
                <GameCard
                  games={agenda.upcoming}
                  names={favoriteNames}
                  card={card}
                  styles={styles}
                  onOpen={openTeam}
                />
              </View>
            ) : agenda.recent.length ? (
              <View>
                <SectionTitle>Próximos jogos</SectionTitle>
                <Message text="Nenhum jogo marcado nos próximos 2 meses." />
              </View>
            ) : null}
            {agenda.recent.length ? (
              <View testID="my-teams-recent">
                <SectionTitle>Últimos resultados</SectionTitle>
                <GameCard
                  games={agenda.recent}
                  names={favoriteNames}
                  card={card}
                  styles={styles}
                  onOpen={openTeam}
                  finished
                />
              </View>
            ) : agenda.upcoming.length ? (
              <View>
                <SectionTitle>Últimos resultados</SectionTitle>
                <Message text="Nenhum resultado nos últimos 2 meses." />
              </View>
            ) : null}
            {!agenda.upcoming.length && !agenda.recent.length && !agenda.notices.length ? (
              <Message text="Nenhum jogo dos seus times nos últimos e próximos 2 meses." />
            ) : null}
            {agenda.notices.length ? (
              <View testID="my-teams-notices">
                <SectionTitle>Avisos</SectionTitle>
                {agenda.notices.map((notice) => (
                  <NoticeCard
                    key={`${notice.nome}-${notice.liga || ''}`}
                    notice={notice}
                    card={card}
                    styles={styles}
                    onOpen={openTeam}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Content>
    </Screen>
  );
}

function GameCard({
  games,
  names,
  card,
  styles,
  onOpen,
  finished = false,
}: {
  games: AgendaGame[];
  names: string[];
  card: ReturnType<typeof cardStyle>;
  styles: ReturnType<typeof createStyles>;
  onOpen: (liga: string, nome: string) => void;
  finished?: boolean;
}) {
  return (
    <View style={card}>
      {games.map((game, index) => (
        <GameRow
          key={`${game.liga}-${game.match.id}`}
          game={game}
          names={names}
          styles={styles}
          divider={index < games.length - 1}
          finished={finished}
          onOpen={onOpen}
        />
      ))}
    </View>
  );
}

function GameRow({
  game,
  names,
  styles,
  divider,
  finished,
  onOpen,
}: {
  game: AgendaGame;
  names: string[];
  styles: ReturnType<typeof createStyles>;
  divider: boolean;
  finished: boolean;
  onOpen: (liga: string, nome: string) => void;
}) {
  const { match, liga, competicao, time } = game;
  const favorites = [match.casa, match.fora].filter((side) => names.some((nome) => isSameTeam(side, nome)));
  const mark = finished && favorites.length === 1 ? resultMark(match, favorites[0].time) : null;
  const live = match.estado === 'in';
  const penalties =
    match.casa.penaltis != null && match.fora.penaltis != null
      ? `pên. ${match.casa.penaltis}–${match.fora.penaltis}`
      : '';
  const when = finished ? `${formatDay(match.data)} · ${formatTime(match.data)}` : formatDay(match.data);
  const score = `${match.casa.gols ?? ''} – ${match.fora.gols ?? ''}`;
  const resultWord = mark === 'V' ? 'vitória' : mark === 'E' ? 'empate' : mark === 'D' ? 'derrota' : '';
  const info = [competicao, match.fase].filter(Boolean).join(' · ');
  const kickoff = live ? `AO VIVO${match.relogio ? ` ${match.relogio}` : ''}` : formatTime(match.data);
  const label = finished
    ? `${when}. ${match.casa.time} ${score} ${match.fora.time}${resultWord ? `, ${resultWord}` : ''}. ${info}. Abrir ${time.time}`
    : `${when}, ${kickoff}. ${match.casa.time} contra ${match.fora.time}. ${info}. Abrir ${time.time}`;

  return (
    <Pressable
      style={[styles.game, divider && styles.divider]}
      onPress={() => onOpen(liga, time.time)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.when}>{when}</Text>
      <View style={styles.line}>
        <TeamSide liga={liga} team={match.casa} names={names} styles={styles} />
        <View style={styles.center}>
          {finished ? (
            <>
              <Text style={styles.score}>{score}</Text>
              {penalties ? <Text style={styles.meta}>{penalties}</Text> : null}
              {mark ? <ResultBadge mark={mark} styles={styles} /> : null}
            </>
          ) : (
            <Text style={live ? styles.live : styles.kickoff}>{kickoff}</Text>
          )}
        </View>
        <TeamSide liga={liga} team={match.fora} names={names} styles={styles} away />
      </View>
      {info ? <Text style={styles.info}>{info}</Text> : null}
    </Pressable>
  );
}

function TeamSide({
  liga,
  team,
  names,
  styles,
  away = false,
}: {
  liga: string;
  team: TeamRef;
  names: string[];
  styles: ReturnType<typeof createStyles>;
  away?: boolean;
}) {
  const favorite = names.some((nome) => isSameTeam(team, nome));
  return (
    <TeamLink liga={liga} team={team} style={[styles.side, away && styles.sideAway]}>
      {away ? null : <Crest uri={team.escudo} name={team.time} size={28} />}
      <Text numberOfLines={2} style={[styles.name, away && styles.nameAway, favorite && styles.favoriteName]}>
        {team.time}
      </Text>
      {away ? <Crest uri={team.escudo} name={team.time} size={28} /> : null}
    </TeamLink>
  );
}

function ResultBadge({ mark, styles }: { mark: 'V' | 'E' | 'D'; styles: ReturnType<typeof createStyles> }) {
  const word = mark === 'V' ? 'Vitória' : mark === 'E' ? 'Empate' : 'Derrota';
  return (
    <View
      style={[styles.badge, mark === 'V' && styles.badgeV, mark === 'E' && styles.badgeE, mark === 'D' && styles.badgeD]}
      accessibilityLabel={word}
    >
      <Text style={[styles.badgeText, mark === 'V' && styles.badgeTextV, mark === 'E' && styles.badgeTextE, mark === 'D' && styles.badgeTextD]}>
        {mark}
      </Text>
    </View>
  );
}

function NoticeCard({
  notice,
  card,
  styles,
  onOpen,
}: {
  notice: TeamNotice;
  card: ReturnType<typeof cardStyle>;
  styles: ReturnType<typeof createStyles>;
  onOpen: (liga: string, nome: string) => void;
}) {
  const text = (
    <>
      <Text style={styles.noticeName}>{notice.nome}</Text>
      <Text style={styles.noticeText}>{notice.texto}</Text>
    </>
  );
  if (!notice.liga) {
    return (
      <View style={[card, styles.notice]} accessibilityLabel={`${notice.nome}. ${notice.texto}`}>
        {text}
      </View>
    );
  }
  return (
    <Pressable
      style={[card, styles.notice]}
      onPress={() => onOpen(notice.liga || '', notice.nome)}
      accessibilityRole="button"
      accessibilityLabel={`${notice.nome}. ${notice.texto}. Abrir página do time`}
    >
      {text}
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    choose: {
      alignSelf: 'center',
      minHeight: 48,
      minWidth: 44,
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chooseText: { color: colors.onButton, fontSize: 17, fontWeight: '700' },
    partial: {
      color: colors.warning,
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 4,
      paddingHorizontal: 8,
    },
    game: { paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
    divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
    when: { color: colors.muted, fontSize: 15, marginBottom: 8 },
    line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, minHeight: 44 },
    sideAway: { justifyContent: 'flex-end' },
    name: { flex: 1, fontSize: 17, color: colors.text },
    nameAway: { textAlign: 'right' },
    favoriteName: { fontWeight: '700' },
    center: { minWidth: 76, alignItems: 'center', justifyContent: 'center' },
    score: { fontWeight: '700', fontSize: 18, color: colors.text },
    kickoff: { fontWeight: '700', fontSize: 18, color: colors.link },
    live: { fontWeight: '700', fontSize: 15, color: colors.live, textAlign: 'center' },
    meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
    info: { textAlign: 'center', color: colors.muted, fontSize: 14, marginTop: 8 },
    badge: {
      marginTop: 4,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 4,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
    badgeV: { backgroundColor: colors.badgeVBg },
    badgeE: { backgroundColor: colors.badgeEBg },
    badgeD: { backgroundColor: colors.badgeDBg },
    badgeTextV: { color: colors.badgeVText },
    badgeTextE: { color: colors.badgeEText },
    badgeTextD: { color: colors.badgeDText },
    notice: { paddingHorizontal: 14, paddingVertical: 14, minHeight: 44, justifyContent: 'center' },
    noticeName: { color: colors.text, fontSize: 17, fontWeight: '700' },
    noticeText: { color: colors.warning, fontSize: 15, marginTop: 4 },
  });
}
