import React from 'react'
import './index.scss'
import { AppleGamingWikiInfo } from 'common/types'
import { createNewWindow } from 'frontend/helpers'
import classNames from 'classnames'

type Props = {
  title: string
  info: AppleGamingWikiInfo
}

export default function Crossover({ title, info }: Props) {
  if (!info || !info.crossoverRating) {
    return null
  }

  const getColorClass = (value: string) => {
    if (value === 'perfect') {
      return 'crossover__square__green'
    } else if (value === 'playable') {
      return 'crossover__square__yellow'
    }

    return 'crossover__square__red'
  }

  const { crossoverLink, crossoverRating } = info

  return (
    <details className="crossoverWrapper">
      <summary>Crossover</summary>
      <div className="crossover">
        {crossoverRating && (
          <div
            className={classNames(
              'crossover__square',
              getColorClass(crossoverRating)
            )}
            onClick={() => {
              if (crossoverLink) {
                createNewWindow(
                  `https://www.codeweavers.com/compatibility/crossover/${crossoverLink}`
                )
              } else {
                createNewWindow(
                  `https://www.codeweavers.com/compatibility?browse=&app_desc=&company=&rating=&platform=&date_start=&date_end=&name=${title}&search=app#results`
                )
              }
            }}
          >
            <div className="crossover__square__title">Rating</div>
            <div className="crossover__square__value">
              {`${crossoverRating}`}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
