import './index.css'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { useEffect } from 'react'
import { useInstallProgressHistory } from 'frontend/state/InstallProgress'
import { padTimeline, TimelineSlot } from 'frontend/state/progressTimeline'
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Box, LinearProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { DownloadManagerState, Runner } from 'common/types'

const roundToNearestHundredth = function (val: number | undefined) {
  if (!val) return 0
  return Math.round(val * 100) / 100
}

export default function ProgressHeader(props: {
  appName: string
  state: DownloadManagerState
  runner: Runner
}) {
  const { t } = useTranslation()
  const [progress] = hasProgress(props.appName, props.runner)
  const progressKey = `${props.appName}_${props.runner}`
  const progressHistory = useInstallProgressHistory(
    (state) => state.history[progressKey] ?? []
  )
  const clearProgressHistory = useInstallProgressHistory((state) => state.clear)

  useEffect(() => {
    if (props.state === 'idle') clearProgressHistory(progressKey)
  }, [clearProgressHistory, progressKey, props.state])

  const timeline = padTimeline(progressHistory)
  const latest = progressHistory.at(-1)

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
                <ComposedChart
                  data={timeline}
                  margin={{ top: 0, right: 0 }}
                  barCategoryGap={1}
                >
                  <XAxis dataKey="slot" hide type="category" />
                  <YAxis yAxisId="download" hide domain={[0, 'auto']} />
                  <YAxis yAxisId="disk" hide domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--input-background)',
                      border: '1px solid var(--text-default)',
                      borderRadius: '4px'
                    }}
                    formatter={(value: number) =>
                      `${roundToNearestHundredth(value)} MB/s`
                    }
                    labelFormatter={(_, payload) => {
                      const { timestamp } = (payload[0]?.payload ??
                        {}) as Partial<TimelineSlot>
                      return timestamp
                        ? new Date(timestamp).toLocaleTimeString()
                        : ''
                    }}
                  />
                  <Bar
                    isAnimationActive={false}
                    yAxisId="download"
                    dataKey="download"
                    name={t('download-manager.label.speed', 'Download')}
                    fill="var(--accent)"
                    fillOpacity={0.6}
                  />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    yAxisId="disk"
                    dataKey="disk"
                    name={t('download-manager.label.disk', 'Disk')}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="realtimeDownloadStatContainer">
            <h5 className="realtimeDownloadStat">
              {roundToNearestHundredth(latest?.download)} MB/s
            </h5>
            <div className="realtimeDownloadStatLabel downLabel">
              {t('download-manager.label.speed', 'Download')}{' '}
            </div>
          </div>
          <div className="realtimeDownloadStatContainer">
            <h5 className="realtimeDownloadStat">
              {roundToNearestHundredth(latest?.disk)} MB/s
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
            <p className="downloadStat" color="var(--text-default)">{`${
              progress.percent ?? 0
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
                  ? (progress.eta ?? '00.00.00')
                  : 'Paused'}
              </Typography>
            </Box>
          </Box>
        </div>
      )}
    </>
  )
}
