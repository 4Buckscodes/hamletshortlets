import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (active) setSession(nextSession);
      });
      return () => { active = false; data.subscription.unsubscribe(); };
    }
    return () => { active = false; };
  }, []);

  async function signOut() {
    if (!supabase) return;
    setBusy(true); setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    setBusy(false);
  }

  const name = session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0] || 'HAMLET guest';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>YOUR ACCOUNT</Text>
        <Text style={s.title}>{session ? 'Good to have you back.' : 'Welcome to HAMLET.'}</Text>
        {session ? (
          <>
            <View style={s.profile}>
              <View style={s.avatar}><Text style={s.avatarText}>{String(name).slice(0,1).toUpperCase()}</Text></View>
              <View style={s.profileText}>
                <Text style={s.name}>{name}</Text>
                <Text style={s.email}>{session.user.email}</Text>
              </View>
            </View>
            <Text style={s.body}>Your account is signed in. Booking requests and account-specific services will use this secure session.</Text>
            <TouchableOpacity disabled={busy} onPress={signOut} style={s.secondary}>
              <Text style={s.secondaryText}>{busy ? 'Signing out…' : 'Sign out'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.body}>Sign in or create an account to manage your stays, booking requests and partner access.</Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity style={s.primary}><Text style={s.primaryText}>Sign in or create account  →</Text></TouchableOpacity>
            </Link>
          </>
        )}
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.status}>
          <View style={[s.dot, { backgroundColor: isSupabaseConfigured ? '#76B89A' : '#C5A46D' }]} />
          <Text style={s.statusText}>{isSupabaseConfigured ? 'Secure account service configured' : 'Account connection awaiting environment setup'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:24,paddingTop:32},
  eyebrow:{color:'#C5A46D',fontSize:10,letterSpacing:2,fontWeight:'700'},
  title:{color:'#F4F0E8',fontSize:37,lineHeight:43,fontFamily:'serif',marginTop:14},
  body:{color:'#A8B2BE',fontSize:14,lineHeight:22,marginTop:12},
  profile:{flexDirection:'row',alignItems:'center',marginTop:28,padding:16,backgroundColor:'#18283A',borderRadius:8,borderWidth:1,borderColor:'#314258'},
  avatar:{width:46,height:46,borderRadius:23,backgroundColor:'#C5A46D',alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#142235',fontSize:19,fontWeight:'700'},profileText:{marginLeft:13,flex:1},
  name:{color:'#F4F0E8',fontSize:15,fontWeight:'700'},email:{color:'#A8B2BE',fontSize:12,marginTop:4},
  primary:{marginTop:26,padding:16,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},
  primaryText:{color:'#142235',fontSize:13,fontWeight:'700'},
  secondary:{marginTop:24,padding:15,borderWidth:1,borderColor:'#C5A46D',borderRadius:5,alignItems:'center'},
  secondaryText:{color:'#C5A46D',fontSize:13,fontWeight:'700'},
  error:{color:'#F0A7A0',fontSize:12,marginTop:14},
  status:{flexDirection:'row',alignItems:'center',marginTop:32,padding:15,borderRadius:6,backgroundColor:'#18283A'},
  dot:{width:8,height:8,borderRadius:4,marginRight:10},statusText:{color:'#D5DCE3',fontSize:12},
});
