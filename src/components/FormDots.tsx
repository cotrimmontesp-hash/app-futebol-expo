import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type Palette } from '../theme';
import type { ResultMark } from '../teamResults';

const LABEL: Record<ResultMark, string> = {
  V: 'Vitória',
  E: 'Empate',
  D: 'Derrota',
};

export const FORM_DOT = 18;
export const FORM_DOT_LATEST = 22;
export const FORM_GAP = 3;

export function FormDots({ marks }: { marks: ResultMark[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fill: Record<ResultMark, string> = {
    V: colors.formV,
    E: colors.formE,
    D: colors.formD,
  };
  if (!marks.length) return null;
  const latest = marks.length - 1;
  return (
    <View style={styles.row} testID="recent-form">
      {marks.map((mark, index) => (
        <View
          key={`${index}-${mark}`}
          accessible
          accessibilityRole="image"
          accessibilityLabel={LABEL[mark]}
          style={[styles.dot, index === latest && styles.dotLatest, { backgroundColor: fill[mark] }]}
          testID={`form-dot-${mark}`}
        >
          <Text
            style={styles.letter}
            aria-hidden
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {mark}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: FORM_GAP },
    dot: {
      width: FORM_DOT,
      height: FORM_DOT,
      borderRadius: FORM_DOT / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotLatest: {
      width: FORM_DOT_LATEST,
      height: FORM_DOT_LATEST,
      borderRadius: FORM_DOT_LATEST / 2,
    },
    letter: {
      color: colors.formLetter,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 14,
      textAlign: 'center',
      includeFontPadding: false,
    },
  });
}
