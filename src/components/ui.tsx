import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { sectionTitleStyle, useTheme, type Palette } from '../theme';

const PULL_TRIGGER_PX = 64;

type ScreenProps = {
  title: string;
  onBack?: () => void;
  tabs?: ReactNode;
  children: ReactNode;
  testID?: string;
};

export function Screen({ title, onBack, tabs, children, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const styles = useUiStyles();
  return (
    <View style={styles.root} testID={testID}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={10}
              style={styles.backHit}
            >
              <Text style={styles.back}>‹</Text>
            </Pressable>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      {tabs}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function Content({
  children,
  refreshing = false,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const styles = useUiStyles();
  const { colors } = useTheme();
  const scrollRef = useRef<HTMLElement | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const refreshingRef = useRef(refreshing);
  const [pulling, setPulling] = useState<'idle' | 'ready' | 'armed'>('idle');
  onRefreshRef.current = onRefresh;
  refreshingRef.current = refreshing;
  const webPull = Platform.OS === 'web' && !!onRefresh;

  useEffect(() => {
    if (!webPull) return undefined;
    const node = scrollRef.current;
    if (!node?.addEventListener) return undefined;
    return attachWebPull(node, {
      isRefreshing: () => refreshingRef.current,
      onRefresh: () => onRefreshRef.current?.(),
      onPullChange: (distance) => {
        const next = distance >= PULL_TRIGGER_PX ? 'armed' : distance > 12 ? 'ready' : 'idle';
        setPulling((current) => (current === next ? current : next));
      },
    });
  }, [webPull]);

  const showPullHint = webPull && (refreshing || pulling !== 'idle');

  return (
    <ScrollView
      ref={(node) => {
        scrollRef.current = node as unknown as HTMLElement | null;
      }}
      style={[styles.scroll, webPull ? ({ overscrollBehaviorY: 'contain' } as ViewStyle) : null]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={
        onRefresh && Platform.OS !== 'web' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.link}
            colors={[colors.link]}
            progressBackgroundColor={colors.card}
          />
        ) : undefined
      }
    >
      {showPullHint ? (
        <Text style={styles.pullHint} accessibilityLiveRegion={refreshing ? 'polite' : 'none'}>
          {refreshing || pulling === 'armed' ? 'Atualizando…' : 'Puxe para atualizar'}
        </Text>
      ) : null}
      {children}
      <Text style={styles.footer}>Dados: ESPN (API pública). Horários de Brasília.</Text>
    </ScrollView>
  );
}

function attachWebPull(
  node: HTMLElement,
  handlers: {
    isRefreshing: () => boolean;
    onRefresh: () => void;
    onPullChange: (distance: number) => void;
  },
): () => void {
  let pointerId: number | null = null;
  let startY = 0;
  let distance = 0;

  const finish = (event: PointerEvent) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    pointerId = null;
    const triggered = distance >= PULL_TRIGGER_PX && !handlers.isRefreshing();
    distance = 0;
    handlers.onPullChange(0);
    if (triggered) handlers.onRefresh();
  };

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (handlers.isRefreshing() || node.scrollTop > 1) return;
    pointerId = event.pointerId;
    startY = event.clientY;
    distance = 0;
  };

  const onMove = (event: PointerEvent) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    if (node.scrollTop > 1) {
      distance = 0;
      handlers.onPullChange(0);
      return;
    }
    const dy = event.clientY - startY;
    if (dy <= 0) {
      if (distance !== 0) {
        distance = 0;
        handlers.onPullChange(0);
      }
      return;
    }
    distance = Math.min(dy, 96);
    handlers.onPullChange(distance);
    if (dy > 8 && event.cancelable) event.preventDefault();
  };

  node.addEventListener('pointerdown', onDown, true);
  node.addEventListener('pointermove', onMove, { capture: true, passive: false });
  node.addEventListener('pointerup', finish, true);
  node.addEventListener('pointercancel', finish, true);
  return () => {
    node.removeEventListener('pointerdown', onDown, true);
    node.removeEventListener('pointermove', onMove, true);
    node.removeEventListener('pointerup', finish, true);
    node.removeEventListener('pointercancel', finish, true);
  };
}

export function QuietNote({
  text,
  tone = 'muted',
  live = false,
  testID,
}: {
  text: string;
  tone?: 'muted' | 'warning';
  live?: boolean;
  testID?: string;
}) {
  const styles = useUiStyles();
  return (
    <Text
      testID={testID}
      accessibilityLiveRegion={live ? 'polite' : 'none'}
      style={[styles.quiet, tone === 'warning' && styles.quietWarn]}
    >
      {text}
    </Text>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  const style = useMemo(() => sectionTitleStyle(colors), [colors]);
  return <Text style={style}>{children}</Text>;
}

export function Message({
  text,
  detail,
  onRetry,
  tone = 'muted',
}: {
  text: string;
  detail?: string;
  onRetry?: () => void;
  tone?: 'muted' | 'error';
}) {
  const styles = useUiStyles();
  return (
    <View style={styles.message}>
      <Text style={[styles.messageText, tone === 'error' && styles.error]}>{text}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryText}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function useUiStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      backgroundColor: colors.header,
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
    backHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    back: { color: colors.onButton, fontSize: 34, lineHeight: 34, marginTop: -4 },
    title: { flex: 1, color: colors.onButton, fontSize: 20, fontWeight: '700' },
    body: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: 12 },
    pullHint: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      paddingBottom: 8,
    },
    quiet: {
      textAlign: 'center',
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22,
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 8,
      fontVariant: ['tabular-nums'],
    },
    quietWarn: { color: colors.warning, fontWeight: '600' },
    footer: { textAlign: 'center', color: colors.muted, fontSize: 12, paddingTop: 8, paddingBottom: 8 },
    message: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 28 },
    messageText: { color: colors.muted, textAlign: 'center', fontSize: 16 },
    error: { color: colors.error },
    detail: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 6 },
    retry: {
      marginTop: 16,
      backgroundColor: colors.button,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    retryText: { color: colors.onButton, fontWeight: '700', fontSize: 16 },
  });
}
