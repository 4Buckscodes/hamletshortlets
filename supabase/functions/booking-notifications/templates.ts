export type BookingNotificationEventType =
  | 'booking_request_created'
  | 'booking_availability_confirmed'
  | 'booking_availability_declined'
  | 'booking_payment_confirmed'
  | 'booking_cancelled'
  | 'booking_expired'
  | 'booking_refunded';

export type BookingNotificationRecipientType = 'guest' | 'partner' | 'operations';

export interface BookingNotificationPayload {
  booking_id?: string;
  booking_reference?: string;
  property_id?: string;
  property_title?: string;
  property_type?: string;
  property_area?: string;
  property_address?: string;
  property_image_url?: string | null;
  guest_name?: string;
  partner_name?: string;
  partner_role?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  guest_count?: number;
  accommodation_subtotal?: number;
  owner_listed_price_ngn?: number;
  domestic_markup_ngn?: number;
  mandatory_total?: number;
  hamlet_guest_fee?: number;
  guest_total?: number;
  refundable_deposit?: number;
  quote_currency?: string;
  currency_pair?: string;
  exchange_rate_ngn_per_unit?: number;
  quoted_guest_total?: number;
  international_buffer_amount?: number;
  international_buffer_ngn_equiv?: number;
  settlement_total_ngn?: number;
  status?: string;
  payment_deadline?: string | null;
  special_requests?: string | null;
  decision_note?: string | null;
  cancel_reason?: string | null;
  refund_amount?: number | null;
}

export interface RenderedBookingEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHeaderSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function normalizeAppBaseUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    const isLocalhost =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
      return null;
    }
    const basePath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${basePath}`;
  } catch {
    return null;
  }
}

export function resolveSafeAssetUrl(rawAssetUrl: unknown, appBaseUrl: string): string | null {
  if (typeof rawAssetUrl !== 'string' || !rawAssetUrl.trim()) return null;
  const trimmed = rawAssetUrl.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;

  try {
    const resolved = trimmed.startsWith('/')
      ? new URL(`${appBaseUrl}${trimmed}`)
      : new URL(trimmed);
    const isLocalhost =
      resolved.hostname === 'localhost' || resolved.hostname === '127.0.0.1';
    if (resolved.protocol !== 'https:' && !(resolved.protocol === 'http:' && isLocalhost)) {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

export function buildGuestBookingUrl(appBaseUrl: string, bookingId: string): string {
  return `${appBaseUrl}/#/account?booking=${encodeURIComponent(bookingId)}`;
}

export function buildPartnerBookingReviewUrl(appBaseUrl: string, bookingId: string): string {
  return `${appBaseUrl}/#/partner/bookings/${encodeURIComponent(bookingId)}`;
}

export function buildAdminBookingUrl(appBaseUrl: string, bookingId: string): string {
  return `${appBaseUrl}/#/admin/bookings?booking=${encodeURIComponent(bookingId)}`;
}

export function buildExploreStaysUrl(appBaseUrl: string): string {
  return `${appBaseUrl}/#/stays`;
}

function formatNairaEmail(amount: number | undefined | null): string {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₦${safe.toLocaleString('en-NG')}`;
}

function formatForeignCurrencyEmail(amount: number | undefined | null, currency: 'USD' | 'GBP'): string {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const symbol = currency === 'USD' ? '$' : '£';
  return `${symbol}${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDateReadable(isoDate: string | undefined): string {
  if (!isoDate) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateTimeWat(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return 'Within 48 hours of acceptance';
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return isoDateTime;
  return `${date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  })} WAT`;
}

interface EmailShellOptions {
  eyebrow: string;
  heading: string;
  introHtml: string;
  noticeHtml?: string;
  noticeTone?: 'amber' | 'jade' | 'red' | 'slate';
  thumbnailUrl?: string | null;
  thumbnailAlt?: string;
  rows: Array<{ label: string; value: string }>;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCta?: { label: string; url: string };
  footerNote: string;
}

function renderEmailHtmlShell(opts: EmailShellOptions): string {
  const toneColors: Record<NonNullable<EmailShellOptions['noticeTone']>, { bg: string; border: string; text: string }> = {
    amber: { bg: '#FFFBEB', border: '#F59E0B', text: '#78350F' },
    jade: { bg: '#ECFDF5', border: '#059669', text: '#064E3B' },
    red: { bg: '#FEF2F2', border: '#DC2626', text: '#7F1D1D' },
    slate: { bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
  };
  const tone = toneColors[opts.noticeTone ?? 'slate'];

  const rowsHtml = opts.rows
    .map(
      row => `
        <tr>
          <td style="padding:8px 0;color:#64748B;font-size:13px;font-weight:600;vertical-align:top;width:42%;border-bottom:1px solid #F1F5F9;">${escapeHtml(row.label)}</td>
          <td style="padding:8px 0;color:#0F172A;font-size:13px;font-weight:700;vertical-align:top;text-align:right;border-bottom:1px solid #F1F5F9;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join('');

  const thumbnailHtml = opts.thumbnailUrl
    ? `
      <div style="margin:18px 0 16px 0;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
        <img src="${escapeHtml(opts.thumbnailUrl)}" alt="${escapeHtml(opts.thumbnailAlt ?? 'HAMLET property photo')}" style="display:block;width:100%;max-height:220px;object-fit:cover;" />
      </div>`
    : '';

  const noticeBlockHtml = opts.noticeHtml
    ? `
      <div style="margin:18px 0;padding:14px 16px;border-radius:12px;background:${tone.bg};border:1px solid ${tone.border};color:${tone.text};font-size:13px;line-height:1.55;">
        ${opts.noticeHtml}
      </div>`
    : '';

  const secondaryHtml = opts.secondaryCta
    ? `
      <p style="margin:12px 0 0 0;font-size:13px;">
        <a href="${escapeHtml(opts.secondaryCta.url)}" style="color:#0F766E;font-weight:700;text-decoration:underline;">${escapeHtml(opts.secondaryCta.label)}</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:24px 12px;background:#F6F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;margin:0 auto;background:#FFFFFF;border-radius:18px;border:1px solid #E5E0D5;overflow:hidden;">
    <tr>
      <td style="background:#0C1311;padding:22px 28px;">
        <span style="font-size:22px;font-weight:900;letter-spacing:0.04em;color:#F8F6F0;">HAMLET<span style="color:#C89B3C;">.</span></span>
        <span style="display:block;margin-top:4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#94A3B8;">Verified Lagos Shortlets</span>
      </td>
    </tr>
    <tr>
      <td style="padding:28px;">
        <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#0F766E;">${escapeHtml(opts.eyebrow)}</p>
        <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.25;font-weight:800;color:#0F172A;">${escapeHtml(opts.heading)}</h1>
        <div style="font-size:14px;line-height:1.6;color:#334155;">${opts.introHtml}</div>
        ${thumbnailHtml}
        ${noticeBlockHtml}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;border-collapse:collapse;">
          ${rowsHtml}
        </table>
        <div style="margin:24px 0 16px 0;">
          <a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#0F766E;color:#FFFFFF;font-size:14px;font-weight:800;text-decoration:none;">${escapeHtml(opts.ctaLabel)}</a>
          ${secondaryHtml}
        </div>
        <p style="margin:14px 0 0 0;font-size:12px;line-height:1.5;color:#64748B;">
          Direct link: <a href="${escapeHtml(opts.ctaUrl)}" style="color:#0F766E;word-break:break-all;">${escapeHtml(opts.ctaUrl)}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 28px;background:#FAF8F5;border-top:1px solid #EAE5DA;font-size:11.5px;line-height:1.55;color:#64748B;">
        ${escapeHtml(opts.footerNote)}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderPlainText(opts: {
  heading: string;
  introLines: string[];
  notice?: string;
  rows: Array<{ label: string; value: string }>;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCta?: { label: string; url: string };
  footerNote: string;
}): string {
  const sections: string[] = [
    'HAMLET — Verified Lagos Shortlets',
    '=================================',
    '',
    opts.heading,
    '',
    ...opts.introLines,
  ];

  if (opts.notice) {
    sections.push('', `IMPORTANT: ${opts.notice}`);
  }

  sections.push(
    '',
    'Booking Summary:',
    ...opts.rows.map(row => `- ${row.label}: ${row.value}`),
    '',
    `${opts.ctaLabel}: ${opts.ctaUrl}`,
  );

  if (opts.secondaryCta) {
    sections.push(`${opts.secondaryCta.label}: ${opts.secondaryCta.url}`);
  }

  sections.push('', '---', opts.footerNote);
  return sections.join('\n');
}

export function renderBookingNotificationEmail(input: {
  bookingId: string;
  bookingReference: string;
  eventType: BookingNotificationEventType;
  recipientType: BookingNotificationRecipientType;
  payload: BookingNotificationPayload;
  appBaseUrl: string;
}): RenderedBookingEmail {
  const { bookingId, bookingReference, eventType, recipientType, payload, appBaseUrl } = input;
  const propertyTitle = payload.property_title?.trim() || 'HAMLET Verified Stay';
  const propertyArea = payload.property_area?.trim() || 'Lagos';
  const propertyLabel = `${propertyTitle} (${propertyArea})`;
  const guestName = payload.guest_name?.trim() || 'Guest';
  const partnerName = payload.partner_name?.trim() || 'Property Partner';
  const checkInFmt = formatDateReadable(payload.check_in);
  const checkOutFmt = formatDateReadable(payload.check_out);
  const nights = typeof payload.nights === 'number' && payload.nights > 0 ? payload.nights : 1;
  const guests = typeof payload.guest_count === 'number' && payload.guest_count > 0 ? payload.guest_count : 1;
  const datesSummary = `${checkInFmt} → ${checkOutFmt} (${nights} night${nights === 1 ? '' : 's'})`;
  const guestsSummary = `${guests} guest${guests === 1 ? '' : 's'}`;
  const rawQuoteCurrency = (payload.quote_currency ?? 'NGN').toUpperCase();
  const isForeignQuote =
    (rawQuoteCurrency === 'USD' || rawQuoteCurrency === 'GBP') &&
    typeof payload.quoted_guest_total === 'number' &&
    payload.quoted_guest_total > 0;
  const settlementNgn =
    typeof payload.settlement_total_ngn === 'number' && payload.settlement_total_ngn > 0
      ? payload.settlement_total_ngn
      : payload.guest_total ?? 0;
  const settlementTotalFmt = formatNairaEmail(settlementNgn);
  const guestTotalFmt = isForeignQuote
    ? `${formatForeignCurrencyEmail(payload.quoted_guest_total, rawQuoteCurrency as 'USD' | 'GBP')} (incl. 10% FX buffer @ 1 ${rawQuoteCurrency} = ${formatNairaEmail(payload.exchange_rate_ngn_per_unit)})`
    : settlementTotalFmt;
  const cautionDepositAmount =
    typeof payload.refundable_deposit === 'number' && payload.refundable_deposit > 0
      ? payload.refundable_deposit
      : 0;
  const cautionDepositRow = cautionDepositAmount > 0
    ? [{ label: 'Refundable caution deposit (held separately)', value: formatNairaEmail(cautionDepositAmount) }]
    : [];
  const foreignSettlementRow = isForeignQuote
    ? [{ label: 'Paystack NGN settlement amount', value: settlementTotalFmt }]
    : [];
  const partnerProceedsFmt = formatNairaEmail(
    (payload.accommodation_subtotal ?? 0) + (payload.mandatory_total ?? 0),
  );
  const guestUrl = buildGuestBookingUrl(appBaseUrl, bookingId);
  const partnerUrl = buildPartnerBookingReviewUrl(appBaseUrl, bookingId);
  const adminUrl = buildAdminBookingUrl(appBaseUrl, bookingId);
  const staysUrl = buildExploreStaysUrl(appBaseUrl);
  const thumbnailUrl = resolveSafeAssetUrl(payload.property_image_url, appBaseUrl);
  const specialRequests = payload.special_requests?.trim() || null;
  const decisionNote = payload.decision_note?.trim() || null;
  const cancelReason = payload.cancel_reason?.trim() || null;

  // ─── Event A: Booking Request Created ────────────────────────────────────────
  if (eventType === 'booking_request_created') {
    if (recipientType === 'guest') {
      const subject = sanitizeHeaderSubject("We've received your HAMLET booking request");
      const rows = [
        { label: 'Booking reference', value: bookingReference },
        { label: 'Property', value: propertyLabel },
        { label: 'Check-in / Check-out', value: datesSummary },
        { label: 'Guests', value: guestsSummary },
        { label: 'Quoted stay total', value: guestTotalFmt },
        ...foreignSettlementRow,
        ...cautionDepositRow,
        { label: 'Current status', value: 'Requested — awaiting availability confirmation' },
      ];
      return {
        subject,
        html: renderEmailHtmlShell({
          eyebrow: 'Booking request received',
          heading: "We've received your booking request",
          introHtml: `<p style="margin:0;">Hi ${escapeHtml(guestName)}, thank you for requesting <strong>${escapeHtml(propertyTitle)}</strong> on HAMLET.</p>`,
          noticeTone: 'amber',
          noticeHtml:
            '<strong>Awaiting availability confirmation — not yet confirmed:</strong> Your stay is not confirmed yet and no payment has been collected. Once the authorised property partner confirms availability, we will email you a 48-hour payment window to complete checkout securely on HAMLET.',
          rows,
          ctaLabel: 'View booking status on HAMLET',
          ctaUrl: guestUrl,
          footerNote:
            'Never send off-platform bank transfers or rely on payment screenshots. All HAMLET bookings are confirmed exclusively through verified checkout on HAMLET.',
        }),
        text: renderPlainText({
          heading: "We've received your HAMLET booking request",
          introLines: [
            `Hi ${guestName}, thank you for requesting ${propertyTitle} on HAMLET.`,
          ],
          notice:
            'Your booking request is awaiting availability confirmation and is NOT yet confirmed. No payment is collected until availability is confirmed.',
          rows,
          ctaLabel: 'View booking status on HAMLET',
          ctaUrl: guestUrl,
          footerNote:
            'Never send off-platform transfers. All HAMLET stays are confirmed exclusively through verified checkout on HAMLET.',
        }),
      };
    }

    if (recipientType === 'partner') {
      const subject = sanitizeHeaderSubject('Availability review required — HAMLET booking request');
      const rows = [
        { label: 'Booking reference', value: bookingReference },
        { label: 'Property', value: propertyLabel },
        { label: 'Requested dates', value: datesSummary },
        { label: 'Guests', value: guestsSummary },
        { label: 'Guest name', value: guestName },
        { label: 'Your proceeds (0% owner fee)', value: partnerProceedsFmt },
        { label: 'Current status', value: 'Requested — awaiting your availability decision' },
        ...(specialRequests ? [{ label: 'Guest note', value: specialRequests }] : []),
      ];
      return {
        subject,
        html: renderEmailHtmlShell({
          eyebrow: 'Partner action required',
          heading: 'Confirm or decline property availability',
          introHtml: `<p style="margin:0;">Hello ${escapeHtml(partnerName)}, a guest has submitted a booking request for <strong>${escapeHtml(propertyTitle)}</strong>. Please sign in to your HAMLET Partner Workspace to review the property and booking details and record your availability decision.</p>`,
          thumbnailUrl,
          thumbnailAlt: propertyTitle,
          noticeTone: 'amber',
          noticeHtml:
            '<strong>Action required inside HAMLET:</strong> Confirming availability commits these dates for a 48-hour guest payment window at the stated rate. Opening this link does not change booking status automatically — sign in and confirm or decline on your dashboard.',
          rows,
          ctaLabel: 'Review booking request',
          ctaUrl: partnerUrl,
          footerNote:
            'You are receiving this notification as an active authorised partner for this property on HAMLET.',
        }),
        text: renderPlainText({
          heading: 'Availability review required — HAMLET booking request',
          introLines: [
            `Hello ${partnerName}, a guest has requested ${propertyTitle}.`,
            'Sign in to your HAMLET Partner Workspace to review the property and guest request and confirm or decline availability.',
          ],
          notice:
            'Confirming availability reserves these dates for a 48-hour guest payment window. Actions must be submitted inside your authenticated HAMLET dashboard.',
          rows,
          ctaLabel: 'Review booking request',
          ctaUrl: partnerUrl,
          footerNote:
            'You are receiving this notification as an active authorised partner for this property on HAMLET.',
        }),
      };
    }

    const subject = sanitizeHeaderSubject(`New HAMLET booking request — ${bookingReference}`);
    const rows = [
      { label: 'Booking reference', value: bookingReference },
      { label: 'Property', value: propertyLabel },
      { label: 'Guest', value: guestName },
      { label: 'Requested dates', value: datesSummary },
      { label: 'Guests', value: guestsSummary },
      { label: 'Quoted guest total', value: guestTotalFmt },
      ...foreignSettlementRow,
      ...cautionDepositRow,
      { label: 'Current status', value: 'requested' },
      ...(specialRequests ? [{ label: 'Guest note', value: specialRequests }] : []),
    ];
    return {
      subject,
      html: renderEmailHtmlShell({
        eyebrow: 'HAMLET operations alert',
        heading: `New booking request ${bookingReference}`,
        introHtml: `<p style="margin:0;">A new guest booking request has been recorded and routed to the authorised property partner for availability confirmation.</p>`,
        rows,
        ctaLabel: 'Open in Admin Booking Operations',
        ctaUrl: adminUrl,
        footerNote: 'Internal HAMLET operations notification.',
      }),
      text: renderPlainText({
        heading: `New HAMLET booking request — ${bookingReference}`,
        introLines: [
          'A new guest booking request has been recorded and routed for partner availability review.',
        ],
        rows,
        ctaLabel: 'Open in Admin Booking Operations',
        ctaUrl: adminUrl,
        footerNote: 'Internal HAMLET operations notification.',
      }),
    };
  }

  // ─── Event B: Partner Confirms Availability (awaiting_payment) ───────────────
  if (eventType === 'booking_availability_confirmed') {
    const deadlineFmt = formatDateTimeWat(payload.payment_deadline);

    if (recipientType === 'guest') {
      const subject = sanitizeHeaderSubject(
        `Availability confirmed — complete payment for HAMLET booking ${bookingReference}`,
      );
      const rows = [
        { label: 'Booking reference', value: bookingReference },
        { label: 'Property', value: propertyLabel },
        { label: 'Check-in / Check-out', value: datesSummary },
        { label: 'Guests', value: guestsSummary },
        { label: 'Amount due', value: guestTotalFmt },
        ...foreignSettlementRow,
        ...cautionDepositRow,
        { label: 'Payment deadline', value: deadlineFmt },
        { label: 'Current status', value: 'Awaiting payment (not yet confirmed)' },
        ...(decisionNote ? [{ label: 'Partner note', value: decisionNote }] : []),
      ];
      return {
        subject,
        html: renderEmailHtmlShell({
          eyebrow: 'Availability confirmed · Next step: Payment',
          heading: 'Your dates are available — complete payment within 48 hours',
          introHtml: `<p style="margin:0;">Hi ${escapeHtml(guestName)}, good news — availability has been confirmed for <strong>${escapeHtml(propertyTitle)}</strong>. Your booking is now <strong>awaiting payment</strong>.</p>`,
          noticeTone: 'jade',
          noticeHtml: `<strong>Complete payment before ${escapeHtml(deadlineFmt)}:</strong> Your booking is <strong>not confirmed yet</strong> until payment is completed via HAMLET's verified Paystack checkout and confirmed server-side. Unpaid holds expire automatically after the deadline.`,
          rows,
          ctaLabel: 'Complete payment on HAMLET',
          ctaUrl: guestUrl,
          footerNote:
            'Pay only through your signed-in HAMLET account. Screenshots or off-platform bank transfers never confirm a HAMLET booking.',
        }),
        text: renderPlainText({
          heading: `Availability confirmed — complete payment for ${bookingReference}`,
          introLines: [
            `Hi ${guestName}, availability has been confirmed for ${propertyTitle}.`,
            'Your booking status is now Awaiting Payment.',
          ],
          notice: `Complete payment via HAMLET before ${deadlineFmt}. Your booking is NOT confirmed until verified server-side payment succeeds.`,
          rows,
          ctaLabel: 'Complete payment on HAMLET',
          ctaUrl: guestUrl,
          footerNote:
            'Pay only through your signed-in HAMLET account. Off-platform transfers or screenshots never confirm a booking.',
        }),
      };
    }

    const subject = sanitizeHeaderSubject(
      `Availability confirmed — HAMLET booking ${bookingReference} awaiting payment`,
    );
    const rows = [
      { label: 'Booking reference', value: bookingReference },
      { label: 'Property', value: propertyLabel },
      { label: 'Guest', value: guestName },
      { label: 'Dates', value: datesSummary },
      { label: 'Guest total', value: guestTotalFmt },
      { label: 'Payment deadline', value: deadlineFmt },
      { label: 'Current status', value: 'awaiting_payment' },
      ...(decisionNote ? [{ label: 'Partner note', value: decisionNote }] : []),
    ];
    return {
      subject,
      html: renderEmailHtmlShell({
        eyebrow: 'HAMLET operations update',
        heading: `${bookingReference} accepted — awaiting guest payment`,
        introHtml: `<p style="margin:0;">Property availability has been confirmed and the 48-hour payment window is now active.</p>`,
        rows,
        ctaLabel: 'View booking in Admin Operations',
        ctaUrl: adminUrl,
        footerNote: 'Internal HAMLET operations notification.',
      }),
      text: renderPlainText({
        heading: `${bookingReference} accepted — awaiting guest payment`,
        introLines: [
          'Property availability has been confirmed and the 48-hour payment window is active.',
        ],
        rows,
        ctaLabel: 'View booking in Admin Operations',
        ctaUrl: adminUrl,
        footerNote: 'Internal HAMLET operations notification.',
      }),
    };
  }

  // ─── Event C: Partner Marks Property Unavailable (declined) ──────────────────
  if (eventType === 'booking_availability_declined') {
    if (recipientType === 'guest') {
      const subject = sanitizeHeaderSubject(
        `Update on your HAMLET booking request (${bookingReference})`,
      );
      const rows = [
        { label: 'Booking reference', value: bookingReference },
        { label: 'Property', value: propertyLabel },
        { label: 'Requested dates', value: datesSummary },
        { label: 'Guests', value: guestsSummary },
        { label: 'Current status', value: 'Declined — dates unavailable' },
        ...(decisionNote ? [{ label: 'Host note', value: decisionNote }] : []),
      ];
      return {
        subject,
        html: renderEmailHtmlShell({
          eyebrow: 'Booking request update',
          heading: 'Those dates are unavailable for this property',
          introHtml: `<p style="margin:0;">Hi ${escapeHtml(guestName)}, thank you for your interest in <strong>${escapeHtml(propertyTitle)}</strong>. Unfortunately, the property partner cannot accommodate the requested dates (${escapeHtml(datesSummary)}).</p>`,
          noticeTone: 'slate',
          noticeHtml:
            '<strong>No payment was charged:</strong> Because HAMLET verifies availability before payment, nothing has been billed to you. You can explore other verified Lagos homes for your dates right away.',
          rows,
          ctaLabel: 'Explore verified Lagos stays',
          ctaUrl: staysUrl,
          secondaryCta: { label: 'View request in your HAMLET account', url: guestUrl },
          footerNote: 'Need help finding an alternative verified home in Lagos? Visit HAMLET support.',
        }),
        text: renderPlainText({
          heading: `Update on your HAMLET booking request (${bookingReference})`,
          introLines: [
            `Hi ${guestName}, unfortunately ${propertyTitle} is unavailable for ${datesSummary}.`,
          ],
          notice: 'No payment was charged for this request.',
          rows,
          ctaLabel: 'Explore verified Lagos stays',
          ctaUrl: staysUrl,
          secondaryCta: { label: 'View request in your HAMLET account', url: guestUrl },
          footerNote: 'Need help finding an alternative verified home in Lagos? Visit HAMLET support.',
        }),
      };
    }

    const subject = sanitizeHeaderSubject(
      `Booking request declined — HAMLET ${bookingReference}`,
    );
    const rows = [
      { label: 'Booking reference', value: bookingReference },
      { label: 'Property', value: propertyLabel },
      { label: 'Guest', value: guestName },
      { label: 'Requested dates', value: datesSummary },
      { label: 'Current status', value: 'declined' },
      ...(decisionNote ? [{ label: 'Decline note', value: decisionNote }] : []),
    ];
    return {
      subject,
      html: renderEmailHtmlShell({
        eyebrow: 'HAMLET operations update',
        heading: `${bookingReference} declined — property unavailable`,
        introHtml: `<p style="margin:0;">The property partner marked the requested dates unavailable. No payment was collected.</p>`,
        rows,
        ctaLabel: 'View booking in Admin Operations',
        ctaUrl: adminUrl,
        footerNote: 'Internal HAMLET operations notification.',
      }),
      text: renderPlainText({
        heading: `${bookingReference} declined — property unavailable`,
        introLines: [
          'The property partner marked the requested dates unavailable. No payment was collected.',
        ],
        rows,
        ctaLabel: 'View booking in Admin Operations',
        ctaUrl: adminUrl,
        footerNote: 'Internal HAMLET operations notification.',
      }),
    };
  }

  // ─── Extensible Lifecycle Templates (Events D & E: Confirmed / Cancelled / Expired / Refunded) ───
  const targetUrl =
    recipientType === 'partner'
      ? partnerUrl
      : recipientType === 'operations'
        ? adminUrl
        : guestUrl;

  const lifecycleHeadings: Record<
    Exclude<
      BookingNotificationEventType,
      | 'booking_request_created'
      | 'booking_availability_confirmed'
      | 'booking_availability_declined'
    >,
    { subject: string; eyebrow: string; heading: string; summary: string }
  > = {
    booking_payment_confirmed: {
      subject: `Booking confirmed — HAMLET ${bookingReference}`,
      eyebrow: 'Payment verified · Booking confirmed',
      heading: `Booking ${bookingReference} is confirmed`,
      summary: 'Payment has been verified server-side and the stay dates are locked in.',
    },
    booking_cancelled: {
      subject: `Booking cancelled — HAMLET ${bookingReference}`,
      eyebrow: 'Booking cancelled',
      heading: `Booking ${bookingReference} has been cancelled`,
      summary: cancelReason
        ? `This booking was cancelled (${cancelReason}).`
        : 'This booking has been cancelled.',
    },
    booking_expired: {
      subject: `Payment window expired — HAMLET ${bookingReference}`,
      eyebrow: 'Payment deadline elapsed',
      heading: `Booking ${bookingReference} expired without payment`,
      summary: 'The 48-hour payment deadline elapsed and the held dates have been released.',
    },
    booking_refunded: {
      subject: `Refund recorded — HAMLET ${bookingReference}`,
      eyebrow: 'Refund processed',
      heading: `Refund processed for booking ${bookingReference}`,
      summary: `A refund of ${formatNairaEmail(payload.refund_amount ?? payload.guest_total)} has been recorded on the HAMLET ledger.`,
    },
  };

  const meta = lifecycleHeadings[eventType];
  const rows = [
    { label: 'Booking reference', value: bookingReference },
    { label: 'Property', value: propertyLabel },
    { label: 'Dates', value: datesSummary },
    { label: 'Guests', value: guestsSummary },
    ...(eventType === 'booking_payment_confirmed'
      ? [
          { label: 'Settled stay amount (NGN)', value: settlementTotalFmt },
          ...cautionDepositRow,
        ]
      : []),
    { label: 'Current status', value: payload.status ?? eventType.replace('booking_', '') },
  ];

  return {
    subject: sanitizeHeaderSubject(meta.subject),
    html: renderEmailHtmlShell({
      eyebrow: meta.eyebrow,
      heading: meta.heading,
      introHtml: `<p style="margin:0;">${escapeHtml(meta.summary)}</p>`,
      rows,
      ctaLabel: 'View booking on HAMLET',
      ctaUrl: targetUrl,
      footerNote: 'HAMLET transactional booking notification.',
    }),
    text: renderPlainText({
      heading: meta.heading,
      introLines: [meta.summary],
      rows,
      ctaLabel: 'View booking on HAMLET',
      ctaUrl: targetUrl,
      footerNote: 'HAMLET transactional booking notification.',
    }),
  };
}
