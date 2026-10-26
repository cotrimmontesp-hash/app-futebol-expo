import { Platform } from 'react-native';

import { api, apiOrigin, loadPushStatus } from '../api';

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

type BrowserSubscription = {
  endpoint: string;
  unsubscribe: () => Promise<boolean>;
  toJSON: () => PushSubscriptionJson;
};

type PushManagerLike = {
  getSubscription: () => Promise<BrowserSubscription | null>;
  subscribe: (options: { userVisibleOnly: boolean; applicationServerKey: BufferSource }) => Promise<BrowserSubscription>;
};

type RegistrationLike = {
  pushManager: PushManagerLike;
};

function browserSupportsPush(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker(): Promise<void> {
  if (!browserSupportsPush()) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // navegador sem push ou arquivo fora do ar
  }
}

function urlBase64ToBytes(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) out[index] = raw.charCodeAt(index);
  return out;
}

async function readyRegistration(): Promise<RegistrationLike | null> {
  if (!browserSupportsPush()) return null;
  try {
    await navigator.serviceWorker.register('/sw.js');
    return (await navigator.serviceWorker.ready) as unknown as RegistrationLike;
  } catch {
    return null;
  }
}

export async function webPushAvailable(): Promise<boolean> {
  if (!browserSupportsPush()) return false;
  try {
    const status = await loadPushStatus();
    return !!(status.ativo && status.chavePublica);
  } catch {
    return false;
  }
}

export async function isWebPushSubscribed(): Promise<boolean> {
  const registration = await readyRegistration();
  if (!registration || Notification.permission !== 'granted') return false;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

export async function syncWebPush(favorites: string[]): Promise<void> {
  if (!browserSupportsPush() || Notification.permission !== 'granted') return;
  try {
    const status = await loadPushStatus();
    if (!status.ativo) return;
    const registration = await readyRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await api('push/registrar', {
      method: 'POST',
      body: JSON.stringify({ inscricao: subscription.toJSON(), favoritos: favorites }),
    });
  } catch {
    // sem rede ou push indisponível
  }
}

export async function enableWebPush(favorites: string[]): Promise<string | 'ok'> {
  const registration = await readyRegistration();
  if (!registration) return 'Não foi possível ativar as notificações neste navegador.';
  try {
    const status = await loadPushStatus(true);
    if (!status.ativo || !status.chavePublica) return 'Notificações indisponíveis.';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'O navegador bloqueou as notificações.';
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(status.chavePublica) as BufferSource,
      });
    }
    await api('push/registrar', {
      method: 'POST',
      body: JSON.stringify({ inscricao: subscription.toJSON(), favoritos: favorites }),
    });
    return 'ok';
  } catch {
    return 'Não foi possível ativar as notificações neste navegador.';
  }
}

export async function disableWebPush(): Promise<void> {
  const registration = await readyRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;
  if (subscription) await subscription.unsubscribe();
  if (!endpoint) return;
  await fetch(`${apiOrigin()}/api/push/remover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}
