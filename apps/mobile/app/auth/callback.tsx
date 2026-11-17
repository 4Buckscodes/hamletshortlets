import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('Confirming your HAMLET account…');
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    async function complete(url: string | null) {
      if (!url || !supabase) {
        if (active && url === null) setMessage('Open the confirmation link from your email to continue.');
        if (active && !supabase) setMessage('Account service is not configured. Return to HAMLET and try again.');
        return;
      }
      if (handledUrl.current === url) return;
      handledUrl.current = url;
      try {
        const parsed = Linking.parse(url);
        const queryType = typeof parsed.queryParams?.type === 'string' ? parsed.queryParams.type : null;
        const hash = url.split('#')[1] || '';
        const hashParams = new URLSearchParams(hash);
        const linkType = queryType || hashParams.get('type');
        const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          } else {
            const { data } = await supabase.auth.getSession();
            if (!data.session) throw new Error('The confirmation link did not contain a valid session.');
          }
        }

        if (active) router.replace(linkType === 'recovery' ? '/reset-password' : '/(tabs)');
      } catch (caught) {
        if (active) setMessage(caught instanceof Error ? caught.message : 'Could not confirm this link.');
      }
    }

    Linking.getInitialURL().then(url => { void complete(url); });
    const subscription = Linking.addEventListener('url', event => { void complete(event.url); });
    return () => { active = false; subscription.remove(); };
  }, []);

  return (
    <View style={s.screen}>
      <ActivityIndicator color="#C5A46D" />
      <Text style={s.message}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101D2D', alignItems: 'center', justifyContent: 'center', padding: 28 },
  message: { color: '#F4F0E8', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 20 },
});
