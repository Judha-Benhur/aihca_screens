import React, { useState, useContext } from 'react';
import DrivePopup from '../components/DrivePopup';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Linking, ActivityIndicator, Alert } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

const ReferenceBooksScreen = () => {
  const { theme } = useContext(ThemeContext);
  console.log('ThemeContext theme value:', theme);
  const isDark = theme.mode === 'dark';

  const [isLoading, setIsLoading] = useState(false);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');

  const pdfFiles = {
    'Semester 1': [
      { name: 'Semester 1', file: 'https://drive.google.com/drive/folders/1UHwt9lWLd9JrvHfOVudJv8Lxgm8iR4rl?usp=share_link' },
    ],
    'Semester 2': [
      { name: 'Semester 2', file: 'https://drive.google.com/drive/folders/1-iSE8EvN-cdt2-k3V73rTppKrm-JI3O_?usp=share_link' },
    ],
    'Semester 3': [
      { name: 'Semester 3', file: 'https://drive.google.com/drive/folders/1dt2jOksY97ErgRtFH7e1DgJdeFCgX58z?usp=share_link' },
    ],
    'Semester 4': [
      { name: 'Semester 4', file: 'https://drive.google.com/drive/folders/1v-1pDYPGfe2vAfjGwlwcVuzAJpxwLLAX?usp=share_link' },
    ],
    'Others': [
      { name: 'Misc', file: 'https://drive.google.com/drive/folders/16VVUP8tfNas1EqUaHLzcb2tWE7N-RfK3?usp=share_link' },
    ],
  };

  const openPdf = (file) => {
    if (!file || typeof file !== 'string') {
      Alert.alert('Invalid Link', 'No valid PDF link found for this subject.');
      return;
    }
    setWebViewUrl(file);
    setWebViewVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <FlatList
        contentContainerStyle={styles.scrollContent}
        data={Object.entries(pdfFiles)}
        keyExtractor={([semester]) => semester}
        renderItem={({ item }) => {
          const [semester, files] = item;
          const file = files[0]; // assuming one file per semester
          return (
            <TouchableOpacity
              style={[styles.dropdown, isDark && styles.dropdownDark]}
              onPress={() => openPdf(file.file)}
            >
              <Text style={[styles.selectedText, isDark && styles.selectedTextDark]}>{file.name}</Text>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={isLoading ? <ActivityIndicator size={50} color="#007AFF" style={styles.loading} /> : null}
      />
      <DrivePopup
        visible={webViewVisible}
        url={webViewUrl}
        onClose={() => setWebViewVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  dropdown: {
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 16,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownDark: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
  },
  selectedTextDark: {
    color: '#eee',
  },
  loading: {
    marginTop: 20,
  },
});

export default ReferenceBooksScreen;
