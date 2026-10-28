import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { errorMessage, isAbortError, loadToday } from '../api';
import { MatchList } from '../components/MatchList';
import { Content, Message, QuietNote, Screen, SectionTitle } from '../components/ui';
import { dateForDay, dayChoices, dayResponseMatches, type DayChoice, type DayId } from '../day';
import { useFavorites } from '../favorites';
import type { RootStackParamList } from '../navigation';
import {
  STALE_DATA_NOTE,
  createRefreshGate,
  formatUpdatedAt,
  planAfterRefresh,
  planRefresh,
  refreshIntervalMs,
  shouldPauseRefresh,
  type RefreshKind,
} from '../refresh';
import { useTheme, type Palette } from '../theme';
import type { Match, TodayResponse } from '../types';

type TodayFilter = 'todos' | 'aovivo';

type CompetitionGroup = {
  key: string;
  title: string;
  matches: Match[];
};

function isFavoriteMatch(match: Match, isFav: (team: Match['casa']) => boolean): boolean {
  return isFav(match.casa) || isFav(match.fora);
}

function sortToday(list: Match[], isFav: (team: Match['casa']) => boolean): Match[] {
  return [...list].sort((a, b) => {
    const favA = isFavoriteMatch(a, isFav) ? 0 : 1;
    const favB = isFavoriteMatch(b, isFav) ? 0 : 1;
    if (favA !== favB) return favA - favB;
    return String(a.data).localeCompare(String(b.data));
  });
}

function groupByCompetition(list: Match[], isFav: (team: Match['casa']) => boolean): CompetitionGroup[] {
  const byKickoff = [...list].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const groups: CompetitionGroup[] = [];
  const byKey = new Map<string, CompetitionGroup>();
  for (const match of byKickoff) {
    const key = match.liga || match.competicao || 'outros';
    const title = match.competicao || match.liga || 'Outros jogos';
    let group = byKey.get(key);
    if (!group) {
      group = { key, title, matches: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.matches.push(match);
  }
  for (const group of groups) group.matches = sortToday(group.matches, isFav);
  const favorite = (group: CompetitionGroup) => group.matches.some((match) => isFavoriteMatch(match, isFav));
  return [...groups.filter(favorite), ...groups.filter((group) => !favorite(group))];
}

export default function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isFav, migrate } = useFavorites();
  const [day, setDay] = useState<DayId>('hoje');
  const [data, setData] = useState<TodayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<TodayFilter>('todos');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dataRef = useRef<TodayResponse | null>(null);
  const loadRef = useRef<(kind: RefreshKind) => void>(() => setRefreshing(false));
  const choices = dayChoices();

  // Um relógio só, enquanto esta tela está em foco e o app está visível.
  useFocusEffect(
    useCallback(() => {
      let disposed = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let controller: AbortController | null = null;
      let hasLive = false;
      const gate = createRefreshGate(!shouldPauseRefresh(AppState.currentState));

      const clearTimer = () => {
        if (timer) clearTimeout(timer);
        timer = null;
      };
      const arm = (delayMs: number) => {
        clearTimer();
        timer = setTimeout(() => {
          timer = null;
          void run('tick');
        }, delayMs);
      };

      const run = async (kind: RefreshKind) => {
        const decision = planRefresh(gate, kind);
        if (decision !== 'run') return;
        clearTimer();
        const current = new AbortController();
        controller = current;
        const silent = dataRef.current != null;
        let delayMs: number | null = null;
        try {
          const requested = dateForDay(day);
          const next = await loadToday(requested, current.signal);
          if (disposed || current.signal.aborted) return;
          if (!dayResponseMatches(next.data, requested, day)) {
            dataRef.current = null;
            setData(null);
            setUnavailable(true);
            setError(null);
            setStale(false);
            setUpdatedAt(null);
            hasLive = false;
            delayMs = refreshIntervalMs(day, false);
            return;
          }
          const jogos = Array.isArray(next.jogos) ? next.jogos : [];
          const payload = { ...next, jogos };
          dataRef.current = payload;
          hasLive = jogos.some((match) => match.estado === 'in');
          setUnavailable(false);
          setData(payload);
          setError(null);
          setStale(false);
          setUpdatedAt(new Date());
          migrate(jogos.flatMap((match) => [match.casa, match.fora]));
          delayMs = refreshIntervalMs(day, hasLive);
        } catch (cause) {
          if (disposed || current.signal.aborted || isAbortError(cause)) return;
          if (!silent) {
            setError(errorMessage(cause));
            setData(null);
            dataRef.current = null;
            setUnavailable(false);
            setStale(false);
            delayMs = null;
          } else {
            setStale(true);
            delayMs = refreshIntervalMs(day, hasLive);
          }
        } finally {
          if (disposed || current.signal.aborted) return;
          if (!silent) setLoading(false);
          const nextPlan = planAfterRefresh(gate, delayMs);
          if (nextPlan.type === 'again') {
            void run('resume');
            return;
          }
          setRefreshing((currentValue) => (currentValue ? false : currentValue));
          if (nextPlan.type === 'wait') arm(nextPlan.delayMs);
        }
      };

      loadRef.current = (kind) => {
        void run(kind);
      };

      const onAppState = (state: AppStateStatus) => {
        if (shouldPauseRefresh(state)) {
          gate.visible = false;
          clearTimer();
          return;
        }
        const wasHidden = !gate.visible;
        gate.visible = true;
        if (wasHidden) void run('resume');
      };

      const subscription = AppState.addEventListener('change', onAppState);
      if (gate.visible) void run('open');

      return () => {
        disposed = true;
        gate.visible = false;
        clearTimer();
        controller?.abort();
        subscription.remove();
        loadRef.current = () => setRefreshing(false);
        setRefreshing(false);
      };
    }, [attempt, day, migrate]),
  );

  const selectDay = (next: DayId) => {
    if (next === day) return;
    setDay(next);
    dataRef.current = null;
    setData(null);
    setUpdatedAt(null);
    setStale(false);
    setError(null);
    setUnavailable(false);
    setLoading(true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRef.current('manual');
  }, []);

  const styles = useTodayStyles();
  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };
  const games = data?.jogos || [];
  const liveCount = games.filter((match) => match.estado === 'in').length;
  const visible = filter === 'aovivo' ? games.filter((match) => match.estado === 'in') : games;
  const groups = groupByCompetition(visible, isFav);
  const emptyAll = !!data && filter === 'todos' && games.length === 0;
  const emptyLive = !!data && filter === 'aovivo' && liveCount === 0;

  const retry = () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    setAttempt((value) => value + 1);
  };

  return (
    <Screen
      title="Hoje"
      onBack={back}
      testID="today-screen"
      tabs={
        <View>
          <View style={styles.days} accessibilityRole="tablist" testID="day-selector">
            {choices.map((choice) => (
              <DayButton
                key={choice.id}
                choice={choice}
                selected={day === choice.id}
                onPress={() => selectDay(choice.id)}
              />
            ))}
          </View>
          {data ? (
            <View style={styles.tabs}>
              <FilterTab
                label="Todos"
                selected={filter === 'todos'}
                testID="filter-todos"
                onPress={() => setFilter('todos')}
              />
              <FilterTab
                label={`Ao vivo (${liveCount})`}
                selected={filter === 'aovivo'}
                testID="filter-live"
                onPress={() => setFilter('aovivo')}
              />
            </View>
          ) : null}
          {updatedAt ? <QuietNote testID="updated-at" text={formatUpdatedAt(updatedAt)} /> : null}
          {stale ? <QuietNote testID="refresh-stale" tone="warning" live text={STALE_DATA_NOTE} /> : null}
        </View>
      }
    >
      {loading && !data ? (
        <View accessibilityLiveRegion="polite">
          <Message text="Carregando…" />
        </View>
      ) : null}
      {error && !data ? (
        <View accessibilityLiveRegion="polite">
          <Message tone="error" text="Não foi possível carregar os dados." detail={error} onRetry={retry} />
        </View>
      ) : null}
      {unavailable && !loading && !error ? (
        <View testID="day-unavailable" accessibilityLiveRegion="polite">
          <Message text="Este dia ainda não está disponível." />
        </View>
      ) : null}
      {data ? (
        <Content refreshing={refreshing} onRefresh={onRefresh}>
          {emptyAll ? (
            <View testID="day-empty" accessibilityLiveRegion="polite">
              <Message text="Sem jogos neste dia." />
            </View>
          ) : null}
          {emptyLive ? (
            <View testID="live-empty">
              <Message text="Nenhum jogo ao vivo agora." />
            </View>
          ) : null}
          {groups.map((group) => (
            <View key={group.key} testID={`hoje-grupo-${group.key}`}>
              <SectionTitle>{group.title}</SectionTitle>
              <MatchList matches={group.matches} hideDay />
            </View>
          ))}
        </Content>
      ) : null}
    </Screen>
  );
}

function DayButton({
  choice,
  selected,
  onPress,
}: {
  choice: DayChoice;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useTodayStyles();
  return (
    <Pressable
      testID={`day-${choice.id}`}
      style={[styles.day, selected && styles.dayOn]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={choice.accessibilityLabel}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.dayLabel, selected && styles.dayLabelOn]}>{choice.label}</Text>
      <Text style={[styles.dayCaption, selected && styles.dayCaptionOn]}>{choice.caption}</Text>
    </Pressable>
  );
}

function FilterTab({
  label,
  selected,
  testID,
  onPress,
}: {
  label: string;
  selected: boolean;
  testID: string;
  onPress: () => void;
}) {
  const styles = useTodayStyles();
  return (
    <Pressable
      testID={testID}
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.tabText, selected && styles.tabTextOn]}>{label}</Text>
      <View style={[styles.underline, selected && styles.underlineOn]} />
    </Pressable>
  );
}

function useTodayStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    days: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.bg,
    },
    day: {
      flex: 1,
      minHeight: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.buttonOffBorder,
      backgroundColor: colors.buttonOffBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    dayOn: {
      backgroundColor: colors.button,
      borderColor: colors.button,
    },
    dayLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.buttonOffText,
      textAlign: 'center',
    },
    dayLabelOn: { color: colors.onButton },
    dayCaption: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
    },
    dayCaptionOn: { color: colors.onButton },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.tabBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.tabBorder,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingTop: 8, paddingHorizontal: 8 },
    tabText: { textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: 14, minHeight: 20 },
    tabTextOn: { color: colors.link },
    underline: { height: 3, alignSelf: 'stretch', marginTop: 8, backgroundColor: 'transparent' },
    underlineOn: { backgroundColor: colors.link },
  });
}
