import React, { useEffect, useState, useCallback, useRef, useMemo, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  Button,
  InteractionManager,
  Alert,
} from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Network from 'expo-network';
import { Share, DeviceEventEmitter } from 'react-native';
import rssFeeds, { fetchFeedsFromEndpoint } from '../data/rssFeeds'; // or './data/rssFeeds' depending on your file structure
const FEEDS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwS_LwRrvpZ7ZpFF6Eli48bt5Jpq8Jy3PRUKv9xeiGeamAZ0J5Cgf7Wooops1p2fydaWA/exec';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import BookmarkScreen from './BookmarkScreen';


// ✅ Share using React Native's Share API
const handleShare = async (article) => {
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nRead more: ${article.link}`,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
};


const formatDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    return format(date, 'EEE, MMM d yyyy');
  } catch {
    return '';
  }
};

const cleanHtml = (html = '') => {
  // Simple HTML to text conversion: strip tags; ensure robust on undefined/null
  return String(html).replace(/<[^>]+>/g, '');
};

// --- FEED PARSERS & NORMALIZERS ---
const getTag = (xml, tag) => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
};

const getAllTags = (xml, tag) => {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'gi');
  const out = [];
  let m;
  while ((m = regex.exec(xml))) out.push(m[1]);
  return out;
};

const getAttr = (xmlTag, attr) => {
  const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
  const m = xmlTag.match(regex);
  return m ? m[1] : '';
};

const stripCdata = (s = '') => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

const extractFirstImage = (html = '') => {
  const m = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  return m ? m[1] : '';
};

const parseRSS2 = (xml) => {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml))) {
    const block = m[0];
    const title = stripCdata(getTag(block, 'title'));

    // Prefer <link>, but some feeds use GUID-permalink
    let link = stripCdata(getTag(block, 'link'));
    const guidOpen = (block.match(/<guid[^>]*>/i) || [null])[0];
    const guidText = stripCdata(getTag(block, 'guid'));
    const isPermalink = guidOpen ? /ispermalink=["']?true["']?/i.test(guidOpen) : false;
    if (!link && isPermalink && guidText) link = guidText;

    const contentEncoded = stripCdata(getTag(block, 'content:encoded'));
    const description = contentEncoded || stripCdata(getTag(block, 'description')) || stripCdata(getTag(block, 'summary'));

    const pubDate = stripCdata(getTag(block, 'pubDate')) || stripCdata(getTag(block, 'dc:date')) || stripCdata(getTag(block, 'updated')) || stripCdata(getTag(block, 'published'));

    // Try media tags for thumbnail, then enclosure, then first <img>
    let thumb = '';
    const mediaContentMatch = block.match(/<media:content[^>]*>/i);
    if (mediaContentMatch) thumb = getAttr(mediaContentMatch[0], 'url');
    if (!thumb) {
      const mediaThumbMatch = block.match(/<media:thumbnail[^>]*>/i);
      if (mediaThumbMatch) thumb = getAttr(mediaThumbMatch[0], 'url');
    }
    if (!thumb) {
      const enclosureMatch = block.match(/<enclosure[^>]*>/i);
      if (enclosureMatch) thumb = getAttr(enclosureMatch[0], 'url');
    }
    if (!thumb) thumb = extractFirstImage(description);

    items.push({ title, link, description, pubDate, thumbnail: thumb, guid: guidText || link });
  }
  return items;
};

const parseAtom = (xml) => {
  const entries = [];
  const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
  let m;
  while ((m = entryRegex.exec(xml))) {
    const block = m[0];
    const title = stripCdata(getTag(block, 'title'));

    // Prefer rel="alternate"
    let link = '';
    const altMatch = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    if (altMatch) link = altMatch[1];
    if (!link) {
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
      if (linkMatch) link = linkMatch[1];
    }

    const content = stripCdata(getTag(block, 'content'));
    const summary = stripCdata(getTag(block, 'summary'));
    const description = content || summary;

    const updated = stripCdata(getTag(block, 'updated')) || stripCdata(getTag(block, 'published'));
    const guid = stripCdata(getTag(block, 'id')) || link;

    let thumb = '';
    const mediaContentMatch = block.match(/<media:content[^>]*>/i);
    if (mediaContentMatch) thumb = getAttr(mediaContentMatch[0], 'url');
    if (!thumb) {
      const mediaThumbMatch = block.match(/<media:thumbnail[^>]*>/i);
      if (mediaThumbMatch) thumb = getAttr(mediaThumbMatch[0], 'url');
    }
    if (!thumb) thumb = extractFirstImage(description);

    entries.push({ title, link, description, pubDate: updated, thumbnail: thumb, guid });
  }
  return entries;
};

const normalizeFromJson = (json) => {
  // Support common JSON feed shapes
  let items = [];
  if (Array.isArray(json)) items = json;
  if (!items.length && Array.isArray(json?.items)) items = json.items;
  if (!items.length && Array.isArray(json?.articles)) items = json.articles;
  return items.map((it) => ({
    title: it.title || it.headline || 'Untitled',
    link: it.link || it.url || '',
    description: it.description || it.summary || it.content || '',
    pubDate: it.pubDate || it.publishedAt || it.date || '',
    thumbnail: it.thumbnail || it.image || it.enclosure || (it.media && it.media.thumbnail) || '',
  }));
};

const parseFeed = (rawText) => {
  // try JSON first
  try {
    const json = JSON.parse(rawText);
    const normalized = normalizeFromJson(json);
    if (normalized && normalized.length) return normalized;
  } catch (_) {
    // not JSON; fall through to XML
  }
  const text = rawText.trim();
  if (/<(rss|rdf):?\b/i.test(text)) return parseRSS2(text);
  if (/<feed\b/i.test(text)) return parseAtom(text);
  return [];
};

const NewsTab = () => {
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme.mode === 'dark';

  const tabListRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [sources, setSources] = useState(rssFeeds);
  const [selectedSource, setSelectedSource] = useState(rssFeeds[0]);
  const [articles, setArticles] = useState([]);
  const [bookmarked, setBookmarked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    const stored = await AsyncStorage.getItem('bookmarkedArticles');
    setBookmarked(stored ? JSON.parse(stored) : []);
  }, []);

const fetchNews = async () => {
    const sourceUrl = selectedSource?.url;
    const sourceName = selectedSource?.name || 'Feed';
    if (!sourceUrl) { setArticles([]); return; }
    try {
      const response = await fetch(sourceUrl);
      const raw = await response.text();
      const parsed = parseFeed(raw).map((a) => {
        const desc = cleanHtml(a?.description || '');
        const title = a?.title && a.title.trim() ? a.title : (desc ? desc.slice(0, 80) : 'Untitled');
        const thumb = a?.thumbnail || extractFirstImage(a?.description || '');
        const pub = a?.pubDate || a?.published || '';
        return { ...a, title, description: desc, thumbnail: thumb, pubDate: pub };
      });
      setArticles(parsed);
      await AsyncStorage.setItem(`cachedArticles_${sourceName}`, JSON.stringify(parsed));
    } catch (error) {
      console.error('Error fetching news:', error);
      Alert.alert(
        'Network error',
        `Failed to load news from ${sourceName}. Please check your connection or try another source.`,
      );
      const cached = await AsyncStorage.getItem(`cachedArticles_${sourceName}`);
      if (cached) {
        setArticles(JSON.parse(cached));
      } else {
        setArticles([]);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const sourceName = selectedSource?.name || 'Feed';
      if (isOffline) {
        const cached = await AsyncStorage.getItem(`cachedArticles_${sourceName}`);
        if (cached) {
          setArticles(JSON.parse(cached));
        } else {
          setArticles([]);
        }
      } else {
        await fetchNews();
      }
      await fetchBookmarks();
      setLoading(false);
    };
    loadData();

    // Find index and update selectedIndex if necessary
    const index = sources.findIndex((s) => s.name === selectedSource.name);
    if (index >= 0 && index !== selectedIndex) {
      setSelectedIndex(index);
    }
  }, [selectedSource, isOffline, sources]);

  // Load sources from AsyncStorage and Apps Script endpoint
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('cached_sources');
        if (cached) {
          const arr = JSON.parse(cached);
          if (Array.isArray(arr) && arr.length) setSources(arr);
        }
        if (FEEDS_ENDPOINT) {
          const remote = await fetchFeedsFromEndpoint(FEEDS_ENDPOINT);
          if (remote.length) {
            setSources(remote);
            await AsyncStorage.setItem('cached_sources', JSON.stringify(remote));
            // Ensure selectedSource remains valid
            const stillExists = remote.find((r) => r.name === selectedSource?.name);
            if (!stillExists) setSelectedSource(remote[0]);
          }
        }
      } catch (_) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkNetworkStatus = async () => {
      const networkState = await Network.getNetworkStateAsync();
      setIsOffline(!(networkState?.isConnected && networkState?.isInternetReachable !== false));
    };

    checkNetworkStatus();

    const interval = setInterval(checkNetworkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Sync bookmarks across tabs via DeviceEventEmitter and focus
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('bookmarks_updated', fetchBookmarks);
    return () => sub.remove();
  }, [fetchBookmarks]);

  useFocusEffect(
    useCallback(() => {
      fetchBookmarks();
    }, [fetchBookmarks])
  );
  

  const openArticle = async (link) => {
    const supported = await Linking.canOpenURL(link);
    if (supported) await Linking.openURL(link);
  };

  const toggleBookmark = async (article) => {
    const exists = bookmarked.find((a) => a.link === article.link);
    const updated = exists
      ? bookmarked.filter((a) => a.link !== article.link)
      : [...bookmarked, article];
    setBookmarked(updated);
    await AsyncStorage.setItem('bookmarkedArticles', JSON.stringify(updated));
  };

  const isBookmarked = (link) => bookmarked.some((a) => a.link === link);

  const filteredArticles = articles.filter((article) => {
    const t = (article?.title || '').toLowerCase();
    const d = (article?.description || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase();
    return t.includes(q) || d.includes(q);
  });

  const renderArticleItem = useMemo(() => ({ item }) => (
    <TouchableOpacity
      style={[styles.article(isDarkMode)]}
      onPress={() => openArticle(item.link)}
      onLongPress={() => {
        setSelectedArticle(item);
        setModalVisible(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open article: ${item.title}`}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : null}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title(isDarkMode)]}>{item.title}</Text>
          <TouchableOpacity
            onPress={() => toggleBookmark(item)}
            accessibilityLabel={`Bookmark toggle for: ${item.title}`}
            accessibilityHint={isBookmarked(item.link) ? 'Remove bookmark' : 'Add bookmark'}
          >
            <Ionicons
              name={isBookmarked(item.link) ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isDarkMode ? '#00aced' : '#007aff'}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.meta(isDarkMode)]}>{formatDate(item.pubDate)}</Text>
        <Text numberOfLines={3} style={[styles.description(isDarkMode)]}>
          {cleanHtml(item?.description || '')}
        </Text>
        <TouchableOpacity
          onPress={() => handleShare(item)}
          accessibilityLabel={`Share article: ${item.title}`}
          accessibilityHint="Share this article with others"
        >
          <Ionicons name="share-social-outline" size={22} color={isDarkMode ? '#00aced' : '#007aff'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [bookmarked, isDarkMode]);

  const renderTabItem = useMemo(() => ({ item, index }) => {
    const isActive = selectedSource.name === item.name;
    return (
      <TouchableOpacity
        style={[
          styles.sourceButton(isDarkMode),
          isActive && styles.activeSourceButton,
        ]}
        onPress={() => {
          setSelectedSource(item);
          setSelectedIndex(index);
          InteractionManager.runAfterInteractions(() => {
            if (tabListRef.current && index >= 0 && index < sources.length) {
              tabListRef.current.scrollToIndex({ index, animated: true });
            }
          });
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`Select news source: ${item.name}`}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.sourceText(isDarkMode), isActive && styles.activeSourceText]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedSource, sources, isDarkMode]);

  return (
    <SafeAreaView style={[styles.container(isDarkMode)]}>
      {isOffline && <Text style={styles.offlineMessage}>You are offline. Viewing cached articles.</Text>}

      <TextInput
        style={[styles.searchInput(isDarkMode)]}
        placeholder="Search articles"
        placeholderTextColor={isDarkMode ? '#b2bec3' : '#999'}
        onChangeText={(text) => setSearchQuery(text)}
        value={searchQuery}
      />

      {!loading && (
        <FlatList
          ref={tabListRef}
          data={sources}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={sources.length}
          initialScrollIndex={Math.min(selectedIndex, sources.length - 1)}
          getItemLayout={(data, index) => ({
            length: 110, // approx width of each tab with padding
            offset: 110 * index,
            index,
          })}
          extraData={{selectedIndex, sources}}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4 }}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          renderItem={renderTabItem}
          style={{ maxHeight: 50 }}
        />
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 20 }} />
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredArticles}
            keyExtractor={(item, index) => {
              const a = item?.link || item?.guid || '';
              const b = item?.pubDate || '';
              const c = item?.title || '';
              return `${a}|${b}|${c}|${index}`;
            }}
            renderItem={renderArticleItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ opacity: 0.7 }}>No articles found. Pull to refresh or try another source.</Text>
              </View>
            }
          />
        </View>
      )}

      <Modal visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContent(isDarkMode)}>
          <Text style={styles.title(isDarkMode)}>{selectedArticle?.title}</Text>
          <Text style={styles.description(isDarkMode)}>{cleanHtml(selectedArticle?.description || '')}</Text>
          <Button title="Close" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Tab = createBottomTabNavigator();

const NewsScreen = () => {
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme.mode === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            borderTopColor: isDarkMode ? '#2c2c2c' : '#ccc',
          },
          tabBarActiveTintColor: isDarkMode ? '#bb86fc' : '#007aff',
          tabBarInactiveTintColor: isDarkMode ? '#888' : 'gray',
          tabBarIcon: ({ color, size }) => {
            let iconName;
            if (route.name === 'News') {
              iconName = 'article';
            } else if (route.name === 'Bookmarks') {
              iconName = 'bookmark';
            }
            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
        };
      }}
    >
      <Tab.Screen name="News" component={NewsTab} />
      <Tab.Screen name="Bookmarks" component={BookmarkScreen} />
    </Tab.Navigator>
  );
};

export default NewsScreen;

const styles = StyleSheet.create({
  container: (isDarkMode) => ({
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
  }),
  
  sourceButton: (isDarkMode) => ({
    backgroundColor: isDarkMode ? '#444' : '#dfe6e9',
    paddingHorizontal: 15,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderRadius: 16,
  }),
  
  activeSourceButton: {
    backgroundColor: '#007aff',
  },
  
  sourceText: (isDarkMode) => ({
    color: isDarkMode ? '#fff' : '#000',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  }),
  
  activeSourceText: {
    color: '#fff',
  },  
  
  searchInput: (isDarkMode) => ({
    height: 40,
    borderColor: isDarkMode ? '#555' : '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 10,
    color: isDarkMode ? '#fff' : '#000',
    backgroundColor: isDarkMode ? '#2c2c2e' : '#fff',
  }),
  list: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  article: (isDarkMode) => ({
    backgroundColor: isDarkMode ? '#2c2c2e' : '#ffffff',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
  }),
  thumbnail: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: (isDarkMode) => ({
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    color: isDarkMode ? '#ffffff' : '#2d3436',
  }),
  meta: (isDarkMode) => ({
    fontSize: 12,
    color: isDarkMode ? '#b2bec3' : '#636e72',
    marginTop: 4,
    marginBottom: 6,
  }),
  description: (isDarkMode) => ({
    fontSize: 14,
    color: isDarkMode ? '#dfe6e9' : '#2f3640',
  }),
  offlineMessage: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
  },
  modalContent: (isDarkMode) => ({
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
  }),
});