import './index.css'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { useEffect, useMemo, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { ArrowDownToLine, HardDrive } from 'lucide-react'
import { DownloadManagerState, Runner } from 'common/types'
import { StatCard } from 'frontend/components/UI'

interface Point {
  download: number
  disk: number
}

const roundToNearestHundredth = function (val: number | undefined) {
  if (!val) return 0
  return Math.round(val * 100) / 100
}

const SMOOTHING = 0.3

function smoothPoints(points: Point[]): Point[] {
  let download = points[0]?.download ?? 0
  let disk = points[0]?.disk ?? 0
  return points.map((point) => {
    download += SMOOTHING * (point.download - download)
    disk += SMOOTHING * (point.disk - disk)
    return { download, disk }
  })
}

export default function ProgressHeader(props: {
  appName: string
  state: DownloadManagerState
  runner: Runner
}) {
  const sampleSize = 100
  const { t } = useTranslation()
  const [progress] = hasProgress(props.appName, props.runner)
  const [avgSpeed, setAvgDownloadSpeed] = useState<Point[]>(
    Array<Point>(sampleSize).fill({ download: 0, disk: 0 })
  )

  useEffect(() => {
    if (props.state === 'idle') {
      setAvgDownloadSpeed(
        Array<Point>(sampleSize).fill({ download: 0, disk: 0 })
      )
      return
    }

    if (avgSpeed.length > sampleSize - 1) {
      avgSpeed.shift()
    }

    avgSpeed.push({
      download:
        progress.downSpeed && progress.downSpeed > 0
          ? progress.downSpeed
          : (avgSpeed.at(-1)?.download ?? 0),
      disk: progress.diskSpeed ?? 0
    })

    setAvgDownloadSpeed([...avgSpeed])
  }, [progress, props.state])

  const chartData = useMemo(() => smoothPoints(avgSpeed), [avgSpeed])
  const speedUnit = t('download-manager.label.unit', 'MB/s')

  return (
    <div className="DownloadStats">
      <div className="DownloadStats__chart">
        <ResponsiveContainer width="100%" height={88}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0 }}>
            {/* keeps the baseline at the bottom of the chart while idle */}
            <YAxis
              hide
              domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
            />
            <defs>
              <linearGradient id="downloadRate" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--success, #10b981)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--success, #10b981)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="diskRate" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--secondary, var(--accent))"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--secondary, var(--accent))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="disk"
              stroke="var(--secondary, var(--accent))"
              strokeWidth="1.5px"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="url(#diskRate)"
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="download"
              stroke="var(--success, #10b981)"
              strokeWidth="1.5px"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="url(#downloadRate)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="DownloadStats__cards">
        <StatCard
          glyph={ArrowDownToLine}
          label={t('download-manager.label.speed', 'Download')}
          value={`${roundToNearestHundredth(
            avgSpeed.at(-1)?.download
          )} ${speedUnit}`}
          className="DownloadStats__card DownloadStats__card--download"
        />
        <StatCard
          glyph={HardDrive}
          label={t('download-manager.label.disk', 'Disk')}
          value={`${roundToNearestHundredth(avgSpeed.at(-1)?.disk)} ${speedUnit}`}
          className="DownloadStats__card DownloadStats__card--disk"
        />
      </div>
    </div>
  )
}
