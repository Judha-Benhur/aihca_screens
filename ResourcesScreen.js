import React, { useState, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

const ResourcesScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [showLinks, setShowLinks] = useState(null);
  /*const [adVisible, setAdVisible] = useState(false);*/
  const [loadingLink, setLoadingLink] = useState(null);

  const studyResources = [
    {
      title: 'Power Point Presentations',
      links: [
        'https://www.slideshare.net/AIHCArchaeoJiwajiUni/presentations',
        'https://www.slideshare.net/thegreathistoryofhum/presentations'
      ],
      icon: 'computer'
    },
    {
      title: 'Sample Assignments',
      links: [
        'https://drive.google.com/drive/folders/15nAugrP3PTA6yucylLRqxsqs-GrkHsSi?usp=share_link'
      ],
      icon: 'description'
    },
    {
      title: 'Sample Practical Files',
      links: [
        'https://drive.google.com/drive/folders/10I8_i8Nk3v4g56veqDlU2y8rW4yR3cni?usp=share_link'
      ],
      icon: 'science'
    },
    { title: 'Previous Year Exam Papers', icon: 'menu-book', screen: 'Previous Papers' },
    { title: 'Notes', icon: 'bookmark', screen: 'Notes' },
  ];

  const handlePress = useCallback((item) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (item.links) {
      setShowLinks((prev) => (prev === item.title ? null : item.title));
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  }, [navigation]);

  const handleLinkPress = async (link) => {
    setLoadingLink(link);
    try {
      const supported = await Linking.canOpenURL(link);
      if (supported) {
        await Linking.openURL(link);
      } else {
        Alert.alert('Error', 'This link is not supported.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the link.');
      console.error('Error opening link:', error);
    } finally {
      setLoadingLink(null);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
          data={studyResources}
          keyExtractor={(item, index) => `resource-${index}`}
          renderItem={({ item }) => (
            <SectionItem
              item={item}
              showLinks={showLinks === item.title}
              onPress={() => handlePress(item)}
              onLinkPress={handleLinkPress}
              loadingLink={loadingLink}
              theme={theme}
            />
          )}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.text }]}>No resources available.</Text>}
          ListFooterComponent={<View style={{ height: 60 }} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const SectionItem = React.memo(({ item, showLinks, onPress, onLinkPress, loadingLink, theme }) => (
  <TouchableOpacity
    style={[styles.section, showLinks && { backgroundColor: theme.card }]}
    onPress={onPress}
    accessibilityLabel={item.title}
    accessibilityHint={`Opens ${item.title}`}
    accessibilityRole="button"
    activeOpacity={0.85}
  >
    <View style={styles.sectionHeader}>
      <MaterialIcons name={item.icon} size={24} color={theme.text} style={styles.icon} />
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{item.title}</Text>
    </View>

    {showLinks && item.links && (
      <View style={styles.linksContainer}>
        {item.links.map((link, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onLinkPress(link)}
            style={styles.linkTouchable}
            accessibilityLabel={`Link ${index + 1}`}
            accessibilityRole="link"
            activeOpacity={0.7}
          >
            <Text style={[styles.linkText, { color: theme.link }]}>
              {loadingLink === link ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                `🔗 ${new URL(link).hostname.replace('www.', '')}`
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: Platform.OS === 'android' ? 25 : 0
  },
  section: {
    marginVertical: 6,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    marginRight: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  linksContainer: {
    marginTop: 10
  },
  linkTouchable: {
    paddingVertical: 6
  },
  linkText: {
    fontSize: 16
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16
  }
});

export default ResourcesScreen;
