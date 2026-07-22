import { useEffect, useState } from 'react'
import { KnowFixesInfo } from 'common/types'
import type { GameHandle } from '../helpers/ipc'

export const hasKnownFixes = (game: GameHandle) => {
  const [knownFixes, setKnownFixes] = useState<KnowFixesInfo | null>(null)

  useEffect(() => {
    window.api.getKnownFixes(game).then((info: KnowFixesInfo | null) => {
      console.log({ info })
      setKnownFixes(info)
    })
  }, [game])

  return knownFixes
}
