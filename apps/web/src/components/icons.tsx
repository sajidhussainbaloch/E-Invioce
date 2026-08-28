import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconDashboard(p: P) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Svg>
  )
}

export function IconInvoices(p: P) {
  return (
    <Svg {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Svg>
  )
}

export function IconCustomers(p: P) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 20a6 6 0 0 0-3-5.2" />
    </Svg>
  )
}

export function IconProducts(p: P) {
  return (
    <Svg {...p}>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Svg>
  )
}

export function IconReports(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 3v18h18" />
      <path d="M7 15v-4" />
      <path d="M12 15V8" />
      <path d="M17 15v-6" />
    </Svg>
  )
}

export function IconFbr(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 12l-8 8" />
      <path d="M12 12l8 8" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function IconScanner(p: P) {
  return (
    <Svg {...p}>
      <path d="M3 7V4a1 1 0 0 1 1-1h3" />
      <path d="M17 3h3a1 1 0 0 1 1 1v3" />
      <path d="M21 17v3a1 1 0 0 1-1 1h-3" />
      <path d="M7 21H4a1 1 0 0 1-1-1v-3" />
      <path d="M7 8h10v8H7z" />
    </Svg>
  )
}

export function IconSettings(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  )
}

export function IconSearch(p: P) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Svg>
  )
}

export function IconSun(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  )
}

export function IconMoon(p: P) {
  return (
    <Svg {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  )
}

export function IconCommand(p: P) {
  return (
    <Svg {...p}>
      <path d="M9 9V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v3" />
      <circle cx="6" cy="15" r="3" />
      <circle cx="18" cy="15" r="3" />
      <path d="M9 15v3a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3v-3" />
    </Svg>
  )
}

export function IconPanelLeft(p: P) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </Svg>
  )
}

export function IconChevronsLeft(p: P) {
  return (
    <Svg {...p}>
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </Svg>
  )
}

export function IconChevronsRight(p: P) {
  return (
    <Svg {...p}>
      <path d="M13 17l5-5-5-5" />
      <path d="M6 17l5-5-5-5" />
    </Svg>
  )
}

export function IconDownload(p: P) {
  return (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  )
}

export function IconLogOut(p: P) {
  return (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  )
}

export function IconImage(p: P) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </Svg>
  )
}

export function IconBolt(p: P) {
  return (
    <Svg {...p}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
    </Svg>
  )
}