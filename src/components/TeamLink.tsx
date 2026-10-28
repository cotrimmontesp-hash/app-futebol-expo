import type { ReactNode } from 'react';
import { Pressable, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation';
import type { TeamRef } from '../types';

type Props = {
  liga?: string;
  team: TeamRef;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function TeamLink({ liga, team, children, style }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!liga || !team.time) return <View style={style}>{children}</View>;
  const open = (event: GestureResponderEvent) => {
    event.stopPropagation();
    navigation.push('Team', { liga, nome: team.time });
  };
  return (
    <Pressable
      style={style}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Ver ${team.time}`}
    >
      {children}
    </Pressable>
  );
}
