export function Flame({ size = 16, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ filter: dim ? "grayscale(1) opacity(.5)" : undefined }}>
      <defs>
        <linearGradient id="fl-o" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb23e" />
          <stop offset="1" stopColor="#ff5a1f" />
        </linearGradient>
        <linearGradient id="fl-i" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="1" stopColor="#ffb23e" />
        </linearGradient>
      </defs>
      <path d="M12 1.8c.6 3.4 3.1 5.2 4.8 7.6 1.5 2.1 2.2 4 2.2 6 0 4-3.1 6.8-7 6.8s-7-2.8-7-6.8c0-2.4 1.2-4.5 2.7-5.9.3 1.6 1 2.6 2 3.2-.3-3.9 1-7.7 2.3-10.9z" fill="url(#fl-o)" />
      <path d="M12 12.2c1.6 1.6 3.1 3 3.1 5 0 1.9-1.4 3.2-3.1 3.2s-3.1-1.3-3.1-3.2c0-1.4.7-2.4 1.6-3.1.1.8.4 1.3.9 1.6-.1-1.3.1-2.4.6-3.5z" fill="url(#fl-i)" />
    </svg>
  );
}

export function IceCube({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5 21 7.3v9.4L12 21.5 3 16.7V7.3z" fill="#5fb4ff" />
      <path d="M12 2.5 21 7.3 12 12 3 7.3z" fill="#bfe6ff" />
      <path d="M12 12v9.5l9-4.8V7.3z" fill="#2f8cf0" />
      <path d="M6.2 8.1 12 5.1" stroke="#fff" strokeOpacity=".7" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="m12 2.6 2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.2l-5.8 3.2 1.2-6.5-4.8-4.5 6.5-.8z" fill="#f7c33c" />
    </svg>
  );
}

export function Sparkle({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 11 L35.2 28.8 L53 32 L35.2 35.2 L32 53 L28.8 35.2 L11 32 L28.8 28.8 Z" fill="none" stroke="var(--primary)" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M46 14 L47 18 L51 19 L47 20 L46 24 L45 20 L41 19 L45 18 Z" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="18.5" cy="43" r="3.6" fill="var(--primary)" />
    </svg>
  );
}

export function MedalIcon({ rank }: { rank: number }) {
  const colors = [
    ["#f7c33c", "#c98f12"],
    ["#d7dde5", "#8e99a8"],
    ["#e19a5b", "#9c5a26"],
  ][rank] ?? ["#4a4a4a", "#2a2a2a"];
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
      <path d="M4 0h3l2 6H6zM12 0H9L7 6h3z" fill="#4f7fd9" />
      <circle cx="8" cy="11.5" r="5.5" fill={colors[0]} stroke={colors[1]} strokeWidth="1.2" />
      <text x="8" y="14" textAnchor="middle" fontSize="7" fontWeight="700" fill={colors[1]}>
        {rank + 1}
      </text>
    </svg>
  );
}
