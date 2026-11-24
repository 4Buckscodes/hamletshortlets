import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PROPERTY_MEDIA_POLICY } from '@/lib/pricing';
import { TOUR_VIDEO_PROVIDER_LABEL, parseTourVideo, type TourVideo } from '@/lib/tourVideo';

export const runtime = 'nodejs';

type Payload = {
  propertyId?: string;
  saveAsDraft?: boolean;
  title?: string;
  propertyType?: string;
  area?: string;
  address?: string;
  nightlyRate?: number;
  cleaningFee?: number;
  deposit?: number;
  bedrooms?: number;
  bathrooms?: number;
  capacity?: number;
  bedSetup?: string;
  amenities?: string[];
  imageUrls?: string[];
  videoUrl?: string;
  /** Legacy field name from the first YouTube-only release. */
  youtubeUrl?: string;
  houseRules?: string[];
  firstAvailableDate?: string;
  calendarResponsiblePerson?: string;
  authorityBasis?: string;
  submittedRole?: string;
  correctionNote?: string;
};

const text = (value: unknown, max = 160) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const list = (value: unknown, maxItems = 20, maxLength = 120) =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string')
        .map(v => v.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

function getAuthenticatedDb(request: Request) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    return {
      error: NextResponse.json(
        { error: 'Property submissions are not configured.' },
        { status: 503 },
      ),
    };
  }
  const token = (request.headers.get('authorization') || '').match(
    /^Bearer\s+(.+)$/i,
  )?.[1];
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Sign in with an approved partner account.' },
        { status: 401 },
      ),
    };
  }
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { db, token };
}

function parseAndValidatePayload(body: Payload) {
  const saveAsDraft = Boolean(body.saveAsDraft);
  const title = text(body.title, 120);
  const propertyType = text(body.propertyType, 60) || 'Apartment';
  const area = text(body.area, 100);
  const address = text(body.address, 240);
  const nightlyRate = Math.round(Number(body.nightlyRate || 0));
  const cleaningFee = Math.round(Number(body.cleaningFee || 0));
  const deposit = Math.round(Number(body.deposit || 0));
  const bedrooms = Math.round(Number(body.bedrooms ?? 1));
  const bathrooms = Math.round(Number(body.bathrooms ?? 1));
  const capacity = Math.round(Number(body.capacity ?? 2));
  const authorityBasis =
    text(body.authorityBasis, 600) ||
    (saveAsDraft ? 'Draft partner declaration pending completion' : '');

  if (
    title.length < 8 ||
    !propertyType ||
    !area ||
    address.length < 10 ||
    (!saveAsDraft && authorityBasis.length < 9)
  ) {
    return {
      validationError:
        'Complete the property title (8+ chars), neighbourhood, public area/street (10+ chars), and authority to list.',
    };
  }

  if (
    !Number.isInteger(nightlyRate) ||
    nightlyRate < 1 ||
    nightlyRate > 100000000 ||
    !Number.isInteger(cleaningFee) ||
    cleaningFee < 0 ||
    !Number.isInteger(deposit) ||
    deposit < 0 ||
    !Number.isInteger(bedrooms) ||
    bedrooms < 0 ||
    !Number.isInteger(bathrooms) ||
    bathrooms < 0 ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 50
  ) {
    return {
      validationError:
        'Check the nightly rate, charges, bedrooms, bathrooms and guest capacity.',
    };
  }

  const imageUrls = list(
    body.imageUrls,
    DEFAULT_PROPERTY_MEDIA_POLICY.maxImagesPerListing,
    500,
  ).filter(value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  });

  if (!saveAsDraft && imageUrls.length < 1) {
    return {
      validationError:
        'Add at least one property photo (upload or HTTPS URL) before submitting for review.',
    };
  }

  // Optional tour video. Blank means none; anything else must be a YouTube, Vimeo or Instagram link.
  const videoInput = text(body.videoUrl ?? body.youtubeUrl, 300);
  const tourVideo = videoInput ? parseTourVideo(videoInput) : null;
  if (videoInput && !tourVideo) {
    return {
      validationError:
        'That video link is not supported. Paste a YouTube, Vimeo or Instagram post/reel link, or leave it blank.',
    };
  }

  const firstAvailableDate = text(body.firstAvailableDate, 20);
  const calendarResponsiblePerson = text(body.calendarResponsiblePerson, 120);

  return {
    saveAsDraft,
    title,
    tourVideo,
    listingData: {
      title,
      property_type: propertyType,
      area,
      public_address: address,
      nightly_rate: nightlyRate,
      cleaning_fee: cleaningFee,
      mandatory_charges:
        cleaningFee > 0 ? [{ label: 'Cleaning fee', amount: cleaningFee }] : [],
      refundable_deposit: deposit,
      bedrooms,
      bathrooms,
      capacity,
      bed_setup: text(body.bedSetup, 120) || `${Math.max(1, bedrooms)} bed setup`,
      amenities: list(body.amenities, 30, 80),
      image_urls: imageUrls,
      house_rules: list(body.houseRules, 20, 240),
      status: saveAsDraft ? 'draft' : 'submitted',
      save_as_draft: saveAsDraft,
      first_available_date: /^\d{4}-\d{2}-\d{2}$/.test(firstAvailableDate)
        ? firstAvailableDate
        : undefined,
      calendar_responsible_person: calendarResponsiblePerson || undefined,
    },
    submissionData: {
      authority_basis: authorityBasis,
      submitted_role: text(body.submittedRole, 80) || 'Property partner',
      docs: [
        { label: 'Ownership / title evidence', status: 'self_reported' },
        { label: 'Identity evidence', status: 'self_reported' },
        { label: 'Authority to list', status: 'self_reported' },
      ],
    },
    correctionNote: text(body.correctionNote, 500) || null,
  };
}

/**
 * Attaches (or clears) the optional tour video after the listing itself is saved. Deliberately
 * non-fatal: the listing is already safely stored, so a failure here is reported as a warning
 * rather than failing the whole submission.
 */
async function attachTourVideo(
  db: Extract<ReturnType<typeof getAuthenticatedDb>, { db: unknown }>['db'],
  propertyId: string,
  video: TourVideo | null,
): Promise<string | null> {
  const { error } = await db.rpc('set_partner_property_video', {
    target_property_id: propertyId,
    video_provider: video?.provider ?? null,
    video_id: video?.id ?? null,
  });
  if (!error) return null;
  const name = video ? `${TOUR_VIDEO_PROVIDER_LABEL[video.provider]} video` : 'video change';
  return `The listing was saved, but the ${name} could not be applied. You can try again by editing the listing.`;
}

export async function POST(request: Request) {
  const clientRes = getAuthenticatedDb(request);
  if ('error' in clientRes) return clientRes.error;
  const { db, token } = clientRes;

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  }

  const parsed = parseAndValidatePayload(body);
  if ('validationError' in parsed) {
    return NextResponse.json({ error: parsed.validationError }, { status: 400 });
  }

  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) {
    return NextResponse.json(
      { error: 'Your session expired. Sign in again.' },
      { status: 401 },
    );
  }

  const [{ data: profile }, { data: membership, error: membershipError }] =
    await Promise.all([
      db.from('profiles').select('role,partner_role,account_status').eq('id', auth.user.id).maybeSingle(),
      db.from('partner_network_memberships').select('primary_role,status').eq('user_id', auth.user.id).maybeSingle(),
    ]);

  const activePartnerMember = !membershipError && membership?.status === 'active';
  const maySubmit = profile?.role === 'admin' || activePartnerMember;

  if (!maySubmit) {
    return NextResponse.json(
      {
        error:
          'Join the HAMLET partner network before uploading a property. Each submitted listing is reviewed separately before it is published.',
      },
      { status: 403 },
    );
  }

  const { data: propertyId, error } = await db.rpc('submit_partner_property', {
    listing_data: parsed.listingData,
    submission_data: parsed.submissionData,
  });

  if (error || !propertyId) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'We could not save this listing. Please review the details and try again.',
      },
      { status: 400 },
    );
  }

  const videoWarning = parsed.tourVideo
    ? await attachTourVideo(db, String(propertyId), parsed.tourVideo)
    : null;
  const createdMessage = parsed.saveAsDraft
    ? 'Draft listing saved to your partner workspace. You can finish and submit it anytime.'
    : 'Listing submitted for HAMLET review. It will not appear publicly until approved.';

  return NextResponse.json(
    {
      property: {
        id: propertyId,
        title: parsed.title,
        status: parsed.saveAsDraft ? 'draft' : 'submitted',
      },
      message: videoWarning ? `${createdMessage} ${videoWarning}` : createdMessage,
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const clientRes = getAuthenticatedDb(request);
  if ('error' in clientRes) return clientRes.error;
  const { db, token } = clientRes;

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'Invalid update.' }, { status: 400 });
  }

  const propertyId = text(body.propertyId, 80);
  if (!propertyId) {
    return NextResponse.json(
      { error: 'Property ID is required to update a listing.' },
      { status: 400 },
    );
  }

  const parsed = parseAndValidatePayload(body);
  if ('validationError' in parsed) {
    return NextResponse.json({ error: parsed.validationError }, { status: 400 });
  }

  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) {
    return NextResponse.json(
      { error: 'Your session expired. Sign in again.' },
      { status: 401 },
    );
  }

  const { error } = await db.rpc('update_and_resubmit_partner_property', {
    target_property_id: propertyId,
    listing_data: parsed.listingData,
    submission_data: parsed.submissionData,
    correction_note: parsed.correctionNote,
  });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          'Could not update and resubmit this listing. Ensure the listing is in draft or needs_correction status.',
      },
      { status: 400 },
    );
  }

  // An explicit videoUrl (even blank) updates the video; an absent field leaves it untouched.
  const videoWarning =
    (body.videoUrl ?? body.youtubeUrl) !== undefined
      ? await attachTourVideo(db, propertyId, parsed.tourVideo)
      : null;
  const updatedMessage = parsed.saveAsDraft
    ? 'Draft changes saved.'
    : 'Listing updated and resubmitted for HAMLET review.';

  return NextResponse.json(
    {
      property: {
        id: propertyId,
        title: parsed.title,
        status: parsed.saveAsDraft ? 'draft' : 'submitted',
      },
      message: videoWarning ? `${updatedMessage} ${videoWarning}` : updatedMessage,
    },
    { status: 200 },
  );
}
