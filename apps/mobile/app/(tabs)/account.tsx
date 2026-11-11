import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AccountScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={s.title}>Welcome to{ '\n' }HAMLET.</Text>
        <Text style={s.body}>Sign in or create an account to manage your stays, profile and partner access.</Text>
        <View style={s.status}>
          <View style={[s.dot, { backgroundColor: isSupabaseConfigured ? '#76B89A' : '#C5A46D' }]} />
          <Text style={s.statusText}>{isSupabaseConfigured ? 'Secure account service configured' : 'Account connection awaiting environment setup'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101D2D' },
  content: { padding: 24, paddingTop: 32 },
  eyebrow: { color: '#C5A46D', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F4F0E8', fontSize: 42, lineHeight: 46, fontFamily: 'serif', marginTop: 14 },
  body: { color: '#A8B2BE', fontSize: 14, lineHeight: 22, marginTop: 12 },
  status: { flexDirection: 'row', alignItems: 'center', marginTop: 32, padding: 15, borderRadius: 6, backgroundColor: '#18283A' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusText: { color: '#D5DCE3', fontSize: 12 },
});
