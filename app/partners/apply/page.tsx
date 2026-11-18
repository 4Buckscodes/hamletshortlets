'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const inputStyle: React.CSSProperties = {
  width: '100%', minHeight: 50, border: '1px solid #e5e0d5', borderRadius: 12,
  padding: '12px 14px', background: '#fffefa', color: '#17251d', fontSize: 14,
  outline: 'none', transition: 'border-color .2s, box-shadow .2s',
};
const labelStyle: React.CSSProperties = { display: 'grid', gap: 8, color: '#26352c', fontSize: 12, fontWeight: 750, letterSpacing: '.01em' };
const sectionStyle: React.CSSProperties = { display: 'grid', gap: 15, paddingTop: 22, borderTop: '1px solid #eee9df' };

export default function PartnerApplicationPage() {
  const db = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!db) { setError('Partner applications are not configured on this deployment.'); return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const userResult = await db.auth.getUser();
    const user = userResult.data.user;
    if (!user) { window.location.assign('/signin?next=/partners/apply'); return; }
    const fullName = String(form.get('fullName') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const company = String(form.get('company') || '').trim();
    const role = String(form.get('role') || '').trim();
    const areas = String(form.get('areas') || '').split(',').map(v => v.trim()).filter(Boolean).slice(0, 10);
    const count = Number(form.get('propertiesCount'));
    const motivation = String(form.get('motivation') || '').trim();
    if (fullName.length < 2 || phone.length < 7 || company.length < 2 || role.length < 2 || !areas.length || !Number.isInteger(count) || count < 0 || motivation.length < 20) {
      setError('Complete all required details. Explain your experience in at least 20 characters.'); return;
    }
    setBusy(true);
    try {
      const { error: appError } = await db.from('partner_applications').insert({
        applicant_id: user.id, full_name: fullName, email: user.email || '', phone, company, role, areas,
        properties_count: count, motivation, status: 'pending',
      });
      if (appError) throw appError;
      setMessage('Your partner application has been submitted for review. Your account remains a guest account until HAMLET approves the application.');
      formElement.reset();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'We could not submit your application.'); }
    finally { setBusy(false); }
  }

  return <main style={{ minHeight: '100svh', background: '#f5f2e9', color: '#17251d' }}>
    <section className="partner-apply-shell" style={{ maxWidth: 1120, margin: '0 auto', padding: '42px 24px 76px' }}>
      <div className="partner-apply-intro" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(230px,.62fr)', gap: 36, alignItems: 'end', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 11px', border: '1px solid #d8c99e', borderRadius: 999, color: '#866b2d', background: '#fbf8ef', fontSize: 10, fontWeight: 850, letterSpacing: '.14em', textTransform: 'uppercase' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: '#b8954a' }} /> HAMLET partner network
          </div>
          <h1 className="serif" style={{ maxWidth: 680, fontSize: 'clamp(38px,5.4vw,62px)', lineHeight: 1.02, fontWeight: 500, letterSpacing: '-.035em', margin: '18px 0 14px', color: '#17251d' }}>
            Good properties deserve <span style={{ color: '#a17d37', fontStyle: 'italic' }}>good partners.</span>
          </h1>
          <p style={{ maxWidth: 610, color: '#68736b', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
            Bring your properties, hospitality experience or local network to HAMLET. Tell us how you work and where you operate; our team will review your application before partner access is granted.
          </p>
        </div>
        <aside style={{ background: '#17251d', color: '#f7f3e8', borderRadius: 20, padding: '22px 23px', boxShadow: '0 14px 35px rgba(23,37,29,.10)' }}>
          <p style={{ margin: '0 0 14px', color: '#d8bd7c', fontSize: 10, fontWeight: 850, letterSpacing: '.15em', textTransform: 'uppercase' }}>A simple first step</p>
          <div style={{ display: 'grid', gap: 13 }}>
            {['Share your experience', 'Tell us your coverage', 'Get reviewed by HAMLET'].map((item, index) => <div key={item} style={{ display: 'flex', gap: 11, alignItems: 'center', fontSize: 13, color: '#f1eee5' }}><span style={{ display: 'grid', placeItems: 'center', width: 25, height: 25, borderRadius: 99, border: '1px solid #8f794a', color: '#e1c783', fontSize: 11 }}>{String(index + 1).padStart(2, '0')}</span>{item}</div>)}
          </div>
        </aside>
      </div>

      <div className="partner-apply-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 245px', gap: 28, padding: 28, border: '1px solid #e7e1d5', borderRadius: 24, background: '#fffefa', boxShadow: '0 18px 55px rgba(44,42,32,.07)' }}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 22, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
            <div><p style={{ margin: 0, color: '#a17d37', fontSize: 10, fontWeight: 850, letterSpacing: '.15em', textTransform: 'uppercase' }}>Partner application</p><h2 className="serif" style={{ margin: '7px 0 0', fontSize: 29, lineHeight: 1.15, fontWeight: 500 }}>Let’s get to know you.</h2></div>
            <span style={{ whiteSpace: 'nowrap', padding: '7px 10px', borderRadius: 999, background: '#f4f0e5', color: '#74623c', fontSize: 10, fontWeight: 800 }}>ABOUT 3 MIN</span>
          </div>

          <div style={sectionStyle}>
            <div><p style={{ margin: 0, color: '#a17d37', fontSize: 10, fontWeight: 850, letterSpacing: '.13em' }}>01 / YOUR DETAILS</p><p style={{ margin: '5px 0 0', color: '#7a827b', fontSize: 12 }}>How can our team reach you?</p></div>
            <div className="partner-apply-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
              <label style={labelStyle}>Full name<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Your full name" style={inputStyle}/></label>
              <label style={labelStyle}>Phone number<input name="phone" required minLength={7} maxLength={32} autoComplete="tel" placeholder="+234…" style={inputStyle}/></label>
            </div>
            <label style={labelStyle}>Business / company name<input name="company" required minLength={2} maxLength={160} placeholder="Your business or trading name" style={inputStyle}/></label>
          </div>

          <div style={sectionStyle}>
            <div><p style={{ margin: 0, color: '#a17d37', fontSize: 10, fontWeight: 850, letterSpacing: '.13em' }}>02 / YOUR PARTNERSHIP</p><p style={{ margin: '5px 0 0', color: '#7a827b', fontSize: 12 }}>Choose the role that best describes how you work.</p></div>
            <label style={labelStyle}>Partner role<select name="role" required defaultValue="" style={{ ...inputStyle, appearance: 'auto' }}><option value="" disabled>Choose your role</option><option value="owner">Property owner</option><option value="property_manager">Property manager</option><option value="shortlet_operator">Shortlet operator</option><option value="cohost">Co-host</option><option value="closing_agent">Closing agent</option><option value="referral">Referral partner</option></select></label>
            <div className="partner-apply-fields" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(150px,.7fr)', gap: 14 }}>
              <label style={labelStyle}>Areas you cover in Nigeria<input name="areas" required placeholder="Lagos, Abuja, Ibadan, Lekki…" style={inputStyle}/><span style={{ color: '#899087', fontSize: 11, fontWeight: 500 }}>Separate locations with commas.</span></label>
              <label style={labelStyle}>Properties you can bring<input name="propertiesCount" required type="number" min="0" max="10000" defaultValue="1" style={inputStyle}/><span style={{ color: '#899087', fontSize: 11, fontWeight: 500 }}>An estimate is fine.</span></label>
            </div>
          </div>

          <div style={sectionStyle}>
            <div><p style={{ margin: 0, color: '#a17d37', fontSize: 10, fontWeight: 850, letterSpacing: '.13em' }}>03 / YOUR EXPERIENCE</p><p style={{ margin: '5px 0 0', color: '#7a827b', fontSize: 12 }}>Help us understand the value you bring.</p></div>
            <label style={labelStyle}>Experience and reason for joining<textarea name="motivation" required minLength={20} maxLength={1500} rows={5} placeholder="Tell us about your properties, hospitality experience, clients or network…" style={{ ...inputStyle, minHeight: 130, resize: 'vertical', lineHeight: 1.65 }}/></label>
          </div>

          {error && <p role="alert" style={{ margin: 0, padding: '12px 14px', borderRadius: 12, background: '#fff0ed', color: '#9f2d20', fontSize: 13 }}>{error}</p>}
          {message && <p role="status" style={{ margin: 0, padding: '12px 14px', borderRadius: 12, background: '#edf6ee', color: '#236238', fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
          <button className="primary-button" type="submit" disabled={busy} style={{ minHeight: 54, borderRadius: 12, fontSize: 14, fontWeight: 800, letterSpacing: '.01em' }}>{busy ? 'Submitting your application…' : 'Submit partner application  →'}</button>
          <p style={{ margin: '-10px 0 0', color: '#92988f', fontSize: 11, lineHeight: 1.6 }}>By submitting, you confirm that the details provided are accurate. Submission does not automatically grant partner permissions.</p>
        </form>

        <aside className="partner-apply-aside" style={{ borderLeft: '1px solid #eee9df', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 13, background: '#f3eddd', color: '#927337', fontFamily: 'Georgia,serif', fontSize: 24 }}>H</div>
          <div><h3 className="serif" style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 500 }}>Built on trust.</h3><p style={{ margin: 0, color: '#737d74', fontSize: 12, lineHeight: 1.8 }}>Every application is reviewed before partner permissions are granted. Your account stays a guest account until approval.</p></div>
          <div style={{ height: 1, background: '#eee9df' }}/>
          <div><p style={{ margin: '0 0 7px', color: '#a17d37', fontSize: 10, fontWeight: 850, letterSpacing: '.12em' }}>WHAT HAPPENS NEXT</p><p style={{ margin: 0, color: '#737d74', fontSize: 12, lineHeight: 1.8 }}>Our team reviews your details and follows up using the contact information on your account.</p></div>
          <div style={{ marginTop: 'auto', padding: 14, borderRadius: 14, background: '#f6f3eb' }}><p style={{ margin: 0, color: '#5d695f', fontSize: 11, lineHeight: 1.7 }}>Already part of the network? <a href="/signin?next=/partners" style={{ color: '#8d6c2d', fontWeight: 800, textDecoration: 'none' }}>Sign in to your workspace →</a></p></div>
        </aside>
      </div>
    </section>
    <style jsx>{`
      .partner-apply-shell input:focus, .partner-apply-shell select:focus, .partner-apply-shell textarea:focus { border-color: #b4934d !important; box-shadow: 0 0 0 3px rgba(180,147,77,.13); }
      .partner-apply-shell input::placeholder, .partner-apply-shell textarea::placeholder { color: #a5aaa1; }
      @media (max-width: 760px) {
        .partner-apply-intro { grid-template-columns: 1fr !important; gap: 20px !important; }
        .partner-apply-card { grid-template-columns: 1fr !important; padding: 20px !important; }
        .partner-apply-aside { border-left: 0 !important; border-top: 1px solid #eee9df; padding: 20px 0 0 !important; }
      }
      @media (max-width: 520px) {
        .partner-apply-shell { padding: 28px 14px 54px !important; }
        .partner-apply-fields { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </main>;
}
