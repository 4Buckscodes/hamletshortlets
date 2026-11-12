import { useCallback, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

type Booking = {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  guest_total: number;
  refundable_deposit: number;
  status: string;
  created_at: string;
  properties?: { title?: string; area?: string } | null;
};

const labels: Record<string, string> = {
  requested: 'Awaiting partner response',
  checking: 'Availability being checked',
  awaiting_payment: 'Accepted · awaiting payment',
  confirmed: 'Confirmed · payment verified',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Payment hold expired',
  refunded: 'Refunded',
  disputed: 'Under operations review',
  declined: 'Declined by partner',
  no_show: 'Recorded no-show',
};

const money = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(amount || 0);

export default function BookingsScreen() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!supabase) {
      setError('HAMLET account access is not configured.');
      setLoading(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setSignedIn(false);
      setItems([]);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    await supabase.rpc('expire_overdue_bookings');
    const { data, error: queryError } = await supabase
      .from('bookings')
      .select('id,reference,property_id,check_in,check_out,guest_count,guest_total,refundable_deposit,status,created_at,properties(title,area)')
      .order('created_at', { ascending: false });
    if (queryError) setError('We could not load your booking requests. Please try again.');
    else { setItems((data || []) as unknown as Booking[]); setError(''); }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => data.subscription.unsubscribe();
  }, [load]);

  async function cancelBooking(booking: Booking) {
    if (!supabase) return;
    setBusyId(booking.id); setError(''); setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('transition_booking', {
        target_booking_id: booking.id,
        next_status: 'cancelled',
        transition_note: 'Cancelled by guest from HAMLET mobile app.',
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice('Booking request ' + booking.reference + ' has been cancelled.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not cancel this booking request.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>YOUR HAMLET JOURNEY</Text>
        <Text style={s.title}>Bookings.</Text>
        <Text style={s.body}>Follow every request from the first enquiry through partner confirmation and payment.</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {notice ? <Text style={s.notice}>{notice}</Text> : null}

        {loading ? (
          <View style={s.state}><ActivityIndicator color="#C5A46D"/><Text style={s.body}>Loading your bookings…</Text></View>
        ) : !signedIn ? (
          <View style={s.state}>
            <Text style={s.stateTitle}>Your stays, all in one place.</Text>
            <Text style={s.body}>Sign in to see booking requests and follow their progress.</Text>
            <Link href="/sign-in" asChild><TouchableOpacity style={s.button}><Text style={s.buttonText}>Sign in  →</Text></TouchableOpacity></Link>
          </View>
        ) : items.length === 0 ? (
          <View style={s.state}>
            <Text style={s.stateTitle}>No bookings yet.</Text>
            <Text style={s.body}>When you request a stay, its status and next steps will appear here.</Text>
            <Link href="/stays" asChild><TouchableOpacity style={s.button}><Text style={s.buttonText}>Explore stays  →</Text></TouchableOpacity></Link>
          </View>
        ) : (
          <View style={s.list}>
            <Text style={s.count}>{items.length} {items.length === 1 ? 'BOOKING' : 'BOOKINGS'}</Text>
            {items.map(booking => (
              <View key={booking.id} style={s.card}>
                <Text style={s.area}>{booking.properties?.area || 'Lagos'}</Text>
                <Text style={s.cardTitle}>{booking.properties?.title || 'HAMLET stay'}</Text>
                <Text style={s.reference}>{booking.reference}</Text>
                <View style={s.rule}/>
                <Text style={s.meta}>Check-in  ·  {booking.check_in}</Text>
                <Text style={s.meta}>Check-out  ·  {booking.check_out}</Text>
                <Text style={s.meta}>{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</Text>
                <Text style={s.total}>{money(Number(booking.guest_total))}</Text>
                {Number(booking.refundable_deposit) > 0 ? <Text style={s.meta}>Refundable caution deposit: {money(Number(booking.refundable_deposit))}</Text> : null}
                <View style={s.status}><View style={[s.dot,{backgroundColor:booking.status==='confirmed'||booking.status==='completed'?'#76B89A':'#C5A46D'}]}/><Text style={s.statusText}>{labels[booking.status] || booking.status}</Text></View>
                {['requested','checking','awaiting_payment'].includes(booking.status) ? (
                  <TouchableOpacity disabled={busyId===booking.id} onPress={() => void cancelBooking(booking)} style={s.cancel}>
                    <Text style={s.cancelText}>{busyId===booking.id?'Cancelling…':'Cancel request'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:22,paddingTop:32,paddingBottom:40},
  eyebrow:{color:'#C5A46D',fontSize:10,letterSpacing:2,fontWeight:'700'},
  title:{color:'#F4F0E8',fontSize:42,fontFamily:'serif',marginTop:12},
  body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:10},
  state:{marginTop:32,padding:22,minHeight:170,justifyContent:'center',backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:8},
  stateTitle:{color:'#F4F0E8',fontSize:21,fontFamily:'serif'},
  button:{marginTop:20,padding:14,backgroundColor:'#C5A46D',borderRadius:5,alignItems:'center'},
  buttonText:{color:'#142235',fontSize:12,fontWeight:'700'},
  list:{marginTop:30,gap:16},count:{color:'#C5A46D',fontSize:10,letterSpacing:1.6,fontWeight:'700'},
  card:{padding:17,backgroundColor:'#18283A',borderWidth:1,borderColor:'#314258',borderRadius:8},
  area:{color:'#C5A46D',fontSize:10,letterSpacing:1.4,fontWeight:'700',textTransform:'uppercase'},
  cardTitle:{color:'#F4F0E8',fontSize:21,fontFamily:'serif',marginTop:7},
  reference:{color:'#8290A0',fontSize:10,letterSpacing:1.2,marginTop:6},
  rule:{height:1,backgroundColor:'#314258',marginVertical:14},
  meta:{color:'#A8B2BE',fontSize:12,lineHeight:20,marginTop:3},
  total:{color:'#F4F0E8',fontSize:19,fontWeight:'700',marginTop:12},
  status:{flexDirection:'row',alignItems:'center',padding:11,backgroundColor:'#101D2D',borderRadius:5,marginTop:15},
  dot:{width:7,height:7,borderRadius:4,marginRight:9},statusText:{color:'#E5E0D6',fontSize:11,fontWeight:'600'},
  cancel:{borderWidth:1,borderColor:'#9C7772',padding:12,borderRadius:5,alignItems:'center',marginTop:13},
  cancelText:{color:'#D9A7A1',fontSize:12,fontWeight:'600'},
  error:{color:'#F0A7A0',fontSize:12,marginTop:14},notice:{color:'#9BD0AE',fontSize:12,marginTop:14},
});
