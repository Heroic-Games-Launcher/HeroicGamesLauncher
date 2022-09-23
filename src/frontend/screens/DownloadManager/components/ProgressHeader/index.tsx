import './index.css'
import { hasProgress } from 'frontend/hooks/hasProgress'
import React, { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import {
  Box,
  LinearProgress,
  LinearProgressProps,
  Typography
} from '@mui/material'

interface Point {
  download: number
  disk: number
}

export default function ProgressHeader(props: { appName: string }) {
  const [progress] = hasProgress(props.appName)
  const [avgSpeed, setAvgDownloadSpeed] = useState<Point[]>(
    Array<Point>(10).fill({ download: 0, disk: 0 })
  )

  useEffect(() => {
    if (avgSpeed.length > 9) {
      avgSpeed.shift()
    }

    avgSpeed.push({
      download:
        progress.downSpeed && progress.downSpeed > 0
          ? progress.downSpeed
          : avgSpeed.at(-1)?.download ?? 0,
      disk:
        progress.diskSpeed && progress.diskSpeed > 0
          ? progress.diskSpeed
          : avgSpeed.at(-1)?.disk ?? 0
    })

    setAvgDownloadSpeed([...avgSpeed])
  }, [progress])

  function LinearProgressWithLabel(
    props: LinearProgressProps & { value: number }
  ) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box>
          <Typography
            variant="body2"
            color="var(--accent)"
          >{`${props.value}%`}</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <div className="progressHeader">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={avgSpeed} margin={{ top: 10, right: 40 }}>
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
      <div className="progressChartValues">
        <p className="downSpeed">Down: {avgSpeed.at(-1)?.download} MiB/s</p>
        <p className="diskSpeed">Disk: {avgSpeed.at(-1)?.disk} MiB/s</p>
      </div>
      <LinearProgressWithLabel
        className="progressHeader linearProgress"
        variant="determinate"
        value={progress.percent ?? 0}
      />
      <div className="progressHeaderETA">{`ETA: ${
        progress.eta ?? '00.00.00'
      }`}</div>
    </div>
  )
}
