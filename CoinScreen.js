import React, { useMemo, useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import useCoins from '../hooks/useCoins';
import useCoinFilters from '../hooks/useCoinFilters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../services/storageKeys';
import SyncStatusBar from '../components/coins/SyncStatusBar';
import CoinSearchBar from '../components/coins/CoinSearchBar';
import CoinSortMenu from '../components/coins/CoinSortMenu';
import CoinFilterBar from '../components/coins/CoinFilterBar';
import CoinList from '../components/coins/CoinList';
import ErrorState from '../components/coins/ErrorState';
import CoinDetailModal from '../components/coins/CoinDetailModal';

export default function CoinScreen() {
  const { colors } = useTheme();
  const { data, lastSync, isLoading, isRefreshing, error, offline, refetch } = useCoins();
  const { list, search, setSearch, sort, setSort, facets, selected, setSelected, clearAll } = useCoinFilters(data);

  // simple bookmark state (local to this screen)
  const [bookmarks, setBookmarks] = useState({});
  const [detail, setDetail] = useState({ open: false, coin: null });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.coinsBookmarks);
        const obj = raw ? JSON.parse(raw) : {};
        setBookmarks(obj || {});
      } catch {}
    })();
  }, []);

  const isBookmarked = (id) => !!bookmarks[id];

  const toggleBookmark = async (item) => {
    const id = item?.id;
    if (!id) return;
    const next = { ...bookmarks, [id]: !bookmarks[id] };
    if (!next[id]) delete next[id];
    setBookmarks(next);
    await AsyncStorage.setItem(STORAGE_KEYS.coinsBookmarks, JSON.stringify(next));
  };

  const header = useMemo(() => (
    <View style={{ paddingBottom: 12 }}>
      <SyncStatusBar offline={offline} lastSyncISO={lastSync} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <CoinSearchBar value={search} onChangeText={setSearch} />
        </View>
        <CoinSortMenu value={sort} onChange={setSort} />
      </View>

      <View style={{ height: 10 }} />
      <CoinFilterBar
        periods={facets.periods}
        rulers={facets.rulers}
        denominations={facets.denominations}
        metals={facets.metals}
        selected={selected}
        onChange={setSelected}
        onClearAll={clearAll}
      />
    </View>
  ), [offline, lastSync, search, sort, facets, selected]);

  if (!isLoading && error && (!data || data.length === 0)) {
    return <ErrorState message="Couldn’t load coins. Check your internet and try again." onRetry={refetch} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CoinList
        data={list}
        loading={isLoading}
        refreshing={isRefreshing}
        onRefresh={refetch}
        renderHeader={header}
        onItemPress={(coin) => setDetail({ open: true, coin })}
        isBookmarked={isBookmarked}
        onToggleBookmark={toggleBookmark}
      />

      <CoinDetailModal
        visible={detail.open}
        coin={detail.coin}
        onClose={() => setDetail({ open: false, coin: null })}
      />
    </View>
  );
}