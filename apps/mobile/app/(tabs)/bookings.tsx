import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>YOUR HAMLET JOURNEY</Text>
        <Text style={s.title}>Bookings.</Text>
        <Text style={s.body}>Your upcoming stays, booking requests, payment status and receipts will live here.</Text>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Your next stay starts here.</Text>
          <Text style={s.body}>When you make a booking request, you will be able to follow its progress here.</Text>
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
