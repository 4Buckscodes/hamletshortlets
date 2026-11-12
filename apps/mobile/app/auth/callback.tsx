import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('Confirming your HAMLET account…');

  useEffect(() => {
    let active = true;
    async function complete(url: string | null) {
      if (!url || !supabase) {
        if (active) setMessage('We could not open the confirmation link. Return to HAMLET and sign in.');
        return;
      }
      try {
        const parsed = Linking.parse(url);
        const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;\n        const queryType = typeof parsed.queryParams?.type === 'string' ? parsed.queryParams.type : null;
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = url.split('#')[1] || '';
          const params = new URLSearchParams(hash);\n          if (params.get('type') === 'recovery') {\n            if (active) router.replace('/reset-password');\n            return;\n          }
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          } else {
            const { data } = await supabase.auth.getSession();
            if (!data.session) throw new Error('The confirmation link did not contain a valid session.');
          }
        }
        if (active) router.replace(queryType === 'recovery' ? '/reset-password' : '/(tabs)');
      } catch (caught) {
        if (active) setMessage(caught instanceof Error ? caught.message : 'Could not confirm this link.');
      }
    }
    Linking.getInitialURL().then(url => { void complete(url); });
    const subscription = Linking.addEventListener('url', event => { void complete(event.url); });
    return () => { active = false; subscription.remove(); };
  }, []);

  return <View style={s.screen}><ActivityIndicator color="#C5A46D"/><Text style={s.message}>{message}</Text></View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101D2D', alignItems: 'center', justifyContent: 'center', padding: 28 },
  message: { color: '#F4F0E8', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 20 },
});
