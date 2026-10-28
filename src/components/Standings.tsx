import { useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { loadMatches } from '../api';
import { useFavorites } from '../favorites';
import { recentForm, type ResultMark } from '../teamResults';
import { card, colors } from '../theme';
import type { MatchesResponse, StandingGroup, StandingRow, Standings as StandingsData } from '../types';
import { Crest } from './Crest';
import { FormDots } from './FormDots';
import { StarButton } from './StarButton';
import { TeamLink } from './TeamLink';
import { Message, SectionTitle } from './ui';

const FIXED_WIDTH = 200;
const COL = 36;
const WIDE = 40;

const STATS: { key: keyof StandingRow; label: string; width: number; bold?: boolean }[] = [
  { key: 'pts', label: 'P', width: WIDE, bold: true },
  { key: 'j', label: 'J', width: COL },
  { key: 'v', label: 'V', width: COL },
  { key: 'e', label: 'E', width: COL },
  { key: 'd', label: 'D', width: COL },
  { key: 'gp', label: 'GP', width: COL },
  { key: 'gc', label: 'GC', width: COL },
  { key: 'sg', label: 'SG', width: WIDE },
];

export function Standings({ data, leagueId }: { data: StandingsData; leagueId?: string }) {
  const { migrate } = useFavorites();
  const groups = data.grupos || [];
  const empty = data.semTabela || !groups.length || groups.every((group) => !group.linhas.length);
  const matches = useLeagueMatches(empty ? undefined : leagueId);

  useEffect(() => {
    migrate((data.grupos || []).flatMap((group) => group.linhas));
  }, [data, migrate]);

  if (empty) {
    return (
      <Message text="Esta competição é mata-mata e não tem tabela. Veja Resultados e Próximos jogos." />
    );
  }

  const legend = new Map<string, string>();
  for (const group of groups) {
    for (const row of group.linhas) {
      if (row.nota) legend.set(row.nota.texto, row.nota.cor);
    }
  }
  const hasForm = !!matches && groups.some((group) => group.linhas.some((row) => row.time && recentForm(matches, row.time).length > 0));

  return (
    <View testID="standings">
      {groups.length > 1 ? (
        <Message text="Classificação da fase de grupos. Para o mata-mata, veja Resultados e Próximos jogos." />
      ) : null}
      {groups.map((group) => (
        <View key={group.nome || 'geral'}>
          {group.nome ? <SectionTitle>{group.nome}</SectionTitle> : null}
          <GroupTable group={group} leagueId={leagueId} matches={matches} />
        </View>
      ))}
      {legend.size ? (
        <View style={[card, styles.legend]}>
          {[...legend].map(([text, color]) => (
            <View key={text} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: color || colors.muted }]} />
              <Text style={styles.legendText}>{text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.hint}>
        P = pontos · J = jogos · V/E/D = vitórias/empates/derrotas · GP/GC = gols · SG = saldo
        {hasForm ? '\nForma: jogos finalizados já carregados, mais recente à direita. Arraste para o lado.' : ''}
      </Text>
    </View>
  );
}

function GroupTable({
  group,
  leagueId,
  matches,
}: {
  group: StandingGroup;
  leagueId?: string;
  matches: MatchesResponse | null;
}) {
  const forms = group.linhas.map((row) => (matches && row.time ? recentForm(matches, row.time) : []));
  const showForm = forms.some((marks) => marks.length > 0);
  const formWidth = Math.max(0, ...forms.map((marks) => dotsWidth(marks.length)));
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const metrics = useRef({ x: 0, width: 0, viewport: 0 });
  const [edge, setEdge] = useState({ scrolled: false, more: false });
  useWebScrollAssist(scrollRef);

  const publish = () => {
    const { x, width, viewport } = metrics.current;
    if (!viewport || !width) return;
    const next = { scrolled: x > 2, more: width - viewport - x > 2 };
    setEdge((prev) => (prev.scrolled === next.scrolled && prev.more === next.more ? prev : next));
  };

  return (
    <View style={[card, styles.table]}>
      <View style={styles.fixed}>
        <View style={[styles.head, styles.fixedHead]}>
          <Text style={[styles.cell, styles.pos]}>#</Text>
          <Text style={[styles.cell, styles.teamHead]}>Time</Text>
        </View>
        {group.linhas.map((row) => (
          <View
            key={`${row.pos}-${row.time}`}
            style={[styles.fixedRow, { borderLeftColor: row.nota?.cor || 'transparent' }]}
          >
            <Text style={styles.posValue}>{row.pos ?? ''}</Text>
            <View style={styles.team}>
              <StarButton team={row} />
              <TeamLink liga={leagueId} team={row} style={styles.teamHit}>
                <Crest uri={row.escudo} name={row.time} />
                <Text numberOfLines={1} style={styles.teamName}>
                  {row.time}
                </Text>
              </TeamLink>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.scrollWrap}>
        {edge.scrolled ? <View pointerEvents="none" style={styles.divider} /> : null}
        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          scrollEventThrottle={16}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
          testID="table-hscroll"
          onLayout={(event) => {
            metrics.current.viewport = event.nativeEvent.layout.width;
            publish();
          }}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            metrics.current.x = contentOffset.x;
            metrics.current.width = contentSize.width;
            metrics.current.viewport = layoutMeasurement.width;
            publish();
          }}
          onContentSizeChange={(width) => {
            metrics.current.width = width;
            publish();
          }}
        >
          <View>
            <View style={styles.head}>
              {STATS.map((col) => (
                <Text key={col.label} style={[styles.cell, { width: col.width }]}>
                  {col.label}
                </Text>
              ))}
              {showForm ? <Text style={[styles.cell, styles.formHead, { width: formWidth }]}>Forma</Text> : null}
            </View>
            {group.linhas.map((row, index) => (
              <View key={`${row.pos}-${row.time}`} style={styles.scrollRow}>
                {STATS.map((col) => (
                  <Text key={col.label} style={[styles.num, { width: col.width }, col.bold && styles.bold]}>
                    {String(row[col.key] ?? '')}
                  </Text>
                ))}
                {showForm ? (
                  <View style={[styles.formCell, { width: formWidth }]}>
                    <FormDots marks={forms[index]} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
        {edge.more ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0)', colors.white]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fade}
          />
        ) : null}
      </View>
    </View>
  );
}

function dotsWidth(count: number): number {
  if (count <= 0) return 0;
  const gap = 3;
  const dot = 16;
  const latest = 20;
  return (count - 1) * (dot + gap) + latest;
}

function scrollHost(ref: ComponentRef<typeof ScrollView> | null): HTMLElement | null {
  if (!ref || Platform.OS !== 'web') return null;
  const node = ref as unknown as HTMLElement & { getScrollableNode?: () => HTMLElement };
  return typeof node.getScrollableNode === 'function' ? node.getScrollableNode() : node;
}

function useWebScrollAssist(ref: RefObject<ComponentRef<typeof ScrollView> | null>) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = scrollHost(ref.current);
    if (!node?.addEventListener) return;
    const drag = { on: false, x: 0, left: 0, id: -1, armed: false };

    const onWheel = (event: WheelEvent) => {
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 1) return;
      const horizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal) return;
      const delta = event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX || event.deltaY;
      if (!delta) return;
      node.scrollLeft += delta;
      event.preventDefault();
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (node.scrollWidth - node.clientWidth <= 1) return;
      drag.on = true;
      drag.armed = false;
      drag.x = event.clientX;
      drag.left = node.scrollLeft;
      drag.id = event.pointerId;
    };
    const onMove = (event: PointerEvent) => {
      if (!drag.on || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      if (!drag.armed && Math.abs(dx) < 4) return;
      drag.armed = true;
      node.scrollLeft = drag.left - dx;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== drag.id) return;
      drag.on = false;
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [ref]);
}

function useLeagueMatches(leagueId?: string): MatchesResponse | null {
  const [matches, setMatches] = useState<MatchesResponse | null>(null);

  useEffect(() => {
    if (!leagueId) {
      setMatches(null);
      return;
    }
    let alive = true;
    setMatches(null);
    loadMatches(leagueId)
      .then((data) => {
        if (alive) setMatches(data);
      })
      .catch(() => {
        if (alive) setMatches(null);
      });
    return () => {
      alive = false;
    };
  }, [leagueId]);

  return matches;
}

const webScroller = Platform.OS === 'web'
  ? ({ scrollbarWidth: 'thin', scrollbarColor: '#c5cdc8 transparent', cursor: 'grab' } as object)
  : null;

const styles = StyleSheet.create({
  table: { flexDirection: 'row', alignItems: 'flex-start' },
  fixed: { width: FIXED_WIDTH },
  scrollWrap: { flex: 1, minWidth: 0, position: 'relative' },
  scroller: { width: '100%', flexGrow: 0, minWidth: 0, ...(webScroller ?? {}) },
  scrollContent: { paddingRight: 10 },
  head: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  fixedHead: { borderLeftWidth: 4, borderLeftColor: 'transparent' },
  fixedRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    borderLeftWidth: 4,
  },
  scrollRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cell: { textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '600' },
  pos: { width: 32 },
  teamHead: { flex: 1, textAlign: 'left', paddingLeft: 8 },
  posValue: { width: 32, textAlign: 'center', fontSize: 13, color: colors.text },
  team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  teamHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0, alignSelf: 'stretch' },
  teamName: { flex: 1, fontSize: 13, color: colors.text },
  num: { textAlign: 'center', fontSize: 13, color: colors.text },
  bold: { fontWeight: '700' },
  formHead: { textAlign: 'center' },
  formCell: { alignItems: 'flex-end', justifyContent: 'center' },
  divider: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#d5dbd8',
    zIndex: 2,
  },
  fade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, zIndex: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: '#4b5550', fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 8 },
});
