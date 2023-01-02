import React, { useEffect, useState } from 'react'
import './index.scss'
import { PCGamingWikiInfo } from 'common/types'
import classNames from 'classnames'

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

  return (
    <details className="gamescoreWrapper">
      <summary>Game Scores</summary>
      <div className="gamescore">
        {metacritic && (
          <div
            className={classNames(
              'gamescore__square',
              getColorClass(metacritic.score)
            )}
          >
            <div className="gamescore__square__title">MetaCritic</div>
            <div className="gamescore__square__value">
              {`${metacritic.score}`}
            </div>
          </div>
        )}
        {opencritic && (
          <div
            className={classNames(
              'gamescore__square',
              getColorClass(opencritic.score)
            )}
          >
            <div className="gamescore__square__title">OpenCritic</div>
            <div className="gamescore__square__value">
              {`${opencritic.score}`}
            </div>
          </div>
        )}
        {igdb && (
          <div className={classNames('gamescore__square', getColorClass(igdb.score))}>
            <div className="gamescore__square__title">IGDB</div>
            <div className="gamescore__square__value">{`${igdb.score}`}</div>
          </div>
        )}
      </div>
    </details>
  )
}
