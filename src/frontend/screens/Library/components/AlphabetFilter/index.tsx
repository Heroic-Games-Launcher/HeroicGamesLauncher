import React, { useMemo, useContext } from 'react'
import './index.css'
import LibraryContext from '../../LibraryContext'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('')

const AlphabetFilter: React.FC = () => {
  const {
    alphabetFilterLetter: currentFilter,
    setAlphabetFilterLetter: onFilterChange,
    gamesForAlphabetFilter: allGames
  } = useContext(LibraryContext)

  const availableChars = useMemo(() => {
    const chars = new Set<string>()
    allGames.forEach((game) => {
      if (game.title) {
        const processedTitle = game.title.replace(/^the\s/i, '')
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

  return (
    <div className="alphabet-filter-container">
      {CHARS.map((char) => {
        const isInteractable =
          availableChars.has(char) || char === currentFilter
        return (
          <button
            key={char}
            onClick={() => handleClick(char)}
            className={getButtonClassName(char)}
            disabled={!isInteractable}
          >
            {char}
          </button>
        )
      })}
    </div>
  )
}

export default AlphabetFilter
