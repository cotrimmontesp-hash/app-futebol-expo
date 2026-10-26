import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Remote push on a native build needs Firebase/FCM (Android) and APNs (iOS).
 * Those credentials are not in this repo and must not be invented.
 * The current Render API only stores Web Push subscriptions, so an Expo token
 * is never posted to /api/push/registrar.
 */
export const NATIVE_PUSH_ENABLED = process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED === 'true';

export type NativePushResult =
  | { status: 'unsupported' }
  | { status: 'disabled'; message: string }
  | { status: 'missing-credentials'; message: string }
  | { status: 'ready'; token: string };

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  return (fromExtra || fromEas || '').trim() || undefined;
}

export async function prepareNativePush(): Promise<NativePushResult> {
  if (Platform.OS === 'web') return { status: 'unsupported' };
  if (!NATIVE_PUSH_ENABLED) {
    return {
      status: 'disabled',
      message:
        'Notificações nativas estão desligadas. Faltam credenciais Firebase/FCM e APNs, e EXPO_PUBLIC_NATIVE_PUSH_ENABLED não é true.',
    };
  }
  const projectId = easProjectId();
  if (!projectId) {
    return {
      status: 'missing-credentials',
      message: 'Falta o projectId do EAS e o arquivo do Firebase. Nenhum token foi inventado.',
    };
  }
  try {
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) {
      return { status: 'missing-credentials', message: 'A permissão de notificação foi negada.' };
    }
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'ready', token: token.data };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'falha ao pedir o token';
    return {
      status: 'missing-credentials',
      message: `Não foi possível obter o token Expo (${detail}). Confira google-services.json e a chave FCM no EAS.`,
    };
  }
}
