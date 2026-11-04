'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DEFAULT_PROPERTY_MEDIA_POLICY } from '@/lib/pricing';
import { FIELD_INPUT_CLASS } from '@/components/forms/ProgressiveFormPrimitives';
import {
  ACCEPTED_PROPERTY_IMAGE_ACCEPT_ATTR,
  buildFileFingerprint,
  deletePropertyMediaObjects,
  extractPropertyMediaObjectPath,
  formatBytes,
  getRecommendedImageConcurrency,
  OPTIMISING_USER_MESSAGE,
  optimisePropertyImage,
  uploadOptimisedPropertyImage,
  type ImageQualityWarning,
} from '@/lib/imageOptimiser';

export type LocalJobStatus = 'queued' | 'optimising' | 'uploading' | 'error';

export interface LocalPhotoJob {
  id: string;
  fingerprint: string;
  fileName: string;
  previewUrl: string;
  originalFile: File;
  optimisedFile: File | null;
  originalBytes: number;
  optimisedBytes: number | null;
  width: number | null;
  height: number | null;
  wasHeic: boolean;
  warnings: ImageQualityWarning[];
  status: LocalJobStatus;
  progressPct: number;
  errorMessage: string | null;
}

export interface CompletedPhotoMeta {
  fingerprint: string;
  originalBytes: number;
  optimisedBytes: number;
  width: number;
  height: number;
  mimeType: string;
  wasHeic: boolean;
  warnings: ImageQualityWarning[];
  sessionObjectPath: string | null;
}

export interface MediaUploadActivityState {
  hasActiveUploads: boolean;
  activeCount: number;
  failedCount: number;
  sessionUploadedPaths: string[];
}

export interface PropertyMediaManagerProps {
  db: SupabaseClient | null;
  imageUrls: string[];
  initialPersistedUrls?: readonly string[];
  maxImages?: number;
  onChangeImageUrls: (updater: string[] | ((prev: string[]) => string[])) => void;
  onActivityChange?: (activity: MediaUploadActivityState) => void;
}

function makeJobId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function PropertyMediaManager({
  db,
  imageUrls,
  initialPersistedUrls = [],
  maxImages = DEFAULT_PROPERTY_MEDIA_POLICY.maxImagesPerListing,
  onChangeImageUrls,
  onActivityChange,
}: PropertyMediaManagerProps) {
  const [jobs, setJobs] = useState<LocalPhotoJob[]>([]);
  const [completedMeta, setCompletedMeta] = useState<Record<string, CompletedPhotoMeta>>({});
  const [urlInput, setUrlInput] = useState('');
  const [bannerNotice, setBannerNotice] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Refs for bounded-concurrency worker queue & safe cleanup
  const jobsRef = useRef<LocalPhotoJob[]>([]);
  const completedMetaRef = useRef<Record<string, CompletedPhotoMeta>>({});
  const imageUrlsRef = useRef<string[]>(imageUrls);
  const activeWorkersRef = useRef(0);
  const claimedJobIdsRef = useRef<Set<string>>(new Set());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  useEffect(() => {
    completedMetaRef.current = completedMeta;
  }, [completedMeta]);

  // Notify parent wizard whenever active/failed counts or session storage paths change
  useEffect(() => {
    if (!onActivityChange) return;
    const activeCount = jobs.filter(
      j => j.status === 'queued' || j.status === 'optimising' || j.status === 'uploading',
    ).length;
    const failedCount = jobs.filter(j => j.status === 'error').length;
    const sessionUploadedPaths = Object.entries(completedMeta)
      .filter(([url, meta]) => Boolean(meta.sessionObjectPath) && imageUrls.includes(url))
      .map(([, meta]) => meta.sessionObjectPath as string);

    onActivityChange({
      hasActiveUploads: activeCount > 0,
      activeCount,
      failedCount,
      sessionUploadedPaths,
    });
  }, [completedMeta, imageUrls, jobs, onActivityChange]);

  // Revoke object URLs and abort in-flight work on unmount
  useEffect(() => {
    mountedRef.current = true;
    const controllers = abortControllersRef.current;
    const previews = previewUrlsRef.current;
    return () => {
      mountedRef.current = false;
      controllers.forEach(ctrl => ctrl.abort());
      controllers.clear();
      previews.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore revoke errors
        }
      });
      previews.clear();
    };
  }, []);

  // Close lightbox on Escape
  useEffect(() => {
    if (previewLightboxIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewLightboxIndex(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewLightboxIndex]);

  const updateJobs = useCallback(
    (updater: (prev: LocalPhotoJob[]) => LocalPhotoJob[]) => {
      setJobs(prev => {
        const next = updater(prev);
        jobsRef.current = next;
        return next;
      });
    },
    [],
  );

  const runSingleJob = useCallback(
    async (jobId: string) => {
      const currentJob = jobsRef.current.find(j => j.id === jobId);
      if (!currentJob || currentJob.status !== 'queued') return;

      if (!db) {
        updateJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'error',
                  errorMessage: 'Storage upload is not configured on this deployment.',
                }
              : j,
          ),
        );
        return;
      }

      const controller = new AbortController();
      abortControllersRef.current.set(jobId, controller);

      try {
        const { data: sessionData } = await db.auth.getSession();
        const userId = sessionData.session?.user?.id;
        const accessToken = sessionData.session?.access_token;
        if (!userId) {
          throw new Error(
            'Sign in with your approved partner account before uploading photographs.',
          );
        }

        let readyFile = currentJob.optimisedFile;
        let optimisedBytes = currentJob.optimisedBytes ?? 0;
        let finalWidth = currentJob.width ?? 0;
        let finalHeight = currentJob.height ?? 0;
        let wasHeic = currentJob.wasHeic;
        let warnings = currentJob.warnings;

        // Phase 1: Client-side optimisation (skipped on retry if optimisation already succeeded!)
        if (!readyFile) {
          updateJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? { ...j, status: 'optimising', progressPct: 8, errorMessage: null }
                : j,
            ),
          );

          const result = await optimisePropertyImage(currentJob.originalFile, {
            signal: controller.signal,
            onProgress: pct => {
              if (!mountedRef.current) return;
              updateJobs(prev =>
                prev.map(j =>
                  j.id === jobId && j.status === 'optimising'
                    ? { ...j, progressPct: Math.min(50, Math.max(8, Math.round(pct * 0.5))) }
                    : j,
                ),
              );
            },
          });

          readyFile = result.file;
          optimisedBytes = result.optimisedBytes;
          finalWidth = result.width;
          finalHeight = result.height;
          wasHeic = result.wasHeic;
          warnings = result.warnings;

          if (!mountedRef.current) return;
          updateJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? {
                    ...j,
                    optimisedFile: readyFile,
                    optimisedBytes,
                    width: finalWidth,
                    height: finalHeight,
                    wasHeic,
                    warnings,
                    status: 'uploading',
                    progressPct: 52,
                  }
                : j,
            ),
          );
        } else {
          updateJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? { ...j, status: 'uploading', progressPct: 52, errorMessage: null }
                : j,
            ),
          );
        }

        // Guard against race if user filled remaining slots via URL while uploading
        if (imageUrlsRef.current.length >= maxImages) {
          throw new Error(
            `Maximum of ${maxImages} photographs reached. Remove a photo first to upload this one.`,
          );
        }

        // Phase 2: Direct upload to Supabase Storage (`property-media`) with progress
        const uploaded = await uploadOptimisedPropertyImage({
          db,
          userId,
          accessToken,
          file: readyFile,
          bucket: 'property-media',
          signal: controller.signal,
          onProgress: uploadPct => {
            if (!mountedRef.current) return;
            const combined = 50 + Math.round(Math.min(100, Math.max(0, uploadPct)) * 0.5);
            updateJobs(prev =>
              prev.map(j =>
                j.id === jobId && j.status === 'uploading'
                  ? { ...j, progressPct: combined }
                  : j,
              ),
            );
          },
        });

        if (!mountedRef.current) return;

        // If listing filled up concurrently, immediately delete orphan object
        if (imageUrlsRef.current.length >= maxImages) {
          void deletePropertyMediaObjects(db, [uploaded.objectPath]);
          throw new Error(`Maximum of ${maxImages} photographs reached.`);
        }

        // Record metadata, append publicUrl to wizard state, and release local job memory
        setCompletedMeta(prev => {
          const next = {
            ...prev,
            [uploaded.publicUrl]: {
              fingerprint: currentJob.fingerprint,
              originalBytes: currentJob.originalBytes,
              optimisedBytes,
              width: finalWidth,
              height: finalHeight,
              mimeType: readyFile?.type || 'image/webp',
              wasHeic,
              warnings,
              sessionObjectPath: uploaded.objectPath,
            },
          };
          completedMetaRef.current = next;
          return next;
        });

        onChangeImageUrls(prev =>
          prev.includes(uploaded.publicUrl)
            ? prev
            : [...prev, uploaded.publicUrl].slice(0, maxImages),
        );

        // Revoke local blob preview URL now that public HTTPS URL is live
        if (currentJob.previewUrl) {
          previewUrlsRef.current.delete(currentJob.previewUrl);
          try {
            URL.revokeObjectURL(currentJob.previewUrl);
          } catch {
            // Ignore revoke error
          }
        }

        updateJobs(prev => prev.filter(j => j.id !== jobId));
      } catch (caught) {
        if (!mountedRef.current) return;
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return;
        }
        const errMessage =
          caught instanceof Error
            ? caught.message
            : 'Could not optimise or upload this photograph. Tap Retry to try again.';

        updateJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'error',
                  errorMessage: errMessage,
                }
              : j,
          ),
        );
      } finally {
        abortControllersRef.current.delete(jobId);
      }
    },
    [db, maxImages, onChangeImageUrls, updateJobs],
  );

  const pumpQueue = useCallback(() => {
    const concurrencyLimit = getRecommendedImageConcurrency();
    while (activeWorkersRef.current < concurrencyLimit) {
      const nextQueued = jobsRef.current.find(
        j => j.status === 'queued' && !claimedJobIdsRef.current.has(j.id),
      );
      if (!nextQueued) break;

      const targetId = nextQueued.id;
      claimedJobIdsRef.current.add(targetId);
      activeWorkersRef.current += 1;

      void (async () => {
        try {
          await runSingleJob(targetId);
        } finally {
          claimedJobIdsRef.current.delete(targetId);
          activeWorkersRef.current = Math.max(0, activeWorkersRef.current - 1);
          if (mountedRef.current) {
            pumpQueue();
          }
        }
      })();
    }
  }, [runSingleJob]);

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    setLocalError('');
    setBannerNotice('');

    const inFlightOrFailedCount = jobsRef.current.length;
    const availableSlots = Math.max(
      0,
      maxImages - imageUrlsRef.current.length - inFlightOrFailedCount,
    );

    if (availableSlots <= 0) {
      setLocalError(
        `You already have ${maxImages} photographs attached or queued. Remove a photo first to add another.`,
      );
      return;
    }

    const activeFingerprints = new Set<string>();
    for (const j of jobsRef.current) {
      activeFingerprints.add(j.fingerprint);
    }
    for (const url of imageUrlsRef.current) {
      const meta = completedMetaRef.current[url];
      if (meta?.fingerprint) activeFingerprints.add(meta.fingerprint);
    }

    const deduplicated: File[] = [];
    let skippedDuplicates = 0;
    for (const file of selectedFiles) {
      const fp = buildFileFingerprint(file);
      if (activeFingerprints.has(fp)) {
        skippedDuplicates += 1;
        continue;
      }
      activeFingerprints.add(fp);
      deduplicated.push(file);
    }

    const acceptedBatch = deduplicated.slice(0, availableSlots);
    const skippedOverflow = Math.max(0, deduplicated.length - acceptedBatch.length);

    if (acceptedBatch.length === 0) {
      if (skippedDuplicates > 0) {
        setBannerNotice(
          skippedDuplicates === 1
            ? 'Skipped 1 duplicate photograph that is already attached.'
            : `Skipped ${skippedDuplicates} duplicate photographs that are already attached.`,
        );
      }
      return;
    }

    const notices: string[] = [];
    if (skippedOverflow > 0) {
      notices.push(
        `Selected ${selectedFiles.length} photos — optimising the first ${acceptedBatch.length} to match the ${maxImages}-photo listing limit (${skippedOverflow} extra skipped so no mobile data is wasted).`,
      );
    }
    if (skippedDuplicates > 0) {
      notices.push(
        `Skipped ${skippedDuplicates} duplicate photo${skippedDuplicates === 1 ? '' : 's'}.`,
      );
    }
    if (notices.length > 0) {
      setBannerNotice(notices.join(' '));
    }

    const createdJobs: LocalPhotoJob[] = acceptedBatch.map(file => {
      const fp = buildFileFingerprint(file);
      let previewUrl = '';
      try {
        previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
      } catch {
        previewUrl = '';
      }
      return {
        id: makeJobId(),
        fingerprint: fp,
        fileName: file.name,
        previewUrl,
        originalFile: file,
        optimisedFile: null,
        originalBytes: file.size,
        optimisedBytes: null,
        width: null,
        height: null,
        wasHeic: /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type),
        warnings: [],
        status: 'queued',
        progressPct: 0,
        errorMessage: null,
      };
    });

    updateJobs(prev => [...prev, ...createdJobs]);
    window.setTimeout(() => pumpQueue(), 0);
  }

  function retryJob(jobId: string) {
    setLocalError('');
    updateJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, status: 'queued', progressPct: j.optimisedFile ? 50 : 0, errorMessage: null }
          : j,
      ),
    );
    window.setTimeout(() => pumpQueue(), 0);
  }

  function retryAllFailed() {
    setLocalError('');
    updateJobs(prev =>
      prev.map(j =>
        j.status === 'error'
          ? { ...j, status: 'queued', progressPct: j.optimisedFile ? 50 : 0, errorMessage: null }
          : j,
      ),
    );
    window.setTimeout(() => pumpQueue(), 0);
  }

  function removeJob(jobId: string) {
    const ctrl = abortControllersRef.current.get(jobId);
    if (ctrl) {
      ctrl.abort();
      abortControllersRef.current.delete(jobId);
    }
    const target = jobsRef.current.find(j => j.id === jobId);
    if (target?.previewUrl) {
      previewUrlsRef.current.delete(target.previewUrl);
      try {
        URL.revokeObjectURL(target.previewUrl);
      } catch {
        // Ignore revoke error
      }
    }
    updateJobs(prev => prev.filter(j => j.id !== jobId));
  }

  function addPhotoUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setLocalError('');

    if (imageUrls.length + jobs.length >= maxImages) {
      setLocalError(`Maximum of ${maxImages} photographs per listing reached.`);
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:') {
        setLocalError('Photo links must start with https://');
        return;
      }
      if (imageUrls.includes(trimmed)) {
        setLocalError('This photo URL is already in your gallery.');
        return;
      }
      onChangeImageUrls(prev => [...prev, trimmed].slice(0, maxImages));
      setUrlInput('');
    } catch {
      setLocalError('Enter a valid HTTPS photo URL.');
    }
  }

  function makeCoverPhoto(idx: number) {
    if (idx <= 0 || idx >= imageUrls.length) return;
    onChangeImageUrls(prev => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      if (picked) next.unshift(picked);
      return next;
    });
  }

  function movePhoto(idx: number, direction: -1 | 1) {
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || idx >= imageUrls.length || targetIdx >= imageUrls.length) {
      return;
    }
    onChangeImageUrls(prev => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      if (moved) next.splice(targetIdx, 0, moved);
      return next;
    });
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, idx: number) {
    setDraggedIndex(idx);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(idx));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, dropIdx: number) {
    event.preventDefault();
    const fromIdx =
      draggedIndex !== null ? draggedIndex : Number(event.dataTransfer.getData('text/plain'));
    setDraggedIndex(null);
    if (!Number.isInteger(fromIdx) || fromIdx < 0 || fromIdx === dropIdx) return;
    onChangeImageUrls(prev => {
      if (fromIdx >= prev.length || dropIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      if (moved) next.splice(dropIdx, 0, moved);
      return next;
    });
  }

  function removeUploadedPhoto(idx: number) {
    const removedUrl = imageUrls[idx];
    if (!removedUrl) return;

    onChangeImageUrls(prev => prev.filter((_, i) => i !== idx));
    if (previewLightboxIndex !== null) {
      setPreviewLightboxIndex(null);
    }

    const meta = completedMeta[removedUrl];

    // Prevent orphaned storage files: if uploaded during THIS session and not part of an
    // existing persisted database record, delete from Supabase Storage immediately.
    const wasPersistedBeforeSession = initialPersistedUrls.includes(removedUrl);
    if (!wasPersistedBeforeSession) {
      const objectPath =
        meta?.sessionObjectPath || extractPropertyMediaObjectPath(removedUrl) || null;
      if (objectPath) {
        void deletePropertyMediaObjects(db, [objectPath]);
      }
    }
  }

  const activeJobs = jobs.filter(j => j.status !== 'error');
  const failedJobs = jobs.filter(j => j.status === 'error');
  const isProcessing = activeJobs.length > 0;
  const remainingSlots = Math.max(0, maxImages - imageUrls.length - jobs.length);

  // Aggregate session savings badge
  const sessionStats = Object.entries(completedMeta).reduce(
    (acc, [url, meta]) => {
      if (imageUrls.includes(url) && meta.originalBytes > 0 && meta.optimisedBytes > 0) {
        acc.count += 1;
        acc.originalTotal += meta.originalBytes;
        acc.optimisedTotal += meta.optimisedBytes;
      }
      return acc;
    },
    { count: 0, originalTotal: 0, optimisedTotal: 0 },
  );

  const avgActiveProgress =
    activeJobs.length > 0
      ? Math.round(
          activeJobs.reduce((sum, j) => sum + j.progressPct, 0) / activeJobs.length,
        )
      : 0;

  return (
    <div className="space-y-4">
      {/* Primary Device Camera / Gallery Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-paper p-5 text-center transition-colors hover:border-brass-500">
        <Upload className="mx-auto h-6 w-6 text-brass-600" />
        <p className="m-0 mt-2 text-sm font-bold text-ink-900">
          Upload property photographs straight from your phone or computer
        </p>
        <p className="mx-auto m-0 mt-1 max-w-xl text-xs leading-relaxed text-ink-600">
          Up to {maxImages} photos (HEIC, JPEG, PNG, WebP) — optimised automatically on device.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <label
            className={`primary-button inline-flex min-h-[48px] ${
              remainingSlots === 0 ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
            }`}
          >
            <Upload className="h-4 w-4 shrink-0 text-brass-400" />
            <span>
              {remainingSlots === 0
                ? `${maxImages}/${maxImages} photos attached`
                : imageUrls.length > 0 || jobs.length > 0
                  ? `Add more photos (${remainingSlots} left)`
                  : 'Select photos from device'}
            </span>
            <input
              type="file"
              accept={ACCEPTED_PROPERTY_IMAGE_ACCEPT_ATTR}
              multiple
              disabled={remainingSlots === 0}
              onChange={handleFileSelection}
              className="sr-only"
            />
          </label>
        </div>

        <p className="m-0 mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <span>
            First photo is your listing cover · Drag or tap arrows to reorder anytime
          </span>
        </p>
      </div>

      {/* Live Optimisation & Upload Progress Banner */}
      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-brass-400/60 bg-[#FBF8F1] p-4 text-ink-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brass-700" />
              <span className="text-xs font-bold sm:text-sm">
                {OPTIMISING_USER_MESSAGE}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-brass-700">
              {activeJobs.length} remaining · {avgActiveProgress}%
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-ink-900 transition-all duration-200"
              style={{ width: `${Math.max(6, avgActiveProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Session Compression Savings Summary */}
      {!isProcessing && sessionStats.count > 0 && sessionStats.originalTotal > sessionStats.optimisedTotal && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-950"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>
              Optimised {sessionStats.count} photo{sessionStats.count === 1 ? '' : 's'} to WebP ({formatBytes(sessionStats.originalTotal)} → {formatBytes(sessionStats.optimisedTotal)},{' '}
              {Math.max(
                1,
                Math.round(
                  ((sessionStats.originalTotal - sessionStats.optimisedTotal) /
                    sessionStats.originalTotal) *
                    100,
                ),
              )}
              % mobile data saved · EXIF GPS stripped).
            </span>
          </span>
          <span className="font-bold text-emerald-800">
            {imageUrls.length}/{maxImages} ready
          </span>
        </div>
      )}

      {/* Overflow / Duplicate Notice */}
      {bannerNotice && (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950"
        >
          {bannerNotice}
        </div>
      )}

      {/* Failed Uploads Action Bar */}
      {failedJobs.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <div>
              <p className="m-0 font-bold">
                {failedJobs.length} photograph{failedJobs.length === 1 ? '' : 's'} could not finish uploading
              </p>
              <p className="m-0 mt-0.5 text-[11px] text-red-800">
                Tap Retry to upload again.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={retryAllFailed}
            className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-red-800 px-4 text-xs font-bold text-white transition-colors hover:bg-red-900"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>Retry failed ({failedJobs.length})</span>
          </button>
        </div>
      )}

      {localError && (
        <p
          role="alert"
          className="m-0 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800"
        >
          {localError}
        </p>
      )}

      {/* Optional HTTPS URL Fallback */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Or paste an existing https:// photo URL…"
          className={`${FIELD_INPUT_CLASS} flex-1`}
        />
        <button
          type="button"
          onClick={addPhotoUrl}
          className="secondary-button min-h-[48px] shrink-0"
        >
          Add URL
        </button>
      </div>

      {/* Unified Photo Grid: Persisted Ready Photos + Active/Failed Upload Jobs */}
      {(imageUrls.length > 0 || jobs.length > 0) && (
        <div className="grid grid-cols-1 gap-3.5 min-[440px]:grid-cols-2 sm:grid-cols-3">
          {/* 1. Ready / Uploaded Gallery Photos (Draggable & Reorderable) */}
          {imageUrls.map((url, idx) => {
            const meta = completedMeta[url];
            const isCover = idx === 0;
            return (
              <div
                key={url}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, idx)}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow ${
                  isCover
                    ? 'border-ink-900 ring-1 ring-ink-900/15'
                    : 'border-ink-200 hover:shadow-sm'
                }`}
              >
                <div className="group relative aspect-[4/3] bg-ink-100">
                  <img
                    src={url}
                    alt={`Property photograph ${idx + 1}${isCover ? ' (Cover photo)' : ''}`}
                    className="h-full w-full cursor-pointer object-cover"
                    onClick={() => setPreviewLightboxIndex(idx)}
                  />
                  <div className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between gap-1.5">
                    {isCover ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/90 px-2.5 py-1 text-[10px] font-bold text-white">
                        <Star className="h-3 w-3 shrink-0 fill-brass-400 text-brass-400" />
                        Cover photo
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink-950/70 px-2 py-0.5 text-[10px] font-bold text-white">
                        #{idx + 1}
                      </span>
                    )}

                    {meta && meta.optimisedBytes > 0 && (
                      <span className="rounded-full bg-emerald-950/85 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                        {formatBytes(meta.optimisedBytes)} WebP
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewLightboxIndex(idx)}
                    aria-label={`Preview photo ${idx + 1} full size`}
                    className="absolute right-2 bottom-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ink-950/75 text-white transition-colors hover:bg-ink-950"
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>

                {/* Quality Safeguard Warnings (Low-Res / Blurry) */}
                {meta && meta.warnings.length > 0 && (
                  <div className="space-y-1 border-b border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-950">
                    {meta.warnings.map(w => (
                      <p key={w.code} className="m-0 flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                        <span>{w.message}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Cover, Reorder & Delete Toolbar */}
                <div className="mt-auto flex items-center justify-between gap-1 p-2">
                  <div className="flex items-center gap-1">
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={() => makeCoverPhoto(idx)}
                        className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-ink-800 hover:bg-paper"
                      >
                        <Star className="h-3 w-3 shrink-0 text-brass-600" />
                        <span>Make cover</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePhoto(idx, -1)}
                      aria-label={`Move photo ${idx + 1} earlier`}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-700 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === imageUrls.length - 1}
                      onClick={() => movePhoto(idx, 1)}
                      aria-label={`Move photo ${idx + 1} later`}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-700 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeUploadedPhoto(idx)}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 2. In-Flight & Failed Upload Cards */}
          {jobs.map(job => {
            const isFailed = job.status === 'error';
            return (
              <div
                key={job.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white ${
                  isFailed ? 'border-red-300 bg-red-50/20' : 'border-ink-200'
                }`}
              >
                <div className="relative aspect-[4/3] bg-ink-100">
                  {job.previewUrl ? (
                    <img
                      src={job.previewUrl}
                      alt={job.fileName}
                      className={`h-full w-full object-cover ${
                        isFailed ? 'opacity-55' : 'opacity-80'
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-ink-500">
                      {job.wasHeic ? 'HEIC photo' : 'Photograph'}
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/45 p-3 text-center text-white">
                    {!isFailed ? (
                      <>
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brass-300" />
                        <span className="mt-1.5 text-xs font-bold">
                          {job.status === 'queued'
                            ? 'Queued…'
                            : job.status === 'optimising'
                              ? 'Optimising WebP…'
                              : `Uploading ${job.progressPct}%…`}
                        </span>
                        <div className="mt-2 h-1.5 w-4/5 overflow-hidden rounded-full bg-white/25">
                          <div
                            className="h-full rounded-full bg-brass-400 transition-all duration-200"
                            style={{ width: `${Math.max(5, job.progressPct)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />
                        <span className="mt-1 text-xs font-bold">Upload paused</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-2 p-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-semibold text-ink-900" title={job.fileName}>
                      {job.fileName}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] text-ink-500">
                      Original: {formatBytes(job.originalBytes)}
                      {job.optimisedBytes ? ` → ${formatBytes(job.optimisedBytes)} WebP` : ''}
                    </p>
                    {isFailed && job.errorMessage && (
                      <p className="m-0 mt-1.5 text-[11px] font-medium leading-snug text-red-800">
                        {job.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    {isFailed ? (
                      <button
                        type="button"
                        onClick={() => retryJob(job.id)}
                        className="inline-flex min-h-[34px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-ink-900 px-2.5 text-[11px] font-bold text-white hover:bg-ink-800"
                      >
                        <RefreshCw className="h-3 w-3 shrink-0" />
                        <span>Retry</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-ink-500">
                        {job.status === 'queued' ? 'Waiting for slot' : 'In progress'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeJob(job.id)}
                      aria-label={`Cancel or remove ${job.fileName}`}
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Clarity Lightbox Preview Modal (Never stretches or distorts) */}
      {previewLightboxIndex !== null && imageUrls[previewLightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photograph ${previewLightboxIndex + 1} preview`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4"
          onClick={() => setPreviewLightboxIndex(null)}
        >
          <div
            className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3">
              <div className="min-w-0">
                <p className="m-0 text-xs font-extrabold uppercase tracking-wider text-brass-700">
                  {previewLightboxIndex === 0
                    ? `Cover photo · 1 of ${imageUrls.length}`
                    : `Photograph ${previewLightboxIndex + 1} of ${imageUrls.length}`}
                </p>
                {completedMeta[imageUrls[previewLightboxIndex]] && (
                  <p className="m-0 mt-0.5 text-xs text-ink-500">
                    {completedMeta[imageUrls[previewLightboxIndex]].width}×
                    {completedMeta[imageUrls[previewLightboxIndex]].height}px ·{' '}
                    {formatBytes(
                      completedMeta[imageUrls[previewLightboxIndex]].optimisedBytes,
                    )}{' '}
                    (from{' '}
                    {formatBytes(
                      completedMeta[imageUrls[previewLightboxIndex]].originalBytes,
                    )}
                    )
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewLightboxIndex(null)}
                aria-label="Close photo preview"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-900 hover:border-ink-900"
              >
                <X className="h-4 w-4 shrink-0" />
              </button>
            </div>

            <div className="flex max-h-[68dvh] items-center justify-center overflow-hidden rounded-2xl bg-ink-950">
              <img
                src={imageUrls[previewLightboxIndex]}
                alt={`Property photograph ${previewLightboxIndex + 1}`}
                className="max-h-[68dvh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={previewLightboxIndex === 0}
                  onClick={() =>
                    setPreviewLightboxIndex(i => (i !== null && i > 0 ? i - 1 : i))
                  }
                  className="secondary-button min-h-[40px] px-3 text-xs disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={previewLightboxIndex === imageUrls.length - 1}
                  onClick={() =>
                    setPreviewLightboxIndex(i =>
                      i !== null && i < imageUrls.length - 1 ? i + 1 : i,
                    )
                  }
                  className="secondary-button min-h-[40px] px-3 text-xs disabled:opacity-40"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {previewLightboxIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      makeCoverPhoto(previewLightboxIndex);
                      setPreviewLightboxIndex(0);
                    }}
                    className="primary-button min-h-[40px] px-4 text-xs"
                  >
                    <Star className="h-3.5 w-3.5 shrink-0 text-brass-400" />
                    Set as cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeUploadedPhoto(previewLightboxIndex)}
                  className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-800 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  Delete photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
