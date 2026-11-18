import {
  KeyboardEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import classNames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import { resolveSettingsSearchEntries, searchSettings } from '../../search'
import type {
  ResolvedSettingsSearchEntry,
  SettingsSearchTab
} from '../../search'
import './index.css'

const TAB_LABELS: Record<SettingsSearchTab, string> = {
  general: 'settings.navbar.general',
  runners: 'settings.navbar.runners',
  advanced: 'settings.navbar.advanced'
}

interface Props {
  onSelect: (entry: ResolvedSettingsSearchEntry) => void
}

export default function SettingsSearch({ onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const inputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLLIElement | null>>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const entries = useMemo(
    () => resolveSettingsSearchEntries(platform, t),
    // `t` changes identity on language changes, but i18n.language makes the
    // dependency explicit for the bundler and React.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [platform, i18n.language, t]
  )

  const results = useMemo(
    () => searchSettings(entries, query),
    [entries, query]
  )

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable

      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const selectEntry = (entry: ResolvedSettingsSearchEntry) => {
    onSelect(entry)
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
    inputRef.current?.blur()
  }

  const handleChange = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
    setOpen(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!query) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (results.length > 0) {
        setActiveIndex((index) => Math.min(index + 1, results.length - 1))
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const entry = results[activeIndex]
      if (open && entry) {
        event.preventDefault()
        selectEntry(entry)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (query) {
        setQuery('')
        setOpen(false)
      } else {
        inputRef.current?.blur()
      }
    }
  }

  const showResults = open && query.length > 0
  const activeOption =
    showResults && results[activeIndex]
      ? `settings-search-option-${activeIndex}`
      : undefined

  return (
    <div
      className="SettingsSearch"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false)
        }
      }}
    >
      <div className="SettingsSearch__field">
        <Search size={18} strokeWidth={1.75} aria-hidden />
        <input
          ref={inputRef}
          id="search"
          className="SettingsSearch__input"
          type="text"
          role="combobox"
          aria-label={t('settings.search.placeholder', 'Search settings')}
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls="settings-search-results"
          aria-activedescendant={activeOption}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('settings.search.placeholder', 'Search settings')}
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            if (query) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className="SettingsSearch__clear"
            aria-label={t('settings.search.clear', 'Clear search')}
            onClick={() => {
              setQuery('')
              setOpen(false)
              inputRef.current?.focus()
            }}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      {showResults && (
        <ul
          id="settings-search-results"
          className="SettingsSearch__results"
          role="listbox"
          aria-label={t('settings.search.results', 'Settings results')}
          onMouseDown={(event) => event.preventDefault()}
        >
          {results.map((entry, index) => (
            <li
              key={`${entry.tab}-${entry.titleKey}-${entry.id ?? index}`}
              id={`settings-search-option-${index}`}
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              className={classNames('SettingsSearch__result', {
                'SettingsSearch__result--active': index === activeIndex
              })}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectEntry(entry)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="SettingsSearch__resultTitle">{entry.title}</span>
              <span className="SettingsSearch__resultContext">
                {`${t(TAB_LABELS[entry.tab])} · ${entry.section}`}
              </span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="SettingsSearch__empty" role="presentation">
              {t('settings.search.noResults', 'No settings found')}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
