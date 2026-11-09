import { describe, expect, it, vi } from 'vitest';
import { handleBookingNotifications } from './handler';

const INTERNAL_SECRET = 'test-internal-dispatch-secret';

function makeDeps() {
  const claimPendingNotifications = vi.fn(async () => ({
    data: [],
    error: null,
  }));

  return {
    deps: {
      resendApiKey: undefined,
      resendFromEmail: undefined,
      hamletBookingsEmail: undefined,
      hamletAppUrl: undefined,
      internalDispatchSecret: INTERNAL_SECRET,
      getAuthenticatedUser: vi.fn(async () => null),
      authorizeDispatch: vi.fn(async () => ({ data: null, error: null })),
      claimPendingNotifications,
      completeNotification: vi.fn(async () => ({ error: null })),
    },
    claimPendingNotifications,
  };
}

async function dispatch(
  body: unknown,
  deps: ReturnType<typeof makeDeps>['deps'],
  secret = INTERNAL_SECRET,
) {
  return handleBookingNotifications(
    new Request('https://hamlet.test/functions/v1/booking-notifications', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hamlet-internal-secret': secret,
      },
      body: JSON.stringify(body),
    }),
    deps,
  );
}

describe('booking notification dispatch request contract', () => {
  it('scopes snake_case frontend booking_id requests to the requested booking', async () => {
    const { deps, claimPendingNotifications } = makeDeps();

    const response = await dispatch({ booking_id: 'booking-123' }, deps);

    expect(response.status).toBe(200);
    expect(claimPendingNotifications).toHaveBeenCalledWith({
      bookingId: 'booking-123',
      batchLimit: 20,
      ignoreBackoff: false,
    });
  });

  it('accepts a Vault-backed scheduler secret when the Edge Function secret is not configured', async () => {
    const vaultSecret = 'hamlet-vault-dispatch-secret-with-more-than-32-characters';
    const { deps, claimPendingNotifications } = makeDeps();
    const verifyVaultDispatchSecret = vi.fn(async (candidate: string) => candidate === vaultSecret);
    const depsWithVault = {
      ...deps,
      internalDispatchSecret: undefined,
      verifyVaultDispatchSecret,
    };

    const response = await dispatch({}, depsWithVault, vaultSecret);

    expect(response.status).toBe(200);
    expect(verifyVaultDispatchSecret).toHaveBeenCalledWith(vaultSecret);
    expect(claimPendingNotifications).toHaveBeenCalledWith({
      bookingId: null,
      batchLimit: 20,
      ignoreBackoff: false,
    });
  });

  it('continues to support the camelCase bookingId contract', async () => {
    const { deps, claimPendingNotifications } = makeDeps();

    const response = await dispatch({ bookingId: 'booking-456' }, deps);

    expect(response.status).toBe(200);
    expect(claimPendingNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'booking-456' }),
    );
  });

  it('rejects conflicting booking identifiers instead of widening the dispatch scope', async () => {
    const { deps, claimPendingNotifications } = makeDeps();

    const response = await dispatch(
      { bookingId: 'booking-123', booking_id: 'booking-456' },
      deps,
    );

    expect(response.status).toBe(400);
    expect(claimPendingNotifications).not.toHaveBeenCalled();
  });

  it('rejects non-string booking identifiers instead of treating them as an unscoped batch', async () => {
    const { deps, claimPendingNotifications } = makeDeps();

    const response = await dispatch({ booking_id: 123 }, deps);

    expect(response.status).toBe(400);
    expect(claimPendingNotifications).not.toHaveBeenCalled();
  });
});
