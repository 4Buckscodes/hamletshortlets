import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Stay={id:string;title:string;area:string;property_type:string|null;bedrooms:number|null;bathrooms:number|null;capacity:number|null;image_urls:string[]|null;trust_label:string|null;first_available_date:string|null};
export default function AgentInventoryScreen(){
 const [items,setItems]=useState<Stay[]>([]);
 const [search,setSearch]=useState('');
 const [code,setCode]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [shared,setShared]=useState('');
 const load=useCallback(async()=>{
  if(!supabase){setError('Inventory is not configured.');setLoading(false);return;}
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setError('Sign in to discover approved inventory.');setLoading(false);return;}
  const {data:profile,error:profileError}=await supabase.from('profiles').select('role,account_status,referral_code').eq('id',auth.user.id).maybeSingle();
  if(profileError||!profile||!['partner','admin'].includes(String(profile.role))||(profile.account_status&&profile.account_status!=='active')){setError('Active partner access is required.');setLoading(false);return;}
  let ref=String(profile.referral_code||'');
  if(!ref){const {data}=await supabase.rpc('ensure_my_referral_code');if(typeof data==='string')ref=data;}
  setCode(ref);
  const {data,error:e}=await supabase.from('properties').select('id,title,area,property_type,bedrooms,bathrooms,capacity,image_urls,trust_label,first_available_date').eq('status','approved').order('updated_at',{ascending:false}).limit(100);
  if(e)throw new Error('Could not load approved HAMLET inventory.');
  setItems((data||[]) as Stay[]);setError('');setLoading(false);
 },[]);
 useFocusEffect(useCallback(()=>{void load().catch(e=>{setError(e instanceof Error?e.message:'Could not load inventory.');setLoading(false);});},[load]));
 const filtered=items.filter(x=>(x.title+' '+x.area+' '+(x.property_type||'')).toLowerCase().includes(search.toLowerCase().trim()));
 async function share(item:Stay){
  if(!code)return;
  const url='https://www.hamlet.rest/stays/'+encodeURIComponent(item.id)+'?ref='+encodeURIComponent(code);
  await Share.share({message:'Take a look at '+item.title+' in '+item.area+' on HAMLET: '+url});
  setShared(item.id);
 }
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
  <TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>←  Back to performance</Text></TouchableOpacity>
  <Text style={s.eyebrow}>AGENT INVENTORY DESK</Text><Text style={s.title}>Find a stay. Bring a guest.</Text>
  <Text style={s.body}>Browse approved HAMLET properties and share a tracked link with your guest. Your referral code is attached so qualifying activity can be attributed to your account.</Text>
  <TextInput value={search} onChangeText={setSearch} placeholder="Search by property, area or type" placeholderTextColor="#8290A0" style={s.search}/>
  {loading?<View style={s.loading}><ActivityIndicator color="#C5A46D"/></View>:error?<View style={s.panel}><Text style={s.error}>{error}</Text><TouchableOpacity onPress={()=>{setLoading(true);void load();}}><Text style={s.action}>Try again</Text></TouchableOpacity></View>:<>
   <View style={s.summary}><Text style={s.summaryValue}>{filtered.length}</Text><Text style={s.summaryLabel}>approved properties available to share</Text></View>
   {filtered.length===0?<View style={s.panel}><Text style={s.body}>No matching approved stays. Try another area or property type.</Text></View>:filtered.map(item=><View key={item.id} style={s.card}>
    <View style={s.row}><Text style={s.area}>{item.area||'Lagos'}</Text>{item.trust_label?<Text style={s.trust}>{item.trust_label}</Text>:null}</View>
    <Text style={s.cardTitle}>{item.title}</Text>
    <Text style={s.meta}>{item.property_type||'Shortlet'} · {item.bedrooms??'—'} beds · {item.bathrooms??'—'} baths · {item.capacity??'—'} guests</Text>
    {item.first_available_date?<Text style={s.meta}>First available: {item.first_available_date}</Text>:null}
    <TouchableOpacity onPress={()=>void share(item)} style={s.primary}><Text style={s.primaryText}>{shared===item.id?'Share again':'Share tracked property link  ↗'}</Text></TouchableOpacity>
   </View>)}
  </>}
  <Text style={s.footnote}>Only approved public listings are shown. Sharing a link does not guarantee availability, booking or commission. The guest must submit a booking request and HAMLET’s attribution and payout rules determine eligibility.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:22,paddingTop:16,paddingBottom:44},back:{color:'#A8B2BE',fontSize:12,marginBottom:26},
 eyebrow:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700'},title:{color:'#F4F0E8',fontSize:36,lineHeight:42,fontFamily:'serif',marginTop:14},
 body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:9},search:{marginTop:20,padding:14,backgroundColor:'#18283A',borderWidth:1,borderColor:'#526176',borderRadius:5,color:'#F4F0E8',fontSize:12},
 loading:{padding:45,alignItems:'center'},summary:{flexDirection:'row',alignItems:'baseline',gap:8,marginTop:20},summaryValue:{color:'#F4F0E8',fontSize:23,fontWeight:'700'},summaryLabel:{color:'#A8B2BE',fontSize:10},
 card:{marginTop:13,padding:16,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:7},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 area:{color:'#C5A46D',fontSize:10,fontWeight:'700',letterSpacing:1,textTransform:'uppercase'},trust:{color:'#9BD0AE',fontSize:9},cardTitle:{color:'#F4F0E8',fontSize:20,fontFamily:'serif',marginTop:9},
 meta:{color:'#A8B2BE',fontSize:11,lineHeight:17,marginTop:6},primary:{marginTop:15,padding:13,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},primaryText:{color:'#142235',fontSize:11,fontWeight:'700'},
 panel:{marginTop:15,padding:17,backgroundColor:'#18283A',borderRadius:7},error:{color:'#F0A7A0',fontSize:11},action:{color:'#C5A46D',fontSize:11,fontWeight:'700',marginTop:10},
 footnote:{color:'#718094',fontSize:10,lineHeight:16,marginTop:22},
});
