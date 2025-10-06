import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../theme/ThemeContext';
import SubjectPicker from '../components/subjectsPicker';
import subjects from '../data/semesterSubjects';

const VideoLectureScreen = () => {
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.mode === 'dark';

  const onSubjectPress = (subject) => {
    const semester = Object.keys(subjects).find((sem) =>
      subjects[sem].some((sub) => sub.name.toLowerCase() === subject.name.toLowerCase())
    );

    if (!semester) {
      return Alert.alert('Not Found', 'Could not match the selected subject to any semester. Please try another.');
    }

    const selected = subjects[semester].find(
      (sub) => sub.name.toLowerCase() === subject.name.toLowerCase()
    );

    if (selected?.videoPlaylist?.startsWith('http')) {
      setPlaylistUrl(selected.videoPlaylist);
    } else {
      Alert.alert('No Playlist', 'No video playlist found for this subject.');
    }
  };

  const handleGoBack = () => setPlaylistUrl(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {playlistUrl ? (
        <View style={[styles.webViewContainer, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={[styles.backButton, { backgroundColor: theme.card }]}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? '#FF9500' : '#007AFF'} />
          </TouchableOpacity>
          <Text style={[styles.heading, { color: theme.text, marginBottom: 0 }]}>
            📺 {playlistUrl.includes('youtube') ? 'YouTube Playlist' : 'Video Playlist'}
          </Text>
          <WebView
            source={{ uri: playlistUrl }}
            style={[styles.webview, { backgroundColor: theme.background }]}
            renderError={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: theme.error }}>Failed to load video. Please try again later.</Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={[styles.selectionContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.heading, { color: theme.text }]}>🎓 Select a Subject to View Video Playlist</Text>
          <SubjectPicker onSubjectPress={onSubjectPress} />
          <Text style={[styles.tip, { color: theme.textSecondary }]}>Tip: Choose your subject to unlock a curated playlist.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  selectionContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  backButton: {
    padding: 12,
    alignSelf: 'flex-start',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
  },
  tip: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default VideoLectureScreen;