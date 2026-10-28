import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { errorMessage, loadCompetitions, loadMatches } from '../api';
import { MatchList } from '../components/MatchList';
import { PushBar } from '../components/PushBar';
import { Content, Message, QuietNote, Screen, SectionTitle } from '../components/ui';
import { useFavorites } from '../favorites';
import type { RootStackParamList } from '../navigation';
import { STALE_DATA_NOTE } from '../refresh';
import type { Match } from '../types';

type Bundle = {
  id: string;
  nome: string;
  resultados: Match[];
  proximos: Match[];
};

export default function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { names, ready, isFav, migrate } = useFavorites();
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const bundlesRef = useRef<Bundle[] | null>(null);
  const loadRef = useRef<(mode: 'open' | 'manual') => void>(() => setRefreshing(false));

  useFocusEffect(
    useCallback(() => {
      if (!ready || names.size === 0) return undefined;
      let alive = true;
      let inFlight = false;
      let follow = false;

      const run = async (mode: 'open' | 'manual') => {
        if (!alive) return;
        if (inFlight) {
          if (mode === 'manual') follow = true;
          return;
        }
        inFlight = true;
        const keep = bundlesRef.current != null;
        if (!keep) {
          setLoading(true);
          setError(null);
        }
        try {
          const competitions = await loadCompetitions();
          const lists = await Promise.all(
            competitions.map(async (competition) => {
              try {
                return { competition, data: await loadMatches(competition.id) };
              } catch {
                return { competition, data: null };
              }
            }),
          );
          if (!alive) return;
          if (lists.every((item) => !item.data)) throw new Error('Não foi possível carregar os jogos');
          migrate(
            lists.flatMap((item) =>
              item.data ? [...item.data.resultados, ...item.data.proximos].flatMap((match) => [match.casa, match.fora]) : [],
            ),
          );
          const next = lists.flatMap((item) =>
            item.data
              ? [{ id: item.competition.id, nome: item.competition.nome, resultados: item.data.resultados, proximos: item.data.proximos }]
              : [],
          );
          bundlesRef.current = next;
          setBundles(next);
          setError(null);
          setStale(false);
        } catch (cause) {
          if (!alive) return;
          if (!keep) {
            setError(errorMessage(cause));
            setStale(false);
          } else {
            setStale(true);
          }
        } finally {
          inFlight = false;
          if (!alive) return;
          if (!keep) setLoading(false);
          if (follow) {
            follow = false;
            void run('manual');
            return;
          }
          setRefreshing((current) => (current ? false : current));
        }
      };

      loadRef.current = (mode) => {
        void run(mode);
      };
      if (!bundlesRef.current) {
        setLoading(true);
        setError(null);
      }
      void run('open');
      return () => {
        alive = false;
        loadRef.current = () => setRefreshing(false);
        setRefreshing(false);
      };
    }, [ready, names.size, attempt, migrate]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRef.current('manual');
  }, []);

  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  const favorite = (match: Match) => isFav(match.casa) || isFav(match.fora);
  const results: Match[] = [];
  const upcoming: Match[] = [];
  for (const bundle of bundles || []) {
    for (const match of bundle.resultados) {
      if (favorite(match)) results.push({ ...match, competicao: bundle.nome, liga: bundle.id });
    }
    for (const match of bundle.proximos) {
      if (favorite(match)) upcoming.push({ ...match, competicao: bundle.nome, liga: bundle.id });
    }
  }
  results.sort((a, b) => b.data.localeCompare(a.data));
  upcoming.sort((a, b) => a.data.localeCompare(b.data));

  return (
    <Screen title="Favoritos" onBack={back} testID="favorites-screen">
      <Content refreshing={refreshing} onRefresh={names.size > 0 ? onRefresh : undefined}>
        <PushBar />
        {stale ? <QuietNote testID="favorites-stale" tone="warning" live text={STALE_DATA_NOTE} /> : null}
        {names.size === 0 ? (
          <Message text="Nenhum time favorito ainda. Toque na estrela ao lado de um time na tabela ou nos jogos." />
        ) : null}
        {names.size > 0 && loading && !bundles ? <Message text="Carregando…" /> : null}
        {names.size > 0 && error && !bundles ? (
          <Message
            tone="error"
            text="Não foi possível carregar os dados."
            detail={error}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        ) : null}
        {names.size > 0 && bundles && !results.length && !upcoming.length ? (
          <Message text="Nenhum jogo dos seus times nos últimos e próximos 2 meses." />
        ) : null}
        {names.size > 0 && (results.length || upcoming.length) ? (
          <>
            <SectionTitle>Resultados</SectionTitle>
            {results.length ? <MatchList matches={results} /> : <Message text="Nenhum resultado nos últimos 2 meses." />}
            <SectionTitle>Próximos jogos</SectionTitle>
            {upcoming.length ? (
              <MatchList matches={upcoming} />
            ) : (
              <Message text="Nenhum jogo marcado nos próximos 2 meses." />
            )}
          </>
        ) : null}
      </Content>
    </Screen>
  );
}
