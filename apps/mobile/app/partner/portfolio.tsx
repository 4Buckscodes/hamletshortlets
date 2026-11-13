import { useCallback, useEffect, useState } from 'react';
import { router, Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Property = {
  id: string;
  title: string;
  area: string;
  property_type: string | null;
  bedrooms: number | null;
  capacity: number | null;
  nightly_rate: number;
  status: string;
  trust_label: string | null;
  review_note: string | null;
  updated_at: string;
};

const STATUS: Record<string,string> = {
  draft:'Draft', submitted:'Submitted', pending_review:'Under review',
  needs_correction:'Correction requested', approved:'Live on marketplace',
  paused:'Paused', suspended:'Suspended by operations', rejected:'Not approved',
};
const money=(value:number)=>'₦'+Number(value||0).toLocaleString('en-NG',{maximumFractionDigits:0});

export default function PartnerPortfolioScreen(){
  const [items,setItems]=useState<Property[]>([]);
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [pendingBookings,setPendingBookings]=useState(0);

  const load=useCallback(async()=>{
    if(!supabase){setError('Partner workspace is not configured.');setLoading(false);return;}
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user){setError('Sign in with your partner account to continue.');setLoading(false);return;}
    const {data:profile}=await supabase.from('profiles').select('role,account_status').eq('id',auth.user.id).maybeSingle();
    if(!profile||!['partner','admin'].includes(String(profile.role))||(profile.account_status&&profile.account_status!=='active')){
      setError('Active, approved partner access is required to manage a portfolio.');setLoading(false);return;
    }
    const [properties,bookings]=await Promise.all([
      supabase.from('properties').select('id,title,area,property_type,bedrooms,capacity,nightly_rate,status,trust_label,review_note,updated_at').order('updated_at',{ascending:false}),
      supabase.from('bookings').select('id',{count:'exact',head:true}).in('status',['requested','checking']),
    ]);
    if(properties.error)throw new Error('We could not load your property portfolio.');
    setItems((properties.data||[]) as Property[]);
    setPendingBookings(bookings.count||0);
    setError('');
    setLoading(false);
  },[]);

  useFocusEffect(useCallback(()=>{void load().catch(e=>{setError(e instanceof Error?e.message:'Could not load portfolio.');setLoading(false);});},[load]));

  async function togglePause(item:Property){
    if(!supabase)return;
    setBusyId(item.id);setError('');setNotice('');
    try{
      const paused=item.status==='approved';
      const {error:rpcError}=await supabase.rpc('set_property_publication_pause',{
        target_property_id:item.id,paused,pause_note:paused?'Paused from HAMLET mobile partner workspace.':'Resumed from HAMLET mobile partner workspace.',
      });
      if(rpcError)throw new Error(rpcError.message);
      setNotice(paused?'Listing paused and hidden from new search results.':'Listing is live on the marketplace again.');
      await load();
    }catch(e){setError(e instanceof Error?e.message:'Could not update listing status.');}
    finally{setBusyId('');}
  }

  const live=items.filter(p=>p.status==='approved').length;
  const attention=items.filter(p=>['draft','needs_correction','submitted','pending_review'].includes(p.status)).length;

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.content}>
      <TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>←  Back to partner desk</Text></TouchableOpacity>
      <Text style={s.eyebrow}>OWNER & MANAGER WORKSPACE</Text>
      <Text style={s.title}>Your property portfolio.</Text>
      <Text style={s.body}>One place to monitor your listings, keep availability honest and stay on top of incoming booking activity.</Text>
      {loading?<View style={s.loading}><ActivityIndicator color="#C5A46D"/></View>:<>
        {error?<View style={s.alert}><Text style={s.error}>{error}</Text><TouchableOpacity onPress={()=>{setLoading(true);void load();}}><Text style={s.action}>Try again</Text></TouchableOpacity></View>:null}
        {notice?<Text style={s.notice}>{notice}</Text>:null}
        <View style={s.stats}>
          <Stat label="Total listings" value={String(items.length)}/>
          <Stat label="Live stays" value={String(live)}/>
          <Stat label="In review / action" value={String(attention)}/>
          <Stat label="Booking requests" value={String(pendingBookings)}/>
        </View>
        <View style={s.actions}>
          <Link href="/partner/new-property" asChild><TouchableOpacity style={s.primary}><Text style={s.primaryText}>＋  Add a property</Text></TouchableOpacity></Link>
          <Link href="/partner/availability" asChild><TouchableOpacity style={s.secondary}><Text style={s.secondaryText}>Manage availability →</Text></TouchableOpacity></Link>
          <Link href="/partner/booking-requests" asChild><TouchableOpacity style={s.secondary}><Text style={s.secondaryText}>Review booking requests →</Text></TouchableOpacity></Link>
        </View>
        <Text style={s.section}>YOUR LISTINGS · {items.length}</Text>
        {items.length===0?<View style={s.panel}><Text style={s.cardTitle}>Your portfolio starts here.</Text><Text style={s.body}>Add your first property. It stays private until HAMLET completes its review and approves it.</Text></View>:items.map(item=><View key={item.id} style={s.card}>
          <View style={s.row}><Text style={s.area}>{item.area||'Lagos'}</Text><Text style={s.status}>{STATUS[item.status]||item.status}</Text></View>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.meta}>{item.property_type||'Shortlet'} · {item.bedrooms??'—'} bedrooms · Capacity {item.capacity??'—'}</Text>
          <Text style={s.rate}>{money(item.nightly_rate)} <Text style={s.meta}>owner base / night</Text></Text>
          {item.review_note?<View style={s.review}><Text style={s.reviewTitle}>HAMLET review note</Text><Text style={s.meta}>{item.review_note}</Text></View>:null}
          <View style={s.cardActions}>
            <Link href={'/partner/availability?property='+encodeURIComponent(item.id)} asChild><TouchableOpacity style={s.smallButton}><Text style={s.smallButtonText}>Calendar</Text></TouchableOpacity></Link>
            {item.status==='approved'||item.status==='paused'?<TouchableOpacity disabled={busyId===item.id} onPress={()=>void togglePause(item)} style={s.smallButton}><Text style={s.smallButtonText}>{busyId===item.id?'Updating…':item.status==='approved'?'Pause listing':'Resume listing'}</Text></TouchableOpacity>:null}
          </View>
          <Text style={s.updated}>Updated {new Date(item.updated_at).toLocaleDateString()}</Text>
        </View>)}
        <Text style={s.footnote}>You only see properties and booking activity permitted by your existing HAMLET partner access. Guest payment, booking totals and listing approval remain controlled by HAMLET’s server.</Text>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Stat({label,value}:{label:string;value:string}){return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>;}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:22,paddingTop:16,paddingBottom:44},back:{color:'#A8B2BE',fontSize:12,marginBottom:26},
 eyebrow:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700'},title:{color:'#F4F0E8',fontSize:37,lineHeight:42,fontFamily:'serif',marginTop:14},
 body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:9},loading:{padding:50,alignItems:'center'},
 stats:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:22},stat:{width:'48%',flexGrow:1,padding:14,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:6},
 statValue:{color:'#F4F0E8',fontSize:23,fontWeight:'700'},statLabel:{color:'#A8B2BE',fontSize:10,marginTop:5},
 actions:{gap:9,marginTop:18},primary:{padding:15,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},primaryText:{color:'#142235',fontWeight:'700',fontSize:12},
 secondary:{padding:14,borderWidth:1,borderColor:'#C5A46D',borderRadius:5,alignItems:'center'},secondaryText:{color:'#C5A46D',fontWeight:'700',fontSize:12},
 section:{color:'#C5A46D',fontSize:10,letterSpacing:1.5,fontWeight:'700',marginTop:28,marginBottom:10},
 card:{marginTop:10,padding:16,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:7},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 area:{color:'#C5A46D',fontSize:10,fontWeight:'700',textTransform:'uppercase',letterSpacing:1},status:{color:'#E5E0D6',fontSize:9,backgroundColor:'#26364A',paddingHorizontal:9,paddingVertical:5,borderRadius:20},
 cardTitle:{color:'#F4F0E8',fontSize:20,fontFamily:'serif',marginTop:9},meta:{color:'#A8B2BE',fontSize:11,lineHeight:17,marginTop:5},
 rate:{color:'#F4F0E8',fontSize:16,fontWeight:'700',marginTop:11},review:{marginTop:12,padding:11,backgroundColor:'#2D2B28',borderRadius:5},reviewTitle:{color:'#D9B979',fontSize:9,fontWeight:'700',letterSpacing:1},
 cardActions:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:15},smallButton:{paddingVertical:10,paddingHorizontal:13,borderWidth:1,borderColor:'#526176',borderRadius:5},smallButtonText:{color:'#D9C59F',fontSize:10,fontWeight:'700'},
 updated:{color:'#718094',fontSize:9,marginTop:12},footnote:{color:'#718094',fontSize:10,lineHeight:16,marginTop:22},
 panel:{padding:18,marginTop:16,backgroundColor:'#18283A',borderRadius:7},alert:{padding:14,marginTop:14,backgroundColor:'#342729',borderRadius:6},error:{color:'#F0A7A0',fontSize:11},action:{color:'#C5A46D',fontSize:11,fontWeight:'700',marginTop:10},notice:{color:'#9BD0AE',fontSize:11,marginTop:12},
});
