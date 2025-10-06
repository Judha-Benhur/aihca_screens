// src/screens/PhilosophicalSchoolsScreen.js
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, RefreshControl, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import BriefTable from '../components/common/BriefTable';
import { getPhilosophySchools } from '../services/philosophyService';

export default function PhilosophicalSchoolsScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || { background: '#fff', card: '#fff', text: '#000', border: '#e5e5e5', muted: '#666' };

  const [query, setQuery] = useState('');
  const [rowsData, setRowsData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceTag, setSourceTag] = useState('local');

  const load = useCallback(async (forceRefresh = false) => {
    const { items, source } = await getPhilosophySchools({ forceRefresh });
    setSourceTag(source);
    setRowsData(items);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const columns = useMemo(
    () => [
      { key: 'school', label: 'School', width: 140, lines: 1 },
      { key: 'founder', label: 'Founder / Systematizer', width: 170, lines: 2 },
      { key: 'keyTexts', label: 'Key Text(s)', width: 160, lines: 2 },
      { key: 'epistemology', label: 'Epistemology (Pramāṇas)', width: 220, lines: 3 },
      { key: 'metaphysics', label: 'Metaphysics', width: 200, lines: 3 },
      { key: 'soteriology', label: 'Goal / Method', width: 220, lines: 3 },
      { key: 'notes', label: 'Notes', width: 220, lines: 3 },
    ],
    [],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rowsData;
    return rowsData.filter(item =>
      [
        item.school, item.alsoCalled, item.founder, item.keyTexts, item.keyThinkers,
        item.metaphysics, item.epistemology, item.soteriology, item.notes,
      ].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [query, rowsData]);

  const tableRows = useMemo(
    () => filteredRows.map(r => ({
      __rowKey: r.id,
      school: r.school,
      founder: r.founder,
      keyTexts: r.keyTexts,
      epistemology: r.epistemology,
      metaphysics: r.metaphysics,
      soteriology: r.soteriology,
      notes: r.notes,
    })),
    [filteredRows],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Philosophical Schools — Six Orthodox Systems
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Nyāya · Vaiśeṣika · Sāṃkhya · Yoga · Mīmāṃsā · Vedānta — <Text style={{ fontStyle: 'italic' }}>{sourceTag}</Text>
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filter by school, texts, pramāṇas..."
            placeholderTextColor={colors.muted}
            style={[
              styles.search,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            accessibilityLabel="Filter table"
          />
        </View>

        <BriefTable columns={columns} rows={tableRows} zebra />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13 },
  search: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});