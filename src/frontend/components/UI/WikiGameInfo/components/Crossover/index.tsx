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
      return 'green'
    } else if (value === 'playable' || value === 'runs') {
      return 'yellow'
    }

    return 'red'
  }

  const { crossoverLink, crossoverRating } = info

  return (
    <>
      <h2>Crossover</h2>
      <div className="crossover">
        {crossoverRating && (
          <button
            className={classNames('circle', getColorClass(crossoverRating))}
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
            <div className="circle__title">Rating</div>
            <div className="circle__value">{`${crossoverRating}`}</div>
          </button>
        )}
      </div>
    </>
  )
}
