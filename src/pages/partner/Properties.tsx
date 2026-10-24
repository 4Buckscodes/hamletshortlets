import { Link } from 'react-router-dom';
import { useMemo, useRef, useState } from 'react';
import { PlusCircle, BedDouble, Bath, Users, FileWarning, RefreshCcw, Pencil, X, ShieldCheck, ImagePlus, Loader2, UploadCloud, CalendarClock, PauseCircle, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { PropertyStatusPill, DocStatusBadge } from '../../components/Badges';
import { myPartnerProperties } from '../../lib/partnerUtils';
import { formatNaira, formatDate } from '../../lib/pricing';
import { computePropertyAvailabilitySummary, formatBlockTypeLabel } from '../../lib/availability';
import { AREAS } from '../../lib/seed';
import type { Property, AvailabilityBlockType, AvailabilityConfirmationStatus } from '../../lib/types';

const PROPERTY_TYPES = ['Penthouse', 'Serviced apartment', 'Apartment', 'Studio apartment', 'Duplex', 'Villa', 'Terrace'];
const AMENITIES = ['Wifi', 'Pool', 'Gym', 'Parking', '24/7 Power', 'Security', 'Workspace', 'Kitchen', 'TV', 'Air Conditioning', 'Generator', 'Concierge', 'Garden', 'Balcony'];

export default function PartnerProperties() {
  const {
    state,
    reviewProperty,
    updateAndResubmitProperty,
    uploadPropertyImage,
    updatePropertyAvailabilitySettings,
    addPropertyAvailabilityBlock,
    removePropertyAvailabilityBlock,
    setPropertyPublicationPause,
  } = useHamlet();
  const { toast } = useToast();
  const editFileRef = useRef<HTMLInputElement | null>(null);
  const userId = state.session!.userId;
  const isSuspended = state.session?.accountStatus === 'suspended';
  const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
  const [openDocs, setOpenDocs] = useState<string | null>(null);
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);
  const [calFirstAvail, setCalFirstAvail] = useState('');
  const [calConfirmMode, setCalConfirmMode] = useState<AvailabilityConfirmationStatus>('confirmed_calendar');
  const [calResponsible, setCalResponsible] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockType, setBlockType] = useState<AvailabilityBlockType>('owner_block');
  const [blockNote, setBlockNote] = useState('');
  const [savingCal, setSavingCal] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);

  // Edit & resubmit modal state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Serviced apartment');
  const [area, setArea] = useState('Victoria Island');
  const [address, setAddress] = useState('');
  const [nightlyRate, setNightlyRate] = useState(0);
  const [cleaningFee, setCleaningFee] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [capacity, setCapacity] = useState(2);
  const [bedSetup, setBedSetup] = useState('');
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [uploadingEditPhotos, setUploadingEditPhotos] = useState(false);
  const [authorityBasis, setAuthorityBasis] = useState('');
  const [houseRulesText, setHouseRulesText] = useState('');
  const [correctionSummary, setCorrectionSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = (p: Property) => {
    setEditing(p);
    setTitle(p.title);
    setType(p.type);
    setArea(p.area);
    setAddress(p.address);
    setNightlyRate(p.nightlyRate);
    setCleaningFee(p.cleaningFee);
    setDeposit(p.deposit);
    setBedrooms(p.bedrooms);
    setBathrooms(p.bathrooms);
    setCapacity(p.capacity);
    setBedSetup(p.bedSetup);
    setEditAmenities(p.amenities);
    setEditImages(p.images);
    setEditImageUrl('');
    setAuthorityBasis(p.authorityBasis);
    setHouseRulesText(p.houseRules.join('\n'));
    setCorrectionSummary('');
  };

  const handleEditPhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0) return;
    const remainingSlots = Math.max(0, 12 - editImages.length);
    if (remainingSlots === 0) {
      toast('Maximum 12 photos per listing.', 'error');
      return;
    }
    setUploadingEditPhotos(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected.slice(0, remainingSlots)) {
        uploaded.push(await uploadPropertyImage(file));
      }
      setEditImages(prev => [...prev, ...uploaded]);
      toast(`${uploaded.length} photo${uploaded.length === 1 ? '' : 's'} uploaded.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload photo.', 'error');
    } finally {
      setUploadingEditPhotos(false);
    }
  };

  const submitCorrections = async () => {
    if (!editing) return;
    if (title.trim().length < 8 || address.trim().length < 10) {
      toast('Provide a valid property title (min 8 chars) and full Lagos address (min 10 chars).', 'error');
      return;
    }
    if (authorityBasis.trim().length < 9) {
      toast('Describe your authority to list (min 9 chars).', 'error');
      return;
    }
    if (nightlyRate < 20_000) {
      toast('Nightly rate must be at least ₦20,000.', 'error');
      return;
    }
    if (editImages.length < 1) {
      toast('Attach at least 1 property photo before resubmitting.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateAndResubmitProperty(
        editing.id,
        {
          title: title.trim(),
          type,
          area,
          address: address.trim(),
          nightlyRate,
          cleaningFee,
          mandatoryCharges: cleaningFee > 0 ? [{ label: 'Cleaning & turnover (mandatory)', amount: cleaningFee }] : [],
          deposit,
          bedrooms,
          bathrooms,
          capacity,
          bedSetup: bedSetup.trim(),
          amenities: editAmenities,
          images: editImages,
          houseRules: houseRulesText.split('\n').map(s => s.trim()).filter(Boolean),
          submittedRole: editing.submittedRole,
          authorityBasis: authorityBasis.trim(),
          docs: editing.docs.length > 0 ? editing.docs : [
            { label: 'Certificate of occupancy / title deed', status: 'self_reported' },
            { label: 'Government-issued ID of owner', status: 'self_reported' },
            { label: 'Proof of authority / management mandate', status: 'self_reported' },
            { label: 'Property inspection report', status: 'missing' },
          ],
        },
        correctionSummary.trim() || undefined,
      );
      toast('Corrections saved and listing resubmitted for review.', 'info');
      setEditing(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not resubmit corrections.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Listings</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">My properties</h1>
          <p className="mt-1 max-w-lg text-[12px] font-medium text-ink-300">Only approved, non-suspended listings appear publicly. Documentation evidence is reviewed by HAMLET — checked boxes on submission are self-reported until reviewed.</p>
        </div>
        {!isSuspended && (
          <Link to="/partner/properties/new" className="btn-brass !py-3"><PlusCircle size={17} /> List a new property</Link>
        )}
      </div>

      <div className="mt-6 grid gap-4">
        {myProps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-ink-100">No properties yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[12.5px] font-medium text-ink-400">Submit your first Lagos shortlet. Every submission is reviewed manually — you'll track status here from submitted → needs correction / approved / rejected.</p>
            {!isSuspended && <Link to="/partner/properties/new" className="btn-brass mt-6"><PlusCircle size={16} /> Start submission</Link>}
          </div>
        )}
        {myProps.map(p => {
          const avail = computePropertyAvailabilitySummary({
            property: p,
            bookings: state.bookings,
            publicCalendarSpans: state.publicCalendarSpans,
          });
          const calendarOpen = openCalendarId === p.id;
          return (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
            <div className="flex flex-col gap-4 p-5 sm:flex-row">
              <img src={p.images[0]} alt={p.title} className="h-40 w-full shrink-0 rounded-xl object-cover sm:w-52" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PropertyStatusPill status={p.status} />
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                    avail.currentStatus === 'available_now'
                      ? 'border-jade-500/40 bg-jade-500/10 text-jade-300'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  }`}>
                    <CalendarClock size={11} />
                    {avail.primaryBadgeLabel}
                    {avail.nextAvailableLabel && avail.primaryBadgeLabel !== avail.nextAvailableLabel ? ` · ${avail.nextAvailableLabel}` : ''}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{p.type} · {p.area}</span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-bold text-ink-50">{p.title}</h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-semibold text-ink-300">
                  <span className="inline-flex items-center gap-1.5"><BedDouble size={13} />{p.bedrooms} bd</span>
                  <span className="inline-flex items-center gap-1.5"><Bath size={13} />{p.bathrooms} ba</span>
                  <span className="inline-flex items-center gap-1.5"><Users size={13} />sleeps {p.capacity}</span>
                  <span className="font-bold text-brass-300">Owner: {formatNaira(p.nightlyRate)}/night</span>
                  <span className="text-ink-400">Guest (20% markup): {formatNaira(Math.round(p.nightlyRate * 1.2))}/night</span>
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-ink-500">{p.address}</p>
                <p className="mt-1 text-[10.5px] font-semibold text-ink-500">Authority: {p.authorityBasis}</p>
                {p.reviewNote && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11.5px] font-medium leading-snug text-orange-200">
                    <FileWarning size={14} className="mt-0.5 shrink-0" />{p.reviewNote}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-start justify-between gap-2 sm:items-end">
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {!isSuspended && (
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarOpen) {
                          setOpenCalendarId(null);
                        } else {
                          setOpenCalendarId(p.id);
                          setCalFirstAvail(p.firstAvailableDate ?? '');
                          setCalConfirmMode(p.availabilityConfirmationStatus ?? 'confirmed_calendar');
                          setCalResponsible(p.calendarResponsiblePerson ?? state.session?.name ?? '');
                          setBlockStart('');
                          setBlockEnd('');
                          setBlockNote('');
                        }
                      }}
                      className="btn-brass !px-3 !py-1.5 text-[11px]"
                    >
                      <CalendarClock size={13} /> Manage calendar
                    </button>
                  )}
                  <button onClick={() => setOpenDocs(openDocs === p.id ? null : p.id)} className="btn-ghost-dark !px-3 !py-1.5 text-[11px]">
                    Docs ({p.docs.filter(d => d.status === 'verified').length}/{p.docs.length})
                  </button>
                </div>

                {!isSuspended && (p.status === 'approved' || p.status === 'paused') && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const shouldPause = p.status === 'approved';
                        await setPropertyPublicationPause(p.id, shouldPause);
                        toast(shouldPause ? 'Listing paused from public search.' : 'Listing resumed & live in marketplace.');
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Could not change publication status.', 'error');
                      }
                    }}
                    className="btn-ghost-dark !border !border-ink-700 !px-3 !py-1.5 text-[11px]"
                  >
                    {p.status === 'approved' ? <><PauseCircle size={13} /> Pause listing</> : <><PlayCircle size={13} /> Resume listing</>}
                  </button>
                )}

                {p.status === 'needs_correction' && !isSuspended && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button onClick={() => openEditor(p)} className="btn-brass !px-3.5 !py-2 text-[11px]">
                      <Pencil size={13} /> Edit & resubmit
                    </button>
                    <button onClick={async () => {
                      try {
                        await reviewProperty(p.id, 'submitted', 'Resubmitted by partner after corrections');
                        toast('Resubmitted for review.', 'info');
                      } catch (error) {
                        toast(error instanceof Error ? error.message : 'Could not resubmit property.', 'error');
                      }
                    }} className="btn-ghost-dark !border !border-ink-700 !px-3 !py-2 text-[11px]">
                      <RefreshCcw size={13} /> Quick resubmit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {calendarOpen && (
              <div className="border-t border-ink-800 bg-ink-950/75 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
                    Calendar & availability controls (live update — no re-submission required)
                  </p>
                  <button type="button" onClick={() => setOpenCalendarId(null)} className="text-[11px] font-bold text-ink-400 hover:text-white">Close</button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <label>
                    <span className="label-dark">First available date</span>
                    <input type="date" className="input-dark [color-scheme:dark] text-[12px]" value={calFirstAvail} onChange={e => setCalFirstAvail(e.target.value)} />
                  </label>
                  <label>
                    <span className="label-dark">Confirmation mode</span>
                    <select className="input-dark text-[12px]" value={calConfirmMode} onChange={e => setCalConfirmMode(e.target.value as AvailabilityConfirmationStatus)}>
                      <option value="confirmed_calendar">Confirmed live calendar</option>
                      <option value="recently_updated">Recently updated</option>
                      <option value="manual_confirmation">Needs host confirmation</option>
                    </select>
                  </label>
                  <label>
                    <span className="label-dark">Responsible manager</span>
                    <input className="input-dark text-[12px]" value={calResponsible} onChange={e => setCalResponsible(e.target.value)} />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={savingCal}
                      onClick={async () => {
                        setSavingCal(true);
                        try {
                          await updatePropertyAvailabilitySettings(p.id, {
                            firstAvailableDate: calFirstAvail || null,
                            availabilityConfirmationStatus: calConfirmMode,
                            calendarResponsiblePerson: calResponsible,
                          });
                          toast('Availability settings saved.');
                        } catch (err) {
                          toast(err instanceof Error ? err.message : 'Could not update settings.', 'error');
                        } finally {
                          setSavingCal(false);
                        }
                      }}
                      className="btn-brass w-full !py-2 text-[11.5px] disabled:opacity-50"
                    >
                      Save calendar settings
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-ink-800 pt-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">Add owner-blocked / external occupied dates</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-5">
                    <input type="date" className="input-dark [color-scheme:dark] text-[12px]" value={blockStart} onChange={e => setBlockStart(e.target.value)} aria-label="Block start" />
                    <input type="date" className="input-dark [color-scheme:dark] text-[12px]" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} aria-label="Block end" />
                    <select className="input-dark text-[12px]" value={blockType} onChange={e => setBlockType(e.target.value as AvailabilityBlockType)}>
                      <option value="owner_block">Owner block</option>
                      <option value="external_booking">External booking</option>
                      <option value="maintenance_block">Maintenance hold</option>
                    </select>
                    <input className="input-dark text-[12px]" placeholder="Optional note…" value={blockNote} onChange={e => setBlockNote(e.target.value)} />
                    <button
                      type="button"
                      disabled={savingCal}
                      onClick={async () => {
                        setSavingCal(true);
                        try {
                          await addPropertyAvailabilityBlock(p.id, {
                            startDate: blockStart,
                            endDate: blockEnd,
                            blockType,
                            note: blockNote,
                          });
                          setBlockStart('');
                          setBlockEnd('');
                          setBlockNote('');
                          toast('Unavailable date range added to property calendar.');
                        } catch (err) {
                          toast(err instanceof Error ? err.message : 'Could not add block.', 'error');
                        } finally {
                          setSavingCal(false);
                        }
                      }}
                      className="btn-ghost-dark !border !border-ink-700 !py-2 text-[11.5px]"
                    >
                      <Plus size={14} /> Block dates
                    </button>
                  </div>

                  {(p.unavailableBlocks ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {(p.unavailableBlocks ?? []).map(bl => (
                        <li key={bl.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2 text-[11.5px] font-medium text-ink-200">
                          <span>
                            <strong>{formatDate(bl.startDate)} → {formatDate(bl.endDate)}</strong> · <span className="text-brass-300">{formatBlockTypeLabel(bl.blockType)}</span>
                            {bl.note ? ` · ${bl.note}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await removePropertyAvailabilityBlock(p.id, bl.id);
                                toast('Calendar block removed.');
                              } catch (err) {
                                toast(err instanceof Error ? err.message : 'Could not remove block.', 'error');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {openDocs === p.id && (
              <div className="border-t border-ink-800 bg-ink-850/60 px-5 py-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">Documentation evidence — reviewed by HAMLET</p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {p.docs.map(d => (
                    <li key={d.label} className="flex items-center justify-between gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2">
                      <span className="min-w-0 break-words text-[11.5px] font-medium text-ink-100">{d.label}{d.note && <span className="block text-[10px] font-normal text-ink-400">{d.note}</span>}</span>
                      <DocStatusBadge status={d.status} />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] font-medium leading-snug text-ink-500">“Self-reported” means the submitter attested to the document; it is NOT verified until HAMLET reviews the evidence. HAMLET records verification outcomes honestly rather than issuing blanket trust claims.</p>
              </div>
            )}
          </article>
          );
        })}
      </div>

      {/* Edit & resubmit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { if (!saving) setEditing(null); }} />
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-y-contain rounded-2xl border border-ink-800 bg-ink-900 p-4 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brass-400">Address reviewer feedback</p>
                  <h2 className="mt-1 font-display text-xl font-black text-ink-50">Edit & resubmit listing</h2>
                </div>
                <button disabled={saving} onClick={() => setEditing(null)} className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close"><X size={18} /></button>
              </div>

              {editing.reviewNote && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-500/35 bg-orange-500/10 px-3.5 py-2.5 text-[11.5px] font-medium text-orange-200">
                  <FileWarning size={15} className="mt-0.5 shrink-0" />
                  <span><strong>Reviewer note:</strong> {editing.reviewNote}</span>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="label-dark">Property title</span>
                  <input className="input-dark" value={title} onChange={e => setTitle(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Property type</span>
                  <select className="input-dark" value={type} onChange={e => setType(e.target.value)}>
                    {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label>
                  <span className="label-dark">Lagos area</span>
                  <select className="input-dark" value={area} onChange={e => setArea(e.target.value)}>
                    {AREAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Full Lagos address</span>
                  <input className="input-dark" value={address} onChange={e => setAddress(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Nightly rate (₦)</span>
                  <input type="number" min={20000} step={5000} className="input-dark" value={nightlyRate} onChange={e => setNightlyRate(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Cleaning & turnover (₦)</span>
                  <input type="number" min={0} step={1000} className="input-dark" value={cleaningFee} onChange={e => setCleaningFee(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Refundable deposit (₦)</span>
                  <input type="number" min={0} step={5000} className="input-dark" value={deposit} onChange={e => setDeposit(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Bed setup</span>
                  <input className="input-dark" value={bedSetup} onChange={e => setBedSetup(e.target.value)} />
                </label>
                <label>
                  <span className="label-dark">Bedrooms</span>
                  <input type="number" min={1} className="input-dark" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Bathrooms</span>
                  <input type="number" min={1} className="input-dark" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} />
                </label>
                <label>
                  <span className="label-dark">Guest capacity</span>
                  <input type="number" min={1} max={20} className="input-dark" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">Authority to list (basis & mandate reference)</span>
                  <textarea className="input-dark min-h-[64px]" value={authorityBasis} onChange={e => setAuthorityBasis(e.target.value)} />
                </label>
                <div className="sm:col-span-2">
                  <span className="label-dark">Amenities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AMENITIES.map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setEditAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                        className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition ${editAmenities.includes(a) ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-700 text-ink-300'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="label-dark">Property photos ({editImages.length}/12)</span>
                  <input
                    ref={editFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={e => void handleEditPhotoFiles(e)}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={uploadingEditPhotos || editImages.length >= 12}
                      onClick={() => editFileRef.current?.click()}
                      className="btn-brass shrink-0 !px-3.5 !py-2 text-[11px] disabled:opacity-50"
                    >
                      {uploadingEditPhotos ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                      Upload photo
                    </button>
                    <input
                      className="input-dark flex-1 !py-2 text-[12px]"
                      placeholder="Or paste https:// image URL…"
                      value={editImageUrl}
                      onChange={e => setEditImageUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = editImageUrl.trim();
                        if (!url || editImages.length >= 12) return;
                        setEditImages(prev => [...prev, url]);
                        setEditImageUrl('');
                      }}
                      className="btn-ghost-dark shrink-0 !border !border-ink-700 !px-3 !py-2 text-[11px]"
                    >
                      <UploadCloud size={14} /> Add URL
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editImages.map((src, idx) => (
                      <span key={idx} className="relative">
                        <img src={src} alt="" className="h-14 w-18 rounded-lg border border-ink-800 object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImages(prev => prev.filter((_, j) => j !== idx))}
                          className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <label className="sm:col-span-2">
                  <span className="label-dark">House rules (one per line)</span>
                  <textarea className="input-dark min-h-[64px]" value={houseRulesText} onChange={e => setHouseRulesText(e.target.value)} />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-dark">What did you correct? (logged for reviewer)</span>
                  <input className="input-dark" placeholder="e.g. Updated authority mandate reference and confirmed market nightly rate" value={correctionSummary} onChange={e => setCorrectionSummary(e.target.value)} />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button disabled={saving} onClick={() => setEditing(null)} className="btn-ghost-dark !py-2.5 text-[12px]">Cancel</button>
                <button disabled={saving} onClick={() => void submitCorrections()} className="btn-brass !py-2.5 text-[12px] disabled:opacity-50">
                  <ShieldCheck size={14} /> {saving ? 'Submitting…' : 'Save & resubmit for review'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
