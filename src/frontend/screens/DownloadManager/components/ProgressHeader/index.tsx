import './index.css'
import { hasProgress } from 'frontend/hooks/hasProgress'
import React, { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Box, LinearProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface Point {
  download: number
  disk: number
}

const roundToNearestHundredth = function (val: number | undefined) {
  if (!val) return 0
  return Math.round(val * 100) / 100
}

export default function ProgressHeader(props: {
  appName: string
  downloading: boolean
}) {
  const { t } = useTranslation()
  const [progress] = hasProgress(props.appName)
  const [avgSpeed, setAvgDownloadSpeed] = useState<Point[]>(
    Array<Point>(10).fill({ download: 0, disk: 0 })
  )

  useEffect(() => {
    if (!props.downloading) {
      setAvgDownloadSpeed(Array<Point>(10).fill({ download: 0, disk: 0 }))
      return
    }
    if (avgSpeed.length > 9) {
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
  }, [progress, props.downloading])

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
          <div className="realtimeDownloadStatContainer">
            <h5 className="realtimeDownloadStat">
              {roundToNearestHundredth(avgSpeed.at(-1)?.download)} MB/s
            </h5>
            <div className="realtimeDownloadStatLabel downLabel">
              {t('down', 'Down')}{' '}
            </div>
          </div>
          <div className="realtimeDownloadStatContainer">
            <h5 className="realtimeDownloadStat">
              {roundToNearestHundredth(avgSpeed.at(-1)?.disk)} MB/s
            </h5>
            <div className="realtimeDownloadStatLabel diskLabel">
              {t('disk', 'Disk')}{' '}
            </div>
          </div>
        </div>
      </div>
      {props.downloading && progress.eta && (
        <div className="downloadBar">
          <div className="downloadProgressStats">
            <p className="downloadStat" color="var(--text-default)">{`${
              progress.percent ?? 0
            }%`}</p>
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
              <Typography variant="body2">
                {progress.eta ?? '00.00.00'}
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </>
  )
}
