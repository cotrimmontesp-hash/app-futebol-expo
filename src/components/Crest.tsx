import { useEffect, useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

import { useTheme } from '../theme';

type Props = {
  uri?: string;
  name?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function Crest({ uri, name, size = 22, style }: Props) {
  const { scheme, colors } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) return null;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {scheme === 'dark' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.crestPlate,
          }}
        />
      ) : null}
      <Image
        source={{ uri }}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
        accessibilityLabel={name}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
