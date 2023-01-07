import { WikiInfo } from 'common/types'
import React, { useContext, useEffect, useState } from 'react'
import GameScore from './components/GameScore'
import HowLongToBeat from './components/HowLongToBeat'
import Crossover from './components/Crossover'
import './index.scss'
import ContextProvider from 'frontend/state/ContextProvider'

interface Props {
  title: string
  id?: string
}

export function WikiGameInfo({ title, id }: Props) {
  const [wikiGameInfo, setWikiGameInfo] = useState<WikiInfo | null>(null)
  const { platform } = useContext(ContextProvider)
  const isMac = platform === 'darwin'

  useEffect(() => {
    window.api.getWikiGameInfo(title, id).then((info: WikiInfo) => {
      if (info) {
        setWikiGameInfo(info)
      }
    })
  }, [title, id])

  return (
    <div className="wikigameinfoWrapper">
      {wikiGameInfo?.howlongtobeat && (
        <HowLongToBeat info={wikiGameInfo.howlongtobeat} />
      )}
      {wikiGameInfo?.pcgamingwiki && (
        <GameScore info={wikiGameInfo.pcgamingwiki} title={title} />
      )}
      {isMac && wikiGameInfo?.applegamingwiki && (
        <Crossover info={wikiGameInfo.applegamingwiki} title={title} />
      )}
    </div>
  )
}
