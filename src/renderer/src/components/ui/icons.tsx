import type { JSX, ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconUsers(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M16 20v-1.2a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20" />
      <circle cx="9.2" cy="7.4" r="3.4" />
      <path d="M17.2 4.6a3.4 3.4 0 0 1 0 6.5" />
      <path d="M21.5 20v-1.2a3.8 3.8 0 0 0-2.9-3.6" />
    </Svg>
  )
}

export function IconPlus(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconPencil(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M4 20h4.2L19 9.2a2.9 2.9 0 0 0-4.1-4.1L4 16v4Z" />
      <path d="M13.6 6.6l3.8 3.8" />
    </Svg>
  )
}

export function IconTrash(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.4 7l.9 12.2h9.4L17.6 7" />
      <path d="M10.2 10.6v5.4M13.8 10.6v5.4" />
    </Svg>
  )
}

export function IconClose(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  )
}

export function IconChevronDown(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Svg>
  )
}

export function IconCheck(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5l5 5 10-10" />
    </Svg>
  )
}

export function IconSave(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M5 4h10.5L19 7.5V20H5V4Z" />
      <path d="M8.5 4v5h6V4" />
      <path d="M8.5 13h7v7h-7v-7Z" />
    </Svg>
  )
}

export function IconUndo(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h9.5a5.5 5.5 0 0 1 5.5 5.5V19" />
    </Svg>
  )
}

export function IconGear(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Svg>
  )
}

export function IconShield(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M12 3.2 19 6v5.7c0 4.4-2.9 7.6-7 9.1-4.1-1.5-7-4.7-7-9.1V6l7-2.8Z" />
      <path d="M12 8.6l2.6 4.4h-5.2L12 8.6Z" />
    </Svg>
  )
}

export function IconSkull(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M12 3.4c-4.4 0-7.4 3-7.4 7.1 0 2.4 1 4 2.4 5.2.6.5.9 1 .9 1.8v1.6c0 .7.6 1.3 1.3 1.3h5.6c.7 0 1.3-.6 1.3-1.3v-1.6c0-.8.3-1.3.9-1.8 1.4-1.2 2.4-2.8 2.4-5.2 0-4.1-3-7.1-7.4-7.1Z" />
      <circle cx="9.3" cy="11" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="11" r="1.6" fill="currentColor" stroke="none" />
      <path d="M10.6 20.4v-1.9M13.4 20.4v-1.9" />
    </Svg>
  )
}

export function IconMap(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M9 4.2 4.6 6.1v13.7L9 17.9l6 2 4.4-1.9V4.3L15 6.2 9 4.2Z" />
      <path d="M9 4.2v13.7M15 6.2v13.7" />
    </Svg>
  )
}

export function IconPlay(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M10.1 8.6 15.7 12l-5.6 3.4V8.6Z" />
    </Svg>
  )
}

export function IconLock(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <rect x="4.8" y="10" width="14.4" height="10" rx="2.6" />
      <path d="M8.6 10V7.4a3.4 3.4 0 0 1 6.8 0V10" />
    </Svg>
  )
}

/** d20 — силуэт гексагона с вписанной гранью. */
export function IconD20(props: IconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 48 48"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M24 3 44 14.5v19L24 45 4 33.5v-19L24 3Z" />
      <path d="M24 14 36 35H12L24 14Z" opacity="0.7" />
    </svg>
  )
}
