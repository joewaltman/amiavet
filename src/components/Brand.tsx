// Amia wordmark + logo mark (same mark as the marketing site / favicon).
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Amia Vet logo">
      <rect width="32" height="32" rx="8" fill="#1F6F5C" />
      <path
        d="M20.5 10.5v11M20.5 13.2c-1-1.9-2.9-3-5-3a5.3 5.3 0 100 10.6c2.1 0 4-1.1 5-3"
        fill="none"
        stroke="#FBF9F4"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.6 20.2c.9-.8 1.5-1.6 1.5-2.5a1.5 1.5 0 00-2.7-.9 1.5 1.5 0 00-2.7.9c0 .9.6 1.7 1.5 2.5l1.2 1z"
        fill="#C2410C"
      />
    </svg>
  );
}

export function Brand({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark size={size} />
      <span className="text-xl font-extrabold tracking-tight text-charcoal">Amia&nbsp;Vet</span>
    </span>
  );
}
