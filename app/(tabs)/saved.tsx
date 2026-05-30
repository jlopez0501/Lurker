import { useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { VideoPost } from '@/components/VideoPost';
import { Reddit } from '@/constants/theme';
import type { RedditPost } from '@/types';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const [savedPosts, setSavedPosts] = useState<RedditPost[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useFocusEffect(useCallback(() => { loadSaved(); }, []));

  const loadSaved = async () => {
    const json = await AsyncStorage.getItem('saved_posts');
    setSavedPosts(json ? JSON.parse(json) : []);
  };

  const removeSaved = async (post: RedditPost) => {
    const updated = savedPosts.filter(p => p.id !== post.id);
    setSavedPosts(updated);
    await AsyncStorage.setItem('saved_posts', JSON.stringify(updated));
  };

  const clearAll = async () => {
    setSavedPosts([]);
    await AsyncStorage.removeItem('saved_posts');
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    setVisibleIds(viewableItems.map((item: any) => item.key));
  }, []);

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const getVideoUrl = (post: RedditPost): string | null => {
    if (post.is_video && post.media?.reddit_video) {
      return post.media.reddit_video.fallback_url;
    }
    if (post.media?.type === 'redgifs.com' && post.media?.oembed?.thumbnail_url) {
      return post.media.oembed.thumbnail_url.replace('-poster.jpg', '.mp4');
    }
    return null;
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const renderPost = ({ item }: { item: RedditPost }) => {
    const videoUrl = getVideoUrl(item);
    const imageUrl = item.preview?.images?.[0]?.source?.url.replace(/&amp;/g, '&');

    const aspectRatio = item.is_video
      ? (item.media?.reddit_video?.width ?? 16) / (item.media?.reddit_video?.height ?? 9)
      : item.preview?.images?.[0]?.source
        ? item.preview.images[0].source.width / item.preview.images[0].source.height
        : 16 / 9;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.subreddit}>r/{item.subreddit}</Text>
          {item.over_18 && <View style={styles.nsfwBadge}><Text style={styles.nsfwBadgeText}>NSFW</Text></View>}
        </View>
        <Text style={styles.title}>{item.title}</Text>

        {videoUrl ? (
          <VideoPost
            uri={videoUrl}
            aspectRatio={aspectRatio}
            isActive={visibleIds.includes(item.id)}
          />
        ) : imageUrl ? (
          <TouchableOpacity onPress={() => setFullscreenImage(imageUrl)} activeOpacity={0.95}>
            <Image
              source={{ uri: imageUrl }}
              style={[styles.image, { aspectRatio }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.voteRow}>
            <Text style={styles.upvoteIcon}>▲</Text>
            <Text style={styles.voteCount}>{formatCount(item.score)}</Text>
          </View>
          <View style={styles.commentRow}>
            <Text style={styles.metaIcon}>💬</Text>
            <Text style={styles.metaText}>{formatCount(item.num_comments)}</Text>
          </View>
          <TouchableOpacity style={styles.removeButton} onPress={() => removeSaved(item)}>
            <Text style={styles.removeButtonText}>✕ Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.headerTitle}>Saved</Text>
        {savedPosts.length > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {savedPosts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔖</Text>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyHint}>Tap Save on any post to bookmark it here</Text>
        </View>
      ) : (
        <FlatList
          data={savedPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          removeClippedSubviews
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}

      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <Pressable
          style={styles.fullscreen}
          onPress={() => setFullscreenImage(null)}
        >
          <Image
            source={{ uri: fullscreenImage! }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Reddit.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Reddit.surface,
    borderBottomWidth: 1,
    borderBottomColor: Reddit.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: Reddit.textPrimary, fontSize: 20, fontWeight: '700' },
  clearText: { color: Reddit.orange, fontSize: 14, fontWeight: '600' },

  list: { padding: 8, gap: 8 },

  card: {
    backgroundColor: Reddit.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Reddit.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  subreddit: { color: Reddit.textSecondary, fontSize: 12, fontWeight: '600' },
  nsfwBadge: {
    backgroundColor: '#FF585B',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  nsfwBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: {
    color: Reddit.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  image: { width: '100%', backgroundColor: '#0a0a0a' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: Reddit.border,
  },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 },
  upvoteIcon: { color: Reddit.upvote, fontSize: 13 },
  voteCount: { color: Reddit.textPrimary, fontSize: 13, fontWeight: '600', minWidth: 28 },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  metaIcon: { fontSize: 13 },
  metaText: { color: Reddit.textSecondary, fontSize: 13 },
  removeButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Reddit.border,
  },
  removeButtonText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 44, marginBottom: 4 },
  emptyTitle: { color: Reddit.textPrimary, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: Reddit.textSecondary, fontSize: 13 },

  fullscreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
});
