import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export const Icon = {
  Wave: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0" />
    </svg>
  ),
  Cone: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 12h3l9-7v14l-9-7" />
      <path d="M19 9a4 4 0 0 1 0 6" />
    </svg>
  ),
  Array: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="6" y="3" width="12" height="4" rx="1" />
      <rect x="6.5" y="9" width="11" height="4" rx="1" transform="rotate(4 12 11)" />
      <rect x="7" y="15" width="10" height="4" rx="1" transform="rotate(9 12 17)" />
    </svg>
  ),
  Gain: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 20V10M12 20V4M18 20v-7" />
      <path d="M4 10h4M10 4h4M16 13h4" />
    </svg>
  ),
  Speech: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  ),
  Clock: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  Antenna: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 12v9M8 21h8" />
      <circle cx="12" cy="10" r="2" />
      <path d="M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4" />
    </svg>
  ),
  Bolt: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  Clipboard: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </svg>
  ),
  Book: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 21V5M8 7h7" />
    </svg>
  ),
  More: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </svg>
  ),
  History: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </svg>
  ),
  Bookmark: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  ),
  Share: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  ),
  User: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  Sun: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  Moon: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  ),
  Dim: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  ),
  Info: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </svg>
  ),
  Close: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Trash: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  ),
  Up: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  ),
  Down: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Download: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  ),
  Home: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
    </svg>
  ),
  Offline: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 8.5a15 15 0 0 1 4.5-2.8M10 5a15 15 0 0 1 12 3.5M5 12.5a10 10 0 0 1 4-2.2M15 10.6a10 10 0 0 1 4 1.9M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
    </svg>
  ),
}
