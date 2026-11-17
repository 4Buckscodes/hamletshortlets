import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!supabase) { setError('Account access is not configured.'); setLoading(false); return; }
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !data.user) setError('Sign in to edit your profile.');
      else {
        setFullName(String(data.user.user_metadata?.full_name || ''));
        setPhone(String(data.user.user_metadata?.phone || ''));
      }
      setLoading(false);
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  async function save() {
    setError(''); setNotice('');
    if (!supabase) { setError('Account access is not configured.'); return; }
    if (fullName.trim().length < 2) { setError('Enter your full name.'); return; }
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('Sign in to edit your profile.');
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...data.user.user_metadata, full_name: fullName.trim(), phone: phone.trim() || null },
      });
      if (updateError) throw updateError;
      setNotice('Your profile has been updated.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not update your profile.');
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←  Back to account</Text></TouchableOpacity>
          <Text style={s.eyebrow}>ACCOUNT DETAILS</Text>
          <Text style={s.title}>Your profile.</Text>
          <Text style={s.body}>Keep your contact details current so HAMLET can communicate with you about your stays.</Text>
          {loading ? <View style={s.loading}><ActivityIndicator color="#C5A46D"/></View> : <>
            <Text style={s.label}>FULL NAME</Text>
            <TextInput value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your full name" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.label}>PHONE NUMBER</Text>
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+234…" placeholderTextColor="#8290A0" style={s.input}/>
            {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
            {notice ? <Text accessibilityRole="text" style={s.notice}>{notice}</Text> : null}
            <TouchableOpacity disabled={saving} onPress={() => void save()} style={[s.submit,saving&&s.disabled]}>
              <Text style={s.submitText}>{saving ? 'Saving…' : 'Save profile  →'}</Text>
            </TouchableOpacity>
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#101D2D'},flex:{flex:1},content:{padding:24,paddingTop:20,paddingBottom:44},
  back:{color:'#A8B2BE',fontSize:13,marginBottom:30},eyebrow:{color:'#C5A46D',fontSize:10,letterSpacing:2,fontWeight:'700'},
  title:{color:'#F4F0E8',fontSize:40,fontFamily:'serif',marginTop:14},body:{color:'#A8B2BE',fontSize:14,lineHeight:22,marginTop:10,marginBottom:24},
  label:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700',marginTop:18,marginBottom:8},
  input:{backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:5,color:'#F4F0E8',paddingHorizontal:14,paddingVertical:15,fontSize:14},
  submit:{backgroundColor:'#C5A46D',borderRadius:5,minHeight:52,alignItems:'center',justifyContent:'center',marginTop:28},
  submitText:{color:'#142235',fontSize:13,fontWeight:'700'},disabled:{opacity:0.6},
  error:{color:'#F0A7A0',fontSize:12,lineHeight:18,marginTop:14},notice:{color:'#9BD0AE',fontSize:12,lineHeight:18,marginTop:14},
  loading:{padding:30,alignItems:'center'},
});
