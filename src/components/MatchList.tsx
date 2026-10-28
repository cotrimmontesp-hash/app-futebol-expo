import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { formatDay, formatTime } from '../format';
import type { RootStackParamList } from '../navigation';
import { card, colors } from '../theme';
import type { Match } from '../types';
import { Crest } from './Crest';
import { StarButton } from './StarButton';
import { TeamLink } from './TeamLink';
import { SectionTitle } from './ui';

type Props = {
  matches: Match[];
  leagueId?: string;
  hideDay?: boolean;
};

export function MatchList({ matches, leagueId, hideDay }: Props) {
  const groups: { day: string; items: Match[] }[] = [];
  if (hideDay) {
    if (matches.length) groups.push({ day: '', items: matches });
  } else {
    for (const match of matches) {
      const day = formatDay(match.data);
      const last = groups[groups.length - 1];
      if (!last || last.day !== day) groups.push({ day, items: [match] });
      else last.items.push(match);
    }
  }

  return (
    <View>
      {groups.map((group) => (
        <View key={group.day || 'dia'}>
          {group.day ? <SectionTitle>{group.day}</SectionTitle> : null}
          <View style={card}>
            {group.items.map((match, index) => (
              <MatchRow
                key={`${match.liga || leagueId || ''}-${match.id}`}
                match={match}
                leagueId={leagueId}
                divider={index < group.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function MatchRow({ match, leagueId, divider }: { match: Match; leagueId?: string; divider: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const liga = match.liga || leagueId || '';
  const open = () => {
    if (!liga) return;
    navigation.navigate('Match', { liga, id: String(match.id) });
  };
  const info = [match.competicao, match.fase, match.estadio].filter(Boolean).join(' · ');
  const label = `${match.casa.time} contra ${match.fora.time}`;

  return (
    <Pressable
      style={[styles.row, divider && styles.divider]}
      onPress={open}
      disabled={!liga}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.line}>
        <View style={styles.side}>
          <TeamLink liga={liga} team={match.casa} style={styles.teamHit}>
            <Crest uri={match.casa.escudo} name={match.casa.time} />
            <Text numberOfLines={1} style={[styles.name, match.casa.venceu && styles.winner]}>
              {match.casa.time}
            </Text>
          </TeamLink>
          <StarButton team={match.casa} />
        </View>
        <View style={styles.scoreHit}>
          <Score match={match} />
        </View>
        <View style={[styles.side, styles.sideAway]}>
          <StarButton team={match.fora} />
          <TeamLink liga={liga} team={match.fora} style={styles.teamHit}>
            <Text numberOfLines={1} style={[styles.name, styles.nameAway, match.fora.venceu && styles.winner]}>
              {match.fora.time}
            </Text>
            <Crest uri={match.fora.escudo} name={match.fora.time} />
          </TeamLink>
        </View>
      </View>
      {info ? <Text style={styles.info}>{info}</Text> : null}
    </Pressable>
  );
}

function Score({ match }: { match: Match }) {
  if (match.estado === 'pre') {
    return <Text style={styles.time}>{formatTime(match.data)}</Text>;
  }
  const penalties =
    match.casa.penaltis != null && match.fora.penaltis != null
      ? `pên. ${match.casa.penaltis}–${match.fora.penaltis}`
      : '';
  return (
    <View style={styles.score}>
      <Text style={styles.scoreText}>
        {match.casa.gols ?? ''} – {match.fora.gols ?? ''}
      </Text>
      {penalties ? <Text style={styles.meta}>{penalties}</Text> : null}
      {match.estado === 'in' ? <Text style={styles.live}>AO VIVO {match.relogio || ''}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 8, paddingVertical: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  sideAway: { justifyContent: 'flex-end' },
  teamHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, alignSelf: 'stretch' },
  name: { flex: 1, fontSize: 14, color: colors.text },
  nameAway: { textAlign: 'right' },
  winner: { fontWeight: '700' },
  scoreHit: { minWidth: 72, alignItems: 'center', justifyContent: 'center' },
  score: { alignItems: 'center' },
  scoreText: { fontWeight: '700', fontSize: 16, color: colors.text },
  time: { fontWeight: '700', fontSize: 15, color: colors.green },
  meta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  live: { color: colors.live, fontSize: 11, fontWeight: '700', marginTop: 1 },
  info: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 4 },
});
