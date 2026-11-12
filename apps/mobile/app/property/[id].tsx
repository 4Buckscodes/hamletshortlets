import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { HAMLET_API_BASE_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type Property = {
  id: string; title: string; area: string | null; property_type: string | null;
  guest_nightly_ngn: number | null; cleaning_fee: number | string | null;
  refundable_deposit: number | string | null; bedrooms: number | null;
  bathrooms: number | null; capacity: number | null; amenities: string[] | null;
  image_urls: string[] | null; house_rules: string[] | null; trust_label: string | null;
  first_available_date: string | null;
};

const money = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(amount);

export default function PropertyScreen() {
  const { id, checkIn: initialCheckIn, checkOut: initialCheckOut, guests: initialGuests } = useLocalSearchParams<{ id: string; checkIn?: string; checkOut?: string; guests?: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [dateField, setDateField] = useState<'checkIn' | 'checkOut' | null>(null);
  const [dateDraft, setDateDraft] = useState(new Date());
  const [guests, setGuests] = useState('1');
  const [requests, setRequests] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (typeof initialCheckIn === 'string') setCheckIn(initialCheckIn);
    if (typeof initialCheckOut === 'string') setCheckOut(initialCheckOut);
    if (typeof initialGuests === 'string') setGuests(initialGuests);
  }, [initialCheckIn, initialCheckOut, initialGuests]);

  useEffect(() => {
    let active = true;
    fetch(HAMLET_API_BASE_URL + '/api/mobile/stays/' + encodeURIComponent(id))
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not load this stay.');
        return payload.property as Property;
      })
      .then(value => { if (active) setProperty(value); })
      .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : 'Could not load this stay.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function applySelectedDate(selectedDate: Date) {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const value = year + '-' + month + '-' + day;
    if (dateField === 'checkIn') {
      setCheckIn(value);
      if (checkOut && checkOut <= value) setCheckOut('');
    } else if (dateField === 'checkOut') {
      setCheckOut(value);
    }
    setDateField(null);
  }

  async function requestBooking() {
    setError(''); setSuccess('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
      setError('Enter valid dates in YYYY-MM-DD format. Check-out must be after check-in.');
      return;
    }
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      setError('Enter a guest count between 1 and 20.');
      return;
    }
    if (!supabase) { setError('Booking is not configured right now.'); return; }

    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        const next = '/property/' + id + '?checkIn=' + encodeURIComponent(checkIn) + '&checkOut=' + encodeURIComponent(checkOut) + '&guests=' + encodeURIComponent(guests);
        router.push({ pathname: '/sign-in', params: { next } });
        return;
      }
      const response = await fetch(HAMLET_API_BASE_URL + '/api/booking-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          propertyId: id, checkIn, checkOut, guests: guestCount,
          specialRequests: requests.trim(), quoteCurrency: 'NGN',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not send your request.');
      setSuccess('Request ' + result.booking.reference + ' received. The property partner will confirm availability before payment opens.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not send your request.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color="#C5A46D"/></View></SafeAreaView>;
  if (!property) return <SafeAreaView style={s.safe}><View style={s.content}><Text style={s.body}>{error || 'This stay is not available.'}</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>←  Back to stays</Text></TouchableOpacity>
        {property.image_urls?.[0] ? <Image source={{ uri: property.image_urls[0] }} style={s.hero}/> : <View style={[s.hero,s.heroFallback]}><Text style={s.fallback}>HAMLET</Text></View>}
        <Text style={s.area}>{property.area || 'Lagos'}</Text>
        <Text style={s.title}>{property.title}</Text>
        <Text style={s.body}>{[property.bedrooms ? property.bedrooms + ' bedrooms' : null, property.bathrooms ? property.bathrooms + ' bathrooms' : null, property.capacity ? 'Up to ' + property.capacity + ' guests' : null].filter(Boolean).join('  ·  ')}</Text>
        {property.trust_label ? <Text style={s.trust}>{property.trust_label}</Text> : null}
        {property.guest_nightly_ngn ? <Text style={s.price}>{money(property.guest_nightly_ngn)} <Text style={s.perNight}>/ night</Text></Text> : <Text style={s.body}>Rate available on enquiry</Text>}
        {property.amenities?.length ? <View style={s.section}><Text style={s.sectionTitle}>Amenities</Text><Text style={s.body}>{property.amenities.join('  ·  ')}</Text></View> : null}
        {property.house_rules?.length ? <View style={s.section}><Text style={s.sectionTitle}>House rules</Text>{property.house_rules.map((rule,i)=><Text key={i} style={s.body}>• {rule}</Text>)}</View> : null}

        <View style={s.booking}>
          <Text style={s.sectionTitle}>Request your stay</Text>
          <Text style={s.hint}>Choose your dates. The property partner confirms availability before payment opens.</Text>
          <Text style={s.label}>CHECK-IN</Text>
          <TouchableOpacity onPress={() => { setDateDraft(checkIn ? new Date(checkIn + 'T12:00:00') : new Date()); setDateField('checkIn'); }} style={s.dateButton}>
            <Text style={checkIn ? s.dateValue : s.datePlaceholder}>{checkIn || 'Choose check-in date'}</Text>
          </TouchableOpacity>
          <Text style={s.label}>CHECK-OUT</Text>
          <TouchableOpacity onPress={() => { setDateDraft(checkOut ? new Date(checkOut + 'T12:00:00') : checkIn ? new Date(checkIn + 'T12:00:00') : new Date()); setDateField('checkOut'); }} style={s.dateButton}>
            <Text style={checkOut ? s.dateValue : s.datePlaceholder}>{checkOut || 'Choose check-out date'}</Text>
          </TouchableOpacity>
          {dateField ? (
            <View style={s.datePicker}>
              <DateTimePicker
                value={dateDraft}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={dateField === 'checkOut' && checkIn ? new Date(checkIn + 'T12:00:00') : new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setDateDraft(selectedDate);
                  if (Platform.OS === 'android') {
                    if (event.type === 'set' && selectedDate) applySelectedDate(selectedDate);
                    else setDateField(null);
                  }
                }}
              />
              {Platform.OS === 'ios' ? (
                <TouchableOpacity onPress={() => applySelectedDate(dateDraft)} style={s.dateConfirm}>
                  <Text style={s.dateConfirmText}>Confirm date</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          <Text style={s.label}>GUESTS</Text>
          <TextInput value={guests} onChangeText={setGuests} keyboardType="number-pad" style={s.input}/>
          <Text style={s.label}>SPECIAL REQUESTS · OPTIONAL</Text>
          <TextInput value={requests} onChangeText={setRequests} multiline maxLength={1000} placeholder="Anything the host should know?" placeholderTextColor="#8290A0" style={[s.input,s.multiline]}/>
          {error ? <Text style={s.error}>{error}</Text> : null}
          {success ? <Text style={s.success}>{success}</Text> : null}
          <TouchableOpacity disabled={busy} onPress={requestBooking} style={[s.submit,busy&&s.disabled]}><Text style={s.submitText}>{busy ? 'Sending request…' : 'Request this stay  →'}</Text></TouchableOpacity>
          <Text style={s.hint}>No payment is taken when you submit a request.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#101D2D'},content:{padding:20,paddingBottom:40},
  center:{flex:1,alignItems:'center',justifyContent:'center'},back:{color:'#A8B2BE',fontSize:13,marginBottom:16},
  hero:{width:'100%',height:240,borderRadius:8,backgroundColor:'#203247'},heroFallback:{alignItems:'center',justifyContent:'center'},fallback:{color:'#C5A46D',letterSpacing:3,fontWeight:'700'},
  area:{color:'#C5A46D',fontSize:10,letterSpacing:1.5,fontWeight:'700',marginTop:22,textTransform:'uppercase'},
  title:{color:'#F4F0E8',fontSize:31,lineHeight:37,fontFamily:'serif',marginTop:7},body:{color:'#A8B2BE',fontSize:13,lineHeight:21,marginTop:10},
  trust:{color:'#91C5A6',fontSize:11,marginTop:12},price:{color:'#F4F0E8',fontSize:21,fontWeight:'700',marginTop:18},perNight:{color:'#A8B2BE',fontSize:12,fontWeight:'400'},
  section:{marginTop:28},sectionTitle:{color:'#F4F0E8',fontSize:22,fontFamily:'serif'},booking:{marginTop:32,padding:18,backgroundColor:'#18283A',borderColor:'#314258',borderWidth:1,borderRadius:8},
  hint:{color:'#A8B2BE',fontSize:11,lineHeight:18,marginTop:9},label:{color:'#C5A46D',fontSize:9,letterSpacing:1.2,fontWeight:'700',marginTop:18,marginBottom:7},
  input:{color:'#F4F0E8',backgroundColor:'#101D2D',borderColor:'#314258',borderWidth:1,borderRadius:5,paddingHorizontal:12,paddingVertical:13,fontSize:13},
  dateButton:{backgroundColor:'#101D2D',borderColor:'#314258',borderWidth:1,borderRadius:5,paddingHorizontal:12,paddingVertical:15},
  dateConfirm:{backgroundColor:'#C5A46D',padding:12,alignItems:'center'},dateConfirmText:{color:'#142235',fontSize:12,fontWeight:'700'},
  dateValue:{color:'#F4F0E8',fontSize:13},datePlaceholder:{color:'#8290A0',fontSize:13},datePicker:{marginTop:10,backgroundColor:'#F4F0E8',borderRadius:6,overflow:'hidden'},
  multiline:{minHeight:80,textAlignVertical:'top'},error:{color:'#F0A7A0',fontSize:12,marginTop:14},success:{color:'#9BD0AE',fontSize:12,lineHeight:19,marginTop:14},
  submit:{backgroundColor:'#C5A46D',borderRadius:5,minHeight:50,alignItems:'center',justifyContent:'center',marginTop:20},disabled:{opacity:0.6},submitText:{color:'#142235',fontWeight:'700',fontSize:13},
});
