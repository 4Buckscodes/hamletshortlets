import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Metrics = {
  events?: { share_initiated?:number; whatsapp_handoff?:number; link_copied?:number; link_visited?:number; unique_visitors?:number; enquiries_generated?:number };
  financials?: { booking_requests?:number; open_booking_requests?:number; confirmed_bookings?:number; completed_bookings?:number; potential_opportunity_ngn?:number; earnings_pending_ngn?:number; earnings_eligible_ngn?:number; earnings_paid_ngn?:number; earnings_reversed_ngn?:number };
  properties?: Array<{property_id:string;title:string;area:string;visits:number;enquiries:number;booking_requests:number;completed_bookings:number;potential_earnings_ngn:number;pending_earnings_ngn:number;eligible_earnings_ngn:number;paid_earnings_ngn:number}>;
};
type Attribution = { referred_partners?:Array<{referred_name:string;referred_company?:string}>; closed_bookings?:Array<{booking_reference:string;property_title:string;area:string;status:string;closing_agent_commission_ngn:number;created_at:string}> };

const money=(value:unknown)=>'₦'+Number(value||0).toLocaleString('en-NG',{maximumFractionDigits:0});
const num=(value:unknown)=>Number(value||0).toLocaleString('en-NG');

export default function PartnerDealsScreen() {
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [role,setRole]=useState('');
  const [code,setCode]=useState('');
  const [metrics,setMetrics]=useState<Metrics|null>(null);
  const [attribution,setAttribution]=useState<Attribution|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    if(!supabase){setError('Partner analytics are not configured.');setLoading(false);return;}
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user){setError('Sign in to access partner performance.');setLoading(false);return;}
    const {data:profile,error:profileError}=await supabase.from('profiles').select('role,account_status,referral_code').eq('id',auth.user.id).maybeSingle();
    if(profileError||!profile||!['partner','admin'].includes(String(profile.role))||(profile.account_status&&profile.account_status!=='active')){
      setError('Approved, active partner access is required for this workspace.');setLoading(false);return;
    }
    setRole(String(profile.role));
    let referralCode=String(profile.referral_code||'');
    if(!referralCode){
      const {data:created}=await supabase.rpc('ensure_my_referral_code');
      if(typeof created==='string')referralCode=created;
    }
    setCode(referralCode);
    const [performance,summary]=await Promise.all([
      supabase.rpc('get_my_marketing_performance',{window_days:90}),
      supabase.rpc('get_my_partner_attribution_summary'),
    ]);
    if(performance.error)throw new Error(performance.error.message);
    if(summary.error)throw new Error(summary.error.message);
    setMetrics((performance.data||{}) as Metrics);
    setAttribution((summary.data||{}) as Attribution);
    setLoading(false);
  },[]);

  useEffect(()=>{void load().catch(e=>{setError(e instanceof Error?e.message:'Could not load partner analytics.');setLoading(false);});},[load]);

  async function shareLink(path:string,label:string){
    if(!code)return;
    const url='https://www.hamlet.rest'+path+encodeURIComponent(code);
    await Share.share({message:label+' '+url});
  }

  const f=metrics?.financials||{};
  const e=metrics?.events||{};
  const properties=metrics?.properties||[];
  const bookings=attribution?.closed_bookings||[];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity onPress={()=>router.back()}><Text style={s.back}>←  Back to partner network</Text></TouchableOpacity>
        <Text style={s.eyebrow}>PARTNER PERFORMANCE · LAST 90 DAYS</Text>
        <Text style={s.title}>Your network.{ '\n' }Your momentum.</Text>
        <Text style={s.body}>Performance and earnings are read from HAMLET’s attributed share events, bookings and payout ledger.</Text>
        <TouchableOpacity onPress={()=>router.push("/partner/agent-inventory")} style={s.inventoryButton}><Text style={s.inventoryButtonText}>Browse approved inventory & share with guests  →</Text></TouchableOpacity>
        {loading?<View style={s.loading}><ActivityIndicator color="#C5A46D"/></View>:error?<View style={s.panel}><Text style={s.error}>{error}</Text><TouchableOpacity onPress={()=>void load()} style={s.outline}><Text style={s.outlineText}>Try again</Text></TouchableOpacity></View>:<>
          <View style={s.codePanel}>
            <Text style={s.label}>YOUR PARTNER REFERRAL CODE</Text>
            <Text style={s.code}>{code||'Not available'}</Text>
            <Text style={s.hint}>Share your code to invite guests and new partners. Eligible rewards are recorded by HAMLET after qualifying activity.</Text>
            <TouchableOpacity onPress={()=>void shareLink('/?ref=','Explore HAMLET stays:')} style={s.primary}><Text style={s.primaryText}>Share guest link  ↗</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>void shareLink('/partners/start?ref=','Join the HAMLET partner network:')} style={s.secondary}><Text style={s.secondaryText}>Invite a partner  ↗</Text></TouchableOpacity>
          </View>
          <Text style={s.section}>BOOKING & ENGAGEMENT</Text>
          <View style={s.grid}>
            <Metric label="Attributed booking requests" value={num(f.booking_requests)}/>
            <Metric label="Open requests" value={num(f.open_booking_requests)}/>
            <Metric label="Confirmed stays" value={num(f.confirmed_bookings)}/>
            <Metric label="Completed stays" value={num(f.completed_bookings)}/>
            <Metric label="Link visits" value={num(e.link_visited)}/>
            <Metric label="Unique visitors" value={num(e.unique_visitors)}/>
            <Metric label="Enquiries generated" value={num(e.enquiries_generated)}/>
            <Metric label="Share actions" value={num((Number(e.share_initiated||0)+Number(e.whatsapp_handoff||0)+Number(e.link_copied||0)))}/>
          </View>
          <Text style={s.section}>COMMISSION & PAYOUT POSITION</Text>
          <View style={s.panel}>
            <Finance label="Potential opportunity · unpaid requests" value={money(f.potential_opportunity_ngn)}/>
            <Finance label="Pending completion" value={money(f.earnings_pending_ngn)}/>
            <Finance label="Eligible for payout" value={money(f.earnings_eligible_ngn)}/>
            <Finance label="Paid & settled" value={money(f.earnings_paid_ngn)}/>
            <Finance label="Reversed / withheld" value={money(f.earnings_reversed_ngn)}/>
            <Text style={s.hint}>These figures come from HAMLET’s server-side attribution and payment ledger. Potential opportunity is not earned or payable income.</Text>
          </View>
          <Text style={s.section}>YOUR SHARED PROPERTIES</Text>
          {properties.length?properties.map(item=><View key={item.property_id} style={s.listCard}>
            <Text style={s.propertyTitle}>{item.title}</Text><Text style={s.hint}>{item.area||'Lagos'}</Text>
            <View style={s.row}><Mini label="Visits" value={num(item.visits)}/><Mini label="Enquiries" value={num(item.enquiries)}/><Mini label="Bookings" value={num(item.booking_requests)}/></View>
            <Text style={s.amount}>Paid {money(item.paid_earnings_ngn)} · Pending {money(item.pending_earnings_ngn)}</Text>
          </View>):<View style={s.panel}><Text style={s.body}>No shared-property activity has been recorded yet. Share an approved HAMLET property to start building your performance history.</Text></View>}
          <Text style={s.section}>CLOSED-BOOKING ATTRIBUTION</Text>
          {bookings.length?bookings.slice(0,10).map((item,index)=><View key={item.booking_reference+index} style={s.listCard}>
            <Text style={s.propertyTitle}>{item.property_title}</Text><Text style={s.hint}>{item.booking_reference} · {item.area} · {item.status}</Text>
            <Text style={s.amount}>Attributed commission {money(item.closing_agent_commission_ngn)}</Text>
          </View>):<View style={s.panel}><Text style={s.body}>No closing-agent bookings are attributed to your account yet.</Text></View>}
          <Text style={s.hint}>Partner role: {role}. All amounts shown are server-reported NGN values, not client estimates.</Text>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>;}
function Finance({label,value}:{label:string;value:string}){return <View style={s.finance}><Text style={s.financeLabel}>{label}</Text><Text style={s.financeValue}>{value}</Text></View>;}
function Mini({label,value}:{label:string;value:string}){return <View style={s.mini}><Text style={s.miniValue}>{value}</Text><Text style={s.hint}>{label}</Text></View>;}

const s=StyleSheet.create({
 inventoryButton:{marginTop:18,padding:14,borderWidth:1,borderColor:"#C5A46D",borderRadius:5,alignItems:"center"},inventoryButtonText:{color:"#C5A46D",fontSize:11,fontWeight:"700"},
 safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:22,paddingTop:16,paddingBottom:42},
 back:{color:'#A8B2BE',fontSize:12,marginBottom:28},eyebrow:{color:'#C5A46D',fontSize:9,letterSpacing:1.5,fontWeight:'700'},
 title:{color:'#F4F0E8',fontSize:38,lineHeight:42,fontFamily:'serif',marginTop:14},body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:10},
 loading:{padding:45,alignItems:'center'},panel:{marginTop:14,padding:18,backgroundColor:'#18283A',borderColor:'#314258',borderWidth:1,borderRadius:7},
 codePanel:{marginTop:24,padding:20,backgroundColor:'#18283A',borderColor:'#C5A46D',borderWidth:1,borderRadius:7},
 label:{color:'#C5A46D',fontSize:9,letterSpacing:1.4,fontWeight:'700'},code:{color:'#F4F0E8',fontSize:29,fontWeight:'700',letterSpacing:2,marginTop:9},
 hint:{color:'#8290A0',fontSize:10,lineHeight:16,marginTop:8},primary:{marginTop:17,padding:14,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},
 primaryText:{color:'#142235',fontSize:12,fontWeight:'700'},secondary:{marginTop:9,padding:13,borderWidth:1,borderColor:'#C5A46D',borderRadius:5,alignItems:'center'},
 secondaryText:{color:'#C5A46D',fontSize:12,fontWeight:'700'},section:{color:'#C5A46D',fontSize:10,letterSpacing:1.5,fontWeight:'700',marginTop:30,marginBottom:12},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:9},metric:{width:'48%',flexGrow:1,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:6,padding:14},
 metricValue:{color:'#F4F0E8',fontSize:21,fontWeight:'700'},metricLabel:{color:'#A8B2BE',fontSize:10,lineHeight:15,marginTop:6},
 finance:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#314258'},
 financeLabel:{color:'#A8B2BE',fontSize:11,flex:1,paddingRight:10},financeValue:{color:'#F4F0E8',fontSize:13,fontWeight:'700'},
 listCard:{marginTop:9,padding:15,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:6},
 propertyTitle:{color:'#F4F0E8',fontSize:14,fontWeight:'700'},row:{flexDirection:'row',gap:18,marginTop:14},mini:{minWidth:55},miniValue:{color:'#F4F0E8',fontSize:16,fontWeight:'700'},
 amount:{color:'#C5A46D',fontSize:11,fontWeight:'700',marginTop:13},error:{color:'#F0A7A0',fontSize:12},
 outline:{marginTop:14,padding:12,borderWidth:1,borderColor:'#C5A46D',borderRadius:5,alignItems:'center'},outlineText:{color:'#C5A46D',fontWeight:'700',fontSize:12},
});
