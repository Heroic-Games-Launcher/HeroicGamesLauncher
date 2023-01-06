import React from 'react'
import './index.scss'
import { AppleGamingWikiInfo } from 'common/types'
import { createNewWindow } from 'frontend/helpers'

type Props = {
  title: string
  info: AppleGamingWikiInfo
}

export default function Crossover({ title, info }: Props) {
  if (
    !info || !info.crossoverRating
  ) {
    return null
  }

  const { crossoverLink, crossoverRating } = info

  return (
    <details className="crossoverWrapper">
      <summary>Crossover</summary>
      <div className="crossover">
        {crossoverRating && (
          <div
            className='crossover__square'
            onClick={() => {
              if (crossoverLink) {
                createNewWindow(
                  `https://www.codeweavers.com/compatibility/crossover/${crossoverLink}`
                )
              } else {
                createNewWindow(
                  `https://www.codeweavers.com/search?q=${title}`
                )
              }
            }}
          >
            <div className="crossover__square__title">MetaCritic</div>
            <div className="crossover__square__value">
              {`${crossoverRating}`}
            </div>
          </div>
        )}
        </div>
    </details>
  )
}
