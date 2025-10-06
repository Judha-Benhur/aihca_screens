import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SafeAreaView, View, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import SearchFilterBar from '../components/guild/SearchFilterBar';
import GuildCard from '../components/guild/GuildCard';
import GuildDetailModal from '../components/guild/GuildDetailModal';
import { LoaderGrid, EmptyOrError } from '../components/guild/StateViews';
import { GUILDS_URL } from '../data/api/apis';
/** ========= CONFIG ========= */

/** ========= HELPERS ========= */
const toArray = (v) => Array.isArray(v) ? v.filter(Boolean) : (typeof v === 'string' && v.trim() ? v.split(/[;,]/g).map(s=>s.trim()).filter(Boolean) : []);
const normalizeRow = (item) => {
  if (!item || typeof item !== 'object') return null;
  const o = {
    id: String(item.id ?? '').trim(),
    name: String(item.name ?? '').trim(),
    industry: String(item.industry ?? '').trim(),
    materials: toArray(item.materials),
    techniques: toArray(item.techniques),
    sites: toArray(item.sites),
    period: String(item.period ?? '').trim(),
    image: String(item.image ?? '').trim(),
    description: String(item.description ?? '').trim(),
    published: item.published === true || String(item.published).toLowerCase() === 'true',
  };
  return (!o.id && !o.name) ? null : o;
};
const fetchJsonWithTimeout = async (url, ms = 12000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timed out')), ms);
  });
  let res;
  try {
    res = await Promise.race([
      fetch(url, { headers: { Accept: 'application/json' } }),
      timeoutPromise,
    ]);
    if (!res || !res.ok) {
      const text = res && res.text ? await res.text().catch(() => '') : '';
      const snippet = text ? text.slice(0, 200) : '';
      throw new Error(`HTTP ${res ? res.status : '0'} ${res ? res.statusText : 'Fetch failed'} — ${snippet}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.toLowerCase().includes('application/json')) {
      const text = await res.text().catch(() => '');
      const snippet = text ? text.slice(0, 200) : '';
      throw new Error(`Non-JSON response — ${snippet}`);
    }
    return await res.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

function usePalette() {
  const themeHook = (typeof useTheme === 'function') ? useTheme() : {};
  const theme = (themeHook && typeof themeHook === 'object') ? themeHook : {};
  const dark = theme.mode === 'dark';
  return dark
    ? { background:'#0b0f14', card:'#121821', text:'#e5eef7', border:'#233041', primary:'#5b8cff', onPrimary:'#ffffff', skeleton:'#1a2431', muted:'#8aa0b8' }
    : { background:'#f7f9fc', card:'#ffffff', text:'#0f172a', border:'#e5e7eb', primary:'#3b82f6', onPrimary:'#ffffff', skeleton:'#eef2f7', muted:'#475569' };
}

/** ========= SCREEN ========= */
function GuildsScreenInner() {
  const palette = usePalette();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [bookmarks, setBookmarks] = useState([]);

  // Load bookmarks
  useEffect(() => { (async () => {
    try { const saved = await AsyncStorage.getItem('guildBookmarks'); if (saved) setBookmarks(JSON.parse(saved)); } catch {}
  })(); }, []);

  // Fetch
  const load = useCallback(async () => {
    setErrorMsg(''); setLoading(true);
    try {
      const json = await fetchJsonWithTimeout(GUILDS_URL, 12000);
      const arr = Array.isArray(json) ? json : (json?.items ?? []);
      const normalized = arr.map(normalizeRow).filter(Boolean).filter(x => x.published)
        .sort((a,b) => String(a.name).localeCompare(String(b.name)));
      setData(normalized);
      console.log('Guilds loaded:', normalized.length);
      await AsyncStorage.setItem('guilds_cache_v1', JSON.stringify(normalized));
    } catch (err) {
      console.error('Guilds fetch error:', err);
      setErrorMsg(err?.message || 'Network request failed');
      try {
        const cached = await AsyncStorage.getItem('guilds_cache_v1');
        const parsed = cached ? JSON.parse(cached) : [];
        setData(Array.isArray(parsed) ? parsed : []);
      } catch { setData([]); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  // Derived
  const industries = useMemo(() => {
    const s = new Set(['All']); data.forEach(d => d?.industry && s.add(d.industry)); return Array.from(s);
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(item => {
      const industryOk = selectedIndustry === 'All' || (item.industry || '').toLowerCase() === selectedIndustry.toLowerCase();
      if (!q) return industryOk;
      const blob = [item.name, item.description, item.industry, item.period, ...(item.materials||[]), ...(item.techniques||[]), ...(item.sites||[])].join(' ').toLowerCase();
      return industryOk && blob.includes(q);
    });
  }, [data, query, selectedIndustry]);

  // Bookmarks
  const toggleBookmark = useCallback(async (id) => {
    try {
      const upd = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
      setBookmarks(upd);
      await AsyncStorage.setItem('guildBookmarks', JSON.stringify(upd));
    } catch {}
  }, [bookmarks]);

  // Layout
  const keyExtractor = useCallback((item, idx) => String(item?.id || idx), []);
  const renderItem = useCallback(({ item, index }) => (
    <View style={[styles.cardWrap, (index % 2 === 0) ? styles.left : styles.right]}>
      <GuildCard
        item={item}
        palette={palette}
        bookmarked={bookmarks.includes(item.id)}
        onToggleBookmark={() => toggleBookmark(item.id)}
        onPress={() => setSelectedItem(item)}
      />
    </View>
  ), [bookmarks, palette, toggleBookmark]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
      <SearchFilterBar
        palette={palette}
        value={query}
        onChange={setQuery}
        industries={industries}
        selectedIndustry={selectedIndustry}
        onSelectIndustry={setSelectedIndustry}
      />

      {loading ? (
        <LoaderGrid palette={palette} />
      ) : filtered.length === 0 ? (
        <EmptyOrError palette={palette} message={errorMsg || 'No crafts match your filters.'} onRefresh={onRefresh} refreshing={refreshing} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          initialNumToRender={8}
          windowSize={11}
          maxToRenderPerBatch={8}
          ListFooterComponent={<View style={{ height: 8 }} />}
        />
      )}

      <GuildDetailModal
        visible={!!selectedItem}
        item={selectedItem}
        palette={palette}
        onClose={() => setSelectedItem(null)}
        onToggleBookmark={() => selectedItem && toggleBookmark(selectedItem.id)}
        isBookmarked={!!selectedItem && bookmarks.includes(selectedItem.id)}
      />
    </SafeAreaView>
  );
}

/** ========= EXPORT ========= */
export default function GuildsScreen(props){
  return (
    <ScreenErrorBoundary>
      <GuildsScreenInner {...props} />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root:{ flex:1 },
  column:{ justifyContent:'space-between' },
  cardWrap:{ width:'48%', marginBottom:12 },
  left:{ marginRight:'4%' }, right:{ marginLeft:'0%' },
});