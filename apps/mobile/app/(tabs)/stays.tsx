import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StaysScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>DISCOVER HAMLET</Text>
        <Text style={s.title}>The stays.</Text>
        <Text style={s.body}>Search and browse approved shortlets. Live inventory will appear here from HAMLET's existing listings service.</Text>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>The collection is taking shape.</Text>
          <Text style={s.body}>We're bringing quality properties onto HAMLET. Check back as new stays are approved.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101D2D' },
  content: { padding: 24, paddingTop: 32 },
  eyebrow: { color: '#C5A46D', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F4F0E8', fontSize: 42, fontFamily: 'serif', marginTop: 12 },
  body: { color: '#A8B2BE', fontSize: 14, lineHeight: 22, marginTop: 12 },
  empty: { marginTop: 36, padding: 22, backgroundColor: '#18283A', borderColor: '#314258', borderWidth: 1, borderRadius: 8 },
  emptyTitle: { color: '#F4F0E8', fontSize: 20, fontFamily: 'serif' },
});
