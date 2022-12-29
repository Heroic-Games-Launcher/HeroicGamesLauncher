import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './index.scss'
import { PCGamingWikiInfo } from 'common/types'

type Props = {
  title: string
  id?: string
}

export default function GameScore({ title, id }: Props) {
  const [pcGamingWikiInfo, setPCGamingWikiInfo] =
    useState<PCGamingWikiInfo | null>(null)
  const { t } = useTranslation('gamepage')

  useEffect(() => {
    window.api.getInfoFromPCGamingWiki(title, id).then((info) => {
      if (info) {
        setPCGamingWikiInfo(info)
      }
    })
  }, [title, id])

  if (!pcGamingWikiInfo) {
    return null
  }

  return (
    <div>
      <p>{t('gamescore.header', 'Game Scores')}</p>
      <div className="gamescore">
        <div className="gamescore__square">
          <div className="gamescore__square__title">
            {t('gamescore.metacritic', 'MetaCritic')}
          </div>
          <div className="gamescore__square__value">
            {`${pcGamingWikiInfo.metacritic}` || '?'}
          </div>
        </div>
        <div className="gamescore__square">
          <div className="gamescore__square__title">
            {t('gamescore.opencritic', 'OpenCritic')}
          </div>
          <div className="gamescore__square__value">
            {`${pcGamingWikiInfo.opencritic}` || '?'}
          </div>
        </div>
        <div className="gamescore__square">
          <div className="gamescore__square__title">
            {t('gamescore.igdb', 'IGDB')}
          </div>
          <div className="gamescore__square__value">
            {`${pcGamingWikiInfo.igdb}` || '?'}
          </div>
        </div>
      </div>
    </div>
  )
}
