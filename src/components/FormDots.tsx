import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import type { ResultMark } from '../teamResults';

const LABEL: Record<ResultMark, string> = {
  V: 'Vitória',
  E: 'Empate',
  D: 'Derrota',
};

const FILL: Record<ResultMark, string> = {
  V: colors.green,
  E: '#555555',
  D: colors.error,
};

export function FormDots({ marks }: { marks: ResultMark[] }) {
  if (!marks.length) return null;
  return (
    <View style={styles.row} testID="recent-form">
      {marks.map((mark, index) => (
        <View
          key={`${index}-${mark}`}
          accessible
          accessibilityRole="image"
          accessibilityLabel={LABEL[mark]}
          style={[styles.dot, { backgroundColor: FILL[mark] }]}
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
});
