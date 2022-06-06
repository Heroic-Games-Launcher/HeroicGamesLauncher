import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getGameInfo } from 'src/helpers'
import { hasProgress } from 'src/hooks/hasProgress'
import { Runner } from 'src/types'
import './index.css'

type Props = {
  appName: string
  runner: Runner | undefined
}

export default function CurrentDownload({ appName, runner }: Props) {
  const [progress] = hasProgress(appName)
  const [gameTitle, setGameTitle] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    const getGameTitle = async () => {
      const { title } = await getGameInfo(appName, runner)
      setGameTitle(title)
    }
    getGameTitle()
  }, [appName])

  return (
    <Link to={`gamepage/${appName}`} className="currentDownload">
      <span className="title">
        {progress.percent > 98
          ? t('status.processing', 'Processing files, please wait')
          : t('status.installing', 'Installing')}
      </span>
      <br />
      <span className="gameTitle">{gameTitle ?? 'GameName'}</span>
      <progress
        className="installProgress"
        value={progress.percent ?? 0}
        max={100}
      />
      <span className="percent">{`${progress.percent ?? 0}%`}</span>
    </Link>
  )
}
