// src/screens/StonesScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, RefreshControl, Switch, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext'; // adjust if needed
import StoneCard from '../components/stones/StoneCard';
import StoneDetailModal from '../components/stones/StoneDetailModal';
import {
  loadStonesOnlineFirst,
  refreshStonesOnlineFirst,
  getStoneBookmarks,
  toggleStoneBookmark,
} from '../services/stonesService';

export default function StonesScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || { background: '#fff', card: '#fff', text: '#000', border: '#e5e7eb' };
  const mode = theme.mode || 'light';

  const [data, setData] = useState([]);
  const [query, setQuery] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('network'); // 'network' | 'cache_fallback'
  const [error, setError] = useState('');

  // Online-first initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data: items, source: src } = await loadStonesOnlineFirst();
        if (!mounted) return;
        setData(items);
        setSource(src);
      } catch (e) {
        if (!mounted) return;
        setError('Could not load stones. Please check your connection.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // load bookmarks on focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const b = await getStoneBookmarks();
        if (alive) setBookmarks(b);
      })();
      return () => { alive = false; };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const { data: items, source: src } = await refreshStonesOnlineFirst();
      setData(items);
      setSource(src);
    } catch (e) {
      setError('Refresh failed. Showing last cached data (if available).');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(item => {
      const matchesQ =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.type && String(item.type).toLowerCase().includes(q)) ||
        (item.color && String(item.color).toLowerCase().includes(q)) ||
        (Array.isArray(item.uses) && item.uses.join(' ').toLowerCase().includes(q)) ||
        (Array.isArray(item.sites) && item.sites.join(' ').toLowerCase().includes(q));
      const matchesSaved = !onlySaved || bookmarks.includes(item.id);
      return matchesQ && matchesSaved;
    });
  }, [data, query, onlySaved, bookmarks]);

  const handleToggleBookmark = useCallback(async (id) => {
    const next = await toggleStoneBookmark(id);
    setBookmarks(next);
  }, []);

  const renderItem = ({ item }) => (
    <StoneCard item={item} onPress={setSelected} colors={colors} />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.row, styles.toolbar]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search stones, uses, sites..."
          placeholderTextColor={colors.text + '66'}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        <View style={styles.saveToggle}>
          <Text style={{ color: colors.text, marginRight: 6 }}>Saved</Text>
          <Switch value={onlySaved} onValueChange={setOnlySaved} />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={{ color: colors.text + '99', fontSize: 12 }}>
          Source: {source === 'network' ? 'Live' : 'Offline cache'}
        </Text>
        <Text style={{ color: colors.text + '99', fontSize: 12 }}>
          Count: {filtered.length}
        </Text>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={{ color: colors.text }}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: colors.text + '99' }}>Loading stones…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.text + '99' }}>No results</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <StoneDetailModal
        visible={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
        onToggleBookmark={() => selected && handleToggleBookmark(selected.id)}
        bookmarked={selected ? bookmarks.includes(selected.id) : false}
        colors={colors}
        mode={mode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveToggle: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 6 },
  empty: { alignItems: 'center', marginTop: 24 },
  loader: { alignItems: 'center', marginTop: 40 },
  errorBox: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});