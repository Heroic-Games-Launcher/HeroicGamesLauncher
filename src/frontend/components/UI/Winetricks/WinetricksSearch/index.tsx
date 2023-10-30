import React, { useEffect, useState } from 'react'
import SearchBar from '../../SearchBar'
import { useTranslation } from 'react-i18next'

interface Props {
  allComponents: string[]
  installed: string[]
  onInstallClicked: (component: string) => void
}

export default function WinetricksSearchBar({
  allComponents,
  installed,
  onInstallClicked
}: Props) {
  const { t } = useTranslation()

  // handles the search input and results list
  const [search, setSearch] = useState('')
  const onInputChanged = (text: string) => {
    setSearch(text)
  }
  const [searchResults, setSearchResults] = useState<string[]>([])

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([])
    } else {
      let filtered = allComponents.filter((component) =>
        component.match(search)
      )
      filtered = filtered.filter((component) => !installed?.includes(component))
      setSearchResults(filtered)
    }
  }, [search])

  const install = (component: string) => {
    setSearch('')
    onInstallClicked(component)
  }

  const suggestions = searchResults.map((component) => {
    return (
      <li key={component}>
        <span>{component}</span>
        <button className="button" onClick={() => install(component)}>
          {t('winetricks.install', 'Install')}
        </button>
      </li>
    )
  })

  return (
    <SearchBar
      suggestionsListItems={suggestions}
      onInputChanged={onInputChanged}
      value={search}
      placeholder={t('winetricks.search', 'Search fonts or components')}
    />
  )
}
