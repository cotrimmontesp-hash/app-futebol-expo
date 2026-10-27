import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

type Props = {
  uri?: string;
  name?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function Crest({ uri, name, size = 22, style }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) return null;
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel={name}
      onError={() => setFailed(true)}
    />
  );
}
