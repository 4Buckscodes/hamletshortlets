import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { HAMLET_API_BASE_URL } from '@/lib/api';

export default function NewPropertyScreen() {
  const [title,setTitle]=useState('');
  const [propertyType,setPropertyType]=useState('Serviced apartment');
  const [area,setArea]=useState('');
  const [address,setAddress]=useState('');
  const [nightlyRate,setNightlyRate]=useState('');
  const [cleaningFee,setCleaningFee]=useState('0');
  const [deposit,setDeposit]=useState('0');
  const [bedrooms,setBedrooms]=useState('1');
  const [bathrooms,setBathrooms]=useState('1');
  const [capacity,setCapacity]=useState('2');
  const [amenities,setAmenities]=useState('Air conditioning, Wi-Fi, Kitchen');
  const [imageUrl,setImageUrl]=useState('');
  const [authority,setAuthority]=useState('');
  const [firstAvailableDate,setFirstAvailableDate]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  async function save(saveAsDraft:boolean) {
    setError(''); setNotice('');
    if (!supabase) { setError('Account service is not configured.'); return; }
    if (title.trim().length<8 || area.trim().length<2 || address.trim().length<10 || Number(nightlyRate)<1) {
      setError('Enter a clear property title, Lagos neighbourhood, public address and nightly rate.');
      return;
    }
    if (!saveAsDraft && (!authority.trim() || !imageUrl.trim())) {
      setError('For review submission, add your authority to list and at least one HTTPS property photo URL.');
      return;
    }
    setBusy(true);
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if (!session) throw new Error('Sign in with your partner account to continue.');
      const response=await fetch(HAMLET_API_BASE_URL+'/api/partner/properties',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,Accept:'application/json'},
        body:JSON.stringify({
          saveAsDraft,title:title.trim(),propertyType,area:area.trim(),address:address.trim(),
          nightlyRate:Number(nightlyRate),cleaningFee:Number(cleaningFee||0),deposit:Number(deposit||0),
          bedrooms:Number(bedrooms),bathrooms:Number(bathrooms),capacity:Number(capacity),
          amenities:amenities.split(',').map(v=>v.trim()).filter(Boolean),
          imageUrls:imageUrl.trim()?[imageUrl.trim()]:[],
          authorityBasis:authority.trim()||(saveAsDraft?'Draft details pending completion':''),
          submittedRole:'Mobile partner',
          firstAvailableDate:firstAvailableDate.trim()||undefined,
        }),
      });
      const payload=await response.json() as {error?:string;message?:string;property?:{id:string;status:string}};
      if (!response.ok) throw new Error(payload.error||'We could not save this property.');
      setNotice(payload.message||'Property saved.');
      if (!saveAsDraft) router.replace('/(tabs)/partner');
    } catch(caught) {
      setError(caught instanceof Error?caught.message:'We could not save this property.');
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>←  Back to partner network</Text></TouchableOpacity>
          <Text style={s.eyebrow}>PARTNER PROPERTY INTAKE · LAGOS</Text>
          <Text style={s.title}>Bring your stay to HAMLET.</Text>
          <Text style={s.body}>Share the essentials first. Your listing stays private until HAMLET reviews and approves it.</Text>
          <View style={s.panel}>
            <Text style={s.section}>01 · THE PROPERTY</Text>
            <Text style={s.label}>PROPERTY TITLE</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Calm 2-bedroom serviced apartment" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.label}>PROPERTY TYPE</Text>
            <TextInput value={propertyType} onChangeText={setPropertyType} placeholder="Serviced apartment" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.label}>LAGOS NEIGHBOURHOOD</Text>
            <TextInput value={area} onChangeText={setArea} placeholder="Lekki Phase 1, Ikeja, VI…" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.label}>PUBLIC ADDRESS / STREET</Text>
            <TextInput value={address} onChangeText={setAddress} placeholder="Street and area; do not include access codes" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.label}>FIRST AVAILABLE DATE (OPTIONAL · YYYY-MM-DD)</Text>
            <TextInput value={firstAvailableDate} onChangeText={setFirstAvailableDate} placeholder="2026-12-01" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.section}>02 · RATE & CAPACITY</Text>
            <Text style={s.label}>NIGHTLY RATE (₦)</Text>
            <TextInput value={nightlyRate} onChangeText={setNightlyRate} keyboardType="number-pad" placeholder="e.g. 85000" placeholderTextColor="#8290A0" style={s.input}/>
            <View style={s.row}>
              <View style={s.half}><Text style={s.label}>CLEANING FEE (₦)</Text><TextInput value={cleaningFee} onChangeText={setCleaningFee} keyboardType="number-pad" style={s.input}/></View>
              <View style={s.half}><Text style={s.label}>REFUNDABLE DEPOSIT (₦)</Text><TextInput value={deposit} onChangeText={setDeposit} keyboardType="number-pad" style={s.input}/></View>
            </View>
            <View style={s.row}>
              <View style={s.half}><Text style={s.label}>BEDROOMS</Text><TextInput value={bedrooms} onChangeText={setBedrooms} keyboardType="number-pad" style={s.input}/></View>
              <View style={s.half}><Text style={s.label}>BATHROOMS</Text><TextInput value={bathrooms} onChangeText={setBathrooms} keyboardType="number-pad" style={s.input}/></View>
              <View style={s.half}><Text style={s.label}>GUEST CAPACITY</Text><TextInput value={capacity} onChangeText={setCapacity} keyboardType="number-pad" style={s.input}/></View>
            </View>
            <Text style={s.label}>AMENITIES · SEPARATE WITH COMMAS</Text>
            <TextInput value={amenities} onChangeText={setAmenities} placeholder="Wi-Fi, pool, generator…" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.section}>03 · PHOTOS & AUTHORITY</Text>
            <Text style={s.label}>FIRST PROPERTY PHOTO · HTTPS URL</Text>
            <TextInput value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" keyboardType="url" placeholder="https://…" placeholderTextColor="#8290A0" style={s.input}/>
            <Text style={s.hint}>For a draft, you can add the photo later. Submission for review requires at least one secure photo URL.</Text>
            <Text style={s.label}>YOUR AUTHORITY TO LIST</Text>
            <TextInput value={authority} onChangeText={setAuthority} multiline placeholder="e.g. I am the property owner / I hold written authority from the owner…" placeholderTextColor="#8290A0" style={[s.input,s.multiline]}/>
            {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
            {notice?<Text style={s.notice}>{notice}</Text>:null}
            <TouchableOpacity disabled={busy} onPress={()=>void save(false)} style={[s.primary,busy&&s.disabled]}><Text style={s.primaryText}>{busy?'Saving…':'Submit listing for review  →'}</Text></TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={()=>void save(true)} style={s.secondary}><Text style={s.secondaryText}>Save as private draft</Text></TouchableOpacity>
            <Text style={s.footnote}>HAMLET checks listing authority, details and property quality. A submitted listing is not public or bookable until approved. The server controls all fees and booking calculations.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#101D2D'},flex:{flex:1},content:{padding:22,paddingTop:16,paddingBottom:48},
 back:{color:'#A8B2BE',fontSize:12,marginBottom:26},eyebrow:{color:'#C5A46D',fontSize:9,letterSpacing:1.6,fontWeight:'700'},
 title:{color:'#F4F0E8',fontSize:37,lineHeight:42,fontFamily:'serif',marginTop:13},body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:10},
 panel:{marginTop:24,padding:18,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:8},
 section:{color:'#C5A46D',fontSize:10,letterSpacing:1.4,fontWeight:'700',marginTop:25,marginBottom:5},
 label:{color:'#A8B2BE',fontSize:9,letterSpacing:1,fontWeight:'700',marginTop:16,marginBottom:7},
 input:{backgroundColor:'#101D2D',borderWidth:1,borderColor:'#314258',borderRadius:5,color:'#F4F0E8',paddingHorizontal:12,paddingVertical:13,fontSize:12},
 row:{flexDirection:'row',gap:9},half:{flex:1,minWidth:0},multiline:{minHeight:82,textAlignVertical:'top'},
 hint:{color:'#8290A0',fontSize:10,lineHeight:16,marginTop:7},primary:{marginTop:24,padding:15,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},
 primaryText:{color:'#142235',fontWeight:'700',fontSize:12},secondary:{marginTop:10,padding:14,borderWidth:1,borderColor:'#C5A46D',borderRadius:5,alignItems:'center'},
 secondaryText:{color:'#C5A46D',fontSize:12,fontWeight:'700'},disabled:{opacity:0.6},
 error:{color:'#F0A7A0',fontSize:12,lineHeight:18,marginTop:14},notice:{color:'#9BD0AE',fontSize:12,lineHeight:18,marginTop:14},
 footnote:{color:'#8290A0',fontSize:10,lineHeight:16,marginTop:16},
});
