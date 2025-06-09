import React, { useMemo } from 'react'
import './index.css' // Import the CSS file
import { GameInfo } from 'common/types' // 1. Import GameInfo

interface AlphabetFilterProps {
  currentFilter: string | null
  onFilterChange: (filter: string | null) => void
  allGames: GameInfo[] // 1. Add allGames prop
}

const AlphabetFilter: React.FC<AlphabetFilterProps> = ({
  currentFilter,
  onFilterChange,
  allGames
}) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const symbols = ['#']

  // 2. Calculate Available Letters
  const availableChars = useMemo(() => {
    const chars = new Set<string>()
    if (!allGames) return chars
    allGames.forEach((game) => {
      if (game && game.title) {
        // Added null check for game itself
        const firstChar = game.title.charAt(0)
        if (/[0-9]/.test(firstChar)) {
          chars.add('#')
        } else if (/[a-zA-Z]/.test(firstChar)) {
          chars.add(firstChar.toUpperCase())
        }
      }
    })
    return chars
  }, [allGames])

  // 4. Update getButtonClassName
  const getButtonClassName = (value: string, isEnabled: boolean) => {
    let className = 'alphabet-filter-button'
    if (!isEnabled) {
      className += ' alphabet-filter-button--disabled'
    } else if (value === currentFilter) {
      // Active class should only apply if enabled, but active implies enabled.
      className += ' alphabet-filter-button-active'
    }
    // Specific styling for '#' can remain if needed, independent of active/disabled state for base style
    if (value === '#') {
      className += ' alphabet-filter-symbol'
    }
    return className
  }

  // 3. Modify Button Rendering Logic (onClick part)
  const handleClick = (value: string, isEnabled: boolean) => {
    if (!isEnabled) {
      return // Do nothing if not enabled
    }
    if (value === currentFilter) {
      onFilterChange(null)
    } else {
      onFilterChange(value)
    }
  }

  return (
    <div className="alphabet-filter-container">
      {alphabet.map((letter) => {
        const isEnabled = availableChars.has(letter)
        return (
          <button
            key={letter}
            onClick={() => handleClick(letter, isEnabled)}
            className={getButtonClassName(letter, isEnabled)}
            disabled={!isEnabled} // Add HTML disabled attribute for accessibility
          >
            {letter}
          </button>
        )
      })}
      {symbols.map((symbol) => {
        const isEnabled = availableChars.has(symbol)
        return (
          <button
            key={symbol}
            onClick={() => handleClick(symbol, isEnabled)}
            className={getButtonClassName(symbol, isEnabled)}
            disabled={!isEnabled} // Add HTML disabled attribute for accessibility
          >
            {symbol}
          </button>
        )
      })}
    </div>
  )
}

export default AlphabetFilter
