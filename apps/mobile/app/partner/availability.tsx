import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Property={id:string;title:string;area:string;status:string;first_available_date:string|null;availability_confirmation_status:string|null;calendar_responsible_person:string|null};
type Block={id:string;property_id:string;start_date:string;end_date:string;block_type:string;note:string|null};

export default function PartnerAvailabilityScreen(){
 const params=useLocalSearchParams<{property?:string}>();
 const [properties,setProperties]=useState<Property[]>([]);
 const [blocks,setBlocks]=useState<Block[]>([]);
 const [propertyId,setPropertyId]=useState(String(params.property||''));
 const [firstDate,setFirstDate]=useState('');
 const [responsible,setResponsible]=useState('');
 const [start,setStart]=useState('');
 const [end,setEnd]=useState('');
 const [reason,setReason]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const load=useCallback(async()=>{
  if(!supabase){setError('Calendar service is not configured.');setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError('Sign in with your partner account.');setLoading(false);return;}
  const {data:profile}=await supabase.from('profiles').select('role,account_status').eq('id',auth.user.id).maybeSingle();
  if(!profile||!['partner','admin'].includes(String(profile.role))||(profile.account_status&&profile.account_status!=='active')){setError('Active partner access is required.');setLoading(false);return;}
  const [p,b]=await Promise.all([
   supabase.from('properties').select('id,title,area,status,first_available_date,availability_confirmation_status,calendar_responsible_person').order('updated_at',{ascending:false}),
   supabase.from('property_availability_blocks').select('id,property_id,start_date,end_date,block_type,note').order('start_date',{ascending:true}),
  ]);
  if(p.error)throw new Error('Could not load authorised properties.');
  const list=(p.data||[]) as Property[];setProperties(list);setBlocks((b.data||[]) as Block[]);
  const selected=list.find(x=>x.id===propertyId)||list[0];
  if(selected){setPropertyId(selected.id);setFirstDate(selected.first_available_date||'');setResponsible(selected.calendar_responsible_person||'');}
  setLoading(false);setError('');
 },[propertyId]);

 useFocusEffect(useCallback(()=>{void load().catch(e=>{setError(e instanceof Error?e.message:'Could not load calendar.');setLoading(false);});},[load]));

 const selected=properties.find(p=>p.id===propertyId);
 const active=blocks.filter(b=>b.property_id===propertyId);

 async function saveAvailability(){
  if(!supabase||!propertyId)return;
  if(firstDate&&!/^\d{4}-\d{2}-\d{2}$/.test(firstDate)){setError('Use YYYY-MM-DD for the first available date.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const {error:e}=await supabase.rpc('update_property_availability_settings',{
    target_property_id:propertyId,next_first_available_date:firstDate||null,next_confirmation_status:'confirmed',next_responsible_person:responsible.trim()||null,
   });
   if(e)throw new Error(e.message);
   setNotice('Availability status confirmed for this property.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Could not update availability.');}
  finally{setBusy(false);}
 }

 async function addBlock(){
  if(!supabase||!propertyId)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<=start){setError('Enter valid dates in YYYY-MM-DD format. End date must be after start date.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const {error:e}=await supabase.rpc('add_property_availability_block',{
    target_property_id:propertyId,block_start:start,block_end:end,kind:'owner_block',block_source:'partner',block_note:reason.trim()||'Blocked by property partner',
   });
   if(e)throw new Error(e.message);
   setStart('');setEnd('');setReason('');setNotice('Unavailable date range added.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Could not block these dates.');}
  finally{setBusy(false);}
 }

 async function removeBlock(id:string){
  if(!supabase)return;setBusy(true);setError('');setNotice('');
  try{const {error:e}=await supabase.rpc('remove_property_availability_block',{target_block_id:id});if(e)throw new Error(e.message);setNotice('Blocked dates removed.');await load();}
  catch(e){setError(e instanceof Error?e.message:'Could not remove date block.');}
  finally{setBusy(false);}
 }

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
  <TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>←  Back to portfolio</Text></TouchableOpacity>
  <Text style={s.eyebrow}>OWNER CALENDAR</Text><Text style={s.title}>Availability control.</Text>
  <Text style={s.body}>Keep your HAMLET calendar aligned with your actual availability, including dates blocked on other booking channels.</Text>
  {error?<View style={s.alert}><Text style={s.error}>{error}</Text></View>:null}
  {notice?<Text style={s.notice}>{notice}</Text>:null}
  {loading?<View style={s.loading}><ActivityIndicator color="#C5A46D"/></View>:properties.length===0?<View style={s.panel}><Text style={s.body}>Submit a property listing before managing its calendar.</Text></View>:<>
   <Text style={s.label}>SELECT PROPERTY</Text>
   {properties.map(p=><TouchableOpacity key={p.id} onPress={()=>{setPropertyId(p.id);setFirstDate(p.first_available_date||'');setResponsible(p.calendar_responsible_person||'');}} style={[s.choice,p.id===propertyId&&s.selected]}><Text style={s.choiceTitle}>{p.title}</Text><Text style={s.meta}>{p.area} · {p.status}</Text></TouchableOpacity>)}
   {selected?<View style={s.panel}>
    <Text style={s.section}>AVAILABILITY DETAILS</Text>
    <Text style={s.label}>FIRST AVAILABLE DATE · YYYY-MM-DD</Text>
    <TextInput value={firstDate} onChangeText={setFirstDate} placeholder="2026-12-01" placeholderTextColor="#8290A0" style={s.input}/>
    <Text style={s.label}>CALENDAR RESPONSIBLE PERSON</Text>
    <TextInput value={responsible} onChangeText={setResponsible} placeholder="Name of the person confirming dates" placeholderTextColor="#8290A0" style={s.input}/>
    <Text style={s.hint}>Confirm only after checking direct bookings and other channels.</Text>
    <TouchableOpacity disabled={busy} onPress={()=>void saveAvailability()} style={s.primary}><Text style={s.primaryText}>{busy?'Saving…':'Confirm availability details'}</Text></TouchableOpacity>
   </View>:null}
   <View style={s.panel}>
    <Text style={s.section}>BLOCK UNAVAILABLE DATES</Text>
    <Text style={s.label}>START DATE · YYYY-MM-DD</Text><TextInput value={start} onChangeText={setStart} placeholder="2026-12-10" placeholderTextColor="#8290A0" style={s.input}/>
    <Text style={s.label}>END DATE · YYYY-MM-DD</Text><TextInput value={end} onChangeText={setEnd} placeholder="2026-12-14" placeholderTextColor="#8290A0" style={s.input}/>
    <Text style={s.label}>REASON · OPTIONAL</Text><TextInput value={reason} onChangeText={setReason} placeholder="Owner stay, maintenance, external booking…" placeholderTextColor="#8290A0" style={s.input}/>
    <TouchableOpacity disabled={busy} onPress={()=>void addBlock()} style={s.primary}><Text style={s.primaryText}>{busy?'Saving…':'Block these dates'}</Text></TouchableOpacity>
   </View>
   <Text style={s.section}>EXISTING BLOCKS · {active.length}</Text>
   {active.length===0?<Text style={s.hint}>No unavailable date blocks recorded for this property.</Text>:active.map(b=><View key={b.id} style={s.block}><Text style={s.blockTitle}>{b.start_date} → {b.end_date}</Text><Text style={s.meta}>{b.block_type.replace(/_/g,' ')} · {b.note||'No note'}</Text><TouchableOpacity disabled={busy} onPress={()=>void removeBlock(b.id)}><Text style={s.remove}>{busy?'Updating…':'Remove block'}</Text></TouchableOpacity></View>)}
  </>}
  <Text style={s.footnote}>Calendar changes use HAMLET’s existing permission-checked database functions. A block cannot override an already confirmed stay or active payment hold.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:22,paddingTop:16,paddingBottom:44},back:{color:'#A8B2BE',fontSize:12,marginBottom:26},
 eyebrow:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700'},title:{color:'#F4F0E8',fontSize:36,fontFamily:'serif',marginTop:14},
 body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:9},loading:{padding:45,alignItems:'center'},
 label:{color:'#C5A46D',fontSize:9,fontWeight:'700',letterSpacing:1.2,marginTop:16,marginBottom:8},section:{color:'#C5A46D',fontSize:10,fontWeight:'700',letterSpacing:1.4,marginBottom:8},
 input:{backgroundColor:'#101D2D',borderWidth:1,borderColor:'#526176',borderRadius:5,padding:13,color:'#F4F0E8',fontSize:12},
 choice:{marginTop:8,padding:13,borderWidth:1,borderColor:'#314258',borderRadius:5},selected:{borderColor:'#C5A46D',backgroundColor:'#203247'},choiceTitle:{color:'#F4F0E8',fontSize:12,fontWeight:'700'},
 meta:{color:'#A8B2BE',fontSize:10,lineHeight:16,marginTop:5},hint:{color:'#8290A0',fontSize:10,lineHeight:16,marginTop:8},
 panel:{marginTop:18,padding:17,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:7},primary:{marginTop:16,padding:14,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},primaryText:{color:'#142235',fontSize:11,fontWeight:'700'},
 block:{marginTop:9,padding:13,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:5},blockTitle:{color:'#F4F0E8',fontSize:13,fontWeight:'700'},remove:{color:'#D9A7A1',fontSize:10,fontWeight:'700',marginTop:10},
 alert:{marginTop:14,padding:12,backgroundColor:'#342729',borderRadius:5},error:{color:'#F0A7A0',fontSize:11},notice:{color:'#9BD0AE',fontSize:11,marginTop:12},footnote:{color:'#718094',fontSize:10,lineHeight:16,marginTop:22},
});
