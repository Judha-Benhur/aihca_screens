import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import SubjectPicker from '../components/subjectsPicker';
import DrivePopup from '../components/DrivePopup';
import { ThemeContext } from '../theme/ThemeContext';

const SyllabusScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewTitle, setWebViewTitle] = useState('');

  const { theme } = useContext(ThemeContext);

  const onSubjectPress = (subject) => {
    if (subject.syllabus) {
      if (!/^https?:/.test(subject.syllabus)) {
        Alert.alert('Invalid Link', 'The syllabus link is not valid.');
        return;
      }
      setWebViewUrl(subject.syllabus);
      setWebViewTitle(subject.name);
      setWebViewVisible(true);
    } else {
      Alert.alert('No Syllabus', 'Syllabus not available for this subject.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Select a Subject to View Syllabus</Text>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pickerWrapper}>
          <SubjectPicker onSubjectPress={onSubjectPress} />
        </View>
        {isLoading && <ActivityIndicator size="large" color={theme.text} style={styles.loader} />}
      </ScrollView>
      <DrivePopup
        visible={webViewVisible}
        url={webViewUrl}
        title={webViewTitle}
        onClose={() => setWebViewVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  pickerWrapper: {
    marginBottom: 30,
  },
  loader: {
    marginTop: 20,
  },
});

export default SyllabusScreen;
