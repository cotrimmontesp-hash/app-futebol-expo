import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { lastName, type PitchPoint } from '../pitch';
import { useTheme, type Palette } from '../theme';

export function Pitch({ points }: { points: PitchPoint[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mark = colors.pitchMark;
  return (
    <View style={styles.pitch} testID="pitch">
      <LinearGradient colors={[colors.pitchTop, colors.pitchBottom]} style={StyleSheet.absoluteFill} />
      <Svg viewBox="0 0 68 105" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Rect x="3" y="3" width="62" height="99" fill="none" stroke={mark} strokeWidth="0.6" />
        <Line x1="3" y1="52.5" x2="65" y2="52.5" stroke={mark} strokeWidth="0.6" />
        <Circle cx="34" cy="52.5" r="9.15" fill="none" stroke={mark} strokeWidth="0.5" />
        <Circle cx="34" cy="52.5" r="0.7" fill={mark} />
        <Rect x="13.84" y="3" width="40.32" height="16.5" fill="none" stroke={mark} strokeWidth="0.5" />
        <Rect x="13.84" y="85.5" width="40.32" height="16.5" fill="none" stroke={mark} strokeWidth="0.5" />
        <Rect x="24.84" y="3" width="18.32" height="5.5" fill="none" stroke={mark} strokeWidth="0.5" />
        <Rect x="24.84" y="96.5" width="18.32" height="5.5" fill="none" stroke={mark} strokeWidth="0.5" />
        <Circle cx="34" cy="14" r="0.55" fill={mark} />
        <Circle cx="34" cy="91" r="0.55" fill={mark} />
      </Svg>
      {points.map((player) => (
        <View
          key={`${player.lado}-${player.lugar}-${player.camisa}-${player.nome}`}
          style={[styles.player, { left: `${player.x}%`, top: `${player.y}%` }]}
          pointerEvents="none"
        >
          <View style={[styles.circle, player.lado === 'baixo' && styles.circleAway]}>
            <Text style={[styles.number, player.lado === 'baixo' && styles.numberAway]}>{player.camisa}</Text>
          </View>
          {player.saiu ? <Text style={styles.out}>saiu</Text> : null}
          <Text numberOfLines={1} style={styles.surname}>
            {lastName(player.nome)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    pitch: {
      width: '100%',
      aspectRatio: 68 / 105,
      borderRadius: 12,
      overflow: 'hidden',
      marginVertical: 4,
    },
    player: {
      position: 'absolute',
      width: 56,
      height: 24,
      marginLeft: -28,
      marginTop: -12,
      alignItems: 'center',
    },
    circle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.shirtHomeBg,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.35,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
    circleAway: { backgroundColor: colors.away },
    number: {
      color: colors.shirtHome,
      fontWeight: '800',
      fontSize: 12,
      lineHeight: 14,
      includeFontPadding: false,
    },
    numberAway: { color: colors.shirtAway },
    surname: {
      position: 'absolute',
      top: 24,
      left: 0,
      width: 56,
      color: colors.pitchName,
      fontSize: 12,
      lineHeight: 13,
      fontWeight: '700',
      textAlign: 'center',
      includeFontPadding: false,
      textShadowColor: 'rgba(0,0,0,0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    out: {
      position: 'absolute',
      top: -13,
      left: 0,
      width: 56,
      color: colors.pitchOut,
      fontSize: 12,
      lineHeight: 13,
      fontWeight: '700',
      textAlign: 'center',
      includeFontPadding: false,
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });
}
