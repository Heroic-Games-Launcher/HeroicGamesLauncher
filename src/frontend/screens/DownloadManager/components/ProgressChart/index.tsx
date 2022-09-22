import { hasProgress } from 'frontend/hooks/hasProgress'
import React, { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'

interface Point {
  value: number
  atm: number
}

export default function ProgressChart(props: { appName: string }) {
  const [progress] = hasProgress(props.appName)
  const [avgDownloadSpeed, setAvgDownloadSpeed] = useState<Point[]>([
    { value: 0, atm: 0 }
  ])

  useEffect(() => {
    if (avgDownloadSpeed.length > 10) {
      avgDownloadSpeed.shift()
    }

    avgDownloadSpeed.push({
      value: progress.percent,
      atm: avgDownloadSpeed.length
    })

    setAvgDownloadSpeed([...avgDownloadSpeed])
  }, [progress])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={avgDownloadSpeed} margin={{ top: 10 }}>
        <Area
          isAnimationActive={false}
          type="natural"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth="2px"
          fill="var(--accent)"
        />
        <YAxis
          orientation="right"
          axisLine={false}
          tickLine={false}
          dataKey="value"
          ticks={[avgDownloadSpeed[avgDownloadSpeed.length - 1].value]}
          tick={{ fill: 'var(--accent)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
