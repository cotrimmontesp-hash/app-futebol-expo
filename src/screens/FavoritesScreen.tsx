import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { errorMessage, loadCompetitions, loadMatches } from '../api';
import { MatchList } from '../components/MatchList';
import { PushBar } from '../components/PushBar';
import { Content, Message, Screen, SectionTitle } from '../components/ui';
import { useFavorites } from '../favorites';
import type { RootStackParamList } from '../navigation';
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
          setBundles(
            lists.flatMap((item) =>
              item.data
                ? [{ id: item.competition.id, nome: item.competition.nome, resultados: item.data.resultados, proximos: item.data.proximos }]
                : [],
            ),
          );
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
      <Content>
        <PushBar />
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
