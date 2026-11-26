import React, {
  KeyboardEvent,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'
import LibraryContext from '../../LibraryContext'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

const AlphabetFilter: React.FC = () => {
  const { t } = useTranslation()
  const {
    alphabetFilterLetter: currentFilter,
    setAlphabetFilterLetter: onFilterChange,
    gamesForAlphabetFilter: allGames
  } = useContext(LibraryContext)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [lastFocused, setLastFocused] = useState<string | null>(null)

  const availableChars = useMemo(() => {
    const chars = new Set<string>()
    allGames.forEach((game) => {
      const title = game.overrides?.title || game.title
      if (title) {
        const processedTitle = title.replace(/^the\s/i, '')
        const firstCharMatch = processedTitle.match(/[a-zA-Z0-9]/)
        if (firstCharMatch) {
          const char = firstCharMatch[0]
          if (/[0-9]/.test(char)) {
            chars.add('#')
          } else {
            chars.add(char.toUpperCase())
          }
        }
      }
    })
    return chars
  }, [allGames])

  const interactableChars = CHARS.filter(
    (char) => availableChars.has(char) || char === currentFilter
  )

  const tabStop =
    [lastFocused, currentFilter].find(
      (char): char is string => !!char && interactableChars.includes(char)
    ) ?? interactableChars[0]

  const getButtonClassName = (value: string) => {
    let className = 'alphabet-filter-button'
    if (value === currentFilter) {
      className += ' alphabet-filter-button--active'
    } else if (!availableChars.has(value)) {
      className += ' alphabet-filter-button--disabled'
    }
    return className
  }

  const handleClick = (value: string) => {
    if (value === currentFilter) {
      onFilterChange(null)
    } else if (availableChars.has(value)) {
      onFilterChange(value)
    }
  }

  const focusChar = (char: string | undefined) => {
    if (!char) return
    buttonRefs.current[char]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = interactableChars.indexOf(
      (event.target as HTMLElement).dataset.char ?? ''
    )
    if (current === -1) return

    const lastIndex = interactableChars.length - 1
    const targets: Record<string, number> = {
      ArrowRight: Math.min(current + 1, lastIndex),
      ArrowLeft: Math.max(current - 1, 0),
      Home: 0,
      End: lastIndex
    }
    if (!(event.key in targets)) return

    event.preventDefault()
    focusChar(interactableChars[targets[event.key]])
  }

  return (
    <div
      className="alphabet-filter-container"
      data-tour="library-alphabet-filter"
      role="toolbar"
      aria-label={t('library.alphabetFilter', 'Filter by first letter')}
      onKeyDown={handleKeyDown}
    >
      {CHARS.map((char) => {
        const isInteractable = interactableChars.includes(char)
        return (
          <button
            key={char}
            type="button"
            ref={(element) => {
              buttonRefs.current[char] = element
            }}
            data-char={char}
            onClick={() => handleClick(char)}
            onFocus={() => setLastFocused(char)}
            className={getButtonClassName(char)}
            disabled={!isInteractable}
            aria-pressed={char === currentFilter}
            tabIndex={char === tabStop ? 0 : -1}
          >
            {char}
          </button>
        )
      })}
    </div>
  )
}

export default AlphabetFilter
