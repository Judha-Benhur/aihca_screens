import React, { useState } from 'react';
import DrivePopup from '../components/DrivePopup';
import SubjectPicker from '../components/subjectsPicker';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

const PreviousPapersScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const { theme } = useTheme();

  const goBackToHome = () => {
    navigation.navigate('Home');
  };

  const onSubjectPress = (subject) => {
    if (subject.previousPapers) {
      setIsLoading(true);
      setWebViewUrl(subject.previousPapers);
      setWebViewVisible(true);
    } else {
      Alert.alert('No Papers', 'Previous papers not available for this subject.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Select a Subject to View Previous Papers</Text>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Picker with fallback */}
        <View style={styles.pickerWrapper}>
          <SubjectPicker
            onSubjectPress={onSubjectPress}
          />
        </View>
      </ScrollView>
      {isLoading && <ActivityIndicator size="large" color={theme.text} style={styles.loader} />}
      <DrivePopup
        visible={webViewVisible}
        url={webViewUrl}
        onClose={() => {
          setWebViewVisible(false);
          setIsLoading(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is now set dynamically via theme in the component
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    // color is now set dynamically via theme in the component
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  pickerWrapper: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'flex-start',
  },
  loader: {
    marginTop: 20,
    alignSelf: 'center',
  },
});

export default PreviousPapersScreen;
