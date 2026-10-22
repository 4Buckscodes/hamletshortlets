export function HamletMark({ size = 34, light = false }: { size?: number; light?: boolean }) {
  const fg = light ? '#F2F5F1' : '#101D16';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Stylised gabled shortlet residence under the Lagos sun */}
      <rect x="3" y="3" width="42" height="42" rx="12" fill={light ? '#C9A227' : '#101D16'} />
      <circle cx="24" cy="13.5" r="3.1" fill={light ? '#101D16' : '#C9A227'} />
      <path d="M10 28.5 24 15l14 13.5" stroke="#FAF8F3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 27v9.5h19V27" stroke="#FAF8F3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 36.5v-5.2a2.5 2.5 0 0 1 5 0v5.2" stroke="#C9A227" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HamletWordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <HamletMark size={30} light={light} />
      <span className={`font-display text-[22px] font-black tracking-tight ${light ? 'text-ink-50' : 'text-ink-900'}`}>
        HAMLET<span className="text-brass-500">.</span>
      </span>
    </span>
  );
}
