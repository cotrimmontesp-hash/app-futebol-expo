import { useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

export type Scheme = 'light' | 'dark';

export type Palette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  link: string;
  header: string;
  highlight: string;
  warning: string;
  error: string;
  live: string;
  star: string;
  starOff: string;
  line: string;
  tabBg: string;
  tabBorder: string;
  divider: string;
  scrollbar: string;
  pitchTop: string;
  pitchBottom: string;
  pitchMark: string;
  pitchName: string;
  pitchOut: string;
  away: string;
  shirtHome: string;
  shirtHomeBg: string;
  shirtAway: string;
  formV: string;
  formE: string;
  formD: string;
  formLetter: string;
  badgeVBg: string;
  badgeVText: string;
  badgeEBg: string;
  badgeEText: string;
  badgeDBg: string;
  badgeDText: string;
  button: string;
  onButton: string;
  buttonOffBg: string;
  buttonOffBorder: string;
  buttonOffText: string;
  yellow: string;
  redCard: string;
  varBlue: string;
  miss: string;
  out: string;
  crestPlate: string;
  shadow: string;
};

export const light: Palette = {
  bg: '#f2f4f3',
  card: '#ffffff',
  text: '#1b1f1d',
  muted: '#5c6661',
  link: '#0b6e3d',
  header: '#0b6e3d',
  highlight: '#d5efe4',
  warning: '#8a5a00',
  error: '#b42318',
  live: '#c62828',
  star: '#a37b0a',
  starOff: '#767f7a',
  line: '#e4eae7',
  tabBg: '#ffffff',
  tabBorder: '#dde2df',
  divider: '#d5dbd8',
  scrollbar: '#c5cdc8',
  pitchTop: '#167a3a',
  pitchBottom: '#146b34',
  pitchMark: '#ffffff',
  pitchName: '#ffffff',
  pitchOut: '#ffe8e3',
  away: '#08301c',
  shirtHome: '#0b3d22',
  shirtHomeBg: '#ffffff',
  shirtAway: '#ffffff',
  formV: '#0b6e3d',
  formE: '#5c6560',
  formD: '#b42318',
  formLetter: '#ffffff',
  badgeVBg: '#e5f4ec',
  badgeVText: '#0b6e3d',
  badgeEBg: '#f4f1e4',
  badgeEText: '#6b5a20',
  badgeDBg: '#fdecea',
  badgeDText: '#b42318',
  button: '#0b6e3d',
  onButton: '#ffffff',
  buttonOffBg: '#ffffff',
  buttonOffBorder: '#c5d5cc',
  buttonOffText: '#0b6e3d',
  yellow: '#f5c518',
  redCard: '#d21f1f',
  varBlue: '#1d4e89',
  miss: '#9a3412',
  out: '#b42318',
  crestPlate: '#eef3f0',
  shadow: '#000000',
};

export const dark: Palette = {
  bg: '#0c1210',
  card: '#171f1c',
  text: '#f3f6f4',
  muted: '#b7c4bc',
  link: '#7dcea0',
  header: '#0b6e3d',
  highlight: '#d5efe4',
  warning: '#ffd27a',
  error: '#ffb4ab',
  live: '#ff8a80',
  star: '#f0c14a',
  starOff: '#9aada5',
  line: '#31443c',
  tabBg: '#171f1c',
  tabBorder: '#31443c',
  divider: '#31443c',
  scrollbar: '#4a5c54',
  pitchTop: '#167a3a',
  pitchBottom: '#146b34',
  pitchMark: '#ffffff',
  pitchName: '#ffffff',
  pitchOut: '#ffe8e3',
  away: '#08301c',
  shirtHome: '#0b3d22',
  shirtHomeBg: '#ffffff',
  shirtAway: '#ffffff',
  formV: '#188246',
  formE: '#6e7873',
  formD: '#d32f2f',
  formLetter: '#ffffff',
  badgeVBg: '#143528',
  badgeVText: '#8fd9ae',
  badgeEBg: '#3a3218',
  badgeEText: '#f6c445',
  badgeDBg: '#3a1c1c',
  badgeDText: '#ffb4ab',
  button: '#0b6e3d',
  onButton: '#ffffff',
  buttonOffBg: '#171f1c',
  buttonOffBorder: '#7dcea0',
  buttonOffText: '#7dcea0',
  yellow: '#f5c518',
  redCard: '#e53935',
  varBlue: '#9ec5ff',
  miss: '#ffb089',
  out: '#ffb4ab',
  crestPlate: '#eef3f0',
  shadow: '#000000',
};

export function paletteFor(scheme: Scheme | null | undefined): Palette {
  return scheme === 'dark' ? dark : light;
}

export function useTheme(): { scheme: Scheme; colors: Palette } {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: paletteFor(scheme) };
}

export function cardStyle(colors: Palette, scheme: Scheme): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: scheme === 'dark' ? 1 : 0,
    borderColor: colors.line,
    shadowColor: colors.shadow,
    shadowOpacity: scheme === 'dark' ? 0 : 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: scheme === 'dark' ? 0 : 1,
  };
}

export function sectionTitleStyle(colors: Palette): TextStyle {
  return {
    marginTop: 16,
    marginBottom: 6,
    marginHorizontal: 4,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
  };
}

export function cardFade(colors: Palette): [string, string] {
  const hex = colors.card.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [`rgba(${r},${g},${b},0)`, colors.card];
}

export function applyWebDocument(scheme: Scheme, colors: Palette): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.backgroundColor = colors.bg;
  document.documentElement.style.colorScheme = scheme;
  if (document.body) document.body.style.backgroundColor = colors.bg;
  const mount = document.getElementById('root');
  if (mount) mount.style.backgroundColor = colors.bg;
  const metas = document.head.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', colors.header);
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((node) => node.setAttribute('content', colors.header));
}

export function installWebSchemeSync(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const apply = () => {
    const scheme: Scheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyWebDocument(scheme, paletteFor(scheme));
  };
  apply();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', apply);
}
