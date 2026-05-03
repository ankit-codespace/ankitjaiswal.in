/**
 * Brand SVG icons for social/profile links.
 *
 * Lucide doesn't ship logo glyphs (trademark reasons), so we inline the
 * official simple-icons.org marks (CC0). Using `currentColor` lets these
 * inherit theme color from their parent — important for the dark-on-dark
 * footer band where the lucide stroke variant looks too thin.
 *
 * Kept small and dependency-free so any tool can import without pulling in
 * a second icon library.
 */

type IconProps = { size?: number; className?: string };

export function GitHubIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.39.97.01 1.95.14 2.87.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.71 21.39 24 17.08 24 12 24 5.65 18.85.5 12 .5Z" />
    </svg>
  );
}

export function LinkedInIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

export function XIcon({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ThreadsIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-43.046-41.434-43.206-.121-.001-.241-.001-.362-.001-14.978 0-27.435 6.396-35.095 18.036l13.781 9.452c5.72-8.679 14.694-10.529 21.32-10.529.084 0 .168 0 .251.001 8.25.053 14.479 2.452 18.516 7.131 2.937 3.405 4.902 8.111 5.886 14.05-7.41-1.26-15.424-1.65-23.994-1.158-24.146 1.39-39.668 15.473-38.626 35.046.529 9.931 5.473 18.474 13.926 24.052 7.146 4.713 16.349 7.018 25.916 6.495 12.63-.692 22.538-5.501 29.451-14.291 5.255-6.682 8.578-15.343 10.064-26.281 6.097 3.679 10.617 8.519 13.114 14.336 4.245 9.892 4.493 26.146-8.764 39.391-11.617 11.604-25.582 16.621-46.682 16.775-23.397-.173-41.077-7.677-52.546-22.301-10.745-13.694-16.292-33.474-16.498-58.793.206-25.319 5.753-45.097 16.498-58.792 11.469-14.624 29.149-22.129 52.545-22.302 23.566.174 41.553 7.715 53.46 22.413 5.842 7.211 10.244 16.281 13.156 26.851l17.696-4.72c-3.53-13.013-9.085-24.232-16.665-33.59C145.829 11.466 124.176 1.937 97.061 1.75h-.123c-27.059.187-48.471 9.752-63.643 28.425C19.748 47.295 12.815 70.07 12.589 96.45v.099c.226 26.38 7.159 49.155 20.706 67.69 15.171 17.671 34.295 27.36 60.99 28.066h.105c25.515.221 44.071-6.369 60.078-22.33 22.064-22.005 21.385-49.49 14.131-66.337-5.207-12.084-15.143-21.91-28.715-28.435ZM98.44 129.464c-10.586.595-21.584-4.166-22.124-14.305-.401-7.522 5.354-15.917 22.781-16.92 1.996-.115 3.954-.171 5.876-.171 6.33 0 12.252.612 17.633 1.789-2.005 25.058-13.78 28.917-24.166 29.607Z" />
    </svg>
  );
}

export function AtSignIcon({ size = 16, className }: IconProps) {
  // Generic "@" icon for email-style profile links — kept here for parity.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}
