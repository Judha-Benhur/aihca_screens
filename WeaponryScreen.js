// src/screens/WeaponryScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import * as FilterChipsModule from '../components/common/FilterChips';
const FilterChips = FilterChipsModule.default || FilterChipsModule.FilterChips;

import * as WeaponCardModule from '../components/weaponry/WeaponCard';
const WeaponCard = WeaponCardModule.default || WeaponCardModule.WeaponCard;

import * as WeaponDetailModalModule from '../components/weaponry/WeaponDetailModal';
const WeaponDetailModal = WeaponDetailModalModule.default || WeaponDetailModalModule.WeaponDetailModal;

// Safe fallbacks in case any imported component resolves to undefined
const ResolvedFilterChips = (typeof FilterChips === 'function')
  ? FilterChips
  : function FallbackFilterChips({ options = [], value = '', onChange = () => {}, style }) {
      return (
        <View style={[{ paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap' }, style]}>
          {options.map((opt, idx) => {
            const active = opt === value;
            return (
              <TouchableOpacity
                key={`${opt || 'All'}-${idx}`}
                onPress={() => onChange(active ? '' : opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  backgroundColor: active ? '#eef2ff' : '#fff',
                  marginRight: 8,
                  marginBottom: 8
                }}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${opt || 'All'}`}
              >
                <Text style={{ color: active ? '#3730a3' : '#111827', fontSize: 13, fontWeight: '600' }}>
                  {opt || 'All'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    };

const ResolvedWeaponCard = (typeof WeaponCard === 'function')
  ? WeaponCard
  : function FallbackWeaponCard({ item = {}, onPress, colors = { text: '#111827', border: '#e5e7eb' } }) {
      return (
        <TouchableOpacity onPress={() => onPress?.(item)} activeOpacity={0.9} style={{ paddingHorizontal: 12, marginBottom: 12 }}>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>{item.name || 'Item'}</Text>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{item.material || '—'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: colors.text, opacity: 0.9, marginBottom: 4 }}>
              {(item.era || '—')} • {formatYears(item.startYear, item.endYear)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text, opacity: 0.9 }} numberOfLines={1}>
              {(item.formFactor || '—')} • {(item.subMaterial || '—')}
            </Text>
          </View>
        </TouchableOpacity>
      );
    };

const ResolvedWeaponDetailModal = (typeof WeaponDetailModal === 'function')
  ? WeaponDetailModal
  : function FallbackWeaponDetailModal() { return null; };

import { fetchWeaponry } from '../services/weaponryService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ERA_OPTIONS = [
  'Lower Paleolithic',
  'Middle Paleolithic',
  'Upper Paleolithic',
  'Mesolithic',
  'Neolithic',
  'Chalcolithic',
  'Early Historic',
  'Gupta',
];

const MATERIAL_OPTIONS = ['Stone', 'Copper', 'Bronze', 'Iron', 'Steel'];

const BOOKMARKS_KEY = 'weaponry:bookmarks:v1';

export default function WeaponryScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || { background: '#fff', card: '#fff', text: '#000', border: '#e5e7eb' };

  const [data, setData] = useState([]);
  const [era, setEra] = useState('');
  const [material, setMaterial] = useState('');
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [bookmarks, setBookmarks] = useState({});

  const load = useCallback(async (opts = {}) => {
    const res = await fetchWeaponry({ forceRefresh: !!opts.force, era, material, q });
    if (res.ok) setData(res.items);
  }, [era, material, q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { (async () => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
      setBookmarks(raw ? JSON.parse(raw) : {});
    } catch {}
  })(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ force: true });
    setRefreshing(false);
  }, [load]);

  const toggleBookmark = useCallback(async (item) => {
    const next = { ...bookmarks };
    if (next[item.id]) delete next[item.id]; else next[item.id] = item;
    setBookmarks(next);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  }, [bookmarks]);

  const filteredCount = data.length;

  const header = useMemo(() => (
    <View>
      <Text style={[styles.h1, { color: colors.text }]}>Weaponry: Stone → Copper/Bronze → Iron (Gupta)</Text>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search (name, era, material, sites)"
        placeholderTextColor="#9ca3af"
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        accessibilityLabel="Search weapons"
      />

      <Text style={[styles.label, { color: colors.text }]}>Era</Text>
      <ResolvedFilterChips options={['', ...ERA_OPTIONS]} value={era} onChange={setEra} style={{ paddingBottom: 8 }} />

      <Text style={[styles.label, { color: colors.text }]}>Material</Text>
      <ResolvedFilterChips options={['', ...MATERIAL_OPTIONS]} value={material} onChange={setMaterial} />
      <Text style={[styles.meta, { color: colors.text, opacity: 0.7, paddingHorizontal: 12, marginTop: 6 }]}>{filteredCount} item(s)</Text>
    </View>
  ), [q, era, material, filteredCount, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View>
            <ResolvedWeaponCard item={item} onPress={setSelected} colors={colors} />
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => toggleBookmark(item)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                <Text style={[styles.actionText, { color: colors.text }]}>{bookmarks[item.id] ? '★ Bookmarked' : '☆ Bookmark'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 36 }}
      />

      <ResolvedWeaponDetailModal
        visible={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  h1: { fontSize: 20, fontWeight: '900', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  input: {
    marginHorizontal: 12, marginBottom: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  label: { fontSize: 12, fontWeight: '800', paddingHorizontal: 12, marginTop: 4, marginBottom: 6, opacity: 0.7 },
  meta: { fontSize: 12 },
  rowActions: { paddingHorizontal: 12, marginTop: -6, marginBottom: 8 },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
});