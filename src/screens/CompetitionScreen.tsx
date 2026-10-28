import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { errorMessage, loadCompetitions, loadMatches, loadScorers, loadStandings } from '../api';
import { MatchList } from '../components/MatchList';
import { Scorers } from '../components/Scorers';
import { Standings } from '../components/Standings';
import { Content, Message, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation';
import { useTheme, type Palette } from '../theme';
import type { Competition, MatchesResponse, Scorers as ScorersData, Standings as StandingsData, TabId } from '../types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'tabela', label: 'Tabela' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'proximos', label: 'Próximos jogos' },
  { id: 'artilheiros', label: 'Artilheiros' },
];

type Payload =
  | { kind: 'tabela'; data: StandingsData }
  | { kind: 'resultados'; data: MatchesResponse['resultados'] }
  | { kind: 'proximos'; data: MatchesResponse['proximos'] }
  | { kind: 'artilheiros'; data: ScorersData };

export default function CompetitionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Competition'>>();
  const { id } = route.params;
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [tab, setTab] = useState<TabId>('tabela');
  const [hideScorers, setHideScorers] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadCompetitions()
        .then((list) => {
          if (!alive) return;
          const found = list.find((item) => item.id === id);
          if (!found) navigation.replace('Home');
          else setCompetition(found);
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [id, navigation]),
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadScorers(id)
        .then((data) => {
          if (!alive) return;
          const empty = !(data.gols && data.gols.length) && !(data.assistencias && data.assistencias.length);
          setHideScorers(empty);
          if (empty) setTab((current) => (current === 'artilheiros' ? 'tabela' : current));
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [id]),
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setError(null);
      setPayload(null);
      const run = async () => {
        try {
          let next: Payload;
          if (tab === 'tabela') next = { kind: 'tabela', data: await loadStandings(id) };
          else if (tab === 'artilheiros') next = { kind: 'artilheiros', data: await loadScorers(id) };
          else {
            const matches = await loadMatches(id);
            next = tab === 'resultados'
              ? { kind: 'resultados', data: matches.resultados }
              : { kind: 'proximos', data: matches.proximos };
          }
          if (!alive) return;
          if (next.kind === 'artilheiros') {
            const empty = !next.data.gols.length && !next.data.assistencias.length;
            if (empty) {
              setHideScorers(true);
              setTab('tabela');
              return;
            }
          }
          setPayload(next);
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
    }, [id, tab, attempt]),
  );

  const styles = useCompetitionStyles();
  const visibleTabs = TABS.filter((item) => item.id !== 'artilheiros' || !hideScorers);
  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  return (
    <Screen
      title={competition?.nome || 'Futebol'}
      onBack={back}
      testID="competition-screen"
      tabs={
        <View style={styles.tabs}>
          {visibleTabs.map((item) => {
            const active = item.id === tab;
            return (
              <Pressable key={item.id} style={styles.tab} onPress={() => setTab(item.id)} accessibilityRole="tab">
                <Text style={[styles.tabText, active && styles.tabTextOn]} numberOfLines={2}>
                  {item.label}
                </Text>
                <View style={[styles.underline, active && styles.underlineOn]} />
              </Pressable>
            );
          })}
        </View>
      }
    >
      {loading && !payload ? <Message text="Carregando…" /> : null}
      {error && !payload ? (
        <Message
          tone="error"
          text="Não foi possível carregar os dados."
          detail={error}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : null}
      {payload ? (
        <Content>
          {payload.kind === 'tabela' ? <Standings data={payload.data} leagueId={id} /> : null}
          {payload.kind === 'resultados' ? (
            payload.data.length ? (
              <View testID="results">
                <MatchList matches={payload.data} leagueId={id} />
              </View>
            ) : (
              <Message text="Nenhum resultado nos últimos 2 meses." />
            )
          ) : null}
          {payload.kind === 'proximos' ? (
            payload.data.length ? (
              <View testID="fixtures">
                <MatchList matches={payload.data} leagueId={id} />
              </View>
            ) : (
              <Message text="Nenhum jogo marcado nos próximos 2 meses." />
            )
          ) : null}
          {payload.kind === 'artilheiros' ? <Scorers data={payload.data} /> : null}
        </Content>
      ) : null}
    </Screen>
  );
}

function useCompetitionStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.tabBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.tabBorder,
    },
    tab: { flex: 1, alignItems: 'center', paddingTop: 10, paddingHorizontal: 2 },
    tabText: { textAlign: 'center', color: colors.muted, fontWeight: '600', fontSize: 12, lineHeight: 16, minHeight: 32 },
    tabTextOn: { color: colors.link },
    underline: { height: 3, alignSelf: 'stretch', marginTop: 6, backgroundColor: 'transparent' },
    underlineOn: { backgroundColor: colors.link },
  });
}
