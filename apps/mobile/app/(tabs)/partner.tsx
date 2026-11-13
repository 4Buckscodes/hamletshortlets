import { useCallback, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const ROLES = [
  { value: 'Property owner', label: 'Property owner', detail: 'List and manage your own shortlet properties.' },
  { value: 'Authorised manager', label: 'Authorised manager', detail: 'Manage properties under an owner mandate.' },
  { value: 'Multi-property operator', label: 'Multi-property operator', detail: 'Operate a portfolio of serviced apartments.' },
  { value: 'Closing agent', label: 'Closing agent', detail: 'Refer guests and help close bookings.' },
] as const;

type Application = {
  id: string;
  full_name: string;
  role: string;
  status: string;
  review_note: string | null;
  submitted_at: string;
};

export default function PartnerScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [profileRole, setProfileRole] = useState('guest');
  const [partnerRole, setPartnerRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<string>('Property owner');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [areas, setAreas] = useState('Victoria Island, Lekki, Ikeja');
  const [propertiesCount, setPropertiesCount] = useState('1');
  const [motivation, setMotivation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: auth } = await supabase.auth.getSession();
    const current = auth.session;
    setSession(current);
    if (!current?.user) { setLoading(false); return; }
    const [{ data: profile }, { data: apps, error: appError }] = await Promise.all([
      supabase.from('profiles').select('role,partner_role,full_name,phone,company').eq('id', current.user.id).maybeSingle(),
      supabase.from('partner_applications').select('id,full_name,role,status,review_note,submitted_at').eq('applicant_id', current.user.id).order('submitted_at', { ascending: false }).limit(1),
    ]);
    if (profile) {
      setProfileRole(String(profile.role || 'guest'));
      setPartnerRole(String(profile.partner_role || ''));
      setFullName(String(profile.full_name || current.user.user_metadata?.full_name || ''));
      setPhone(String(profile.phone || current.user.user_metadata?.phone || ''));
      setCompany(String(profile.company || ''));
    }
    if (appError) setError('We could not load your partner application. Please try again.');
    setApplication((apps?.[0] as Application | undefined) || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void load().finally(() => { if (!active) return; });
    const subscription = supabase?.auth.onAuthStateChange(() => { if (active) void load(); }).data.subscription;
    return () => { active = false; subscription?.unsubscribe(); };
  }, [load]);

  async function submitApplication() {
    setError(''); setNotice('');
    if (!supabase || !session?.user) { setError('Sign in before applying to the partner network.'); return; }
    if (fullName.trim().length < 2 || phone.trim().length < 7 || company.trim().length < 2) {
      setError('Enter your name, a valid phone number and your business or practice name.');
      return;
    }
    const selectedAreas = areas.split(',').map(value => value.trim()).filter(Boolean).slice(0, 12);
    if (!selectedAreas.length) { setError('Add at least one Lagos neighbourhood you serve.'); return; }
    const count = Math.max(1, Math.min(500, Math.floor(Number(propertiesCount) || 1)));
    setBusy(true);
    try {
      const { error: insertError } = await supabase.from('partner_applications').insert({
        applicant_id: session.user.id,
        full_name: fullName.trim(),
        email: session.user.email || '',
        phone: phone.trim(),
        company: company.trim(),
        role,
        areas: selectedAreas,
        properties_count: count,
        motivation: motivation.trim() || role + ' operating across ' + selectedAreas.join(', ') + '.',
      });
      if (insertError) throw insertError;
      setNotice('Your application has been submitted. HAMLET will review your details and update your access.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not submit your application.');
    } finally { setBusy(false); }
  }

  const approved = profileRole === 'partner' || application?.status === 'approved';
  const pending = application?.status === 'pending';
  const inventoryRole = (application?.role || partnerRole) !== 'Closing agent';
  const canSubmitListing = inventoryRole && (approved || pending);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.eyebrow}>THE HAMLET PARTNER NETWORK</Text>
        <Text style={s.title}>Your properties.{ '\n' }Your business.</Text>
        <Text style={s.body}>A network for owners, authorised managers, multi-property operators and closing agents — with clear roles and accountable booking activity.</Text>
        {!session ? (
          <View style={s.panel}>
            <Text style={s.panelTitle}>Start with your account.</Text>
            <Text style={s.body}>Sign in or create a guest account before applying to become a HAMLET partner.</Text>
            <Link href="/sign-in?next=/(tabs)/partner" asChild><TouchableOpacity style={s.button}><Text style={s.buttonText}>Sign in to continue  →</Text></TouchableOpacity></Link>
          </View>
        ) : loading ? <View style={s.loading}><ActivityIndicator color="#C5A46D"/></View> : approved ? (
          <View style={s.panel}>
            <Text style={s.status}>PARTNER ACCESS ACTIVE</Text>
            <Text style={s.panelTitle}>Welcome to the network.</Text>
            <Text style={s.body}>Your partner role is {application?.role || 'approved partner'}. Partner tools will only expose actions permitted for your account.</Text>
            <Text style={s.small}>Your partner access is active. Property actions remain protected by your approved role and the existing HAMLET backend.</Text>
            {canSubmitListing ? <Link href="/partner/new-property" asChild><TouchableOpacity style={s.button}><Text style={s.buttonText}>Add a property  →</Text></TouchableOpacity></Link> : <Text style={s.small}>Agent deal access will be available in the next partner workspace release.</Text>}
          </View>
        ) : pending ? (
          <View style={s.panel}>
            <Text style={s.status}>APPLICATION UNDER REVIEW</Text>
            <Text style={s.panelTitle}>We've received your details.</Text>
            <Text style={s.body}>Your application as {application?.role} is awaiting HAMLET review. You can return here to check its status.</Text>
            <Text style={s.small}>Submitted {new Date(application.submitted_at).toLocaleDateString()}</Text>
            {canSubmitListing ? <Link href="/partner/new-property" asChild><TouchableOpacity style={s.button}><Text style={s.buttonText}>Start a property listing  →</Text></TouchableOpacity></Link> : null}
          </View>
        ) : application?.status === 'rejected' ? (
          <View style={s.panel}>
            <Text style={s.status}>APPLICATION NOT APPROVED</Text>
            <Text style={s.panelTitle}>Please contact HAMLET.</Text>
            <Text style={s.body}>{application.review_note || 'Our team has reviewed your application. Contact support if you would like clarification.'}</Text>
          </View>
        ) : (
          <View style={s.form}>
            <Text style={s.formTitle}>Apply to become a partner</Text>
            <Text style={s.small}>Choose the role that best describes how you work. Your access will be activated after review.</Text>
            <Text style={s.label}>YOUR PARTNER ROLE</Text>
            {ROLES.map(option => (
              <TouchableOpacity key={option.value} onPress={() => setRole(option.value)} style={[s.roleOption, role === option.value && s.roleSelected]}>
                <View style={s.roleCopy}><Text style={s.roleTitle}>{option.label}</Text><Text style={s.roleDetail}>{option.detail}</Text></View>
                <View style={[s.radio, role === option.value && s.radioSelected]} />
              </TouchableOpacity>
            ))}
            <Text style={s.label}>FULL NAME</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="#8290A0" autoCapitalize="words" style={s.input}/>
            <Text style={s.label}>PHONE NUMBER</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+234…" placeholderTextColor="#8290A0" keyboardType="phone-pad" style={s.input}/>
            <Text style={s.label}>BUSINESS / PRACTICE NAME</Text>
            <TextInput value={company} onChangeText={setCompany} placeholder="Company or trading name" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.label}>LAGOS AREAS YOU SERVE</Text>
            <TextInput value={areas} onChangeText={setAreas} placeholder="Lekki, Ikeja, Victoria Island" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.hint}>Separate neighbourhoods with commas.</Text>
            {role !== 'Closing agent' ? <>
              <Text style={s.label}>NUMBER OF PROPERTIES</Text>
              <TextInput value={propertiesCount} onChangeText={setPropertiesCount} keyboardType="number-pad" style={s.input}/>
            </> : null}
            <Text style={s.label}>TELL US A LITTLE ABOUT YOUR WORK (OPTIONAL)</Text>
            <TextInput value={motivation} onChangeText={setMotivation} placeholder="Your experience, portfolio or how you support guests…" placeholderTextColor="#8290A0" multiline style={[s.input,s.multiline]}/>
            {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
            {notice ? <Text style={s.notice}>{notice}</Text> : null}
            <TouchableOpacity disabled={busy} onPress={() => void submitApplication()} style={[s.button,busy&&s.disabled]}><Text style={s.buttonText}>{busy ? 'Submitting…' : 'Submit partner application  →'}</Text></TouchableOpacity>
            <Text style={s.footnote}>Submitting an application does not grant partner permissions. HAMLET reviews applications before activating partner access.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:24,paddingTop:30,paddingBottom:48},
  eyebrow:{color:'#C5A46D',fontSize:10,letterSpacing:2,fontWeight:'700'},
  title:{color:'#F4F0E8',fontSize:40,lineHeight:44,fontFamily:'serif',marginTop:16},
  body:{color:'#A8B2BE',fontSize:14,lineHeight:22,marginTop:12},
  panel:{marginTop:30,padding:22,backgroundColor:'#18283A',borderColor:'#314258',borderWidth:1,borderRadius:8},
  panelTitle:{color:'#F4F0E8',fontSize:23,fontFamily:'serif',marginTop:10},
  status:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700'},
  small:{color:'#8290A0',fontSize:12,lineHeight:19,marginTop:14},
  loading:{padding:40,alignItems:'center'},
  form:{marginTop:30,padding:20,backgroundColor:'#18283A',borderColor:'#314258',borderWidth:1,borderRadius:8},
  formTitle:{color:'#F4F0E8',fontSize:25,fontFamily:'serif'},
  label:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700',marginTop:22,marginBottom:9},
  roleOption:{flexDirection:'row',alignItems:'center',padding:13,borderWidth:1,borderColor:'#314258',borderRadius:5,marginTop:8},
  roleSelected:{borderColor:'#C5A46D',backgroundColor:'#203247'},
  roleCopy:{flex:1},roleTitle:{color:'#F4F0E8',fontSize:13,fontWeight:'700'},roleDetail:{color:'#A8B2BE',fontSize:11,lineHeight:16,marginTop:4},
  radio:{width:17,height:17,borderRadius:9,borderWidth:1,borderColor:'#8290A0',marginLeft:12},
  radioSelected:{backgroundColor:'#C5A46D',borderColor:'#C5A46D'},
  input:{backgroundColor:'#101D2D',borderWidth:1,borderColor:'#314258',borderRadius:5,color:'#F4F0E8',paddingHorizontal:13,paddingVertical:14,fontSize:13},
  multiline:{minHeight:90,textAlignVertical:'top'},hint:{color:'#8290A0',fontSize:10,marginTop:6},
  button:{marginTop:24,padding:16,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},
  buttonText:{color:'#142235',fontWeight:'700',fontSize:13},disabled:{opacity:0.6},
  error:{color:'#F0A7A0',fontSize:12,lineHeight:18,marginTop:14},notice:{color:'#9BD0AE',fontSize:12,lineHeight:18,marginTop:14},
  footnote:{color:'#8290A0',fontSize:10,lineHeight:16,marginTop:15},
});
