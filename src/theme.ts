import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  green: '#0b6e3d',
  greenDark: '#0b3d22',
  pitchTop: '#1f8f48',
  pitchBottom: '#146b34',
  bg: '#f2f4f3',
  text: '#1b1f1d',
  muted: '#6b7570',
  card: '#ffffff',
  line: '#eef0ef',
  star: '#d4a017',
  starOff: '#b7c0bb',
  live: '#c62828',
  error: '#b42318',
  white: '#ffffff',
  away: '#08301c',
  yellow: '#f5c518',
  redCard: '#d21f1f',
  varBlue: '#1d4e89',
  miss: '#9a3412',
  highlightText: '#d5efe4',
  out: '#b42318',
};

export const card: ViewStyle = {
  backgroundColor: colors.card,
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 12,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};

export const sectionTitle: TextStyle = {
  marginTop: 16,
  marginBottom: 6,
  marginHorizontal: 4,
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: colors.muted,
};

export const font = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});
