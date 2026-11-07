import { describe, expect, it } from 'vitest';
import {
  computePaystackHmacSha512,
  handlePaystackWebhook,
  type ConfirmWebhookParams,
} from './handler.ts';

const SECRET = 'sk_test_hamlet_webhook_validation';

async function signedRequest(payload: unknown): Promise<Request> {
  const body = JSON.stringify(payload);
  const signature = await computePaystackHmacSha512(body, SECRET);
  return new Request('https://hamlet.test/functions/v1/paystack-webhook', {
    method: 'POST',
    headers: { 'x-paystack-signature': signature },
    body,
  });
}

describe('Paystack webhook payload validation', () => {
  it('rejects amounts that cannot be represented as whole NGN before calling the database', async () => {
    let rpcCalls = 0;
    const req = await signedRequest({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_FRACTIONAL_NGN',
        amount: 10050,
        currency: 'NGN',
        metadata: { booking_id: 'booking-123' },
      },
    });

    const response = await handlePaystackWebhook(req, {
      paystackSecretKey: SECRET,
      confirmPaymentRpc: async (_params: ConfirmWebhookParams) => {
        rpcCalls += 1;
        return { data: null, error: null };
      },
    });

    expect(response.status).toBe(400);
    expect(rpcCalls).toBe(0);
  });

  it('rejects successful charges without a HAMLET booking identifier', async () => {
    let rpcCalls = 0;
    const req = await signedRequest({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_NO_BOOKING_METADATA',
        amount: 10000,
        currency: 'NGN',
        metadata: {},
      },
    });

    const response = await handlePaystackWebhook(req, {
      paystackSecretKey: SECRET,
      confirmPaymentRpc: async (_params: ConfirmWebhookParams) => {
        rpcCalls += 1;
        return { data: null, error: null };
      },
    });

    expect(response.status).toBe(400);
    expect(rpcCalls).toBe(0);
  });

  it('rejects malformed provider fee values before calling the database', async () => {
    let rpcCalls = 0;
    const req = await signedRequest({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_BAD_FEE',
        amount: 10000,
        fees: -1,
        currency: 'NGN',
        metadata: { booking_id: 'booking-123' },
      },
    });

    const response = await handlePaystackWebhook(req, {
      paystackSecretKey: SECRET,
      confirmPaymentRpc: async (_params: ConfirmWebhookParams) => {
        rpcCalls += 1;
        return { data: null, error: null };
      },
    });

    expect(response.status).toBe(400);
    expect(rpcCalls).toBe(0);
  });
});
