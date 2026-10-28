import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { errorMessage, loadCompetitions } from '../api';
import { useFavorites } from '../favorites';
import type { RootStackParamList } from '../navigation';
import { useTheme, type Palette, type Scheme } from '../theme';
import type { Competition } from '../types';
import { Content, Message, Screen, SectionTitle } from '../components/ui';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { names } = useFavorites();
  const [list, setList] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setError(null);
      loadCompetitions(attempt > 0)
        .then((competitions) => {
          if (alive) setList(competitions);
        })
        .catch((cause) => {
          if (alive) setError(errorMessage(cause));
        });
      return () => {
        alive = false;
      };
    }, [attempt]),
  );

  const styles = useHomeStyles();
  const count = names.size;
  const summary = count === 0 ? 'Nenhum time marcado' : count === 1 ? [...names][0] : `${count} times`;
  const leagues = (list || []).filter((item) => item.tipo === 'liga');
  const cups = (list || []).filter((item) => item.tipo === 'copa');

  return (
    <Screen title="⚽ Futebol" testID="home-screen">
      {!list && !error ? <Message text="Carregando…" /> : null}
      {error ? (
        <Message
          tone="error"
          text="Não foi possível carregar os dados."
          detail={error}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      ) : null}
      {list ? (
        <Content>
          <Pressable
            style={styles.highlight}
            onPress={() => navigation.navigate('Today')}
            accessibilityRole="button"
          >
            <Text style={styles.highlightTitle}>Hoje</Text>
            <Text style={styles.highlightSub}>Placares ao vivo e jogos de hoje</Text>
          </Pressable>
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('MyTeams')}
            accessibilityRole="button"
            testID="my-teams-entry"
          >
            <Text style={styles.cardTitle}>Meus times</Text>
            <Text style={styles.cardSub}>
              {count === 0 ? 'Favorite um time para vê-lo aqui' : 'Próximos jogos e últimos resultados'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Favorites')}
            accessibilityRole="button"
          >
            <Text style={styles.cardTitle}>★ Favoritos</Text>
            <Text style={styles.cardSub}>{summary}</Text>
          </Pressable>
          <Group title="Ligas nacionais" items={leagues} onOpen={(id) => navigation.navigate('Competition', { id })} />
          <Group title="Copas" items={cups} onOpen={(id) => navigation.navigate('Competition', { id })} />
        </Content>
      ) : null}
    </Screen>
  );
}

function Group({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: Competition[];
  onOpen: (id: string) => void;
}) {
  const styles = useHomeStyles();
  if (!items.length) return null;
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      {items.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => onOpen(item.id)} accessibilityRole="button">
          <Text style={styles.cardTitle}>{item.nome}</Text>
          <Text style={styles.cardSub}>{item.pais}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function useHomeStyles() {
  const { colors, scheme } = useTheme();
  return useMemo(() => createStyles(colors, scheme), [colors, scheme]);
}

function createStyles(colors: Palette, scheme: Scheme) {
  return StyleSheet.create({
    highlight: {
      backgroundColor: colors.header,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
    },
    highlightTitle: { color: colors.onButton, fontSize: 17, fontWeight: '700' },
    highlightSub: { color: colors.highlight, fontSize: 14, marginTop: 2 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
      borderWidth: scheme === 'dark' ? 1 : 0,
      borderColor: colors.line,
    },
    cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    cardSub: { color: colors.muted, fontSize: 14, marginTop: 2 },
  });
}
