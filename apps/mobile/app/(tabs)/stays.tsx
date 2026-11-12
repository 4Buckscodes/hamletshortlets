import { useEffect, useState } from 'react';\nimport { Link } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPublicStays, type PublicStay } from '@/lib/api';

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function StaysScreen() {
  const [properties, setProperties] = useState<PublicStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPublicStays()
      .then(items => { if (active) setProperties(items); })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load stays.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>DISCOVER HAMLET · LAGOS</Text>
        <Text style={s.title}>The stays.</Text>
        <Text style={s.body}>A considered collection of approved shortlets across Lagos.</Text>

        {loading ? (
          <View style={s.state}>
            <ActivityIndicator color="#C5A46D" />
            <Text style={s.body}>Finding available stays…</Text>
          </View>
        ) : error ? (
          <View style={s.state}>
            <Text style={s.stateTitle}>We couldn't load the collection.</Text>
            <Text style={s.body}>{error}</Text>
          </View>
        ) : properties.length === 0 ? (
          <View style={s.state}>
            <Text style={s.stateTitle}>The collection is taking shape.</Text>
            <Text style={s.body}>There are no approved public stays to show right now. New properties will appear here once they complete HAMLET's review.</Text>
          </View>
        ) : (
          <View style={s.list}>
            <Text style={s.count}>{properties.length} APPROVED {properties.length === 1 ? 'STAY' : 'STAYS'}</Text>
            {properties.map(property => (
              <Link key={property.id} href={{ pathname: '/property/[id]', params: { id: property.id } }} asChild>\n              <View style={s.card}>
                {property.image_urls?.[0] ? (
                  <Image source={{ uri: property.image_urls[0] }} style={s.image} resizeMode="cover" />
                ) : (
                  <View style={[s.image, s.imageFallback]}><Text style={s.fallbackText}>HAMLET</Text></View>
                )}
                <View style={s.cardBody}>
                  <Text style={s.area}>{property.area || 'Lagos'}</Text>
                  <Text style={s.cardTitle}>{property.title}</Text>
                  <Text style={s.meta}>
                    {[property.bedrooms ? property.bedrooms + ' bedrooms' : null,
                      property.capacity ? 'Up to ' + property.capacity + ' guests' : null]
                      .filter(Boolean).join('  ·  ') || 'Shortlet accommodation'}
                  </Text>
                  {typeof property.guest_nightly_ngn === 'number' && property.guest_nightly_ngn > 0 ? (
                    <Text style={s.price}>{naira.format(property.guest_nightly_ngn)} <Text style={s.perNight}>/ night</Text></Text>
                  ) : (
                    <Text style={s.meta}>Rate available on enquiry</Text>
                  )}
                  {property.trust_label ? <Text style={s.trust}>{property.trust_label}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101D2D' },
  content: { padding: 22, paddingTop: 32, paddingBottom: 36 },
  eyebrow: { color: '#C5A46D', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F4F0E8', fontSize: 42, fontFamily: 'serif', marginTop: 12 },
  body: { color: '#A8B2BE', fontSize: 14, lineHeight: 22, marginTop: 12 },
  state: { marginTop: 34, padding: 22, minHeight: 150, justifyContent: 'center', backgroundColor: '#18283A', borderColor: '#314258', borderWidth: 1, borderRadius: 8 },
  stateTitle: { color: '#F4F0E8', fontSize: 20, fontFamily: 'serif' },
  list: { marginTop: 30, gap: 18 },
  count: { color: '#C5A46D', fontSize: 10, letterSpacing: 1.8, fontWeight: '700' },
  card: { overflow: 'hidden', backgroundColor: '#18283A', borderWidth: 1, borderColor: '#314258', borderRadius: 8 },
  image: { width: '100%', height: 215, backgroundColor: '#203247' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#C5A46D', fontSize: 13, letterSpacing: 3, fontWeight: '700' },
  cardBody: { padding: 17 },
  area: { color: '#C5A46D', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', textTransform: 'uppercase' },
  cardTitle: { color: '#F4F0E8', fontSize: 21, lineHeight: 27, fontFamily: 'serif', marginTop: 7 },
  meta: { color: '#A8B2BE', fontSize: 12, marginTop: 8 },
  price: { color: '#F4F0E8', fontSize: 17, fontWeight: '700', marginTop: 14 },
  perNight: { color: '#A8B2BE', fontSize: 12, fontWeight: '400' },
  trust: { color: '#8EC4A5', fontSize: 10, marginTop: 10, letterSpacing: 0.6 },
});
