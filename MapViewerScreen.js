// src/screens/MapViewerScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import Supercluster from 'supercluster';
import { useTheme } from '../theme/ThemeContext';
import FilterBar from '../components/map/FilterBar';
import MapToolbar from '../components/map/MapToolbar';
import ClusterMarker from '../components/map/ClusterMarker';
import { fetchSites } from '../services/sitesApi';

const INITIAL_REGION = {
  latitude: 22.9734, // India center-ish
  longitude: 78.6569,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

function longDeltaToZoom(longDelta) {
  // rough mapping for WebMercator-ish scale (good enough)
  return Math.max(1, Math.min(20, Math.round(Math.log2(360 / longDelta))));
}

function featureFromSite(s, idx) {
  return {
    type: 'Feature',
    id: `pt-${s.id}-${s.lat}-${s.lon}-${idx}`, // unique key (prevents duplicate key warnings)
    geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    properties: {
      siteId: s.id,
      name: s.name,
      division: s.division,
      period: s.period,
      subperiod: s.subperiod,
      type: s.type || '',
      image: s.image || '',
      notes: s.notes || '',
    },
  };
}

export default function MapViewerScreen() {
  const theme = useTheme() || {};
  const colors = theme.colors || { background: '#fff', card: '#fff', text: '#000', border: '#e5e7eb' };

  const [region, setRegion] = useState(INITIAL_REGION);
  const [allSites, setAllSites] = useState([]);
  const [division, setDivision] = useState('');
  const [period, setPeriod] = useState('');
  const [subperiod, setSubperiod] = useState('');
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load sites with cache + offline fallback
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const rows = await fetchSites();
      if (!mounted) return;
      setAllSites(rows);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Filter logic
  const filtered = useMemo(() => {
    return allSites.filter(s =>
      (!division || s.division === division) &&
      (!period || s.period === period) &&
      (!subperiod || s.subperiod === subperiod)
    );
  }, [allSites, division, period, subperiod]);

  // Dropdown sources
  const divisions = useMemo(() => [...new Set(allSites.map(s => s.division).filter(Boolean))].sort(), [allSites]);
  const periods = useMemo(() => {
    const arr = allSites.filter(s => !division || s.division === division).map(s => s.period).filter(Boolean);
    return [...new Set(arr)].sort();
  }, [allSites, division]);
  const subperiods = useMemo(() => {
    const arr = allSites
      .filter(s => (!division || s.division === division) && (!period || s.period === period))
      .map(s => s.subperiod)
      .filter(Boolean);
    return [...new Set(arr)].sort();
  }, [allSites, division, period]);

  // supercluster index
  const index = useMemo(() => {
    const pts = filtered.map(featureFromSite);
    const sc = new Supercluster({
      radius: 60, // px cluster radius
      maxZoom: 20,
      minPoints: 3,
    }).load(pts);
    return sc;
  }, [filtered]);

  // Compute clusters for visible box
  const refreshClusters = useCallback((rg = region) => {
    const bbox = [
      rg.longitude - rg.longitudeDelta / 2,
      rg.latitude - rg.latitudeDelta / 2,
      rg.longitude + rg.longitudeDelta / 2,
      rg.latitude + rg.latitudeDelta / 2,
    ];
    const zoom = longDeltaToZoom(rg.longitudeDelta);
    const cs = index.getClusters(bbox, zoom);
    setClusters(cs);
  }, [index, region]);

  useEffect(() => {
    refreshClusters(region);
  }, [index, region, refreshClusters]);

  const onRegionChangeComplete = useCallback((rg) => {
    setRegion(rg);
    refreshClusters(rg);
  }, [refreshClusters]);

  const onClearFilters = useCallback(() => {
    setDivision('');
    setPeriod('');
    setSubperiod('');
  }, []);

  const onZoomIn = useCallback(() => {
    setRegion(rg => ({
      ...rg,
      latitudeDelta: rg.latitudeDelta / 2,
      longitudeDelta: rg.longitudeDelta / 2,
    }));
  }, []);
  const onZoomOut = useCallback(() => {
    setRegion(rg => ({
      ...rg,
      latitudeDelta: rg.latitudeDelta * 2,
      longitudeDelta: rg.longitudeDelta * 2,
    }));
  }, []);
  const onRecenter = useCallback(() => setRegion(INITIAL_REGION), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FilterBar
        division={division}
        period={period}
        subperiod={subperiod}
        divisions={divisions}
        periods={periods}
        subperiods={subperiods}
        onChangeDivision={(v) => { setDivision(v); setPeriod(''); setSubperiod(''); }}
        onChangePeriod={(v) => { setPeriod(v); setSubperiod(''); }}
        onChangeSubperiod={(v) => setSubperiod(v)}
        onClear={onClearFilters}
      />

      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INITIAL_REGION}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {clusters.map((item) => {
          const [lon, lat] = item.geometry.coordinates;
          const { cluster, point_count } = item.properties;

          if (cluster) {
            return (
              <ClusterMarker
                key={`cl-${item.id}`}
                coordinate={{ latitude: lat, longitude: lon }}
                count={point_count}
                onPress={() => {
                  const expansion = index.getClusterExpansionZoom(item.id);
                  const scale = Math.pow(2, expansion - longDeltaToZoom(region.longitudeDelta));
                  const newLongDelta = region.longitudeDelta / Math.max(1.5, Math.min(8, scale));
                  const newLatDelta = region.latitudeDelta / Math.max(1.5, Math.min(8, scale));
                  setRegion(rg => ({
                    ...rg,
                    latitude: lat,
                    longitude: lon,
                    latitudeDelta: newLatDelta,
                    longitudeDelta: newLongDelta,
                  }));
                }}
              />
            );
          }

          const p = item.properties;
          const key = `pt-${p.siteId}-${lat}-${lon}`;
          return (
            <Marker
              key={key}
              coordinate={{ latitude: lat, longitude: lon }}
              title={p.name}
              description={[p.division, p.period, p.subperiod].filter(Boolean).join(' • ')}
            >
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={[styles.title]}>{p.name}</Text>
                  {!!p.type && <Text style={styles.caption}>{p.type}</Text>}
                  {!!p.notes && <Text style={styles.caption}>{p.notes}</Text>}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <MapToolbar onZoomIn={onZoomIn} onZoomOut={onZoomOut} onRecenter={onRecenter} />

      {loading && (
        <View style={styles.loading}>
          <Text style={{ color: colors.text }}>Loading sites…</Text>
        </View>
      )}

      {!loading && !filtered.length && (
        <View style={styles.empty}>
          <Text style={{ color: colors.text }}>No sites for selected filters.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, margin: 12, borderRadius: 16, overflow: 'hidden' },
  callout: { maxWidth: 240, padding: 6 },
  title: { fontWeight: '700', marginBottom: 2 },
  caption: { fontSize: 12, opacity: 0.8 },
  loading: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.1)'
  },
  empty: {
    position: 'absolute', top: 80, left: 0, right: 0,
    alignItems: 'center'
  },
});