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

export function IconBook(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5v-13Z" />
      <path d="M18 20a2.5 2.5 0 0 0 2.5-2.5V7" />
      <path d="M8.5 8.5h5.5M8.5 12h5.5" />
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
