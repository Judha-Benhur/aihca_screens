// src/screens/MusicalInstrumentsScreen.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, FlatList, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import InstrumentCard from '../components/instruments/InstrumentCard';
import InstrumentDetailModal from '../components/instruments/instrumentDetailModal';
import FilterBar from '../components/instruments/FilterBar';
import { getInstruments, getInstrumentBookmarks, setInstrumentBookmarks } from '../services/instrumentsService';

export default function MusicalInstrumentsScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || { background: '#fff', text: '#000' };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [bookmarks, setBookmarks] = useState(new Set());

  const listRef = useRef(null);

  // Initial load
  useEffect(() => {
    (async () => {
      const [data, marks] = await Promise.all([getInstruments(), getInstrumentBookmarks()]);
      setItems(data);
      setBookmarks(marks);
      setLoading(false);
    })();
  }, []);

  // Refresh bookmarks when screen focuses (keeps in sync if changed elsewhere)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const marks = await getInstrumentBookmarks();
        setBookmarks(marks);
      })();
    }, [])
  );

  // Keep UX snappy: scroll to top on filter/search changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [query, type, period]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const fresh = await getInstruments({ forceRefresh: true });
    setItems(fresh);
    setRefreshing(false);
  }, []);

  const typeOptions = useMemo(() => {
    const s = new Set();
    items.forEach((it) => it.type && s.add(it.type));
    return Array.from(s).sort();
  }, [items]);

  const periodOptions = useMemo(() => {
    const s = new Set();
    items.forEach((it) => it.period && s.add(it.period));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQ =
        q.length === 0 ||
        it.name.toLowerCase().includes(q) ||
        (it.region || '').toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q);
      const matchesType = type === 'ALL' || it.type === type;
      const matchesPeriod = period === 'ALL' || it.period === period;
      return matchesQ && matchesType && matchesPeriod;
    });
  }, [items, query, type, period]);

  const toggleBookmark = useCallback(async (id) => {
    const next = new Set(bookmarks);
    if (next.has(id)) next.delete(id); else next.add(id);
    setBookmarks(next);
    await setInstrumentBookmarks(next);
  }, [bookmarks]);

  const renderItem = useCallback(({ item }) => (
    <InstrumentCard
      item={item}
      isBookmarked={bookmarks.has(item.id)}
      onPress={() => setSelected(item)}
    />
  ), [bookmarks]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems:'center', backgroundColor: colors.background }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: colors.text }}>Loading instruments…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={12}
        windowSize={10}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          () => (
            <FilterBar
              query={query} setQuery={setQuery}
              type={type} setType={setType}
              period={period} setPeriod={setPeriod}
              typeOptions={typeOptions}
              periodOptions={periodOptions}
            />
          )
        }
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.text + '99' }}>
              No instruments match your filters.
            </Text>
          </View>
        }
      />

      <InstrumentDetailModal
        visible={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
        isBookmarked={selected ? bookmarks.has(selected.id) : false}
        onToggleBookmark={() => selected && toggleBookmark(selected.id)}
      />
    </View>
  );
}