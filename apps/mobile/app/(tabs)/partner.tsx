import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PartnerScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>THE HAMLET PARTNER NETWORK</Text>
        <Text style={s.title}>Your properties.{ '\n' }Your business.</Text>
        <Text style={s.body}>A workspace for owners, property managers and agents to bring properties to market, manage bookings and work with clear commercial terms.</Text>
        <View style={s.panel}>
          <Text style={s.panelTitle}>One network. Different roles.</Text>
          <Text style={s.body}>Owners control their properties. Managers work with owner-authorised access. Agents discover and accept approved deal offers.</Text>
        </View>
        <Link href="/account" asChild>
          <TouchableOpacity style={s.button}><Text style={s.buttonText}>Continue to partner access  →</Text></TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101D2D' },
  content: { padding: 24, paddingTop: 32 },
  eyebrow: { color: '#C5A46D', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F4F0E8', fontSize: 40, lineHeight: 44, fontFamily: 'serif', marginTop: 16 },
  body: { color: '#A8B2BE', fontSize: 14, lineHeight: 22, marginTop: 12 },
  panel: { marginTop: 34, padding: 22, backgroundColor: '#18283A', borderColor: '#314258', borderWidth: 1, borderRadius: 8 },
  panelTitle: { color: '#F4F0E8', fontSize: 20, fontFamily: 'serif' },
  button: { marginTop: 24, padding: 16, backgroundColor: '#C5A46D', borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#142235', fontWeight: '700', fontSize: 13 },
});
