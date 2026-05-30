import { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoPost } from '@/components/VideoPost';
import { Reddit } from '@/constants/theme';
import type { RedditPost } from '@/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subreddit, setSubreddit] = useState('pics');
  const [input, setInput] = useState('pics');
  const [after, setAfter] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nsfw, setNsfw] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [sort, setSort] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [savedPosts, setSavedPosts] = useState<RedditPost[]>([]);
  const [recentSubreddits, setRecentSubreddits] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  useFocusEffect(useCallback(() => { loadSaved(); }, []));

  useEffect(() => { loadSaved(); loadRecents(); }, []);
  useEffect(() => { fetchPosts(); }, [subreddit, nsfw, sort]);

  const loadRecents = async () => {
    const json = await AsyncStorage.getItem('recent_subreddits');
    if (json) setRecentSubreddits(JSON.parse(json));
  };

  const pushRecent = async (sub: string) => {
    const updated = [sub, ...recentSubreddits.filter(s => s.toLowerCase() !== sub.toLowerCase())].slice(0, 8);
    setRecentSubreddits(updated);
    await AsyncStorage.setItem('recent_subreddits', JSON.stringify(updated));
  };

  const loadSaved = async () => {
    const json = await AsyncStorage.getItem('saved_posts');
    if (json) setSavedPosts(JSON.parse(json));
  };

  const toggleSave = async (post: RedditPost) => {
    const exists = savedPosts.find(p => p.id === post.id);
    const updated = exists
      ? savedPosts.filter(p => p.id !== post.id)
      : [...savedPosts, post];
    setSavedPosts(updated);
    await AsyncStorage.setItem('saved_posts', JSON.stringify(updated));
  };

  const downloadImage = async (url: string) => {
    try {
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) return;
      const filename = url.split('/').pop()?.split('?')[0] ?? 'image.jpg';
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(fileUri);
      alert('Saved to gallery!');
    } catch {
      alert('Failed to save image');
    }
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

  const fetchPosts = async (loadMore = false, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (loadMore) setLoadingMore(true);
    else { setLoading(true); setPosts([]); setAfter(null); }

    setError(null);

    try {
      const afterParam = loadMore && after ? `&after=${after}` : '';
      const response = await fetch(
        `https://old.reddit.com/r/${subreddit}/${sort}.json?limit=25${afterParam}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
          }
        }
      );
      if (!response.ok) throw new Error(`r/${subreddit} not found`);
      const data = await response.json();

      const imagePosts: RedditPost[] = data.data.children
        .map((child: any) => child.data)
        .filter((post: RedditPost) => {
          if (!nsfw && post.over_18) return false;
          return post.preview?.images?.[0]?.source?.url || post.is_video || getVideoUrl(post) !== null;
        });

      setPosts(prev => loadMore ? [...prev, ...imagePosts] : imagePosts);
      setAfter(data.data.after);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    const trimmed = input.trim();
    if (trimmed) {
      pushRecent(trimmed);
      setSubreddit(trimmed);
    }
  };

  const jumpToSubreddit = (sub: string) => {
    setInput(sub);
    setSubreddit(sub);
    setInputFocused(false);
    pushRecent(sub);
  };

  const suggestions = inputFocused
    ? recentSubreddits.filter(s => s.toLowerCase().includes(input.toLowerCase()) && s.toLowerCase() !== input.toLowerCase())
    : [];

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const renderPost = ({ item }: { item: RedditPost }) => {
    const videoUrl = getVideoUrl(item);
    const isSaved = !!savedPosts.find(p => p.id === item.id);
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
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.footerButton, isSaved && styles.footerButtonSaved]}
              onPress={() => toggleSave(item)}
            >
              <Text style={[styles.footerButtonText, isSaved && styles.footerButtonTextSaved]}>
                {isSaved ? '★ Saved' : '☆ Save'}
              </Text>
            </TouchableOpacity>
            {!videoUrl && imageUrl && (
              <TouchableOpacity
                style={styles.footerButton}
                onPress={() => downloadImage(imageUrl)}
              >
                <Text style={styles.footerButtonText}>↓ Download</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View>
          <View style={styles.searchRow}>
            <View style={[styles.inputWrapper, inputFocused && styles.inputWrapperFocused]}>
              <Text style={styles.inputPrefix}>r/</Text>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="subreddit"
                placeholderTextColor={Reddit.textMuted}
                onSubmitEditing={handleSearch}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                autoCapitalize="none"
                returnKeyType="go"
              />
            </View>
            <TouchableOpacity style={styles.goButton} onPress={handleSearch}>
              <Text style={styles.goButtonText}>Go</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nsfwToggle, nsfw && styles.nsfwToggleActive]}
              onPress={() => setNsfw(!nsfw)}
            >
              <Text style={[styles.nsfwToggleText, nsfw && styles.nsfwToggleTextActive]}>NSFW</Text>
            </TouchableOpacity>
          </View>
          {suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((sub, i) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.dropdownItem, i < suggestions.length - 1 && styles.dropdownItemBorder]}
                  onPress={() => jumpToSubreddit(sub)}
                >
                  <Text style={styles.dropdownPrefix}>r/</Text>
                  <Text style={styles.dropdownText}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sortRow}>
          {(['hot', 'new', 'top', 'rising'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.sortChip, sort === option && styles.sortChipActive]}
              onPress={() => setSort(option)}
            >
              <Text style={[styles.sortChipText, sort === option && styles.sortChipTextActive]}>
                {option === 'hot' ? '🔥' : option === 'new' ? '✨' : option === 'top' ? '📈' : '🚀'} {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Reddit.orange} />
          <Text style={styles.loadingText}>Loading r/{subreddit}…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchPosts()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPosts(false, true)}
              tintColor={Reddit.orange}
            />
          }
          onEndReached={() => { if (!loadingMore && after) fetchPosts(true); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Reddit.orange} style={{ padding: 20 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No media posts in r/{subreddit}</Text>
            </View>
          }
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
          <TouchableOpacity
            style={styles.fullscreenDownload}
            onPress={() => downloadImage(fullscreenImage!)}
          >
            <Text style={styles.fullscreenDownloadText}>↓ Download</Text>
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Reddit.bg },

  header: {
    backgroundColor: Reddit.surface,
    borderBottomWidth: 1,
    borderBottomColor: Reddit.border,
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Reddit.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Reddit.border,
    paddingHorizontal: 12,
  },
  inputPrefix: { color: Reddit.orange, fontWeight: '700', fontSize: 15 },
  input: {
    flex: 1,
    color: Reddit.textPrimary,
    fontSize: 15,
    paddingVertical: 8,
    paddingLeft: 2,
  },
  goButton: {
    backgroundColor: Reddit.orange,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  goButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nsfwToggle: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Reddit.border,
  },
  nsfwToggleActive: { backgroundColor: Reddit.orange, borderColor: Reddit.orange },
  nsfwToggleText: { color: Reddit.textSecondary, fontWeight: '600', fontSize: 13 },
  nsfwToggleTextActive: { color: '#fff' },

  inputWrapperFocused: { borderColor: Reddit.orange },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 80,
    backgroundColor: Reddit.card,
    borderWidth: 1,
    borderColor: Reddit.border,
    borderRadius: 8,
    marginTop: 4,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 4,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: Reddit.border },
  dropdownPrefix: { color: Reddit.orange, fontWeight: '700', fontSize: 14 },
  dropdownText: { color: Reddit.textPrimary, fontSize: 14 },

  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Reddit.border,
  },
  sortChipActive: { backgroundColor: Reddit.orange, borderColor: Reddit.orange },
  sortChipText: { color: Reddit.textSecondary, fontSize: 13 },
  sortChipTextActive: { color: '#fff', fontWeight: '600' },

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

  footerActions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  footerButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Reddit.border,
  },
  footerButtonSaved: { backgroundColor: Reddit.orange, borderColor: Reddit.orange },
  footerButtonText: { color: Reddit.textSecondary, fontSize: 12, fontWeight: '600' },
  footerButtonTextSaved: { color: '#fff' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { color: Reddit.textSecondary, fontSize: 14, marginTop: 8 },
  errorText: { color: '#FF6B6B', fontSize: 15, textAlign: 'center' },
  retryButton: {
    backgroundColor: Reddit.orange,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: Reddit.textSecondary, fontSize: 15 },

  fullscreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  fullscreenDownload: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    backgroundColor: Reddit.orange,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  fullscreenDownloadText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
