import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateGuestPricing, calculateInternationalStayQuote, nightsBetween } from '@/lib/pricing';
import { loadActiveExchangeRates } from '@/lib/next-supabase';
import { normalizeShareToken } from '@/lib/share-engine';
import type { SupportedCurrency } from '@/lib/types';

export const runtime='nodejs';
type Body={propertyId?:string;checkIn?:string;checkOut?:string;guests?:number;quoteCurrency?:string;shareToken?:string|null};
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function validDate(value:string){if(!datePattern.test(value))return false;const d=new Date(value+'T00:00:00.000Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
function todayLagos(){const p=new Intl.DateTimeFormat('en',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=(t:Intl.DateTimeFormatPartTypes)=>p.find(x=>x.type===t)?.value||'';return v('year')+'-'+v('month')+'-'+v('day');}
function fail(message:string,status=400){return NextResponse.json({error:message},{status});}

export async function POST(request:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()||process.env.VITE_SUPABASE_URL?.trim();
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()||process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
 if(!url||!key)return fail('Booking quote service is not configured.',503);
 const token=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return fail('Sign in to see a booking quote.',401);
 let body:Body;try{body=await request.json() as Body;}catch{return fail('Invalid quote request.');}
 const propertyId=body.propertyId?.trim()||'',checkIn=body.checkIn||'',checkOut=body.checkOut||'',guests=Number(body.guests);
 const currency:SupportedCurrency=body.quoteCurrency==='USD'||body.quoteCurrency==='GBP'?body.quoteCurrency:'NGN';
 if(!propertyId||!validDate(checkIn)||!validDate(checkOut))return fail('Choose valid check-in and check-out dates.');
 if(checkIn<todayLagos()||checkOut<=checkIn)return fail('Choose future dates with check-out after check-in.');
 const nights=nightsBetween(checkIn,checkOut);if(!Number.isInteger(nights)||nights<1||nights>60)return fail('Bookings must be between 1 and 60 nights.');
 if(!Number.isInteger(guests)||guests<1||guests>20)return fail('Choose between 1 and 20 guests.');
 const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await db.auth.getUser(token);if(authError||!auth.user)return fail('Your session has expired. Sign in again.',401);
 const {data:profile}=await db.from('profiles').select('role,account_status').eq('id',auth.user.id).maybeSingle();
 if(!profile||profile.role!=='guest'||(profile.account_status&&profile.account_status!=='active'))return fail('An active guest account is required.',403);
 const {data:property,error:propertyError}=await db.from('properties').select('id,title,area,status,nightly_rate,cleaning_fee,refundable_deposit,capacity,first_available_date').eq('id',propertyId).eq('status','approved').maybeSingle();
 if(propertyError||!property)return fail('This stay is not currently available.',404);
 if(Number(property.capacity||0)>0&&guests>Number(property.capacity))return fail('This stay does not accommodate that many guests.');
 if(property.first_available_date&&checkIn<String(property.first_available_date))return fail('This stay is available from '+String(property.first_available_date)+' onwards.',409);
 const {data:unavailable,error:calendarError}=await db.rpc('get_unavailable_property_ids',{requested_check_in:checkIn,requested_check_out:checkOut});
 if(calendarError)return fail('We could not verify the property calendar. Please try again.',503);
 if((unavailable as string[]|null)?.includes(propertyId))return fail('These dates are blocked or already booked. Choose different dates.',409);
 const nightly=Math.max(0,Math.round(Number(property.nightly_rate||0))),cleaning=Math.max(0,Math.round(Number(property.cleaning_fee||0))),deposit=Math.max(0,Math.round(Number(property.refundable_deposit||0)));
 const pricing=calculateGuestPricing({accommodationSubtotal:nightly*nights,mandatoryCharges:cleaning>0?[{label:'Cleaning fee',amount:cleaning}]:[],refundableDeposit:deposit});
 const rates=await loadActiveExchangeRates(db);const rate=rates.find(r=>r.currency===currency)||null;
 const fx=calculateInternationalStayQuote({domesticGuestAmountNgn:pricing.guestTotal,refundableDepositNgn:pricing.refundableDeposit,currency,rateConfig:rate});
 return NextResponse.json({quote:{
  propertyId,propertyTitle:property.title,area:property.area,checkIn,checkOut,nights,guests,currency:fx.currency,
  accommodationSubtotal:pricing.accommodationSubtotal,mandatoryCharges:pricing.mandatoryCharges,mandatoryTotal:pricing.mandatoryChargesTotal,
  hamletGuestFee:pricing.hamletGuestServiceFee,guestTotalNgn:pricing.guestTotal,refundableDepositNgn:pricing.refundableDeposit,
  quotedGuestTotal:fx.quotedGuestTotal,settlementTotalNgn:fx.settlementTotalNgn,exchangeRateNgnPerUnit:fx.exchangeRateNgnPerUnit,
  quoteExpiresAt:fx.quoteExpiresAt,pricingRulesVersion:pricing.pricingRulesVersion||undefined,
  shareToken:normalizeShareToken(body.shareToken),
 }},{headers:{'Cache-Control':'no-store'}});
}
