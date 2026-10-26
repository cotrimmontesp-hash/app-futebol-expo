import { StyleSheet, Text, View } from 'react-native';

import { card, colors } from '../theme';
import type { Scorer, Scorers as ScorersData } from '../types';
import { Crest } from './Crest';
import { SectionTitle } from './ui';

export function Scorers({ data }: { data: ScorersData }) {
  return (
    <View testID="scorers">
      <Block title="Gols" rows={data.gols || []} field="gols" column="Gols" />
      <Block title="Assistências" rows={data.assistencias || []} field="assistencias" column="A" />
    </View>
  );
}

function Block({
  title,
  rows,
  field,
  column,
}: {
  title: string;
  rows: Scorer[];
  field: 'gols' | 'assistencias';
  column: string;
}) {
  if (!rows.length) return null;
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View style={card}>
        <View style={styles.header}>
          <Text style={[styles.head, styles.pos]}>#</Text>
          <Text style={[styles.head, styles.playerHead]}>Jogador</Text>
          <Text style={styles.head}>J</Text>
          <Text style={[styles.head, styles.valueHead]}>{column}</Text>
        </View>
        {rows.map((row, index) => (
          <View key={`${row.nome}-${row.time}`} style={styles.line}>
            <Text style={styles.pos}>{index + 1}</Text>
            <View style={styles.player}>
              <Text numberOfLines={1} style={styles.name}>
                {row.nome}
              </Text>
              <View style={styles.club}>
                <Crest uri={row.escudo} name={row.time} size={16} />
                <Text numberOfLines={1} style={styles.clubName}>
                  {row.time}
                </Text>
              </View>
            </View>
            <Text style={styles.num}>{row.jogos ?? ''}</Text>
            <Text style={styles.value}>{row[field] ?? ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  head: { width: 36, textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '600', paddingVertical: 8 },
  pos: { width: 36, textAlign: 'center', color: colors.text, paddingVertical: 8 },
  playerHead: { flex: 1, textAlign: 'left', paddingLeft: 4 },
  valueHead: { width: 52, fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line },
  player: { flex: 1, minWidth: 0, paddingVertical: 8, paddingRight: 8 },
  name: { fontWeight: '600', color: colors.text, fontSize: 15 },
  club: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  clubName: { flex: 1, color: colors.muted, fontSize: 12 },
  num: { width: 36, textAlign: 'center', color: colors.text },
  value: { width: 52, textAlign: 'center', fontWeight: '700', color: colors.text },
});
