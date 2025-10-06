import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert, Animated } from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext'; // falls back below if your theme isn’t present

// --- Helpers ---
const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function xyToHeadingDeg(x, y) {
  // Heading = 0 when facing North, increase clockwise
  // Magnetometer returns device-frame axes; this works well enough across devices
  const angle = Math.atan2(y, x) * r2d;             // -180..+180, 0 = +X
  const heading = (angle + 360 + 90) % 360;          // shift so 0 ~= North
  return heading;
}

function toCardinal(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  return dirs[Math.round(deg / 45)];
}

function fmtCoord(v, isLat) {
  if (v == null) return '—';
  const dir = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W');
  return `${Math.abs(v).toFixed(6)}° ${dir}`;
}

function fmtMeters(m) {
  if (m == null || Number.isNaN(m)) return '—';
  return `${m.toFixed(1)} m`;
}

const LAST_CACHE_KEY = 'compass:lastFix';

// --- Screen ---
export default function CompassScreen() {
  // Theme fallback if your ThemeContext isn’t set in this screen yet
  const theme = (useTheme && useTheme()) || { mode: 'light', colors: { background: '#0b0b0f', card: '#111316', text: '#fafafa', border: '#23262d', tint: '#60a5fa' } };
  const colors = theme.colors || { background: '#0b0b0f', card: '#111316', text: '#fafafa', border: '#23262d', tint: '#60a5fa' };

  const [permGranted, setPermGranted] = useState(false);
  const [coords, setCoords] = useState({ latitude: null, longitude: null, accuracy: null, altitude: null, altitudeAccuracy: null, timestamp: null });
  const [heading, setHeading] = useState(0); // degrees 0..360
  const [usingMag, setUsingMag] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | running | paused

  const magSub = useRef(null);
  const locHeadSub = useRef(null);
  const locPosSub = useRef(null);

  // Smooth needle rotation
  const animatedDeg = useRef(new Animated.Value(0)).current;
  const targetDegRef = useRef(0);

  const animateTo = useCallback((toDeg) => {
    // unwrap rotation to take the shortest path
    const current = targetDegRef.current;
    let delta = ((toDeg - current + 540) % 360) - 180; // -180..+180 shortest
    const next = current + delta;
    targetDegRef.current = (next + 360) % 360;
    Animated.timing(animatedDeg, {
      toValue: targetDegRef.current,
      duration: clamp(Math.abs(delta) * 5, 120, 450),
      useNativeDriver: true,
      easing: (t) => t, // linear looks best here
    }).start();
  }, [animatedDeg]);

  const startAsync = useCallback(async () => {
    try {
      setStatus('running');
      // Permissions
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') {
        setPermGranted(false);
        Alert.alert('Permission needed', 'Location permission is required to show coordinates and elevation.');
        return;
      }
      setPermGranted(true);

      // Position watcher (for coords + altitude)
      locPosSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1500,
          distanceInterval: 1,
          mayShowUserSettingsDialog: true,
        },
        async (loc) => {
          const { latitude, longitude, accuracy, altitude, altitudeAccuracy } = loc.coords || {};
          const payload = {
            latitude, longitude, accuracy,
            altitude: altitude ?? null,
            altitudeAccuracy: altitudeAccuracy ?? null,
            timestamp: loc.timestamp || Date.now(),
          };
          setCoords(payload);
          // cache last fix for offline-first
          try { await AsyncStorage.setItem(LAST_CACHE_KEY, JSON.stringify(payload)); } catch {}
        }
      );

      // Prefer magnetometer for smooth live heading; fallback to Location heading if needed
      setUsingMag(true);
      magSub.current = Magnetometer.addListener(({ x, y }) => {
        if (x == null || y == null) return;
        const deg = (xyToHeadingDeg(x, y) + 360) % 360;
        setHeading(deg);
        animateTo(deg);
      });
      Magnetometer.setUpdateInterval(100);

      // As a backup, also subscribe to heading from OS (helps on devices with poor mag sensor)
      locHeadSub.current = await Location.watchHeadingAsync((evt) => {
        // evt.trueHeading or evt.magHeading depending on platform
        const h = evt?.trueHeading ?? evt?.magHeading;
        if (typeof h === 'number' && !Number.isNaN(h)) {
          if (!usingMag) {
            setHeading(h);
            animateTo(h);
          }
        }
      });
    } catch (e) {
      setStatus('idle');
      Alert.alert('Compass error', String(e?.message || e));
    }
  }, [animateTo, usingMag]);

  const stopAsync = useCallback(() => {
    setStatus('paused');
    if (magSub.current) { magSub.current.remove(); magSub.current = null; }
    if (locHeadSub.current) { locHeadSub.current.remove(); locHeadSub.current = null; }
    if (locPosSub.current) { locPosSub.current.remove(); locPosSub.current = null; }
  }, []);

  // Load cached last fix on mount (offline-first)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_CACHE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setCoords(saved);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    startAsync();
    return () => stopAsync();
  }, [startAsync, stopAsync]);

  // Toggle source if magnetometer is noisy (long-press title to switch)
  const toggleSource = useCallback(() => {
    setUsingMag(prev => !prev);
  }, []);

  // Needle interpolated rotation
  const rotate = animatedDeg.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const cardinal = useMemo(() => toCardinal(heading), [heading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onLongPress={toggleSource} activeOpacity={0.9}>
          <Text style={[styles.title, { color: colors.text }]}>
            Compass {usingMag ? '• Magnetometer' : '• OS Heading'}
          </Text>
        </TouchableOpacity>

        <View style={styles.compassWrap}>
          {/* Compass face */}
          <View style={[styles.compassFace, { borderColor: colors.border }]}>
            {['N','E','S','W'].map((d, i) => (
              <Text key={d} style={[styles.faceLabel, styles[`face${d}`], { color: d === 'N' ? colors.tint : colors.text }]}>{d}</Text>
            ))}
            {/* tick marks */}
            {Array.from({ length: 36 }).map((_, i) => (
              <View
                key={`t${i}`}
                style={[
                  styles.tick,
                  {
                    transform: [{ rotate: `${i * 10}deg` }],
                    backgroundColor: (i % 9 === 0) ? colors.tint : colors.border,
                    height: (i % 9 === 0) ? 16 : 10,
                  }
                ]}
              />
            ))}
            {/* Needle */}
            <Animated.View style={[styles.needleWrap, { transform: [{ rotate }] }]}>
              <View style={[styles.needleNorth, { backgroundColor: colors.tint }]} />
              <View style={[styles.needleSouth, { backgroundColor: colors.text }]} />
              <View style={[styles.axisDot, { backgroundColor: colors.card, borderColor: colors.border }]} />
            </Animated.View>
          </View>

          {/* Heading readout */}
          <Text style={[styles.headingText, { color: colors.text }]}>
            {cardinal} · {heading.toFixed(0)}°
          </Text>
        </View>

        {/* Coordinates & elevation */}
        <View style={styles.rows}>
          <Row label="Latitude" value={fmtCoord(coords.latitude, true)} colors={colors} />
          <Row label="Longitude" value={fmtCoord(coords.longitude, false)} colors={colors} />
          <Row label="Elevation" value={fmtMeters(coords.altitude)} colors={colors} />
          <Row label="Accuracy" value={coords.accuracy != null ? `${coords.accuracy.toFixed(1)} m` : '—'} colors={colors} />
          {coords.altitudeAccuracy != null && (
            <Row label="Elev. accuracy" value={`${coords.altitudeAccuracy.toFixed(1)} m`} colors={colors} />
          )}
          {coords.timestamp && (
            <Row label="Updated" value={new Date(coords.timestamp).toLocaleString()} colors={colors} />
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Button
            label={status === 'running' ? 'Pause' : 'Resume'}
            onPress={status === 'running' ? stopAsync : startAsync}
            colors={colors}
          />
          <Button
            label="Copy coords"
            onPress={() => {
              const txt = coords.latitude != null && coords.longitude != null
                ? `${coords.latitude}, ${coords.longitude}`
                : 'No fix';
              // Clipboard no longer auto-included; use expo-clipboard if you want 1-tap copy
              Alert.alert('Coordinates', txt);
            }}
            colors={colors}
            style={{ marginLeft: 12 }}
          />
        </View>

        {!permGranted && (
          <Text style={[styles.permHint, { color: colors.text }]}>
            Location permission not granted. Enable it in system settings.
          </Text>
        )}
      </View>
    </View>
  );
}

function Row({ label, value, colors }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress, colors, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, { backgroundColor: colors.tint }, style]}>
      <Text style={[styles.btnText, { color: '#0b0b0f' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const SIZE = 220;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  card: {
    borderWidth: 1, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  compassWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 12 },
  compassFace: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center'
  },
  faceLabel: { position: 'absolute', fontSize: 16, fontWeight: '700' },
  faceN: { top: 8 }, faceS: { bottom: 8 }, faceE: { right: 10 }, faceW: { left: 10 },
  tick: {
    position: 'absolute', width: 2, borderRadius: 1, top: 8,
    left: (SIZE / 2) - 1, // center
  },
  needleWrap: {
    position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'
  },
  needleNorth: {
    position: 'absolute', width: 4, height: SIZE * 0.42, top: SIZE * 0.08, borderTopLeftRadius: 2, borderTopRightRadius: 2
  },
  needleSouth: {
    position: 'absolute', width: 4, height: SIZE * 0.32, bottom: SIZE * 0.08, borderBottomLeftRadius: 2, borderBottomRightRadius: 2
  },
  axisDot: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 2
  },
  headingText: { marginTop: 12, fontSize: 20, fontWeight: '700' },
  rows: { marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { opacity: 0.8 },
  rowValue: { fontWeight: '600' },
  controls: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-start' },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  permHint: { marginTop: 10, opacity: 0.8 },
});