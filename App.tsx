import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
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
import TodayScreen from './src/screens/TodayScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg },
};

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') void registerServiceWorker();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <NavigationContainer theme={theme} linking={linking}>
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
            </Stack.Navigator>
          </NavigationContainer>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
