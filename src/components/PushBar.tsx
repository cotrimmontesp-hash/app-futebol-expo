import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useFavorites } from '../favorites';
import { NATIVE_PUSH_ENABLED, prepareNativePush } from '../push/native';
import { disableWebPush, enableWebPush, isWebPushSubscribed, webPushAvailable } from '../push/web';
import { colors } from '../theme';

const NATIVE_NOTE =
  'Notificações no aplicativo instalado ainda não funcionam. Faltam as credenciais Firebase/FCM (Android) e APNs (iOS). O servidor atual só aceita Web Push.';

export function PushBar() {
  const { names } = useFavorites();
  const [mode, setMode] = useState<'hidden' | 'off' | 'on' | 'native'>('hidden');
  const [note, setNote] = useState('Só avisamos jogos dos times com estrela.');

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setMode('native');
      setNote(NATIVE_NOTE);
      return;
    }
    const available = await webPushAvailable();
    if (!available) {
      setMode('hidden');
      return;
    }
    const subscribed = await isWebPushSubscribed();
    setMode(subscribed ? 'on' : 'off');
    setNote('Só avisamos jogos dos times com estrela.');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' || !NATIVE_PUSH_ENABLED) return undefined;
      let alive = true;
      prepareNativePush().then((result) => {
        if (!alive || result.status === 'unsupported') return;
        if (result.status === 'ready') {
          setNote('O aparelho gerou um token, mas o servidor atual não recebe token do Expo. Nada foi enviado.');
          return;
        }
        setNote(result.message);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  if (mode === 'hidden') return null;

  if (mode === 'native') {
    return (
      <Text style={styles.native} testID="push-native-note">
        {note}
      </Text>
    );
  }

  const on = mode === 'on';
  return (
    <View style={styles.wrap}>
      <Pressable
        testID="push-button"
        onPress={() => {
          void (async () => {
            if (on) await disableWebPush();
            else {
              const result = await enableWebPush([...names]);
              if (result !== 'ok') setNote(result);
            }
            await refresh();
          })();
        }}
        style={[styles.button, on && styles.buttonOff]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, on && styles.buttonTextOff]}>
          {on ? 'Desativar notificações' : 'Ativar notificações'}
        </Text>
      </Pressable>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  button: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#c5d5cc' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  buttonTextOff: { color: colors.green },
  note: { textAlign: 'center', color: colors.muted, marginTop: 6, fontSize: 12 },
  native: { color: colors.muted, textAlign: 'center', marginBottom: 12, fontSize: 13, lineHeight: 18 },
});
