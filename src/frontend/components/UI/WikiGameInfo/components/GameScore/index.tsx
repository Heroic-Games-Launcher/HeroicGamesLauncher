import React from 'react'
import './index.scss'
import { PCGamingWikiInfo } from 'common/types'
import classNames from 'classnames'
import { createNewWindow } from 'frontend/helpers'
import { useGlobalConfig } from 'frontend/hooks/config'

type Props = {
  title: string
  info: PCGamingWikiInfo
}

export default function GameScore({ title, info }: Props) {
  const [enableNewDesign] = useGlobalConfig('enableNewDesign')

  if (!info || (!info.metacritic && !info.opencritic && !info.igdb)) {
    return null
  }

  const getColorClass = (value: string) => {
    const number = Number(value)

    if (number > 66) {
      return 'green'
    } else if (number < 33) {
      return 'red'
    }

    return 'yellow'
  }

  const { metacritic, opencritic, igdb } = info

  const shouldShow = metacritic.score || opencritic.score || igdb.score

  if (!shouldShow) {
    return null
  }

  if (enableNewDesign) {
    return (
      <>
        {metacritic.score && (
          <a
            onClick={() => {
              if (metacritic.urlid) {
                createNewWindow(
                  `https://www.metacritic.com/game/pc/${metacritic.urlid}`
                )
              } else {
                createNewWindow(
                  `https://www.metacritic.com/search/all/${title}/results`
                )
              }
            }}
          >
            <b>MetaCritic</b>
            {`${metacritic.score}`}
          </a>
        )}
        {opencritic.score && (
          <a
            className={classNames('circle', getColorClass(opencritic.score))}
            onClick={() => {
              if (opencritic.urlid) {
                createNewWindow(
                  `https://opencritic.com/game/${opencritic.urlid}`
                )
              }
            }}
          >
            <b>OpenCritic</b>
            {`${opencritic.score}`}
          </a>
        )}
        {igdb.score && (
          <a
            className={classNames('circle', getColorClass(igdb.score))}
            onClick={() => {
              if (metacritic.urlid) {
                createNewWindow(
                  `https://www.igdb.com/games/${metacritic.urlid}`
                )
              } else {
                createNewWindow(`https://www.igdb.com/search?type=1&q=${title}`)
              }
            }}
          >
            <b>IGDB</b>
            {`${igdb.score}`}
          </a>
        )}
      </>
    )
  }

  return (
    <>
      <div className="gamescore">
        {metacritic.score && (
          <button
            className={classNames('circle', getColorClass(metacritic.score))}
            onClick={() => {
              if (metacritic.urlid) {
                createNewWindow(
                  `https://www.metacritic.com/game/pc/${metacritic.urlid}`
                )
              } else {
                createNewWindow(
                  `https://www.metacritic.com/search/all/${title}/results`
                )
              }
            }}
          >
            <div className="circle__title">MetaCritic</div>
            <div className="circle__value">{`${metacritic.score}`}</div>
          </button>
        )}
        {opencritic.score && (
          <button
            className={classNames('circle', getColorClass(opencritic.score))}
            onClick={() => {
              if (opencritic.urlid) {
                createNewWindow(
                  `https://opencritic.com/game/${opencritic.urlid}`
                )
              }
            }}
          >
            <div className="circle__title">OpenCritic</div>
            <div className="circle__value">{`${opencritic.score}`}</div>
          </button>
        )}
        {igdb.score && (
          <button
            className={classNames('circle', getColorClass(igdb.score))}
            onClick={() => {
              if (metacritic.urlid) {
                createNewWindow(
                  `https://www.igdb.com/games/${metacritic.urlid}`
                )
              } else {
                createNewWindow(`https://www.igdb.com/search?type=1&q=${title}`)
              }
            }}
          >
            <div className="circle__title">IGDB</div>
            <div className="circle__value">{`${igdb.score}`}</div>
          </button>
        )}
      </div>
    </>
  )
}
