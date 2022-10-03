import './index.css'
import { hasProgress } from 'frontend/hooks/hasProgress'
import React, { useEffect, useRef, useState } from 'react'
import { LinearProgress } from '@mui/material'
import { Chart as ChartJS, registerables } from 'chart.js'
import { Chart } from 'react-chartjs-2'

const roundToNearestHundredth = function (val: number | undefined) {
  if (!val) {
    return 0
  }
  return Math.round(val * 100) / 100
}

export default function ProgressHeader(props: { appName: string }) {
  const [progress] = hasProgress(props.appName)
  const chartRef = useRef<ChartJS>(null)
  const [avgDownloadSpeed, setAvgDownloadSpeed] = useState(
    Array<number>(10).fill(0)
  )
  const [avgDiskSpeed, setAvgDiskSpeed] = useState(Array<number>(10).fill(0))

  useEffect(() => {
    if (avgDownloadSpeed.length > 9) {
      avgDownloadSpeed.shift()
    }

    avgDownloadSpeed.push(
      progress.downSpeed && progress.downSpeed > 0
        ? progress.downSpeed
        : avgDownloadSpeed.at(-1) ?? 0
    )

    setAvgDownloadSpeed([...avgDownloadSpeed])

    if (avgDiskSpeed.length > 9) {
      avgDiskSpeed.shift()
    }

    avgDiskSpeed.push(progress.diskSpeed ?? 0)

    setAvgDiskSpeed([...avgDiskSpeed])
    chartRef.current?.update()
  }, [progress])

  ChartJS.register(...registerables)

  function cssvar(name: string, opacity?: number) {
    const convertedOpacity =
      opacity && opacity >= 0 && opacity < 1 ? Math.round(255 * opacity) : 255
    return (
      getComputedStyle(document.documentElement).getPropertyValue(name) +
      convertedOpacity.toString(16)
    )
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      yAxes: {
        display: false
      },
      xAxes: {
        display: false
      }
    },
    elements: {
      line: {
        tension: 0.5 // smooth lines
      }
    }
  }

  const data = {
    labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    datasets: [
      {
        fill: false,
        data: avgDiskSpeed,
        borderColor: cssvar('--primary'),
        pointRadius: 0,
        animation: {
          duration: 0
        }
      },
      {
        fill: true,
        data: avgDownloadSpeed,
        backgroundColor: cssvar('--accent', 0.5),
        pointRadius: 0,
        borderWidth: 0,
        animation: {
          duration: 0
        }
      }
    ]
  }

  return (
    <div className="progressHeader">
      <div className="downloadRateStats">
        <div className="downloadRateChart">
          <Chart type={'line'} data={data} options={options} ref={chartRef} />
        </div>
        <div className="realtimeDownloadStatContainer">
          <h3 className="realtimeDownloadStat">
            {roundToNearestHundredth(avgDownloadSpeed.at(-1))} MiB/s
          </h3>
          <div className="realtimeDownloadStatLabel downLabel">Down </div>
        </div>
        <div className="realtimeDownloadStatContainer">
          <h3 className="realtimeDownloadStat">
            {roundToNearestHundredth(avgDiskSpeed.at(-1))} MiB/s
          </h3>
          <div className="realtimeDownloadStatLabel diskLabel">Disk </div>
        </div>
      </div>
      <div className="downloadProgress">
        <div className="downloadProgressStats">
          <p className="downloadStat" color="var(--text-default)">{`${
            progress.percent ?? 0
          }%`}</p>
          <p className="downloadStat">{`ETA: ${progress.eta ?? '00.00.00'}`}</p>
        </div>
        <div className="downloadBar">
          <LinearProgress
            variant="determinate"
            className="linearProgress"
            value={progress.percent ?? 0}
            sx={{
              height: '10px',
              backgroundColor: 'var(--text-default)',
              borderRadius: '20px'
            }}
          />
        </div>
      </div>
    </div>
  )
}
