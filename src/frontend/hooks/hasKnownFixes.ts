import { useEffect, useState } from 'react'
import { KnownFixesInfo, Runner } from 'common/types'

export const useKnownFixes = (appName: string, runner: Runner) => {
  const [knownFixes, setKnownFixes] = useState<KnownFixesInfo | null>(null)

  useEffect(() => {
    void window.api
      .getKnownFixes(appName, runner)
      .then((info: KnownFixesInfo | null) => {
        setKnownFixes(info)
      })
  }, [appName, runner])

  return knownFixes
}
