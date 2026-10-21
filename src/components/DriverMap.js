import { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { colors } from '../constants/colors';

// The route is requested ONCE per pickup/drop pair (staleTime: Infinity) and
// the car marker is animated between the driver's 15 s pings, so map cost
// stays at one route call per ride. Needs EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY
// (Routes API enabled); without it the map still shows the live driver.
const DIRECTIONS_KEY = process.env.EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY;

function decodePolyline(str) {
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of ['lat', 'lng']) {
      let b, shift = 0, result = 0;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += d; else lng += d;
    }
    pts.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return pts;
}

const fetchRoute = async (pickup, drop) => {
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': DIRECTIONS_KEY,
      'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({ origin: { address: pickup }, destination: { address: drop } }),
  });
  const json = await res.json();
  const poly = json?.routes?.[0]?.polyline?.encodedPolyline;
  return poly ? decodePolyline(poly) : [];
};

export default function DriverMap({ location, pickup, drop, height = 260 }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const lastPos = useRef(null);

  const { data: route = [] } = useQuery({
    queryKey: ['route', pickup, drop],
    queryFn: () => fetchRoute(pickup, drop),
    enabled: !!DIRECTIONS_KEY && !!pickup && !!drop,
    staleTime: Infinity,
    retry: false,
  });

  const target = useMemo(
    () => (location ? { latitude: location.latitude, longitude: location.longitude } : null),
    [location?.latitude, location?.longitude],
  );

  useEffect(() => {
    if (!target || !mapRef.current) return;
    if (!lastPos.current) {
      mapRef.current.animateToRegion({ ...target, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    } else if (Platform.OS === 'android' && markerRef.current?.animateMarkerToCoordinate) {
      markerRef.current.animateMarkerToCoordinate(target, 2500);
    }
    lastPos.current = target;
  }, [target]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: target?.latitude ?? 12.9716,
          longitude: target?.longitude ?? 77.5946,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        toolbarEnabled={false}
      >
        {route.length > 0 && <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />}
        {target && (
          <Marker ref={markerRef} coordinate={target} title="Driver" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.marker}>
              <Ionicons name="car" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#E5E7EB', marginBottom: 12 },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
