import {
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from 'react'
import './index.scss'

type Props = {
  title?: ReactNode | string
  children: ReactNode
  className?: string
  buttonClass?: string
  dataTour?: string
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'a[href], [tabindex]:not([tabindex="-1"])'

const ROW_TOLERANCE = 8

function centerOf(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function findNext(
  items: HTMLElement[],
  current: HTMLElement,
  key: string
): HTMLElement | undefined {
  const from = centerOf(current)
  const candidates = items
    .filter((item) => item !== current)
    .map((item) => {
      const to = centerOf(item)
      return { item, dx: to.x - from.x, dy: to.y - from.y }
    })

  const sameRow = (dy: number) => Math.abs(dy) <= ROW_TOLERANCE
  const inDirection = candidates.filter(({ dx, dy }) => {
    switch (key) {
      case 'ArrowDown':
        return dy > ROW_TOLERANCE
      case 'ArrowUp':
        return dy < -ROW_TOLERANCE
      case 'ArrowRight':
        return sameRow(dy) && dx > 0
      case 'ArrowLeft':
        return sameRow(dy) && dx < 0
      default:
        return false
    }
  })

  const isVertical = key === 'ArrowDown' || key === 'ArrowUp'
  const nearest = inDirection.sort((a, b) =>
    isVertical
      ? Math.abs(a.dy) - Math.abs(b.dy) || a.dx - b.dx
      : Math.abs(a.dx) - Math.abs(b.dx)
  )[0]
  if (!nearest || !isVertical) return nearest?.item

  return inDirection
    .filter(({ dy }) => Math.abs(dy - nearest.dy) <= ROW_TOLERANCE)
    .sort((a, b) => a.dx - b.dx)[0]?.item
}

export default function Dropdown({
  title,
  children,
  className,
  buttonClass,
  dataTour
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const getItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
    ).filter((item) => item.getClientRects().length > 0)

  const close = (returnFocus: boolean) => {
    setIsExpanded(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!isExpanded) return

    const active = document.activeElement
    if (!active || active === document.body || active === buttonRef.current) {
      getItems()[0]?.focus()
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const focusInside = containerRef.current?.contains(document.activeElement)
      close(!!focusInside)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpanded])

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
      return
    }

    if (!event.key.startsWith('Arrow')) return

    const items = getItems()
    const active = document.activeElement as HTMLElement | null
    if (!active) return

    const current =
      items.find((item) => item === active) ??
      items.find((item) => active.contains(item)) ??
      items.find((item) => item.contains(active))
    if (!current) return

    event.preventDefault()
    findNext(items, current, event.key)?.focus()
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!isExpanded) return
    const next = event.relatedTarget as Node | null
    if (next && !containerRef.current?.contains(next)) {
      setIsExpanded(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`dropdownContainer ${className || ''}`}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`dropdownButton ${buttonClass ? buttonClass : ''}`}
        data-tour={dataTour}
        aria-expanded={isExpanded}
        aria-controls={menuId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        {title}
      </button>
      <div
        ref={menuRef}
        id={menuId}
        className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}
        onKeyDown={handleMenuKeyDown}
      >
        {children}
      </div>
    </div>
  )
}
