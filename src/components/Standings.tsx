import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useFavorites } from '../favorites';
import { card, colors } from '../theme';
import type { StandingRow, Standings as StandingsData } from '../types';
import { Crest } from './Crest';
import { StarButton } from './StarButton';
import { TeamLink } from './TeamLink';
import { Message, SectionTitle } from './ui';

export function Standings({ data, leagueId }: { data: StandingsData; leagueId?: string }) {
  const { migrate } = useFavorites();
  const { width } = useWindowDimensions();
  const showExtra = width > 420;
  const groups = data.grupos || [];
  const empty = data.semTabela || !groups.length || groups.every((group) => !group.linhas.length);

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

  return (
    <View testID="standings">
      {groups.length > 1 ? (
        <Message text="Classificação da fase de grupos. Para o mata-mata, veja Resultados e Próximos jogos." />
      ) : null}
      {groups.map((group) => (
        <View key={group.nome || 'geral'}>
          {group.nome ? <SectionTitle>{group.nome}</SectionTitle> : null}
          <View style={card}>
            <Header showExtra={showExtra} />
            {group.linhas.map((row) => (
              <Row key={`${row.pos}-${row.time}`} row={row} showExtra={showExtra} leagueId={leagueId} />
            ))}
          </View>
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
      <Text style={styles.hint}>P = pontos · J = jogos · V/E/D = vitórias/empates/derrotas · SG = saldo de gols</Text>
    </View>
  );
}

function Header({ showExtra }: { showExtra: boolean }) {
  return (
    <View style={styles.header}>
      <Text style={[styles.cell, styles.pos]}>#</Text>
      <Text style={[styles.cell, styles.teamHead]}>Time</Text>
      <Text style={[styles.cell, styles.pts]}>P</Text>
      <Text style={styles.cell}>J</Text>
      <Text style={styles.cell}>V</Text>
      <Text style={styles.cell}>E</Text>
      <Text style={styles.cell}>D</Text>
      {showExtra ? <Text style={styles.cell}>GP</Text> : null}
      {showExtra ? <Text style={styles.cell}>GC</Text> : null}
      <Text style={[styles.cell, styles.sg]}>SG</Text>
    </View>
  );
}

function Row({ row, showExtra, leagueId }: { row: StandingRow; showExtra: boolean; leagueId?: string }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.posValue, { borderLeftColor: row.nota?.cor || 'transparent' }]}>{row.pos ?? ''}</Text>
      <View style={styles.team}>
        <StarButton team={row} />
        <TeamLink liga={leagueId} team={row} style={styles.teamHit}>
          <Crest uri={row.escudo} name={row.time} />
          <Text numberOfLines={1} style={styles.teamName}>
            {row.time}
          </Text>
        </TeamLink>
      </View>
      <Text style={[styles.num, styles.ptsValue]}>{row.pts}</Text>
      <Text style={styles.num}>{row.j}</Text>
      <Text style={styles.num}>{row.v}</Text>
      <Text style={styles.num}>{row.e}</Text>
      <Text style={styles.num}>{row.d}</Text>
      {showExtra ? <Text style={styles.num}>{row.gp}</Text> : null}
      {showExtra ? <Text style={styles.num}>{row.gc}</Text> : null}
      <Text style={[styles.num, styles.sg]}>{row.sg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingRight: 4,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingRight: 4,
  },
  cell: { width: 24, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '600', paddingVertical: 8 },
  pos: { width: 32 },
  teamHead: { flex: 1, width: undefined, textAlign: 'left', paddingLeft: 8 },
  pts: { width: 28 },
  sg: { width: 32 },
  posValue: {
    width: 32,
    textAlign: 'center',
    fontSize: 13,
    color: colors.text,
    borderLeftWidth: 4,
    paddingVertical: 8,
  },
  team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  teamHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0, alignSelf: 'stretch' },
  teamName: { flex: 1, fontSize: 13, color: colors.text },
  num: { width: 24, textAlign: 'center', fontSize: 13, color: colors.text },
  ptsValue: { width: 28, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: '#4b5550', fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 8 },
});
