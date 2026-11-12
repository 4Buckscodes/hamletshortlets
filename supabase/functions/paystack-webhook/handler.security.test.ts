import { describe, expect, it, vi } from 'vitest';
import {
  computePaystackHmacSha512,
  handlePaystackWebhook,
  verifyPaystackSignature,
} from './handler';

const SECRET = 'hamlet-test-paystack-secret';

function successPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'charge.success',
    data: {
      status: 'success',
      reference: 'PAYSTACK-REF-001',
      amount: 2_500_000,
      fees: 15_000,
      currency: 'NGN',
      metadata: { booking_id: 'booking-001' },
      ...overrides,
    },
  };
}

async function signedRequest(body: string, signatureOverride?: string) {
  const signature = signatureOverride ?? await computePaystackHmacSha512(body, SECRET);
  return new Request('https://hamlet.test/functions/v1/paystack-webhook', {
    method: 'POST',
    headers: { 'x-paystack-signature': signature },
    body,
  });
}

describe('Paystack webhook security boundary', () => {
  it('verifies the HMAC signature against the exact raw request body', async () => {
    const rawBody = JSON.stringify(successPayload());
    const signature = await computePaystackHmacSha512(rawBody, SECRET);

    await expect(verifyPaystackSignature(rawBody, signature, SECRET)).resolves.toBe(true);
    await expect(verifyPaystackSignature(`${rawBody} `, signature, SECRET)).resolves.toBe(false);
    await expect(verifyPaystackSignature(rawBody, null, SECRET)).resolves.toBe(false);
    await expect(verifyPaystackSignature(rawBody, signature, 'wrong-secret')).resolves.toBe(false);
  });

  it('rejects an invalid signature before calling the payment confirmation RPC', async () => {
    const confirmPaymentRpc = vi.fn();
    const rawBody = JSON.stringify(successPayload());
    const response = await handlePaystackWebhook(
      await signedRequest(rawBody, 'invalid-signature'),
      { paystackSecretKey: SECRET, confirmPaymentRpc },
    );

    expect(response.status).toBe(401);
    expect(confirmPaymentRpc).not.toHaveBeenCalled();
  });

  it('rejects an unconfigured webhook secret without processing the payload', async () => {
    const confirmPaymentRpc = vi.fn();
    const response = await handlePaystackWebhook(
      new Request('https://hamlet.test/webhook', { method: 'POST', body: '{}' }),
      { paystackSecretKey: 'replace_with_secret', confirmPaymentRpc },
    );

    expect(response.status).toBe(503);
    expect(confirmPaymentRpc).not.toHaveBeenCalled();
  });

  it('passes only signed, successful NGN whole-Naira payments to the service RPC', async () => {
    const confirmPaymentRpc = vi.fn(async () => ({
      data: {
        status: 'confirmed' as const,
        booking_id: 'booking-001',
        reference: 'HML-BOOKING-001',
        variance: 0,
      },
      error: null,
    }));
    const rawBody = JSON.stringify(successPayload());
    const response = await handlePaystackWebhook(
      await signedRequest(rawBody),
      { paystackSecretKey: SECRET, confirmPaymentRpc },
    );

    expect(response.status).toBe(200);
    expect(confirmPaymentRpc).toHaveBeenCalledTimes(1);
    expect(confirmPaymentRpc).toHaveBeenCalledWith({
      target_booking_id: 'booking-001',
      provider_name: 'Paystack',
      provider_ref: 'PAYSTACK-REF-001',
      paid_amount_naira: 25_000,
      provider_fee_naira: 150,
      currency_code: 'NGN',
    });
  });

  it.each([
    ['wrong currency', { currency: 'USD' }],
    ['fractional Naira', { amount: 2_500_050 }],
    ['zero amount', { amount: 0 }],
    ['missing booking metadata', { metadata: {} }],
    ['non-success charge', { status: 'failed' }],
  ])('rejects %s before calling the payment confirmation RPC', async (_label, override) => {
    const confirmPaymentRpc = vi.fn();
    const rawBody = JSON.stringify(successPayload(override));
    const response = await handlePaystackWebhook(
      await signedRequest(rawBody),
      { paystackSecretKey: SECRET, confirmPaymentRpc },
    );

    expect(response.status).toBe(400);
    expect(confirmPaymentRpc).not.toHaveBeenCalled();
  });

  it('ignores signed non-payment events', async () => {
    const confirmPaymentRpc = vi.fn();
    const rawBody = JSON.stringify({ event: 'transfer.success', data: {} });
    const response = await handlePaystackWebhook(
      await signedRequest(rawBody),
      { paystackSecretKey: SECRET, confirmPaymentRpc },
    );

    expect(response.status).toBe(200);
    expect(confirmPaymentRpc).not.toHaveBeenCalled();
  });
});
