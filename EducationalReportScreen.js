import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

const EducationalReportScreen = () => {
  return (
    <View style={styles.screen}>
      <AppHeader title="Educational Reports" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Field Trip Reports</Text>
        <Text style={styles.comingSoon}>Coming Soon...</Text>
      </ScrollView>
      <AppFooter />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    color: '#222',
  },
  comingSoon: {
    fontSize: 18,
    color: '#888',
  },
});

export default EducationalReportScreen;