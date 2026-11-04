import { test, expect, type Page } from '@playwright/test';

const PARTNER_USER_ID = '11111111-2222-3333-4444-555555555555';

interface CapturedUpload {
  objectPath: string;
  mimeType: string;
  byteLength: number;
  isWebp: boolean;
  hasExifMarker: boolean;
  hasGpsMarker: boolean;
}

interface HarnessOptions {
  uploadLatencyMs?: number;
  failNextUploadsCount?: number;
  existingProperty?: {
    id: string;
    title: string;
    area: string;
    public_address: string;
    image_urls: string[];
    status: string;
    review_note: string | null;
  };
}

function containsAsciiSequence(bytes: Buffer, needle: string): boolean {
  return bytes.includes(Buffer.from(needle, 'ascii'));
}

async function installPartnerStorageHarness(page: Page, options: HarnessOptions = {}) {
  const capturedUploads: CapturedUpload[] = [];
  const storedBlobs = new Map<string, { body: Buffer; contentType: string }>();
  const removedPaths: string[] = [];
  const apiSubmissions: Array<{ method: string; body: Record<string, unknown> }> = [];
  const workerRequests: string[] = [];

  let inFlightUploads = 0;
  let peakConcurrentUploads = 0;
  let remainingFailures = options.failNextUploadsCount ?? 0;
  const latencyMs = options.uploadLatencyMs ?? 35;

  page.on('request', req => {
    if (req.url().includes('/vendor/browser-image-compression.js')) {
      workerRequests.push(req.url());
    }
  });

  // Intercept storage upload endpoint called by injected test Supabase client
  await page.route('**/__e2e_storage__/upload*', async route => {
    inFlightUploads += 1;
    peakConcurrentUploads = Math.max(peakConcurrentUploads, inFlightUploads);

    try {
      await new Promise(resolve => setTimeout(resolve, latencyMs));

      const url = new URL(route.request().url());
      const objectPath = url.searchParams.get('path') || '';
      const contentType =
        route.request().headers()['content-type'] || 'application/octet-stream';
      const bodyBuffer = route.request().postDataBuffer() ?? Buffer.alloc(0);

      if (remainingFailures > 0) {
        remainingFailures -= 1;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Mobile network connection dropped mid-upload. Tap Retry.',
          }),
        });
        return;
      }

      const isWebp =
        bodyBuffer.length >= 12 &&
        bodyBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        bodyBuffer.subarray(8, 12).toString('ascii') === 'WEBP';

      // Check for any EXIF header ("Exif\0\0") or WebP EXIF chunk or GPS IFD tag (0x88 0x25)
      const hasExifMarker = containsAsciiSequence(bodyBuffer, 'Exif\0\0');
      const hasGpsMarker = containsAsciiSequence(bodyBuffer, 'GPSLatitude');

      capturedUploads.push({
        objectPath,
        mimeType: contentType,
        byteLength: bodyBuffer.byteLength,
        isWebp,
        hasExifMarker,
        hasGpsMarker,
      });

      storedBlobs.set(objectPath, { body: bodyBuffer, contentType });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: `property-media/${objectPath}` }),
      });
    } finally {
      inFlightUploads = Math.max(0, inFlightUploads - 1);
    }
  });

  // Serve uploaded public images back to <img> tags so naturalWidth/naturalHeight work genuinely
  await page.route('**/storage/v1/object/public/property-media/**', async route => {
    const url = new URL(route.request().url());
    const marker = '/storage/v1/object/public/property-media/';
    const idx = url.pathname.indexOf(marker);
    const objectPath = decodeURIComponent(url.pathname.slice(idx + marker.length));
    const stored = storedBlobs.get(objectPath);
    if (stored) {
      await route.fulfill({
        status: 200,
        contentType: stored.contentType,
        body: stored.body,
      });
      return;
    }
    // 1x1 fallback PNG for pre-seeded existing URLs in edit tests
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVR42mNk+M9QzwAEAAmGAYCF+yOnAAAAAElFTkSuQmCC',
      'base64',
    );
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: tinyPng,
    });
  });

  await page.route('**/__e2e_storage__/remove', async route => {
    const payload = JSON.parse(route.request().postData() || '{"paths":[]}') as {
      paths?: string[];
    };
    if (Array.isArray(payload.paths)) {
      removedPaths.push(...payload.paths);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ removed: payload.paths ?? [] }),
    });
  });

  await page.route('**/api/partner/properties', async route => {
    // Small latency so rapid double-clicks exercise client submission mutex
    await new Promise(resolve => setTimeout(resolve, 60));
    const body = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
    apiSubmissions.push({ method: route.request().method(), body });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        propertyId: body.propertyId || 'prop-created-001',
        message: body.saveAsDraft
          ? 'Draft saved to your partner workspace.'
          : 'Listing submitted for HAMLET review.',
      }),
    });
  });

  const existingProp = options.existingProperty ?? null;

  await page.addInitScript(
    ({ partnerUserId, seedProperty }) => {
      const makeQueryBuilder = (table: string) => {
        const filters: Record<string, unknown> = {};
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return builder;
          },
          ilike: () => builder,
          order: () => builder,
          limit: () =>
            Promise.resolve({
              data: [],
              error: null,
            }),
          maybeSingle: async () => {
            if (table === 'profiles') {
              return { data: { id: partnerUserId, role: 'partner' }, error: null };
            }
            if (table === 'properties' && seedProperty) {
              return {
                data: {
                  id: seedProperty.id,
                  title: seedProperty.title,
                  property_type: 'Apartment',
                  area: seedProperty.area,
                  public_address: seedProperty.public_address,
                  nightly_rate: 150000,
                  cleaning_fee: 25000,
                  mandatory_charges: [],
                  refundable_deposit: 100000,
                  bedrooms: 2,
                  bathrooms: 2,
                  capacity: 4,
                  bed_setup: '2 queen beds',
                  amenities: ['24/7 Estate Power', 'Fibre Wi-Fi'],
                  image_urls: seedProperty.image_urls,
                  house_rules: ['No smoking indoors'],
                  status: seedProperty.status,
                  verification: 'pending',
                  trust_label: 'Submitted',
                  first_available_date: null,
                  availability_confirmation_status: 'confirmed_available',
                  calendar_responsible_person: 'Chinedu Okonkwo',
                  review_note: seedProperty.review_note,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              };
            }
            if (table === 'property_private_records' && seedProperty) {
              return {
                data: {
                  record_data: {
                    authority_basis: 'Direct owner holding registered deed of assignment.',
                    submitted_role: 'Property owner',
                  },
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        };
        return builder;
      };

      const fakeSupabase = {
        auth: {
          getSession: async () => ({
            data: {
              session: {
                access_token: 'e2e-partner-jwt-token',
                user: { id: partnerUserId, email: 'partner@hamlet.rest' },
              },
            },
            error: null,
          }),
        },
        from: (table: string) => makeQueryBuilder(table),
        rpc: async () => ({ data: null, error: null }),
        storage: {
          from: (bucket: string) => ({
            upload: async (
              objectPath: string,
              file: File | Blob,
              opts?: { contentType?: string },
            ) => {
              const res = await fetch(
                `/__e2e_storage__/upload?bucket=${encodeURIComponent(
                  bucket,
                )}&path=${encodeURIComponent(objectPath)}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type':
                      opts?.contentType || (file as File).type || 'image/webp',
                  },
                  body: file,
                },
              );
              if (!res.ok) {
                const errJson = (await res.json().catch(() => ({}))) as {
                  message?: string;
                };
                return {
                  data: null,
                  error: {
                    message: errJson.message || `Upload HTTP ${res.status}`,
                  },
                };
              }
              return { data: { path: objectPath }, error: null };
            },
            getPublicUrl: (objectPath: string) => ({
              data: {
                publicUrl: `${window.location.origin}/storage/v1/object/public/${bucket}/${objectPath}`,
              },
            }),
            remove: async (paths: string[]) => {
              await fetch('/__e2e_storage__/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bucket, paths }),
              });
              return { data: paths, error: null };
            },
          }),
        },
      };

      (
        window as Window & { __HAMLET_TEST_SUPABASE__?: unknown }
      ).__HAMLET_TEST_SUPABASE__ = fakeSupabase;
    },
    { partnerUserId: PARTNER_USER_ID, seedProperty: existingProp },
  );

  return {
    capturedUploads,
    removedPaths,
    apiSubmissions,
    workerRequests,
    getPeakConcurrentUploads: () => peakConcurrentUploads,
    setFailures: (n: number) => {
      remainingFailures = n;
    },
  };
}

/**
 * Generates a realistic camera JPEG inside browser Canvas with architectural edges,
 * optional APP1 Exif + GPS segment, and optional padding > 5 MB to simulate raw iPhone photos.
 */
async function generateSyntheticCameraFilesInBrowser(
  page: Page,
  specs: Array<{
    name: string;
    width: number;
    height: number;
    blurry?: boolean;
    embedGpsExif?: boolean;
    minByteSize?: number;
    seed?: number;
  }>,
) {
  return page.evaluate(async items => {
    const out: Array<{ name: string; mimeType: string; base64: string }> = [];

    for (const spec of items) {
      const canvas = document.createElement('canvas');
      canvas.width = spec.width;
      canvas.height = spec.height;
      const ctx = canvas.getContext('2d')!;

      if (spec.blurry) {
        ctx.fillStyle = '#8b8d91';
        ctx.fillRect(0, 0, spec.width, spec.height);
      } else {
        // Draw detailed architectural interior pattern (walls, windows, flooring, art frames)
        const grad = ctx.createLinearGradient(0, 0, spec.width, spec.height);
        grad.addColorStop(0, '#f4efe6');
        grad.addColorStop(0.5, '#d8c5a3');
        grad.addColorStop(1, '#1e3557');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, spec.width, spec.height);

        const step = Math.max(24, Math.floor(spec.width / 48));
        for (let y = 0; y < spec.height; y += step) {
          for (let x = 0; x < spec.width; x += step) {
            const v = ((x * 17 + y * 31 + (spec.seed ?? 1) * 53) % 210) + 25;
            ctx.fillStyle = `rgb(${v}, ${(v + 40) % 255}, ${(v + 85) % 255})`;
            ctx.fillRect(x, y, Math.floor(step * 0.72), Math.floor(step * 0.72));
          }
        }
      }

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          0.98,
        );
      });
      canvas.width = 0;
      canvas.height = 0;

      let bytes = new Uint8Array(await blob.arrayBuffer());

      // Inject genuine JPEG APP1 Exif + GPSInfo (0x8825) + ASCII GPSLatitude segment right after SOI
      if (spec.embedGpsExif && bytes[0] === 0xff && bytes[1] === 0xd8) {
        const gpsAscii = new TextEncoder().encode('GPSLatitude:6.4541,3.4346');
        const exifHeader = [
          0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
          0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
          0x00, 0x01,
          0x88, 0x25, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a,
          ...Array.from(gpsAscii),
        ];
        const segLen = exifHeader.length + 2;
        const app1 = new Uint8Array([
          0xff,
          0xe1,
          (segLen >> 8) & 0xff,
          segLen & 0xff,
          ...exifHeader,
        ]);

        // Optional benign APP2 padding so raw camera JPEG exceeds 5 MB (testing raw >5MB handling)
        const extraChunks: Uint8Array[] = [bytes.subarray(0, 2), app1];
        let totalLen = bytes.byteLength + app1.byteLength;
        while (spec.minByteSize && totalLen < spec.minByteSize) {
          const padPayloadLen = Math.min(60_000, spec.minByteSize - totalLen);
          const segTotal = padPayloadLen + 2;
          const app2 = new Uint8Array(2 + segTotal);
          app2[0] = 0xff;
          app2[1] = 0xe2;
          app2[2] = (segTotal >> 8) & 0xff;
          app2[3] = segTotal & 0xff;
          extraChunks.push(app2);
          totalLen += app2.byteLength;
        }
        extraChunks.push(bytes.subarray(2));

        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of extraChunks) {
          merged.set(c, offset);
          offset += c.byteLength;
        }
        bytes = merged;
      }

      // Encode to base64 in chunks
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      out.push({
        name: spec.name,
        mimeType: 'image/jpeg',
        base64: btoa(binary),
      });
    }

    return out;
  }, specs);
}

async function advanceWizardToPhotoStep(page: Page) {
  await page.goto('/partners/properties/new');
  await expect(page.getByRole('heading', { name: /Submit a Lagos stay/i })).toBeVisible();

  await page.getByLabel('Listing title').fill('Bright 2-Bedroom Apartment in Ikoyi');
  await page
    .getByLabel(/Public street, estate or landmark summary/i)
    .fill('Off Bourdillon Road, Old Ikoyi, Lagos');
  await page.getByRole('button', { name: /Save & continue/i }).click();

  // Step 2: Rooms & capacity -> Step 3: Photos
  await page.getByRole('button', { name: /Save & continue/i }).click();
  await expect(
    page.getByText(/Upload property photographs straight from your phone or computer/i),
  ).toBeVisible();
}

test.describe('HAMLET Automatic Property Image Optimisation — Mobile & Desktop E2E', () => {
  test('optimises >5MB 4032x3024 iPhone camera photo to <=2400px WebP, strips EXIF GPS, warns on low-res/blur, and rejects unsupported formats gracefully', async ({
    page,
  }) => {
    const harness = await installPartnerStorageHarness(page, { uploadLatencyMs: 60 });
    await advanceWizardToPhotoStep(page);

    // 1. Single 5.6 MB 4032x3024 camera photo with embedded EXIF & GPS coordinates
    const [largeCameraJpeg, blurryThumb] = await generateSyntheticCameraFilesInBrowser(page, [
      {
        name: 'IMG_4032_IKOYI.JPG',
        width: 4032,
        height: 3024,
        embedGpsExif: true,
        minByteSize: 5_600_000,
        seed: 7,
      },
      {
        name: 'whatsapp-blurry-thumb.jpg',
        width: 500,
        height: 400,
        blurry: true,
        seed: 2,
      },
    ]);

    const rawBytes = Buffer.from(largeCameraJpeg.base64, 'base64');
    expect(rawBytes.byteLength).toBeGreaterThan(5 * 1024 * 1024);
    expect(containsAsciiSequence(rawBytes, 'Exif\0\0')).toBe(true);
    expect(containsAsciiSequence(rawBytes, 'GPSLatitude')).toBe(true);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      {
        name: largeCameraJpeg.name,
        mimeType: largeCameraJpeg.mimeType,
        buffer: rawBytes,
      },
    ]);

    // Wait for Cover photo card to appear in the gallery
    await expect(page.getByText('Cover photo')).toBeVisible({ timeout: 25_000 });
    expect(harness.capturedUploads).toHaveLength(1);

    const uploaded = harness.capturedUploads[0];
    expect(uploaded.objectPath.startsWith(`${PARTNER_USER_ID}/`)).toBe(true);
    expect(uploaded.objectPath.endsWith('.webp')).toBe(true);
    expect(uploaded.mimeType).toBe('image/webp');
    expect(uploaded.isWebp).toBe(true);
    expect(uploaded.byteLength).toBeLessThanOrEqual(700 * 1024);
    expect(uploaded.hasExifMarker).toBe(false);
    expect(uploaded.hasGpsMarker).toBe(false);
    // Self-hosted Web Worker was loaded locally (never external CDN)
    expect(harness.workerRequests.length).toBeGreaterThanOrEqual(1);

    // Open Lightbox preview and verify exact 2400x1800 aspect-ratio-preserving dimensions
    await page.getByRole('button', { name: 'Preview photo 1 full size' }).click();
    const dialog = page.getByRole('dialog', { name: 'Photograph 1 preview' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/2400×1800px/)).toBeVisible();

    const naturalDims = await dialog.locator('img').evaluate((img: HTMLImageElement) => ({
      w: img.naturalWidth,
      h: img.naturalHeight,
    }));
    expect(naturalDims).toEqual({ w: 2400, h: 1800 });
    await dialog.getByRole('button', { name: 'Close photo preview' }).click();

    // 2. Upload low-res blurry image -> verify non-blocking quality warnings appear
    await fileInput.setInputFiles([
      {
        name: blurryThumb.name,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(blurryThumb.base64, 'base64'),
      },
    ]);
    await expect(page.getByText(/Low resolution \(500×400px\)/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/appears soft or slightly blurry/i)).toBeVisible();

    // 3. Upload unsupported PDF file -> graceful inline error without losing gallery photos
    await fileInput.setInputFiles([
      {
        name: 'deed-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.7 fake document'),
      },
    ]);
    await expect(page.getByText(/Upload paused/i)).toBeVisible();
    await expect(
      page.getByText(/Upload JPEG, PNG, WebP, or iPhone HEIC\/HEIF photographs/i),
    ).toBeVisible();
    // Existing 2 valid photos remain intact
    await expect(page.getByText('Cover photo')).toBeVisible();
  });

  test('handles interrupted Nigerian mobile uploads with in-memory Retry, cover/reorder, orphan cleanup, draft resume, and duplicate-submit protection', async ({
    page,
  }) => {
    const harness = await installPartnerStorageHarness(page, {
      uploadLatencyMs: 350,
      failNextUploadsCount: 1, // First upload drops mid-connection!
    });
    await advanceWizardToPhotoStep(page);

    const [photoA, photoB] = await generateSyntheticCameraFilesInBrowser(page, [
      { name: 'living-room-a.jpg', width: 2800, height: 2100, seed: 11 },
      { name: 'bedroom-suite-b.jpg', width: 2800, height: 2100, seed: 22 },
    ]);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      {
        name: photoA.name,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(photoA.base64, 'base64'),
      },
      {
        name: photoB.name,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(photoB.base64, 'base64'),
      },
    ]);

    // Status copy is displayed during processing
    await expect(
      page.getByText('Optimising your photographs for the best viewing experience…'),
    ).toBeVisible();

    // One succeeds, one pauses with connection failure — never silently discarded!
    await expect(
      page.getByText(/1 photograph could not finish uploading/i),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Cover photo')).toBeVisible();

    // Tap Retry — succeeds from cached optimised WebP in memory without re-selecting file
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText('2/12 ready')).toBeVisible({ timeout: 15_000 });
    expect(harness.capturedUploads).toHaveLength(2);

    const firstUrlBeforeSwap = harness.capturedUploads[0].objectPath;
    const secondUrlBeforeSwap = harness.capturedUploads[1].objectPath;

    // Make #2 the Cover photo
    await page.getByRole('button', { name: 'Make cover' }).click();

    // Reload browser mid-submission to test resuming an incomplete property submission
    await page.reload();
    await expect(page.getByText(/Resumed your saved draft/i)).toBeVisible();
    await expect(page.getByText('Cover photo', { exact: true })).toBeVisible();

    // Verify cover swap persisted across reload (second uploaded photo is now first img)
    const firstImgSrcAfterReload = await page
      .locator('img[alt*="Cover photo"]')
      .getAttribute('src');
    expect(firstImgSrcAfterReload).toContain(secondUrlBeforeSwap);

    // Move photo #1 later using arrow button, then back
    await page.getByRole('button', { name: 'Move photo 1 later' }).click();
    const swappedSrc = await page.locator('img[alt*="Cover photo"]').getAttribute('src');
    expect(swappedSrc).toContain(firstUrlBeforeSwap);

    // Delete photo #2 (uncommitted session upload) -> verify orphan storage object is deleted!
    // Note: after reload sessionMeta is fresh, so extractPropertyMediaObjectPath cleans it up!
    await page.getByRole('button', { name: 'Remove photo 2' }).click();
    await expect.poll(() => harness.removedPaths.length).toBe(1);
    expect(harness.removedPaths[0]).toBe(secondUrlBeforeSwap);

    // Complete remaining steps (Step 3 -> 4 -> 5 -> 6 -> 7) and double-click submit
    await page.getByRole('button', { name: /Save & continue/i }).click(); // -> Step 4
    await page.getByRole('button', { name: /Save & continue/i }).click(); // -> Step 5
    await page.getByRole('button', { name: /Save & continue/i }).click(); // -> Step 6
    await page.getByRole('button', { name: /Save & continue/i }).click(); // -> Step 7

    await page
      .getByLabel(/Authority & verification summary/i)
      .fill('Direct property owner holding registered title deed.');

    const submitBtn = page.getByRole('button', { name: /Submit for HAMLET review/i });
    await submitBtn.dblclick();

    await expect(page.getByText(/Listing submitted for HAMLET review/i)).toBeVisible();
    // Duplicate submission prevented!
    expect(harness.apiSubmissions).toHaveLength(1);
    expect(harness.apiSubmissions[0].body.imageUrls).toHaveLength(1);
  });

  test('processes 10-photo and 20-photo simultaneous selections with bounded concurrency and pre-caps excess beyond 12', async ({
    page,
  }) => {
    const harness = await installPartnerStorageHarness(page, { uploadLatencyMs: 45 });
    await advanceWizardToPhotoStep(page);

    const twentyPhotos = await generateSyntheticCameraFilesInBrowser(
      page,
      Array.from({ length: 20 }, (_, i) => ({
        name: `camera-shot-${String(i + 1).padStart(2, '0')}.jpg`,
        width: 1800,
        height: 1350,
        seed: i + 1,
      })),
    );

    const fileInput = page.locator('input[type="file"]');

    // 1. Batch of 10 simultaneous photos
    await fileInput.setInputFiles(
      twentyPhotos.slice(0, 10).map(item => ({
        name: item.name,
        mimeType: item.mimeType,
        buffer: Buffer.from(item.base64, 'base64'),
      })),
    );

    await expect(page.getByText('10/12 ready')).toBeVisible({ timeout: 45_000 });
    expect(harness.capturedUploads).toHaveLength(10);

    const viewport = page.viewportSize();
    const expectedMaxConcurrency = viewport && viewport.width < 768 ? 2 : 3;
    expect(harness.getPeakConcurrentUploads()).toBeLessThanOrEqual(expectedMaxConcurrency);

    // Start fresh (clear draft) -> cleans up all 10 uncommitted storage objects!
    await page.getByRole('button', { name: /Start fresh/i }).click();
    await expect.poll(() => harness.removedPaths.length).toBe(10);

    // Navigate back to Step 3 and select all 20 photos at once
    await page.getByLabel('Listing title').fill('Spacious 4-Bedroom Terrace in Lekki Phase 1');
    await page
      .getByLabel(/Public street, estate or landmark summary/i)
      .fill('Off Admiralty Way, Lekki Phase 1, Lagos');
    await page.getByRole('button', { name: /Save & continue/i }).click();
    await page.getByRole('button', { name: /Save & continue/i }).click();

    await fileInput.setInputFiles(
      twentyPhotos.map(item => ({
        name: item.name,
        mimeType: item.mimeType,
        buffer: Buffer.from(item.base64, 'base64'),
      })),
    );

    // Excess 8 photos are skipped upfront so mobile memory & data are never wasted
    await expect(
      page.getByText(/Selected 20 photos — optimising the first 12/i),
    ).toBeVisible();
    await expect(page.getByText('12/12 ready')).toBeVisible({ timeout: 50_000 });
    expect(harness.capturedUploads).toHaveLength(22); // 10 from first batch + 12 from 20-photo batch
  });

  test('edits an existing property gallery and defers deleting replaced storage files until PATCH succeeds', async ({
    page,
  }) => {
    const oldPath1 = `${PARTNER_USER_ID}/old-living-room.webp`;
    const oldPath2 = `${PARTNER_USER_ID}/old-kitchen.webp`;
    const baseOrigin = 'http://127.0.0.1:3000';

    const harness = await installPartnerStorageHarness(page, {
      existingProperty: {
        id: 'prop-edit-101',
        title: 'Modern 2-Bedroom Flat in Yaba',
        area: 'Yaba',
        public_address: 'Off Herbert Macaulay Way, Alagomeji, Yaba',
        image_urls: [
          `${baseOrigin}/storage/v1/object/public/property-media/${oldPath1}`,
          `${baseOrigin}/storage/v1/object/public/property-media/${oldPath2}`,
        ],
        status: 'needs_correction',
        review_note: 'Please replace the dark living room cover photo with a brighter daytime shot.',
      },
    });

    await page.goto('/partners/properties/prop-edit-101/edit');
    await expect(
      page.getByText(/Please replace the dark living room cover photo/i),
    ).toBeVisible();

    // Advance Step 1 -> Step 2 -> Step 3 (Photos)
    await page.getByRole('button', { name: /Save & continue/i }).click();
    await page.getByRole('button', { name: /Save & continue/i }).click();

    // Remove pre-existing photo #1: MUST NOT delete from Storage yet in case user cancels!
    await page.getByRole('button', { name: 'Remove photo 1' }).click();
    expect(harness.removedPaths).toHaveLength(0);

    // Upload bright replacement HEIC-named camera photo (with JPEG fallback bytes -> WebP)
    const [brightShot] = await generateSyntheticCameraFilesInBrowser(page, [
      { name: 'bright-daytime-living.jpg', width: 2600, height: 1950, seed: 99 },
    ]);
    await page.locator('input[type="file"]').setInputFiles([
      {
        name: brightShot.name,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(brightShot.base64, 'base64'),
      },
    ]);

    await expect(page.getByText('2/12 ready')).toBeVisible({ timeout: 20_000 });
    // Promote new photo to Cover photo
    await page.getByRole('button', { name: 'Make cover' }).click();

    // Advance Step 3 -> 4 -> 5 -> 6 -> 7 and resubmit
    await page.getByRole('button', { name: /Save & continue/i }).click();
    await page.getByRole('button', { name: /Save & continue/i }).click();
    await page.getByRole('button', { name: /Save & continue/i }).click();
    await page.getByRole('button', { name: /Save & continue/i }).click();

    await page.getByRole('button', { name: /Save & resubmit for review/i }).click();
    await expect(page.getByText(/Listing submitted for HAMLET review/i)).toBeVisible();

    expect(harness.apiSubmissions).toHaveLength(1);
    expect(harness.apiSubmissions[0].method).toBe('PATCH');
    const submittedUrls = harness.apiSubmissions[0].body.imageUrls as string[];
    expect(submittedUrls).toHaveLength(2);
    expect(submittedUrls[0]).toContain('bright-daytime-living.webp');
    expect(submittedUrls[1]).toContain(oldPath2);

    // Replaced pre-existing photo IS cleaned up from Storage AFTER PATCH succeeded, while oldPath2 is preserved!
    await expect.poll(() => harness.removedPaths).toEqual([oldPath1]);
  });
});
