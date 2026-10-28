import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FavoritesProvider } from './src/favorites';
import { linking, type RootStackParamList } from './src/navigation';
import { registerServiceWorker } from './src/push/web';
import CompetitionScreen from './src/screens/CompetitionScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import HomeScreen from './src/screens/HomeScreen';
import MatchScreen from './src/screens/MatchScreen';
import TeamScreen from './src/screens/TeamScreen';
import TodayScreen from './src/screens/TodayScreen';
import { applyWebDocument, useTheme } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { scheme, colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web') void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') applyWebDocument(scheme, colors);
  }, [scheme, colors]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.card,
        text: colors.text,
        border: colors.line,
        primary: colors.link,
        notification: colors.live,
      },
    };
  }, [scheme, colors]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <NavigationContainer theme={navigationTheme} linking={linking}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Today" component={TodayScreen} />
              <Stack.Screen name="Favorites" component={FavoritesScreen} />
              <Stack.Screen name="Competition" component={CompetitionScreen} />
              <Stack.Screen name="Match" component={MatchScreen} />
              <Stack.Screen name="Team" component={TeamScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
