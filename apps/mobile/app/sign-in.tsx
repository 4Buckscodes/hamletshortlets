import { useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup' | 'reset';

export default function AuthScreen() {
  const params = useLocalSearchParams<{ next?: string; mode?: string; ref?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const finish = () => {
    const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/(tabs)';
    router.replace(next as never);
  };

  async function submit() {
    setError('');
    setNotice('');
    if (!supabase) {
      setError('Account access is not configured. Please try again later.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode !== 'reset' && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (mode === 'signup' && fullName.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Linking.createURL('auth/callback'),
        });
        if (resetError) throw resetError;
        setNotice('If an account exists for this email, a password reset link has been sent.');
      } else if (mode === 'signup') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: Linking.createURL('auth/callback'),
            data: {
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              referred_by_code: typeof params.ref === 'string' ? params.ref : null,
            },
          },
        });
        if (signupError) throw signupError;
        if (data.session) finish();
        else {
          setNotice('Account created. Check your email to confirm your address, then return to sign in.');
          setMode('signin');
        }
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signinError) throw signinError;
        finish();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not complete that request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←  Back</Text></TouchableOpacity>
          <View style={s.brandMark}><Text style={s.brandH}>H</Text></View>
          <Text style={s.eyebrow}>YOUR STAY, SORTED.</Text>
          <Text style={s.title}>{mode === 'signup' ? 'Join HAMLET.' : mode === 'reset' ? 'Reset password.' : 'Welcome back.'}</Text>
          <Text style={s.body}>One account for better stays and a more considered way to book.</Text>

          <View style={s.switcher}>
            <TouchableOpacity onPress={() => { setMode('signin'); setError(''); setNotice(''); }} style={[s.switch, mode === 'signin' && s.switchActive]}><Text style={[s.switchText, mode === 'signin' && s.switchTextActive]}>Sign in</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setMode('signup'); setError(''); setNotice(''); }} style={[s.switch, mode === 'signup' && s.switchActive]}><Text style={[s.switchText, mode === 'signup' && s.switchTextActive]}>Create account</Text></TouchableOpacity>
          </View>

          {mode === 'signup' ? (
            <>
              <Text style={s.label}>FULL NAME</Text>
              <TextInput value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="#8290A0" autoCapitalize="words" style={s.input}/>
              <Text style={s.label}>PHONE NUMBER (OPTIONAL)</Text>
              <TextInput value={phone} onChangeText={setPhone} placeholder="+234…" placeholderTextColor="#8290A0" keyboardType="phone-pad" style={s.input}/>
            </>
          ) : null}
          <Text style={s.label}>EMAIL ADDRESS</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#8290A0" autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={s.input}/>
          {mode !== 'reset' ? <>
            <Text style={s.label}>PASSWORD</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#8290A0" secureTextEntry autoCapitalize="none" style={s.input}/>
          </> : null}

          {mode === 'signin' ? <TouchableOpacity onPress={() => setMode('reset')} style={s.forgot}><Text style={s.forgotText}>Forgot password?</Text></TouchableOpacity> : null}
          {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
          {notice ? <Text accessibilityRole="text" style={s.notice}>{notice}</Text> : null}
          <TouchableOpacity disabled={busy} onPress={submit} style={[s.submit, busy && s.disabled]}>
            <Text style={s.submitText}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account  →' : mode === 'reset' ? 'Send reset link  →' : 'Sign in  →'}</Text>
          </TouchableOpacity>
          <Text style={s.legal}>By continuing, you agree to HAMLET's terms and privacy policy.</Text>
          <Link href="/(tabs)" style={s.homeLink}>Continue exploring HAMLET</Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101D2D' }, flex: { flex: 1 },
  content: { padding: 24, paddingTop: 18, paddingBottom: 48 },
  back: { color: '#A8B2BE', fontSize: 13, marginBottom: 32 },
  brandMark: { width: 48, height: 48, borderWidth: 1, borderColor: '#C5A46D', alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  brandH: { color: '#C5A46D', fontSize: 30, fontFamily: 'serif' },
  eyebrow: { color: '#C5A46D', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#F4F0E8', fontSize: 39, fontFamily: 'serif', marginTop: 12 },
  body: { color: '#A8B2BE', fontSize: 14, lineHeight: 22, marginTop: 10, marginBottom: 28 },
  switcher: { flexDirection: 'row', padding: 4, backgroundColor: '#18283A', borderRadius: 6, marginBottom: 25 },
  switch: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 4 },
  switchActive: { backgroundColor: '#C5A46D' },
  switchText: { color: '#A8B2BE', fontSize: 12, fontWeight: '600' },
  switchTextActive: { color: '#142235' },
  label: { color: '#C5A46D', fontSize: 9, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#18283A', borderWidth: 1, borderColor: '#314258', borderRadius: 5, color: '#F4F0E8', paddingHorizontal: 14, paddingVertical: 15, fontSize: 14 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 16 },
  forgotText: { color: '#C5A46D', fontSize: 12, fontWeight: '600' },
  error: { color: '#F0A7A0', fontSize: 12, lineHeight: 18, marginTop: 14 },
  notice: { color: '#9BD0AE', fontSize: 12, lineHeight: 18, marginTop: 14 },
  submit: { backgroundColor: '#C5A46D', borderRadius: 5, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  disabled: { opacity: 0.6 },
  submitText: { color: '#142235', fontSize: 13, fontWeight: '700' },
  legal: { color: '#8290A0', fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 20 },
  homeLink: { color: '#C5A46D', textAlign: 'center', fontSize: 12, marginTop: 24 },
});
