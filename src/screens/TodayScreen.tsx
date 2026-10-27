import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { errorMessage, loadToday } from '../api';
import { MatchList } from '../components/MatchList';
import { Content, Message, Screen, SectionTitle } from '../components/ui';
import { useFavorites } from '../favorites';
import type { RootStackParamList } from '../navigation';
import type { Match, TodayResponse } from '../types';
import { View } from 'react-native';

function sortToday(list: Match[], isFav: (team: Match['casa']) => boolean): Match[] {
  return [...list].sort((a, b) => {
    const favA = isFav(a.casa) || isFav(a.fora) ? 0 : 1;
    const favB = isFav(b.casa) || isFav(b.fora) ? 0 : 1;
    if (favA !== favB) return favA - favB;
    return String(a.data).localeCompare(String(b.data));
  });
}

export default function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isFav, migrate } = useFavorites();
  const [data, setData] = useState<TodayResponse | null>(null);
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
          const next = await loadToday();
          if (!alive) return;
          setData(next);
          setError(null);
          migrate(next.jogos.flatMap((match) => [match.casa, match.fora]));
          clear();
          const live = next.jogos.some((match) => match.estado === 'in');
          timer = setInterval(() => {
            void load(true);
          }, live ? 30_000 : 5 * 60_000);
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
    }, [attempt, migrate]),
  );

  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };
  const games = data?.jogos || [];
  const live = sortToday(games.filter((match) => match.estado === 'in'), isFav);
  const upcoming = sortToday(games.filter((match) => match.estado === 'pre'), isFav);
  const finished = sortToday(games.filter((match) => match.estado === 'post'), isFav);
  const empty = !!data && !live.length && !upcoming.length && !finished.length;

  return (
    <Screen title="Hoje" onBack={back} testID="today-screen">
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
          {empty ? <Message text="Nenhum jogo hoje." /> : null}
          {live.length ? (
            <View testID="live-now">
              <SectionTitle>Ao vivo agora</SectionTitle>
              <MatchList matches={live} hideDay />
            </View>
          ) : null}
          {upcoming.length ? (
            <View>
              <SectionTitle>Hoje</SectionTitle>
              <MatchList matches={upcoming} hideDay />
            </View>
          ) : null}
          {finished.length ? (
            <View>
              <SectionTitle>Encerrados hoje</SectionTitle>
              <MatchList matches={finished} hideDay />
            </View>
          ) : null}
        </Content>
      ) : null}
    </Screen>
  );
}
