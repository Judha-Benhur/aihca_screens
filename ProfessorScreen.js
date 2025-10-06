import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { useContext } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import professorsData from '../data/professors';

export default function ProfessorScreen() {
  const { theme } = useContext(ThemeContext);

  const renderItem = ({ item, index }) => (
    <View
      key={item.id}
      style={[
        styles.itemContainer,
        { backgroundColor: theme.card, borderColor: theme.border }
      ]}
    >
      <Text
        style={[styles.name, { color: theme.text }]}
        accessibilityLabel={`Professor name ${item.name}`}
      >
        {item.name}
      </Text>
      <Text
        style={[styles.department, { color: theme.textSecondary }]}
        accessibilityLabel={`Department ${item.department}`}
      >
        {item.department}
      </Text>
      <Text
        style={[styles.duration, { color: theme.textSecondary }]}
        accessibilityLabel={`Duration ${item.duration}`}
      >
        HoD from {item.duration}
      </Text>
      {index !== professorsData.length - 1 && (
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={professorsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 20 }}>
            No professors found.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  separator: {
    height: 1,
    marginTop: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  department: {
    fontSize: 18,
    marginTop: 4,
  },
  duration: {
    fontSize: 16,
    marginTop: 4,
  },
});