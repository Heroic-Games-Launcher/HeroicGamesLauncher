import './index.css'
import { hasProgress } from 'frontend/hooks/hasProgress'
import React, { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Box, LinearProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DownloadManagerState } from 'common/types'

interface Point {
  download: number
  disk: number
}

const roundToNearestHundredthByte = function (val: number | undefined) {
  if (!val) return 0
  return Math.round(val * 100) / 100
}

const roundToNearestHundredthBit = function (val: number | undefined) {
  if (!val) return 0
  return Math.round(val * 100) / 100 * 8
}

export default function ProgressHeader(props: {
  appName: string
  state: DownloadManagerState
}) {
  const { t } = useTranslation()
  const [progress] = hasProgress(props.appName)
  const [avgSpeed, setAvgDownloadSpeed] = useState<Point[]>(
    Array<Point>(20).fill({ download: 0, disk: 0 })
  )
  const [speedType, setSpeedType] = useState<'megabit' | 'megabyte'>('megabyte')

  useEffect(() => {
    if (props.state === 'idle') {
      setAvgDownloadSpeed(Array<Point>(20).fill({ download: 0, disk: 0 }))
      return
    }

    if (avgSpeed.length > 19) {
      avgSpeed.shift()
    }

    avgSpeed.push({
      download:
        progress.downSpeed && progress.downSpeed > 0
          ? progress.downSpeed
          : avgSpeed.at(-1)?.download ?? 0,
      disk: progress.diskSpeed ?? 0
    })

    setAvgDownloadSpeed([...avgSpeed])
  }, [progress, props.state])

  const roundSpeed = function (val: number | undefined) {
    if (speedType === 'megabyte') return roundToNearestHundredthByte(val)
    return roundToNearestHundredthBit(val)
  }

  const toggleSpeedType = function () {    
    if (speedType === 'megabyte') setSpeedType('megabit')
    else setSpeedType('megabyte')
  }

  return (
    <>
      <div className="progressHeader">
        <div className="downloadRateStats">
          <div className="downloadRateChart">
            <div
              style={{
                width: '100%',
                height: '100px',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
              <ResponsiveContainer height={80}>
                <AreaChart data={avgSpeed} margin={{ top: 0, right: 0 }}>
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="download"
                    strokeWidth="0px"
                    fill="var(--accent)"
                    fillOpacity={0.5}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="disk"
                    stroke="var(--primary)"
                    strokeWidth="2px"
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="realtimeDownloadStatContainer" onClick={toggleSpeedType}>
            <h5 className="realtimeDownloadStat">
              {roundSpeed(avgSpeed.at(-1)?.download)} {speedType === 'megabyte' ? 'MB/s' : 'Mb/s'}
            </h5>
            <div className="realtimeDownloadStatLabel downLabel">
              {t('download-manager.label.speed', 'Download')}{' '}
            </div>
          </div>
          <div className="realtimeDownloadStatContainer" onClick={toggleSpeedType}>
            <h5 className="realtimeDownloadStat">
              {roundSpeed(avgSpeed.at(-1)?.disk)} {speedType === 'megabyte' ? 'MB/s' : 'Mb/s'}
            </h5>
            <div className="realtimeDownloadStatLabel diskLabel">
              {t('download-manager.label.disk', 'Disk')}{' '}
            </div>
          </div>
        </div>
      </div>
      {props.state !== 'idle' && props.appName && progress.eta && (
        <div className="downloadBar">
          <div className="downloadProgressStats">
            <p className="downloadStat" color="var(--text-default)">{`${progress.percent ?? 0
              }% [${progress.bytes ?? ''}] `}</p>
          </div>
          <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress
                style={{ height: 10 }}
                variant="determinate"
                className="linearProgress"
                value={progress.percent || 0}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography
                variant="subtitle1"
                title={t('download-manager.ETA', 'Estimated Time')}
              >
                {props.state === 'running'
                  ? progress.eta ?? '00.00.00'
                  : 'Paused'}
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </>
  )
}
