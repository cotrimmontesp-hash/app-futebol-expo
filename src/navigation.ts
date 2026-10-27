import { type LinkingOptions } from '@react-navigation/native';
import { Platform } from 'react-native';

export type RootStackParamList = {
  Home: undefined;
  Today: undefined;
  Favorites: undefined;
  Competition: { id: string };
  Match: { liga: string; id: string };
};

function prefixes(): string[] {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return [window.location.origin];
  return ['appfutebol://'];
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: prefixes(),
  config: {
    screens: {
      Home: '',
      Today: 'hoje',
      Favorites: 'favoritos',
      Competition: 'competicao/:id',
      Match: 'jogo/:liga/:id',
    },
  },
};
