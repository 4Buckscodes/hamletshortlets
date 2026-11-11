import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const p = {
  background: '#101D2D', surface: '#18283A', raised: '#203247',
  ivory: '#F4F0E8', muted: '#A8B2BE', gold: '#C5A46D', line: '#314258',
};

const destinations = ['Lagos', 'Abuja', 'Ibadan'];

export default function ExploreScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.mark}><Text style={s.markText}>H</Text></View>
          <View>
            <Text style={s.brand}>HAMLET</Text>
            <Text style={s.tagline}>SHORTLETS, WITH ACCOUNTABILITY.</Text>
          </View>
          <View style={s.avatar}><Text style={s.avatarText}>H</Text></View>
        </View>

        <View style={s.hero}>
          <Text style={s.eyebrow}>YOUR STAY, SORTED.</Text>
          <Text style={s.headline}>WHERE ARE{ '\n' }YOU STAYING?</Text>
          <Text style={s.subhead}>Find a place you can trust. Book without the usual uncertainty.</Text>
        </View>

        <View style={s.search}>
          <Text style={s.searchLabel}>WHERE TO?</Text>
          <TextInput
            placeholder="City, neighbourhood or property"
            placeholderTextColor="#8390A0"
            style={s.searchInput}
            returnKeyType="search"
          />
          <View style={s.rule} />
          <View style={s.searchMeta}>
            <Text style={s.meta}>Dates · Add your dates</Text>
            <Text style={s.meta}>Guests · 2 guests</Text>
          </View>
          <Link href="/stays" asChild>
            <TouchableOpacity style={s.primary} activeOpacity={0.85}>
              <Text style={s.primaryText}>Explore stays</Text>
              <Text style={s.arrow}>→</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <View>
              <Text style={s.eyebrow}>START WITH A PLACE</Text>
              <Text style={s.sectionTitle}>Wherever you're{ '\n' }going next.</Text>
            </View>
            <Text style={s.counter}>01 / 03</Text>
          </View>
          <View style={s.cityRow}>
            {destinations.map(city => (
              <Link key={city} href={{ pathname: '/stays', params: { city } }} asChild>
                <TouchableOpacity style={s.cityChip}>
                  <Text style={s.cityText}>{city}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        <View style={s.collection}>
          <View style={s.spark}><Text style={s.sparkText}>✦</Text></View>
          <Text style={s.eyebrow}>THE HAMLET COLLECTION</Text>
          <Text style={s.collectionTitle}>Good stays.{ '\n' }No guesswork.</Text>
          <Text style={s.body}>We're preparing a considered collection of shortlets. Approved properties will appear here as they become available.</Text>
          <Link href="/stays" asChild>
            <TouchableOpacity style={s.link}><Text style={s.linkText}>Explore the collection  →</Text></TouchableOpacity>
          </Link>
        </View>

        <View style={s.partner}>
          <Text style={s.eyebrow}>FOR OWNERS & PROPERTY PROFESSIONALS</Text>
          <Text style={s.partnerTitle}>Your property deserves more than a listing.</Text>
          <Text style={s.body}>Bring your properties, manage bookings and build your business with HAMLET.</Text>
          <Link href="/partner" asChild>
            <TouchableOpacity style={s.outline}><Text style={s.outlineText}>Explore the partner network  →</Text></TouchableOpacity>
          </Link>
        </View>
        <Text style={s.footer}>A PRODUCT OF ABUNDANCE ABODES · LAGOS, NIGERIA</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.background },
  content: { paddingHorizontal: 22, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginBottom: 42 },
  mark: { width: 39, height: 39, borderWidth: 1, borderColor: p.gold, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  markText: { color: p.gold, fontSize: 26, fontFamily: 'serif' },
  brand: { color: p.ivory, letterSpacing: 3.2, fontSize: 14, fontWeight: '700' },
  tagline: { color: p.muted, fontSize: 7, letterSpacing: 1.3, marginTop: 4 },
  avatar: { marginLeft: 'auto', width: 38, height: 38, borderRadius: 19, backgroundColor: p.raised, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: p.ivory, fontSize: 13, fontWeight: '600' },
  hero: { marginBottom: 26 },
  eyebrow: { color: p.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 13 },
  headline: { color: p.ivory, fontSize: 45, lineHeight: 50, letterSpacing: -1.5, fontFamily: 'serif' },
  subhead: { color: p.muted, fontSize: 15, lineHeight: 23, marginTop: 16, maxWidth: 300 },
  search: { backgroundColor: p.surface, borderRadius: 8, borderWidth: 1, borderColor: p.line, padding: 17 },
  searchLabel: { color: p.gold, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  searchInput: { color: p.ivory, fontSize: 15, paddingVertical: 15 },
  rule: { height: 1, backgroundColor: p.line },
  searchMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, flexWrap: 'wrap', gap: 8 },
  meta: { color: p.muted, fontSize: 12 },
  primary: { height: 52, backgroundColor: p.gold, borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#142235', fontWeight: '700', fontSize: 14 },
  arrow: { color: '#142235', fontSize: 20, marginLeft: 10 },
  section: { marginTop: 58 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { color: p.ivory, fontSize: 34, lineHeight: 38, fontFamily: 'serif' },
  counter: { color: p.muted, fontSize: 10, marginBottom: 5 },
  cityRow: { flexDirection: 'row', gap: 9, marginTop: 22 },
  cityChip: { paddingHorizontal: 17, paddingVertical: 12, borderWidth: 1, borderColor: p.line, borderRadius: 24 },
  cityText: { color: p.ivory, fontSize: 13 },
  collection: { marginTop: 52, backgroundColor: p.surface, padding: 24, borderRadius: 8, borderWidth: 1, borderColor: p.line },
  spark: { width: 38, height: 38, borderRadius: 19, backgroundColor: p.raised, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  sparkText: { color: p.gold, fontSize: 20 },
  collectionTitle: { color: p.ivory, fontSize: 33, lineHeight: 37, fontFamily: 'serif' },
  body: { color: p.muted, fontSize: 13, lineHeight: 21, marginTop: 12 },
  link: { marginTop: 20, alignSelf: 'flex-start' },
  linkText: { color: p.gold, fontSize: 13, fontWeight: '700' },
  partner: { marginTop: 22, paddingVertical: 27, borderTopWidth: 1, borderBottomWidth: 1, borderColor: p.line },
  partnerTitle: { color: p.ivory, fontSize: 29, lineHeight: 34, fontFamily: 'serif', maxWidth: 300 },
  outline: { marginTop: 20, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: p.gold, borderRadius: 5, alignSelf: 'flex-start' },
  outlineText: { color: p.gold, fontSize: 12, fontWeight: '700' },
  footer: { color: '#718094', fontSize: 8, letterSpacing: 1.2, textAlign: 'center', marginTop: 34 },
});
