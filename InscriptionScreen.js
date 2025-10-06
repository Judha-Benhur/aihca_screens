import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, TextInput
} from 'react-native';
import InscriptionModal from '../components/InscriptionModal';
import INSCRIPTIONS_URL from '../data/api/apis';
const InscriptionsScreen = () => {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    const fetchInscriptions = async () => {
      try {
        const response = await fetch(INSCRIPTIONS_URL);
        const data = await response.json();
        setInscriptions(data.reverse()); // latest first
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch inscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchInscriptions();
  }, []);

  const filteredInscriptions = inscriptions.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.provenance.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search by title or provenance..."
        placeholderTextColor="#888"
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <FlatList
        data={filteredInscriptions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          // Extract Google Drive file ID and construct direct image link
          const driveImageIdMatch = item.image && item.image.match(/[-\w]{25,}/);
          const imageUri = driveImageIdMatch
            ? `https://drive.google.com/uc?id=${driveImageIdMatch[0]}`
            : item.image;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              {item.image && (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.title}>{item.title}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <InscriptionModal
        visible={!!selected}
        inscription={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
};

export default InscriptionsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#222',
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
  },
  title: { color: '#fff', fontSize: 16 },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
  },
  searchBar: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
});