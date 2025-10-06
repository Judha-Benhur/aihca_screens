import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { ThemeContext } from '../theme/ThemeContext';

const AboutScreen = () => {
  const { theme } = useContext(ThemeContext);

  return (
    <ScreenWrapper style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.description, { color: theme.text }]}>
          Welcome to the unofficial app for the School of Studies in Ancient Indian History, Culture, 
          and Archaeology at Jiwaji University. This app is managed by students of the School of Archaeology 
          at Jiwaji University.
        </Text>
        <View style={[styles.separator, { backgroundColor: theme.text }]} />
        <View style={styles.footer}>
          <Text style={[styles.madeBy, { color: theme.text }]}>Made with ❤️ by Parth</Text>
          <Image 
            source={require('../../assets/PictoPatronum.png')} 
            style={styles.logo} 
            accessibilityLabel="PictoPatronum Logo"
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  separator: {
    height: 1,
    width: '80%',
    marginVertical: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  madeBy: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
});

export default AboutScreen;
