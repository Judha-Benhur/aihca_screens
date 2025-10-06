import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import PotteryCard from '../components/pottery/PotteryCard';
import PotteryDetailModal from '../components/pottery/PotteryDetailModal';
import { fetchPottery, buildFilters, toggleBookmark, listBookmarks } from '../services/potteryService';

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? '#38bdf8' : '#374151',
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? 'rgba(56,189,248,0.15)' : 'transparent'
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label} filter`}
    >
      <Text style={{ color: selected ? '#7dd3fc' : '#cbd5e1', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

export default function PotteryScreen() {
  const theme = useTheme();
  const colors = theme?.colors || { background: '#000', text: '#fff', border: '#222', card: '#0b0b0b' };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ updatedAt: '', items: [] });
  const [q, setQ] = useState('');
  const [ware, setWare] = useState('All');
  const [period, setPeriod] = useState('All');
  const [division, setDivision] = useState('All');
  const [bookmarks, setBookmarks] = useState([]);
  const [detail, setDetail] = useState(null);

  const filters = useMemo(() => buildFilters(data.items), [data.items]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchPottery();
    setData(res);
    setBookmarks(await listBookmarks());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    return data.items.filter(it => {
      const matchQ =
        !q ||
        it.name.toLowerCase().includes(q.toLowerCase()) ||
        it.site?.toLowerCase().includes(q.toLowerCase()) ||
        it.ware?.toLowerCase().includes(q.toLowerCase());
      const matchWare = ware === 'All' || it.ware === ware;
      const matchPeriod = period === 'All' || it.period === period;
      const matchDivision = division === 'All' || it.division === division;
      return matchQ && matchWare && matchPeriod && matchDivision;
    });
  }, [data.items, q, ware, period, division]);

  const onRefresh = async () => {
    setLoading(true);
    const res = await fetchPottery({ force: true });
    setData(res);
    setLoading(false);
  };

  const isBookmarked = useCallback((id) => bookmarks.includes(id), [bookmarks]);

  const handleToggleBookmark = async (id) => {
    const next = await toggleBookmark(id);
    setBookmarks(next);
  };

  const renderItem = ({ item }) => (
    <PotteryCard item={item} onPress={() => setDetail(item)} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 12 }}>
      {/* Search */}
      <View style={{ marginBottom: 10 }}>
        <TextInput
          placeholder="Search pottery, site, ware..."
          placeholderTextColor="#6b7280"
          value={q}
          onChangeText={setQ}
          style={{
            backgroundColor: '#0f172a',
            color: colors.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 42,
            borderWidth: 1,
            borderColor: '#1f2937'
          }}
          accessibilityLabel="Search pottery"
        />
      </View>

      {/* Filters */}
      <View style={{ marginBottom: 6 }}>
        <Text style={{ color: '#94a3b8', marginBottom: 6, fontSize: 12 }}>Ware</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="All" selected={ware === 'All'} onPress={() => setWare('All')} />
          {filters.wares.map(w => (
            <Chip key={`ware-${w}`} label={w} selected={ware === w} onPress={() => setWare(w)} />
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 6 }}>
        <Text style={{ color: '#94a3b8', marginBottom: 6, fontSize: 12 }}>Period</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="All" selected={period === 'All'} onPress={() => setPeriod('All')} />
          {filters.periods.map(p => (
            <Chip key={`period-${p}`} label={p} selected={period === p} onPress={() => setPeriod(p)} />
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: '#94a3b8', marginBottom: 6, fontSize: 12 }}>Division</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Chip label="All" selected={division === 'All'} onPress={() => setDivision('All')} />
          {filters.divisions.map(d => (
            <Chip key={`division-${d}`} label={d} selected={division === d} onPress={() => setDivision(d)} />
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 12 }}>Loading pottery…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onRefresh={onRefresh}
          refreshing={false}
          ListEmptyComponent={
            <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 48 }}>
              No items match your filters.
            </Text>
          }
        />
      )}

      {/* Detail Modal */}
      {detail ? (
        <PotteryDetailModal
          visible={!!detail}
          item={detail}
          isBookmarked={isBookmarked(detail.id)}
          onToggleBookmark={() => handleToggleBookmark(detail.id)}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </View>
  );
}