import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Booking={
 id:string;reference:string;property_id:string;check_in:string;check_out:string;guest_count:number;
 accommodation_subtotal:number;guest_total:number;refundable_deposit:number;special_requests:string|null;
 status:string;payment_deadline:string|null;properties?:{title?:string;area?:string}|null;
 profiles?:{full_name?:string;phone?:string}|null;
};
type Decision={booking:Booking;nextStatus:string;label:string};
const money=(n:number)=>'₦'+Number(n||0).toLocaleString('en-NG',{maximumFractionDigits:0});

export default function PartnerBookingRequestsScreen(){
 const [items,setItems]=useState<Booking[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busyId,setBusyId]=useState('');
 const [decision,setDecision]=useState<Decision|null>(null);
 const [note,setNote]=useState('');

 const load=useCallback(async()=>{
  if(!supabase){setError('Partner booking access is not configured.');setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError('Sign in with your partner account to continue.');setLoading(false);return;}
  const {data:profile}=await supabase.from('profiles').select('role,account_status').eq('id',auth.user.id).maybeSingle();
  if(!profile||!['partner','admin'].includes(String(profile.role))||(profile.account_status&&profile.account_status!=='active')){
   setError('Active partner access is required to review bookings.');setLoading(false);return;
  }
  const {data,error:queryError}=await supabase.from('bookings')
   .select('id,reference,property_id,check_in,check_out,guest_count,accommodation_subtotal,guest_total,refundable_deposit,special_requests,status,payment_deadline,properties(title,area),profiles!bookings_guest_id_fkey(full_name,phone)')
   .order('created_at',{ascending:false});
  if(queryError)throw new Error('We could not load booking requests. Check your partner access and try again.');
  setItems((data||[]) as unknown as Booking[]);
  setError('');setLoading(false);
 },[]);

 useFocusEffect(useCallback(()=>{void load().catch(e=>{setError(e instanceof Error?e.message:'Could not load bookings.');setLoading(false);});},[load]));

 async function transition(booking:Booking,nextStatus:string,noteText:string){
  if(!supabase)return;
  setBusyId(booking.id);setError('');setNotice('');
  try{
   if(nextStatus==='awaiting_payment'){
    const {data:unavailable,error:availabilityError}=await supabase.rpc('get_unavailable_property_ids',{
     requested_check_in:booking.check_in,requested_check_out:booking.check_out,
    });
    if(availabilityError)throw new Error('Could not verify date availability. Please retry before accepting.');
    if(Array.isArray(unavailable)&&unavailable.includes(booking.property_id))throw new Error('These dates now conflict with a calendar block, payment hold or confirmed stay.');
   }
   const {error:rpcError}=await supabase.rpc('transition_booking',{
    target_booking_id:booking.id,next_status:nextStatus,
    transition_note:noteText.trim()||'Updated by property partner from HAMLET mobile app.',
   });
   if(rpcError)throw new Error(rpcError.message);
   setNotice('Booking '+booking.reference+' updated to '+nextStatus.replace(/_/g,' ')+'.');
   setDecision(null);setNote('');await load();
  }catch(e){setError(e instanceof Error?e.message:'Could not update this booking.');}
  finally{setBusyId('');}
 }

 function submitDecision(){
  if(!decision)return;
  if(decision.nextStatus==='declined'&&note.trim().length<4){setError('Add a short reason before declining this request.');return;}
  void transition(decision.booking,decision.nextStatus,note);
 }

 return <SafeAreaView style={s.safe}>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
   <TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>←  Back to portfolio</Text></TouchableOpacity>
   <Text style={s.eyebrow}>PARTNER BOOKING REVIEW</Text>
   <Text style={s.title}>Booking requests.</Text>
   <Text style={s.body}>Review dates, check the calendar and make a clear decision. Accepting opens the existing 48-hour payment hold; it does not mark a stay as paid.</Text>
   {error?<View style={s.alert}><Text style={s.error}>{error}</Text></View>:null}
   {notice?<Text style={s.notice}>{notice}</Text>:null}
   {loading?<View style={s.loading}><ActivityIndicator color="#C5A46D"/></View>:items.length===0?<View style={s.panel}><Text style={s.cardTitle}>No booking activity yet.</Text><Text style={s.body}>New requests for properties you are authorised to manage will appear here.</Text></View>:items.map(b=><View key={b.id} style={s.card}>
    <Text style={s.reference}>{b.reference} · {b.status.replace(/_/g,' ').toUpperCase()}</Text>
    <Text style={s.cardTitle}>{b.properties?.title||'Assigned property'}</Text>
    <Text style={s.meta}>{b.properties?.area||'Lagos'} · {b.check_in} → {b.check_out}</Text>
    <Text style={s.meta}>{b.guest_count} guests · {b.profiles?.full_name||'Verified guest'}</Text>
    <Text style={s.amount}>Owner accommodation base: {money(Number(b.accommodation_subtotal))}</Text>
    <Text style={s.meta}>Guest total: {money(Number(b.guest_total))}</Text>
    {Number(b.refundable_deposit)>0?<Text style={s.meta}>Refundable caution deposit: {money(Number(b.refundable_deposit))}</Text>:null}
    {b.special_requests?<View style={s.noteBox}><Text style={s.noteLabel}>GUEST REQUEST</Text><Text style={s.meta}>{b.special_requests}</Text></View>:null}
    {b.status==='requested'?<TouchableOpacity disabled={busyId===b.id} onPress={()=>void transition(b,'checking','Partner is checking calendar availability.')} style={s.outline}><Text style={s.outlineText}>{busyId===b.id?'Updating…':'Mark as checking'}</Text></TouchableOpacity>:null}
    {['requested','checking'].includes(b.status)?<View style={s.actions}>
      <TouchableOpacity disabled={!!busyId} onPress={()=>{setNote('');setError('');setDecision({booking:b,nextStatus:'awaiting_payment',label:'Accept & open payment hold'});}} style={s.primary}><Text style={s.primaryText}>Accept dates</Text></TouchableOpacity>
      <TouchableOpacity disabled={!!busyId} onPress={()=>{setNote('');setError('');setDecision({booking:b,nextStatus:'declined',label:'Decline request'});}} style={s.outline}><Text style={s.outlineText}>Decline</Text></TouchableOpacity>
    </View>:null}
    {b.status==='confirmed'?<View style={s.actions}>
      <TouchableOpacity disabled={!!busyId} onPress={()=>{setNote('');setDecision({booking:b,nextStatus:'completed',label:'Mark stay completed'});}} style={s.primary}><Text style={s.primaryText}>Complete stay</Text></TouchableOpacity>
      <TouchableOpacity disabled={!!busyId} onPress={()=>{setNote('');setDecision({booking:b,nextStatus:'no_show',label:'Record no-show'});}} style={s.outline}><Text style={s.outlineText}>Record no-show</Text></TouchableOpacity>
    </View>:null}
   </View>)}
   {decision?<View style={s.decision}>
    <Text style={s.decisionTitle}>{decision.label}</Text>
    <Text style={s.meta}>{decision.booking.reference} · {decision.booking.properties?.title||'Stay'}</Text>
    <Text style={s.label}>{decision.nextStatus==='declined'?'REASON FOR DECLINING':'NOTE FOR GUEST / AUDIT LOG'}</Text>
    <TextInput value={note} onChangeText={setNote} multiline maxLength={500} placeholder={decision.nextStatus==='declined'?'e.g. Dates already booked on another channel':'Optional handover or welcome note'} placeholderTextColor="#8290A0" style={s.input}/>
    <TouchableOpacity disabled={!!busyId} onPress={submitDecision} style={s.primary}><Text style={s.primaryText}>{busyId?'Updating…':decision.label}</Text></TouchableOpacity>
    <TouchableOpacity onPress={()=>setDecision(null)} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
   </View>:null}
   <Text style={s.footnote}>HAMLET checks date conflicts before opening a payment hold. Only verified payment-provider events can confirm payment. Guest personal information is limited to the fields allowed by your existing partner access.</Text>
  </ScrollView>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:22,paddingTop:16,paddingBottom:44},back:{color:'#A8B2BE',fontSize:12,marginBottom:26},
 eyebrow:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700'},title:{color:'#F4F0E8',fontSize:37,fontFamily:'serif',marginTop:14},
 body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:9},loading:{padding:45,alignItems:'center'},
 card:{marginTop:15,padding:16,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:7},reference:{color:'#C5A46D',fontSize:9,letterSpacing:1,fontWeight:'700'},
 cardTitle:{color:'#F4F0E8',fontSize:21,fontFamily:'serif',marginTop:8},meta:{color:'#A8B2BE',fontSize:11,lineHeight:18,marginTop:5},amount:{color:'#F4F0E8',fontSize:13,fontWeight:'700',marginTop:12},
 noteBox:{marginTop:12,padding:11,backgroundColor:'#101D2D',borderRadius:5},noteLabel:{color:'#C5A46D',fontSize:9,fontWeight:'700',letterSpacing:1},
 actions:{flexDirection:'row',gap:8,marginTop:14},primary:{flex:1,padding:13,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center',marginTop:12},primaryText:{color:'#142235',fontSize:11,fontWeight:'700'},
 outline:{flex:1,padding:12,borderWidth:1,borderColor:'#C5A46D',borderRadius:5,alignItems:'center',marginTop:12},outlineText:{color:'#C5A46D',fontSize:11,fontWeight:'700'},
 decision:{marginTop:22,padding:17,backgroundColor:'#26364A',borderRadius:7,borderWidth:1,borderColor:'#C5A46D'},decisionTitle:{color:'#F4F0E8',fontSize:20,fontFamily:'serif'},
 label:{color:'#C5A46D',fontSize:9,fontWeight:'700',letterSpacing:1.2,marginTop:16,marginBottom:8},input:{minHeight:88,textAlignVertical:'top',backgroundColor:'#101D2D',borderWidth:1,borderColor:'#526176',borderRadius:5,padding:12,color:'#F4F0E8',fontSize:12},
 cancel:{alignItems:'center',padding:12,marginTop:5},cancelText:{color:'#A8B2BE',fontSize:11},footnote:{color:'#718094',fontSize:10,lineHeight:16,marginTop:22},
 panel:{marginTop:18,padding:18,backgroundColor:'#18283A',borderRadius:7},alert:{marginTop:14,padding:13,backgroundColor:'#342729',borderRadius:5},error:{color:'#F0A7A0',fontSize:11},notice:{color:'#9BD0AE',fontSize:11,marginTop:12},
});
