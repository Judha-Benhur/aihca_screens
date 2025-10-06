import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import NotificationModal from '../components/NotificationModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import { useTheme } from '../theme/ThemeContext';
import BuyMeCoffeeButton from '../components/BuyMeCoffeeButton';
import QuoteOfTheDay from '../components/home/QuoteOfTheDay';
import { useFocusEffect } from '@react-navigation/native';
import { NOTIFICATION_API } from '../data/api/apis';

// Reusable Card Component
const AppCard = ({ icon, title, onPress, styles }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconWrapper}>{icon}</View>
    <Text style={styles.cardText}>{title}</Text>
  </TouchableOpacity>
);

// Main Screen Component
const HomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const SIX_HOURS = 6 * 60 * 60 * 1000;

  const refreshUnreadFromCache = async () => {
    try {
      const saved = await AsyncStorage.getItem('notifications');
      if (!saved) { setUnreadCount(0); return; }
      const arr = JSON.parse(saved);
      const count = Array.isArray(arr) ? arr.filter(n => !n.read).length : 0;
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    (async () => {
      await refreshUnreadFromCache();
      const now = Date.now();
      const lastShown = parseInt(await AsyncStorage.getItem('lastShown')) || 0;
      if (now - lastShown > SIX_HOURS) {
        setModalVisible(true);
        await AsyncStorage.setItem('lastShown', String(now));
      }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshUnreadFromCache();
      return () => {};
    }, [])
  );

  useEffect(() => {
    if (!modalVisible) {
      // When it closes, refresh from cache so badge updates
      refreshUnreadFromCache();
    }
  }, [modalVisible]);

  const renderItem = ({ item }) => (
    <AppCard
      title={item.title}
      icon={item.icon}
      onPress={() => navigation.navigate(item.screen)}
      styles={styles}
    />
  );

  return (
    <>
      <NotificationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        autoFetch
        endpointUrl={`${NOTIFICATION_API}`}
        forceRefreshOnOpen={true}   // fetch in background even if modal is closed
        lockDurationMs={5000}
        showTimeAgo={true}
      />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <AppHeader
          title="AIHCA Jiwaji University"
          subtitle="A One-Stop Solution for Students"
          unreadCount={unreadCount}
          onBellPress={() => setModalVisible(true)}
          showBell={true}
        />
        <ScrollView contentContainerStyle={styles.gridContainer}>
          <QuoteOfTheDay style={styles.qotd} />
          <FlatList
            data={menuItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            key={'columns_2'}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No Menu Items</Text>}
          />
          <BuyMeCoffeeButton />
        </ScrollView>
        <AppFooter />
      </View>
    </>
  );
};

// Menu Items Config
const menuItems = [
  {
    id: 'study',
    title: 'Resources',
    screen: 'Resources',
    icon: <MaterialIcons name="folder" size={40} color="#fff" />,
  },
  {
    id: 'video',
    title: 'Video Lectures',
    screen: 'Video Lectures',
    icon: <MaterialIcons name="ondemand-video" size={40} color="#fff" />,
  },
  {
    id: 'news',
    title: 'News',
    screen: 'NewsTab',
    icon: <MaterialIcons name="newspaper" size={40} color="#fff" />,
  },
  {
    id: 'quiz',
    title: 'Quiz',
    screen: 'Quiz',
    icon: <MaterialIcons name="quiz" size={40} color="#fff" />,
  },
  {
    id: 'blog',
    title: 'Blog',
    screen: 'Blog',
    icon: <FontAwesome5 name="blog" size={40} color="#fff" />,
  },
  {
    id: 'inscriptions',
    title: 'Inscriptions',
    screen: 'Inscriptions',
    icon: <MaterialIcons name="translate" size={40} color="#fff" />,
  },
];

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  gridContainer: {
    paddingTop: 30,
    paddingBottom: 100,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qotd: {
    alignSelf: 'stretch',
    width: '100%',
    marginBottom: 12
  },
  card: {
    flexGrow: 1,
    width: '44%',
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrapper: {
    backgroundColor: theme.iconBg,
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen;