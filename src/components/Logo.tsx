export function HamletMark({
  size = 34,
  light = false,
  contained = false,
}: {
  size?: number;
  light?: boolean;
  contained?: boolean;
}) {
  const stemFill = contained || light ? '#F4F3EF' : '#0E1F3B';
  const barFill = contained || light ? '#D4B268' : '#B8923A';

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="shrink-0">
      {contained && <rect x="2" y="2" width="60" height="60" rx="14" fill="#0E1F3B" />}
      <g transform={contained ? 'translate(5.12 5.12) scale(0.84)' : undefined}>
        <path d="M6.5 7H26.5V9.2C22.4 9.3 21 11.5 21 16.6V47.4C21 52.5 22.4 54.7 26.5 54.8V57H6.5V54.8C10.6 54.7 12 52.5 12 47.4V16.6C12 11.5 10.6 9.3 6.5 9.2V7Z" fill={stemFill} />
        <path d="M37.5 7H57.5V9.2C53.4 9.3 52 11.5 52 16.6V47.4C52 52.5 53.4 54.7 57.5 54.8V57H37.5V54.8C41.6 54.7 43 52.5 43 47.4V16.6C43 11.5 41.6 9.3 37.5 9.2V7Z" fill={stemFill} />
        <path d="M12 21.4C13.2 26.2 16.5 28.8 21 28.8H43C47.5 28.8 50.8 26.2 52 21.4V42.2C50.8 37.4 47.5 34.8 43 34.8H21C16.5 34.8 13.2 37.4 12 42.2V21.4Z" fill={barFill} />
      </g>
    </svg>
  );
}

export function HamletWordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <HamletMark size={30} light={light} />
      <span className={`font-display text-[20px] sm:text-[22px] ${light ? 'text-white' : 'text-ink-900'}`}>HAMLET</span>
    </span>
  );
}
