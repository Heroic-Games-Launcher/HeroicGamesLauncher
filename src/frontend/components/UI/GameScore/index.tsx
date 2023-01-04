import React, { useEffect, useState } from 'react'
import './index.scss'
import { PCGamingWikiInfo } from 'common/types'
import classNames from 'classnames'
import { createNewWindow } from 'frontend/helpers'

type Props = {
  title: string
  id?: string
}

export default function GameScore({ title, id }: Props) {
  const [pcGamingWikiInfo, setPCGamingWikiInfo] =
    useState<PCGamingWikiInfo | null>(null)

  useEffect(() => {
    window.api.getInfoFromPCGamingWiki(title, id).then((info) => {
      if (info) {
        setPCGamingWikiInfo(info)
      }
    })
  }, [title, id])

  if (
    !pcGamingWikiInfo ||
    (!pcGamingWikiInfo.metacritic &&
      !pcGamingWikiInfo.opencritic &&
      !pcGamingWikiInfo.igdb)
  ) {
    return null
  }

  const getColorClass = (value: string) => {
    const number = Number(value)

    if (number > 66) {
      return 'gamescore__square__green'
    } else if (number < 33) {
      return 'gamescore__square__red'
    }

    return 'gamescore__square__yellow'
  }

  const { metacritic, opencritic, igdb } = pcGamingWikiInfo

  const shouldShow = metacritic.score || opencritic.score || igdb.score

  if (!shouldShow) {
    return null
  }

  return (
    <details className="gamescoreWrapper">
      <summary>Game Scores</summary>
      <div className="gamescore">
        {metacritic.score && (
          <div
            className={classNames(
              'gamescore__square',
              getColorClass(metacritic.score)
            )}
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
            <div className="gamescore__square__title">MetaCritic</div>
            <div className="gamescore__square__value">
              {`${metacritic.score}`}
            </div>
          </div>
        )}
        {opencritic.score && (
          <div
            className={classNames(
              'gamescore__square',
              getColorClass(opencritic.score)
            )}
            onClick={() => {
              if (opencritic.urlid) {
                createNewWindow(
                  `https://opencritic.com/game/${opencritic.urlid}`
                )
              }
            }}
          >
            <div className="gamescore__square__title">OpenCritic</div>
            <div className="gamescore__square__value">
              {`${opencritic.score}`}
            </div>
          </div>
        )}
        {igdb.score && (
          <div
            className={classNames(
              'gamescore__square',
              getColorClass(igdb.score)
            )}
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
            <div className="gamescore__square__title">IGDB</div>
            <div className="gamescore__square__value">{`${igdb.score}`}</div>
          </div>
        )}
      </div>
    </details>
  )
}
