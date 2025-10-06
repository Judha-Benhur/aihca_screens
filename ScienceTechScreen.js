import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

import SearchBar from '../components/science/SearchBar';
import FilterPills from '../components/science/FilterPills';
import ScienceTechCard from '../components/science/ScienceTechCard';
import ScienceTechDetailModal from '../components/science/ScienceTechDetailModal';

import { fetchScienceTech, loadFromCache, isStale } from '../services/scienceTechApi';

export default function ScienceTechScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || {
    background: '#fff',
    card: '#fff',
    text: '#000',
    border: '#e5e7eb',
    muted: '#667085',
    primary: '#2563eb',
  };

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [fieldFilter, setFieldFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');

  const searchTimer = useRef(null);

  // Initial: read cache, then revalidate if stale
  useEffect(() => {
    (async () => {
      const cached = await loadFromCache();
      if (cached?.items) {
        setData(cached.items);
        setLoading(false);
        if (isStale(cached.timestamp)) void doFetch({ silent: true });
      } else {
        void doFetch();
      }
    })();
  }, []);

  // Debounced re-fetch on query / filters
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void doFetch(), 300);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
  }, [search, fieldFilter, periodFilter]);

  async function doFetch({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const items = await fetchScienceTech({ q: search, field: fieldFilter, period: periodFilter });
      setData(items);
    } catch (e) {
      setError(e?.message || 'Failed to load');
      const cached = await loadFromCache();
      if (cached?.items) setData(cached.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    void doFetch();
  };

  const { fields, periods } = useMemo(() => {
    const fs = new Set();
    const ps = new Set();
    (data || []).forEach((it) => {
      if (it.field) fs.add(String(it.field));
      if (it.period) ps.add(String(it.period));
    });
    return {
      fields: ['All', ...Array.from(fs).sort()],
      periods: ['All', ...Array.from(ps).sort()],
    };
  }, [data]);

  const renderItem = ({ item, index }) => (
    <ScienceTechCard
      item={item}
      onPress={setSelected}
      bg={colors.card}
      border={colors.border}
      titleColor={colors.text}
      subColor={colors.muted}
    />
  );

  const keyExtractor = (item, index) => String(item.id || `${item.topic}-${index}`);

  const Header = () => (
    <View style={{ paddingHorizontal: 0, paddingBottom: 8 }}>
      <SearchBar
        value={search}
        onChange={setSearch}
        borderColor={colors.border}
        textColor={colors.text}
        bgColor={theme.mode === 'dark' ? '#111827' : '#fff'}
        placeholderColor={theme.mode === 'dark' ? '#9CA3AF' : '#667085'}
      />
      <FilterPills
        values={fields}
        active={fieldFilter}
        onChange={setFieldFilter}
        borderColor={colors.border}
        activeBg={colors.primary}
        activeText="#fff"
        idleText={colors.text}
      />
      <FilterPills
        values={periods}
        active={periodFilter}
        onChange={setPeriodFilter}
        borderColor={colors.border}
        activeBg={colors.primary}
        activeText="#fff"
        idleText={colors.text}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
            {loading ? (
              <>
                <ActivityIndicator size="small" />
                <Text style={{ color: colors.muted, marginTop: 8 }}>Loading…</Text>
              </>
            ) : error ? (
              <Text style={{ color: colors.muted, textAlign: 'center' }}>{`Could not load data.\nPull down to retry.`}</Text>
            ) : (
              <Text style={{ color: colors.muted }}>No results</Text>
            )}
          </View>
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={8}
      />
      <ScienceTechDetailModal
        visible={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
        bg={colors.card}
        border={colors.border}
        titleColor={colors.text}
        mutedColor={colors.muted}
        textColor={colors.text}
      />
    </View>
  );
}