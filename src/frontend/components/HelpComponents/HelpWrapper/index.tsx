import React, { useEffect, useState, type ReactNode } from 'react'
import { type Hint, Hints } from 'intro.js-react'

interface Props {
  hintList: Hint[]
  children: ReactNode
}

export default function HelpWrapper({ hintList, children }: Props) {
  const [showHints, setShowHints] = useState(false)

  const toggleHints = () => {
    setShowHints(!showHints)
  }

  useEffect(() => {
    return () => {
      setShowHints(false)
    }
  }, [])

  return (
    <>
      <Hints
        enabled={showHints}
        hints={hintList}
        options={{
          tooltipClass: 'onboarding'
        }}
      />
      {children}
      <button className="button is-primary" onClick={toggleHints}>
        {showHints ? 'Hide' : 'Show'} hints
      </button>
    </>
  )
}
