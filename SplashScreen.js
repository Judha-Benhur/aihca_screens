// SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, StatusBar, Animated, ActivityIndicator, useColorScheme, Text } from 'react-native';

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('Home'); // Prevents back navigation to Splash
    }, 2000);

    return () => clearTimeout(timer); // Cleanup function to prevent memory leaks
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f7f7f7' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} hidden={false} />
      <Animated.Image
        source={require('../../assets/splash.png')}
        style={[styles.splashImage, { opacity: fadeAnim }]}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} style={{ marginTop: 20 }} />
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>AIHCA</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#555' }]}>Curated Knowledge</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7', // Softer background
    paddingHorizontal: 20,
  },
  splashImage: {
    width: '100%',
    height: 'auto',
    maxHeight: 300,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
});

export default SplashScreen;