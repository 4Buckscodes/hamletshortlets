'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  extractShareTokenFromSearchParams,
  readPropertyShareTokenHint,
  readVisitorSessionKey,
} from '@/lib/share-engine';
import { FIELD_INPUT_CLASS, FormField } from '@/components/forms/ProgressiveFormPrimitives';

export function PropertyEnquiryCard({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) return;
    let active = true;
    void (async () => {
      const { data: sess } = await db.auth.getSession();
      const user = sess.session?.user;
      if (!user || !active) return;
      if (user.email) setEmail(prev => prev || user.email || '');
      const { data: prof } = await db
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (active && prof?.full_name) {
        setName(prev => prev || String(prof.full_name));
      }
    })();
    return () => {
      active = false;
    };
  }, [db]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      let accessToken: string | undefined;
      if (db) {
        const { data: sess } = await db.auth.getSession();
        accessToken = sess.session?.access_token;
      }

      const activeShareToken =
        (typeof window !== 'undefined'
          ? extractShareTokenFromSearchParams(new URLSearchParams(window.location.search))
          : null) || readPropertyShareTokenHint(propertyId);

      const response = await fetch('/api/property-enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          propertyId,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          visitorSessionKey: readVisitorSessionKey(),
          shareToken: activeShareToken,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Could not send enquiry.');
      }

      setSent(true);
      setMessage('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not send enquiry.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-3xl border border-ink-200 bg-white p-5">
      {!open ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-sm font-bold text-ink-900">
              Have a question before requesting dates?
            </p>
            <p className="m-0 mt-0.5 text-xs text-ink-500">
              Ask about power, parking, or check-in times.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="secondary-button min-h-[42px] shrink-0 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span>Ask question</span>
          </button>
        </div>
      ) : sent ? (
        <div role="status" className="space-y-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="m-0 text-sm font-bold text-ink-900">Enquiry sent</p>
              <p className="m-0 mt-1 text-xs text-ink-600">
                We have logged your question for {propertyTitle} and will reply by email.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setOpen(false);
            }}
            className="secondary-button min-h-[40px] text-xs"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-bold text-ink-950">
              Ask about {propertyTitle}
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-xs font-bold text-ink-500 hover:text-ink-900"
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Your name">
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>

            <FormField label="Email">
              {fieldProps => (
                <input
                  {...fieldProps}
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={FIELD_INPUT_CLASS}
                />
              )}
            </FormField>
          </div>

          <FormField label="Question">
            {fieldProps => (
              <textarea
                {...fieldProps}
                required
                minLength={10}
                maxLength={1500}
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Is 24/7 inverter + generator power included during daytime work hours?"
                className={`${FIELD_INPUT_CLASS} resize-y`}
              />
            )}
          </FormField>

          {error && (
            <p role="alert" className="m-0 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="primary-button min-h-[44px] w-full text-xs"
          >
            {busy ? 'Sending…' : 'Send enquiry'}
          </button>
        </form>
      )}
    </div>
  );
}
