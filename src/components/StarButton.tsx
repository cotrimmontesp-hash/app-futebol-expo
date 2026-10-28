import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useFavorites } from '../favorites';
import { useTheme, type Palette } from '../theme';
import type { TeamRef } from '../types';

export function StarButton({ team }: { team: TeamRef }) {
  const { isFav, toggle } = useFavorites();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const on = isFav(team);
  const label = on ? `Remover ${team.time} dos favoritos` : `Marcar ${team.time} como favorito`;
  return (
    <Pressable
      onPress={() => toggle(team)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      hitSlop={8}
      style={styles.hit}
    >
      <Text style={[styles.glyph, on ? styles.on : styles.off]}>{on ? '★' : '☆'}</Text>
    </Pressable>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    hit: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    glyph: {
      fontSize: 20,
      lineHeight: 22,
    },
    on: { color: colors.star },
    off: { color: colors.starOff },
  });
}
