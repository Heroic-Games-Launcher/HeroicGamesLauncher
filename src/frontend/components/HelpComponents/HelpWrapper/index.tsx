import React, { useEffect, useState, type ReactNode } from 'react'
import { type Hint, Hints, type Step, Steps } from 'intro.js-react'

interface Props {
  hintList?: Hint[]
  stepList?: Step[]
  onClickCallback?: () => void
  children: ReactNode
}

const introJsOptions = { tooltipClass: 'onboarding' }

export default function HelpWrapper({
  hintList,
  stepList,
  onClickCallback,
  children
}: Props) {
  const [showHelp, setShowHelp] = useState(false)

  const toggleHelp = () => {
    if (onClickCallback) onClickCallback()
    setShowHelp(!showHelp)
  }

  useEffect(() => {
    return () => {
      setShowHelp(false)
    }
  }, [])

  if (!hintList && !stepList) return null

  return (
    <>
      {stepList && (
        <Steps
          enabled={showHelp}
          onExit={() => {
            setShowHelp(false)
          }}
          options={introJsOptions}
          initialStep={0}
          steps={stepList}
        />
      )}
      {hintList && (
        <Hints enabled={showHelp} hints={hintList} options={introJsOptions} />
      )}
      {children}
      <button className="button is-primary" onClick={toggleHelp}>
        {showHelp ? 'Hide' : 'Show'} {stepList && 'tutorial'}{' '}
        {hintList && 'hints'}
      </button>
    </>
  )
}
