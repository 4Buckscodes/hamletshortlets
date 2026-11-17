import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save() {
    setError(''); setNotice('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    if (!supabase) { setError('Account service is not configured.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice('Your password has been updated. You can continue using HAMLET.');
      setTimeout(() => router.replace('/(tabs)'), 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Text style={s.eyebrow}>ACCOUNT SECURITY</Text>
        <Text style={s.title}>Choose a new password.</Text>
        <Text style={s.body}>Use a strong password you have not used elsewhere.</Text>
        <Text style={s.label}>NEW PASSWORD</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" style={s.input} placeholder="At least 8 characters" placeholderTextColor="#8290A0"/>
        <Text style={s.label}>CONFIRM PASSWORD</Text>
        <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" style={s.input} placeholder="Enter it again" placeholderTextColor="#8290A0"/>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {notice ? <Text style={s.notice}>{notice}</Text> : null}
        <TouchableOpacity onPress={save} disabled={busy} style={[s.button,busy&&s.disabled]}>
          <Text style={s.buttonText}>{busy ? 'Updating…' : 'Update password  →'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:24,paddingTop:48},
  eyebrow:{color:'#C5A46D',fontSize:10,letterSpacing:2,fontWeight:'700'},
  title:{color:'#F4F0E8',fontSize:35,lineHeight:42,fontFamily:'serif',marginTop:14},
  body:{color:'#A8B2BE',fontSize:14,lineHeight:22,marginTop:12,marginBottom:22},
  label:{color:'#C5A46D',fontSize:9,letterSpacing:1.4,fontWeight:'700',marginTop:16,marginBottom:8},
  input:{backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:5,color:'#F4F0E8',paddingHorizontal:14,paddingVertical:15},
  error:{color:'#F0A7A0',fontSize:12,marginTop:14},notice:{color:'#9BD0AE',fontSize:12,marginTop:14},
  button:{backgroundColor:'#C5A46D',borderRadius:5,minHeight:52,alignItems:'center',justifyContent:'center',marginTop:24},
  disabled:{opacity:0.6},buttonText:{color:'#142235',fontWeight:'700',fontSize:13},
});
