import { WikiInfo } from 'common/types'
import React, { useContext, useEffect, useState } from 'react'
import GameScore from './components/GameScore'
import HowLongToBeat from './components/HowLongToBeat'
import Crossover from './components/Crossover'
import './index.scss'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogHeader } from '../Dialog'
import { DialogContent } from '@mui/material'

interface Props {
  title: string
  setShouldShow: (value: boolean) => void
  id?: string
}

export function WikiGameInfo({ title, id, setShouldShow }: Props) {
  const [wikiGameInfo, setWikiGameInfo] = useState<WikiInfo | null>(null)
  const { platform } = useContext(ContextProvider)
  const isMac = platform === 'darwin'
  const { t } = useTranslation()

  useEffect(() => {
    window.api.getWikiGameInfo(title, id).then((info: WikiInfo) => {
      if (info) {
        setWikiGameInfo(info)
      }
    })
  }, [title, id])

  return (
    <div className="wikigameinfoWrapper">
      <Dialog showCloseButton onClose={() => setShouldShow(false)}>
        <DialogHeader onClose={() => setShouldShow(false)}>
          {t('info.gamepage.extra', 'Extra')}
        </DialogHeader>
        <DialogContent className="gameExtraDialog">
          {wikiGameInfo?.howlongtobeat && (
            <HowLongToBeat info={wikiGameInfo.howlongtobeat} />
          )}
          {wikiGameInfo?.pcgamingwiki && (
            <GameScore info={wikiGameInfo.pcgamingwiki} title={title} />
          )}
          {isMac && wikiGameInfo?.applegamingwiki && (
            <Crossover info={wikiGameInfo.applegamingwiki} title={title} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
