import React, { useCallback, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Image,
} from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

// --- utils ---
const cleanHtml = (html = '') => String(html).replace(/<[^>]+>/g, '');

const BookmarkScreen = () => {
  const [bookmarked, setBookmarked] = useState([]);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.mode === 'dark';

  useFocusEffect(
    useCallback(() => {
      const fetchBookmarks = async () => {
        const stored = await AsyncStorage.getItem('bookmarkedArticles');
        setBookmarked(stored ? JSON.parse(stored) : []);
      };

      fetchBookmarks();
    }, [])
  );

  const removeBookmark = async (guid) => {
    const updated = bookmarked.filter((item) => item.guid !== guid);
    setBookmarked(updated);
    await AsyncStorage.setItem('bookmarkedArticles', JSON.stringify(updated));
  };

  const openArticle = async (link) => {
    if (!link) return;
    try {
      const supported = await Linking.canOpenURL(link);
      if (supported) await Linking.openURL(link);
    } catch {}
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return '';
      return format(d, 'EEE, MMM d yyyy');
    } catch {
      return '';
    }
  };

  const renderItem = useCallback(({ item }) => {
    const safeTitle = (item?.title && String(item.title).trim())
      ? item.title
      : (cleanHtml(item?.description || '').slice(0, 80) || 'Untitled');
    const safeDesc = cleanHtml(item?.description || '');
    const safeThumb = item?.thumbnail || (isDark
      ? 'https://via.placeholder.com/150/1e1e1e/ffffff'
      : 'https://via.placeholder.com/150');
    const safeLink = item?.link || '';
    const guid = item?.guid || safeLink || safeTitle;

    return (
      <TouchableOpacity
        style={[styles.article, isDark && styles.articleDark]}
        onPress={() => openArticle(safeLink)}
        accessibilityLabel={`Open article: ${safeTitle}`}
      >
        <Image
          source={{ uri: safeThumb }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, isDark && styles.titleDark]}
              numberOfLines={2}
            >
              {safeTitle}
            </Text>
            <TouchableOpacity
              onPress={() => removeBookmark(guid)}
              accessibilityLabel="Remove bookmark"
              accessibilityHint="Removes this article from your bookmarks"
            >
              <Ionicons name="trash" size={22} color="#ff3b30" />
            </TouchableOpacity>
          </View>
          {!!formatDate(item?.pubDate) && (
            <Text style={[styles.meta, isDark && styles.metaDark]}>
              {formatDate(item?.pubDate)}
            </Text>
          )}
          {!!safeDesc && (
            <Text
              numberOfLines={3}
              style={[styles.description, isDark && styles.descriptionDark]}
            >
              {safeDesc}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [isDark, removeBookmark]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {bookmarked.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={[styles.emptyText, isDark && styles.emptyTextDark]}
            accessibilityRole="text"
            accessibilityHint="Indicates no articles are bookmarked"
          >
            You haven’t bookmarked any articles yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarked}
          keyExtractor={(item, index) => {
            const a = item?.guid || item?.link || '';
            const b = item?.pubDate || '';
            const c = (item?.title || '').slice(0, 24);
            return `${a}|${b}|${c}|${index}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

export default BookmarkScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 16,
  },
  containerDark: {
    backgroundColor: '#1e1e1e',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#000',
  },
  headerDark: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  article: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  articleDark: {
    backgroundColor: '#2c2c2e',
  },
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
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    color: '#2d3436',
  },
  titleDark: {
    color: '#f1f1f1',
  },
  meta: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 4,
    marginBottom: 6,
  },
  metaDark: {
    color: '#a5a5a5',
  },
  description: {
    fontSize: 14,
    color: '#2f3640',
  },
  descriptionDark: {
    color: '#dcdcdc',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyTextDark: {
    color: '#bbb',
    fontStyle: 'italic',
  },
});
