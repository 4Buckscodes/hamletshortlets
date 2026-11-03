'use client';

interface GoogleContinueButtonProps {
  mode: 'signin' | 'signup';
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function GoogleContinueButton({
  mode,
  busy = false,
  disabled = false,
  onClick,
}: GoogleContinueButtonProps) {
  const label = busy
    ? 'Connecting to Google…'
    : mode === 'signup'
      ? 'Sign up with Google'
      : 'Continue with Google';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-ink-200 bg-white px-5 text-sm font-bold text-ink-900 shadow-xs transition hover:border-ink-900 hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.07C3.26 21.3 7.31 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.07z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.07c.95-2.85 3.6-4.94 6.73-4.94z"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
