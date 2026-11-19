import {
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import SearchBar from 'frontend/components/UI/SearchBar'
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
  const optionRefs = useRef<Array<HTMLLIElement | null>>([])
  const [query, setQuery] = useState('')
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
    if (!query) return
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, query])

  const selectEntry = (entry: ResolvedSettingsSearchEntry) => {
    onSelect(entry)
    setQuery('')
    setActiveIndex(0)
  }

  const handleInputChanged = useCallback((value: string) => {
    setQuery(value)
    setActiveIndex(0)
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!query) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (results.length > 0) {
        setActiveIndex((index) => Math.min(index + 1, results.length - 1))
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      const entry = results[activeIndex]
      if (entry) {
        event.preventDefault()
        selectEntry(entry)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setQuery('')
      setActiveIndex(0)
    }
  }

  const suggestionItems: JSX.Element[] = results.map((entry, index) => (
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
  ))

  if (query && results.length === 0) {
    suggestionItems.push(
      <li key="empty" className="SettingsSearch__empty" role="presentation">
        {t('settings.search.noResults', 'No settings found')}
      </li>
    )
  }

  return (
    <div className="SettingsSearch">
      <SearchBar
        value={query}
        onInputChanged={handleInputChanged}
        placeholder={t('settings.search.placeholder', 'Search settings')}
        suggestionsListItems={query ? suggestionItems : []}
        suggestionsListProps={{
          id: 'settings-search-results',
          role: 'listbox',
          'aria-label': t('settings.search.results', 'Settings results'),
          onMouseDown: (event) => event.preventDefault()
        }}
        inputProps={{
          role: 'combobox',
          'aria-label': t('settings.search.placeholder', 'Search settings'),
          'aria-autocomplete': 'list',
          'aria-expanded': Boolean(query),
          'aria-controls': 'settings-search-results',
          'aria-activedescendant':
            query && results[activeIndex]
              ? `settings-search-option-${activeIndex}`
              : undefined,
          autoComplete: 'off',
          spellCheck: false,
          onKeyDown: handleKeyDown
        }}
      />
    </div>
  )
}
