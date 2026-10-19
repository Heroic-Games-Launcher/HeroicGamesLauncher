import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const MacPerformanceReport = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const [macPerformanceReport, setMacPerformanceReport] = useSetting(
    'macPerformanceReport',
    true
  )

  if (platform !== 'darwin') {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="macPerformanceReportToggle"
        value={macPerformanceReport}
        handleChange={() => setMacPerformanceReport(!macPerformanceReport)}
        title={t(
          'setting.macPerformanceReport',
          'Performance report after playing'
        )}
      />

      <InfoIcon
        text={t(
          'help.macPerformanceReport',
          'When the game closes, reads the frame statistics macOS recorded while it ran (with metalperftrace) and writes the measured frame rate, frame times, GPU time and the likely bottleneck to the game log.'
        )}
      />
    </div>
  )
}

export default MacPerformanceReport
