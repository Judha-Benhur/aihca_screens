import { useContext, useLayoutEffect } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';

export default function BlogScreen() {
  // const navigation = useNavigation();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const { theme } = useContext(ThemeContext);
  const isDark = theme.mode === 'dark';

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.card,
      },
      headerTintColor: theme.text,
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    });
  }, [navigation, theme]);

  const styles = StyleSheet.create({
    container: {
      padding: 30,
      backgroundColor: isDark ? theme.background : '#fff',
      flexGrow: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
      backgroundColor: isDark ? theme.background : '#fff',
    },
    statusText: {
      marginTop: 15,
      fontSize: 18,
      color: isDark ? theme.textSecondary : '#777',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 20,
      color: isDark ? theme.text : '#2c3e50',
    },
    content: {
      fontSize: 18,
      lineHeight: 28,
      color: isDark ? theme.text : '#333',
      textAlign: 'justify',
    },
    errorText: {
      fontSize: 20,
      color: 'red',
      textAlign: 'center',
    },
    author: {
      marginTop: 30,
      fontSize: 16,
      fontStyle: 'italic',
      color: isDark ? theme.textSecondary : '#555',
      textAlign: 'right',
    },
  });

  const fetchBlog = async () => {
  try {
    setError(null);
    const response = await fetch('https://script.google.com/macros/s/AKfycbx2M9uS_6Mstd7YREVv1MbRKxLMjWQzGmLa6CnU7h6NobjxYJo718uYhaZB_Xl_sBAV6w/exec');

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Invalid response format");
    }

    const data = await response.json();
    console.log('API full response:', data);

    if (data.error) {
      setError('No blog available for today.');
    } else {
      const blogData = {
        title: data.title || 'Untitled',
        content: data.content || 'No content',
        name: data.name || data.email || 'Anonymous',
      };
      console.log('Parsed blog:', blogData);
      setBlog(blogData);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
    setError('Failed to load blog. Please try again later.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    fetchBlog();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlog();
  };

  if (!loading && !error && (!blog || !blog.title.trim())) {
    return (
      <ScreenWrapper style={{ backgroundColor: theme.background }}>
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.statusText}>No blog available for today.</Text>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (loading) {
    return (
      <ScreenWrapper style={{ backgroundColor: theme.background }}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.statusText}>Loading today's blog...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper style={{ backgroundColor: theme.background }}>
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.errorText}>{error}</Text>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={{ backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>{blog?.title?.trim() || 'Untitled Post'}</Text>
        <Text style={styles.content}>{blog?.content?.trim() || 'No content available for this blog.'}</Text>
        <Text style={styles.author}>{blog?.name?.trim() || 'Anonymous'}</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}