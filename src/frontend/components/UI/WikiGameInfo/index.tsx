import { WikiInfo } from 'common/types'
import React, { useEffect, useState } from 'react'
import GameScore from './components/GameScore'
import HowLongToBeat from './components/HowLongToBeat'
import Crossover from './components/Crossover'

interface Props {
  title: string
  id?: string
}

export function WikiGameInfo({ title, id }: Props) {
  const [wikiGameInfo, setWikiGameInfo] = useState<WikiInfo | null>(null)

  useEffect(() => {
    window.api.getWikiGameInfo(title, id).then((info: WikiInfo) => {
      if (info) {
        setWikiGameInfo(info)
      }
    })
  }, [wikiGameInfo === null])


  return (
    <>
      {wikiGameInfo?.howlongtobeat && (
        <HowLongToBeat info={wikiGameInfo.howlongtobeat} />
      )}
      {wikiGameInfo?.pcgamingwiki && (
        <GameScore info={wikiGameInfo.pcgamingwiki} title={title} />
      )}
      {wikiGameInfo?.applegamingwiki && (
        <Crossover info={wikiGameInfo.applegamingwiki} title={title} />
      )}
    </>
  )
}
