import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

export function VideoPost({ uri, aspectRatio, isActive }: {
  uri: string;
  aspectRatio: number;
  isActive: boolean;
}) {
  const player = useVideoPlayer(isActive ? uri : '', p => {
    p.loop = true;
  });

  useEffect(() => {
    if (!isActive) player.pause();
  }, [isActive]);

  return (
    <View style={{ width: '100%', aspectRatio, backgroundColor: '#111' }}>
      {isActive ? (
        <VideoView
          player={player}
          style={{ width: '100%', height: '100%' }}
          nativeControls
        />
      ) : (
        <Image
          source={{ uri: uri.replace('.mp4', '-poster.jpg') }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}
