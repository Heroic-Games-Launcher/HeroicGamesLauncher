import { useEffect, useMemo } from 'react'

import { useTranslation } from 'react-i18next'

import { SmallInfo } from 'frontend/components/UI'

import './index.css'
import PopoverComponent from 'frontend/components/UI/PopoverComponent'
import { AvTimer } from '@mui/icons-material'
import { usePlaytime } from 'frontend/state/Playtime'
import { Runner } from 'common/types'

type Props = {
  game_id: string
  runner: Runner
}

function TimeContainer({ runner, game_id }: Props) {
  const { t, i18n } = useTranslation('gamepage')
  const playtime = usePlaytime((state) => state[`${game_id}_${runner}`])

  useEffect(() => {
    if (playtime) return
    window.api.playtime.get(game_id, runner)
  }, [playtime, game_id, runner])

  const dateTimeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short'
      }),
    [i18n]
  )
  const durationFormat = useMemo(
    () =>
      new Intl.DurationFormat(i18n.language, {
        style: 'long',
        minutesDisplay: 'always'
      }),
    [i18n]
  )

  const firstPlayedDateStr = useMemo(() => {
    if (!playtime?.firstPlayed) return t('game.neverPlayed', 'Never')
    return dateTimeFormat.format(new Date(playtime.firstPlayed))
  }, [playtime, dateTimeFormat, t])

  const lastPlayedDateStr = useMemo(() => {
    if (!playtime?.lastPlayed) return t('game.neverPlayed', 'Never')
    return dateTimeFormat.format(new Date(playtime.lastPlayed))
  }, [playtime, dateTimeFormat, t])

  const totalPlayed = useMemo(() => {
    const totalPlayed = playtime?.totalPlayed ?? 0
    const hours = Math.floor(totalPlayed / 60)
    const minutes = Math.floor(totalPlayed % 60)
    const seconds = Math.floor((totalPlayed % 1) * 60)
    return durationFormat.format({
      hours,
      minutes,
      seconds
    })
  }, [durationFormat, playtime])

  return (
    <PopoverComponent
      item={
        <p className="timeContainerLabel">
          <AvTimer />
          {t('game.totalPlayed', 'Time Played: {{totalPlayed}}', {
            totalPlayed
          })}
        </p>
      }
    >
      <div className="info">
        <SmallInfo
          title={t('game.firstPlayed', 'First Played: {{firstPlayedDateStr}}', {
            firstPlayedDateStr
          })}
        />
        <SmallInfo
          title={t('game.lastPlayed', 'Last Played: {{lastPlayedDateStr}}', {
            lastPlayedDateStr
          })}
        />
      </div>
    </PopoverComponent>
  )
}

export default TimeContainer
