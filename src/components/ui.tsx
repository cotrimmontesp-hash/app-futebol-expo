import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { colors, sectionTitle } from '../theme';

type ScreenProps = {
  title: string;
  onBack?: () => void;
  tabs?: ReactNode;
  children: ReactNode;
  testID?: string;
};

export function Screen({ title, onBack, tabs, children, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
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

export function Content({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
      {children}
      <Text style={styles.footer}>Dados: ESPN (API pública). Horários de Brasília.</Text>
    </ScrollView>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={sectionTitle}>{children}</Text>;
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.green,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  backHit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  back: { color: colors.white, fontSize: 34, lineHeight: 34, marginTop: -4 },
  title: { flex: 1, color: colors.white, fontSize: 20, fontWeight: '700' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 12 },
  footer: { textAlign: 'center', color: '#8a938e', fontSize: 12, paddingTop: 8, paddingBottom: 8 },
  message: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 28 },
  messageText: { color: colors.muted, textAlign: 'center', fontSize: 16 },
  error: { color: colors.error },
  detail: { color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 6 },
  retry: {
    marginTop: 16,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryText: { color: colors.white, fontWeight: '700' },
});
