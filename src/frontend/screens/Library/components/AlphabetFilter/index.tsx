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
    if (!allGames) return chars
    allGames.forEach((game) => {
      if (game?.title) {
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

  const getButtonClassName = (value: string, isEnabled: boolean) => {
    let className = 'alphabet-filter-button'
    if (!isEnabled) {
      className += ' alphabet-filter-button--disabled'
    } else if (value === currentFilter) {
      className += ' alphabet-filter-button--active'
    }
    return className
  }

  const handleClick = (value: string, isEnabled: boolean) => {
    if (!isEnabled) {
      return
    }
    if (value === currentFilter) {
      onFilterChange(null)
    } else {
      onFilterChange(value)
    }
  }

  return (
    <div className="alphabet-filter-container">
      {CHARS.map((char) => {
        const isEnabled = availableChars.has(char)
        return (
          <button
            key={char}
            onClick={() => handleClick(char, isEnabled)}
            className={getButtonClassName(char, isEnabled)}
            disabled={!isEnabled}
          >
            {char}
          </button>
        )
      })}
    </div>
  )
}

export default AlphabetFilter
