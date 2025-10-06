// src/screens/DynastyTimelineScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, SectionList, ActivityIndicator, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import TimelineItem from '../components/dynasty/TimelineItem';
import RulerDetailModal from '../components/dynasty/RulerDetailModal';
import { getDynastyTimeline } from '../services/dynastyTimelineService';

function normalizeAchievements(ach) {
  if (Array.isArray(ach)) {
    // If someone tokenized into words, collapse to a sentence.
    const joined = ach.join(' ');
    return joined.replace(/\s+/g, ' ').trim();
  }
  if (typeof ach === 'string') {
    return ach.replace(/\s+/g, ' ').trim();
  }
  return '';
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityLabel={`Filter ${label}`}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function DynastyTimelineScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || {
    background: '#fff', text: '#111', card: '#fff', border: '#e5e5e5', primary: '#6b8afd', inputBg: '#f3f4f6'
  };

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [filterDynasty, setFilterDynasty] = useState('All');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [source, setSource] = useState('cache');

  const openDetail = useCallback((it) => {
    setDetail({
      ...it,
      achievements: normalizeAchievements(it.achievements),
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getDynastyTimeline(false);
    setSections(res.sections);
    setAllRows(res.rows);
    setSource(res.source);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dynasties = useMemo(() => {
    const s = new Set(sections.map(sec => sec.title));
    return ['All', ...Array.from(s)];
  }, [sections]);

  const filteredSections = useMemo(() => {
    // filter by dynasty
    const base = filterDynasty === 'All'
      ? sections
      : sections.filter(s => s.title === filterDynasty);

    if (!query.trim()) return base;
    const q = query.toLowerCase();
    // search in ruler, dynasty, tags, achievements
    return base.map(sec => ({
      title: sec.title,
      data: sec.data.filter(it => {
        const tagsText = Array.isArray(it.tags) ? it.tags.join(' ') : (it.tags || '');
        const achText = Array.isArray(it.achievements) ? it.achievements.join(' ') : (it.achievements || '');
        const hay = `${it.ruler || ''} ${it.dynasty || ''} ${it.reignLabel || ''} ${tagsText} ${achText}`.toLowerCase();
        return hay.includes(q);
      })
    })).filter(sec => sec.data.length > 0);
  }, [filterDynasty, sections, query]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dynasty Timelines</Text>
        <Text style={[styles.subtitle, { color: colors.text, opacity: 0.6 }]}>
          Source: {source}
        </Text>
      </View>

      <View style={[styles.searchRow]}>
        <TextInput
          placeholder="Search rulers, dynasties, tags..."
          placeholderTextColor="rgba(120,120,120,0.8)"
          value={query}
          onChangeText={setQuery}
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        />
        <Pressable onPress={() => setQuery('')} style={[styles.clearBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, opacity: 0.7 }}>Clear</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dynasties.map((d, idx) => (
            <Chip
              key={`dyn-chip-${idx}-${d}`}
              label={d}
              active={filterDynasty === d}
              onPress={() => setFilterDynasty(d)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
        </View>
      ) : (
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHdr, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <TimelineItem
              item={item}
              onPress={openDetail}
              isFirst={index === 0}
              isLast={index === section.data.length - 1}
            />
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 24 }}
          style={{ flex: 1 }}
        />
      )}

      <RulerDetailModal
        visible={!!detail}
        onClose={() => setDetail(null)}
        item={detail}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  input: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(120,120,120,0.12)' },
  chipActive: { backgroundColor: 'rgba(80,120,255,0.18)' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  chipTextActive: { color: '#1f2937' },
  sectionHdr: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});