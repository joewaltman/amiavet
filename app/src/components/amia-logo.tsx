// Inline SVG brand mark. Used in the header, footer, and as the favicon
// (via a data: URL in the root layout's metadata.icons entry).
export function AmiaLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Amia Vet logo"
      className={className}
    >
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

// The same SVG as a URL-encoded string, for the favicon in metadata.icons.
export const AMIA_LOGO_SVG_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%231F6F5C'/%3E%3Cpath d='M20.5 10.5v11M20.5 13.2c-1-1.9-2.9-3-5-3a5.3 5.3 0 100 10.6c2.1 0 4-1.1 5-3' fill='none' stroke='%23FBF9F4' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M24.6 20.2c.9-.8 1.5-1.6 1.5-2.5a1.5 1.5 0 00-2.7-.9 1.5 1.5 0 00-2.7.9c0 .9.6 1.7 1.5 2.5l1.2 1z' fill='%23C2410C'/%3E%3C/svg%3E";
